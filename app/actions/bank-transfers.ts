"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { applyFundDelta, cashWithdrawalLedger, transferLedger } from "@/lib/fund-ledger";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { dateCode, toNumber } from "@/lib/utils";
import { bankTransferDepositSchema, bankTransferSchema } from "@/lib/validators";

async function nextTransferCode() {
  const prefix = `TRF-${dateCode()}`;
  const last = await prisma.bankTransfer.findFirst({
    where: { kodeTransfer: { startsWith: prefix } },
    orderBy: { kodeTransfer: "desc" },
    select: { kodeTransfer: true }
  });
  const sequence = last ? Number(last.kodeTransfer.split("-").pop()) : 0;
  return `${prefix}-${String(sequence + 1).padStart(3, "0")}`;
}

function revalidateTransferPaths() {
  ["/bank-transfers", "/funds", "/fund-mutations", "/finance", "/reports", "/dashboard"].forEach((path) => revalidatePath(path));
}

function profitRecord(profit: number, transfer: { id: number; kodeTransfer: string; outletId: number | null }, userId: number) {
  if (profit === 0) return null;
  return {
    type: profit > 0 ? "income" as const : "expense" as const,
    category: profit > 0 ? "Profit MiniATM" : "Rugi MiniATM",
    amount: Math.abs(profit),
    description: `MiniATM ${transfer.kodeTransfer}`,
    referenceType: "bank_transfer",
    referenceId: transfer.id,
    bankTransferId: transfer.id,
    outletId: transfer.outletId,
    userId
  };
}

async function defaultFundId(outletId: number, name: string) {
  const fund = await prisma.fundAccount.findFirst({ where: { outletId, name, isActive: true }, select: { id: true } });
  if (!fund) throw new Error(`Sumber dana ${name} belum tersedia`);
  return fund.id;
}

export async function upsertBankTransfer(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferSchema.parse(payload);
  const totalReceived = parsed.amount + parsed.adminFee + (parsed.kind === "Transfer" ? 0 : parsed.externalAdminFee);
  const data = {
    kind: parsed.kind,
    transactionType: parsed.transactionType || null,
    sourceFundId: parsed.sourceFundId,
    targetFundId: parsed.targetFundId,
    customerId: parsed.customerId || null,
    senderName: parsed.senderName || null,
    senderPhone: parsed.senderPhone || null,
    destinationBank: parsed.destinationBank,
    accountNumber: parsed.accountNumber || "",
    accountName: parsed.accountName || "",
    amount: parsed.amount,
    adminFee: parsed.adminFee,
    adminBankFee: parsed.adminBankFee,
    externalAdminFee: parsed.externalAdminFee,
    totalReceived,
    outletId: activeOutlet.id,
    note: parsed.note || null
  };

  if (parsed.id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankTransfer.findUnique({ where: { id: parsed.id } });
      if (!existing) throw new Error("Transfer tidak ditemukan");
      if (existing.status !== "Pending") throw new Error("Transfer yang sudah final tidak dapat diedit");
      await tx.bankTransfer.update({ where: { id: parsed.id }, data });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "update", entity: "bank_transfer", entityId: parsed.id, metadata: { kodeTransfer: existing.kodeTransfer } } });
    });
    revalidateTransferPaths();
    return;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const kodeTransfer = await nextTransferCode();
    try {
      await prisma.$transaction(async (tx) => {
        const transfer = await tx.bankTransfer.create({ data: { ...data, kodeTransfer, userId: user.id } });
        await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "create", entity: "bank_transfer", entityId: transfer.id, metadata: { kodeTransfer, kind: parsed.kind } } });
      });
      revalidateTransferPaths();
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("Gagal membuat kode transfer unik");
}

export async function finalizeBankTransfer(id: number, status: "Berhasil" | "Gagal") {
  await assertTrustedOrigin();
  const user = await requireUser();
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id }, include: { fundMutations: true } });
    if (!transfer) throw new Error("Transfer tidak ditemukan");
    if (transfer.status !== "Pending") throw new Error("Transfer sudah diproses");
    if (transfer.fundMutations.length) throw new Error("Mutasi transfer sudah ada");

    await tx.bankTransfer.update({ where: { id }, data: { status, completedAt: new Date() } });
    let profit = 0;
    if (status === "Berhasil") {
      const amount = toNumber(transfer.amount);
      if (!transfer.sourceFundId || !transfer.targetFundId) throw new Error("Sumber dan terima dana wajib diisi");
      const ledger = transfer.kind === "Tarik_Tunai"
        ? cashWithdrawalLedger(amount, toNumber(transfer.adminFee), toNumber(transfer.externalAdminFee))
        : transferLedger(amount, toNumber(transfer.adminFee), toNumber(transfer.adminBankFee));
      profit = ledger.profit;
      await applyFundDelta(tx, { outletId: transfer.outletId!, fundAccountId: transfer.sourceFundId, type: transfer.kind === "Tarik_Tunai" ? "Cash_Out" : "Transfer_Out", delta: ledger.sourceDelta, adminFee: toNumber(transfer.adminBankFee), referenceType: "bank_transfer", referenceId: id, bankTransferId: id, note: transfer.note, userId: user.id });
      await applyFundDelta(tx, { outletId: transfer.outletId!, fundAccountId: transfer.targetFundId, type: transfer.kind === "Tarik_Tunai" ? "Cash_In" : "Transfer_In", delta: ledger.targetDelta, adminFee: toNumber(transfer.adminFee), referenceType: "bank_transfer", referenceId: id, bankTransferId: id, note: transfer.note, userId: user.id });
      const finance = profitRecord(profit, transfer, user.id);
      if (finance) await tx.financeRecord.create({ data: finance });
    }
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: status === "Berhasil" ? "complete" : "fail", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer, profit } } });
  });
  revalidateTransferPaths();
}

export async function reopenBankTransfer(id: number) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id }, include: { fundMutations: true } });
    if (!transfer) throw new Error("Transfer tidak ditemukan");
    if (transfer.status === "Pending") throw new Error("Transfer masih berstatus Pending");
    for (const mutation of transfer.fundMutations.slice().reverse()) {
      await applyFundDelta(tx, { outletId: mutation.outletId, fundAccountId: mutation.fundAccountId, type: "Reversal", delta: toNumber(mutation.balanceBefore) - toNumber(mutation.balanceAfter), referenceType: "bank_transfer_reopen", referenceId: id, bankTransferId: id, note: `Rollback ${transfer.kodeTransfer}`, userId: user.id });
    }
    await tx.financeRecord.deleteMany({ where: { bankTransferId: id } });
    await tx.bankTransfer.update({ where: { id }, data: { status: "Pending", completedAt: null } });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "reopen", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer } } });
  });
  revalidateTransferPaths();
}

export async function createBankTransferDeposit(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferDepositSchema.parse(payload);
  const fundAccountId = parsed.fundAccountId || await defaultFundId(activeOutlet.id, "BRI");
  await prisma.$transaction(async (tx) => {
    await tx.bankTransferDeposit.create({ data: { outletId: activeOutlet.id, amount: parsed.amount, date: new Date(), note: parsed.note || null, userId: user.id } });
    await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId, type: "Deposit_In", delta: parsed.amount, referenceType: "manual_deposit", note: parsed.note, userId: user.id });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "create", entity: "bank_transfer_deposit", metadata: { outletId: activeOutlet.id, fundAccountId, amount: parsed.amount } } });
  });
  revalidateTransferPaths();
}

