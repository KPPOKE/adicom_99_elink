"use server";

import type { BankTransfer } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { applyFundDelta, cashWithdrawalLedger, feeIncomeLedger, transferLedger } from "@/lib/fund-ledger";
import { outletContext } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
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

function isFeeIncomeKind(kind: BankTransfer["kind"]) {
  return kind === "Jasa_Transfer" || kind === "Fee_Brilink";
}

const feeIncomeLabel: Record<string, string> = {
  Jasa_Transfer: "Jasa Transfer",
  Fee_Brilink: "Fee Brilink"
};

function profitRecord(profit: number, transfer: Pick<BankTransfer, "id" | "kodeTransfer" | "outletId" | "kind">, userId: number) {
  if (profit === 0) return null;
  const feeLabel = feeIncomeLabel[transfer.kind];
  return {
    type: profit > 0 ? "income" as const : "expense" as const,
    category: feeLabel ?? (profit > 0 ? "Profit MiniATM" : "Rugi MiniATM"),
    amount: Math.abs(profit),
    description: `MiniATM ${transfer.kodeTransfer}`,
    referenceType: "bank_transfer",
    referenceId: transfer.id,
    bankTransferId: transfer.id,
    outletId: transfer.outletId,
    userId
  };
}

async function validateFundFlow(tx: Prisma.TransactionClient, transfer: BankTransfer) {
  if (!transfer.outletId || !transfer.targetFundId) throw new Error("Terima dana wajib diisi");
  if (isFeeIncomeKind(transfer.kind)) {
    const target = await tx.fundAccount.findFirst({ where: { id: transfer.targetFundId, outletId: transfer.outletId, isActive: true }, select: { id: true } });
    if (!target) throw new Error("Sumber dana tidak valid");
    return;
  }
  if (!transfer.sourceFundId) throw new Error("Sumber dan terima dana wajib diisi");
  const funds = await tx.fundAccount.findMany({
    where: { id: { in: [transfer.sourceFundId, transfer.targetFundId] }, outletId: transfer.outletId, isActive: true },
    select: { id: true, type: true }
  });
  const source = funds.find((fund) => fund.id === transfer.sourceFundId);
  const target = funds.find((fund) => fund.id === transfer.targetFundId);
  if (!source || !target) throw new Error("Sumber dana tidak valid");
  if (transfer.kind === "Transfer" && (source.type === "Cash" || target.type !== "Cash")) {
    throw new Error("Transfer harus memakai saldo bank/e-wallet dan diterima di kas");
  }
  if (transfer.kind === "Tarik_Tunai" && (source.type !== "Cash" || target.type === "Cash")) {
    throw new Error("Tarik tunai harus memakai kas dan diterima di bank/e-wallet");
  }
}

async function completeBankTransfer(tx: Prisma.TransactionClient, transfer: BankTransfer, userId: number) {
  await validateFundFlow(tx, transfer);
  const amount = toNumber(transfer.amount);
  const feeIncome = isFeeIncomeKind(transfer.kind);
  const ledger = feeIncome
    ? feeIncomeLedger(amount)
    : transfer.kind === "Tarik_Tunai"
    ? cashWithdrawalLedger(amount, toNumber(transfer.adminFee), toNumber(transfer.externalAdminFee))
    : transferLedger(amount, toNumber(transfer.adminFee), toNumber(transfer.adminBankFee));

  if (!feeIncome && transfer.sourceFundId) {
    await applyFundDelta(tx, {
      outletId: transfer.outletId!,
      fundAccountId: transfer.sourceFundId,
      type: transfer.kind === "Tarik_Tunai" ? "Cash_Out" : "Transfer_Out",
      delta: ledger.sourceDelta,
      adminFee: toNumber(transfer.adminBankFee),
      referenceType: "bank_transfer",
      referenceId: transfer.id,
      bankTransferId: transfer.id,
      note: transfer.note,
      userId
    });
  }
  await applyFundDelta(tx, {
    outletId: transfer.outletId!,
    fundAccountId: transfer.targetFundId!,
    type: feeIncome ? "Deposit_In" : transfer.kind === "Tarik_Tunai" ? "Cash_In" : "Transfer_In",
    delta: ledger.targetDelta,
    adminFee: toNumber(transfer.adminFee),
    referenceType: "bank_transfer",
    referenceId: transfer.id,
    bankTransferId: transfer.id,
    note: transfer.note,
    userId
  });
  const finance = profitRecord(ledger.profit, transfer, userId);
  if (finance) await tx.financeRecord.create({ data: finance });
  await tx.bankTransfer.update({ where: { id: transfer.id }, data: { status: "Berhasil", completedAt: new Date() } });
  return ledger.profit;
}

async function defaultFundId(outletId: number, name: string) {
  const fund = await prisma.fundAccount.findFirst({ where: { outletId, name, isActive: true }, select: { id: true } });
  if (!fund) throw new Error(`Sumber dana ${name} belum tersedia`);
  return fund.id;
}

export async function upsertBankTransfer(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requirePermission("bankTransfers.manage");
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferSchema.parse(payload);
  if (parsed.customerId) {
    const customer = await prisma.customerOutlet.findUnique({ where: { customerId_outletId: { customerId: parsed.customerId, outletId: activeOutlet.id } } });
    if (!customer) throw new Error("Pelanggan tidak ditemukan di cabang aktif");
  }
  const isFeeIncome = parsed.kind === "Jasa_Transfer" || parsed.kind === "Fee_Brilink";
  const data = {
    kind: parsed.kind,
    transactionType: isFeeIncome ? null : parsed.transactionType || null,
    sourceFundId: isFeeIncome ? null : parsed.sourceFundId,
    targetFundId: parsed.targetFundId,
    customerId: parsed.customerId || null,
    senderName: parsed.senderName || null,
    senderPhone: parsed.senderPhone || null,
    destinationBank: isFeeIncome ? "-" : parsed.destinationBank!,
    accountNumber: parsed.accountNumber || "",
    accountName: parsed.accountName || "",
    amount: parsed.amount,
    adminFee: isFeeIncome ? 0 : parsed.adminFee,
    adminBankFee: parsed.kind === "Transfer" ? parsed.adminBankFee : 0,
    externalAdminFee: parsed.kind === "Tarik_Tunai" ? parsed.externalAdminFee : 0,
    totalReceived: isFeeIncome ? parsed.amount : parsed.amount + parsed.adminFee + (parsed.kind === "Tarik_Tunai" ? parsed.externalAdminFee : 0),
    outletId: activeOutlet.id,
    note: parsed.note || null
  };

  if (parsed.id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankTransfer.findUnique({ where: { id: parsed.id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Transfer tidak ditemukan di cabang aktif");
      if (existing.status !== "Pending") throw new Error("Transfer yang sudah final tidak dapat diedit");
      const transfer = await tx.bankTransfer.update({ where: { id: parsed.id }, data });
      const profit = await completeBankTransfer(tx, transfer, user.id);
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          outletId: activeOutlet.id,
          action: "update",
          entity: "bank_transfer",
          entityId: transfer.id,
          metadata: { kodeTransfer: transfer.kodeTransfer, before: { amount: toNumber(existing.amount), status: existing.status }, after: { amount: parsed.amount, status: "Berhasil" }, profit }
        }
      });
    });
    revalidateTransferPaths();
    return;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const kodeTransfer = await nextTransferCode();
    try {
      await prisma.$transaction(async (tx) => {
        const transfer = await tx.bankTransfer.create({ data: { ...data, kodeTransfer, userId: user.id } });
        const profit = await completeBankTransfer(tx, transfer, user.id);
        await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "create", entity: "bank_transfer", entityId: transfer.id, metadata: { kodeTransfer, kind: parsed.kind, status: "Berhasil", profit } } });
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
  const user = await requirePermission("bankTransfers.manage");
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id } });
    if (!transfer || transfer.outletId !== activeOutlet.id) throw new Error("Transfer tidak ditemukan di cabang aktif");
    if (transfer.status !== "Pending") throw new Error("Transfer sudah diproses");
    const profit = status === "Berhasil" ? await completeBankTransfer(tx, transfer, user.id) : 0;
    if (status === "Gagal") await tx.bankTransfer.update({ where: { id }, data: { status, completedAt: new Date() } });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: transfer.outletId, action: status === "Berhasil" ? "complete" : "fail", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer, before: { status: transfer.status }, after: { status }, profit } } });
  });
  revalidateTransferPaths();
}

export async function reopenBankTransfer(id: number) {
  await assertTrustedOrigin();
  const user = await requirePermission("bankTransfers.manage");
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id }, include: { fundMutations: true } });
    if (!transfer || transfer.outletId !== activeOutlet.id) throw new Error("Transfer tidak ditemukan di cabang aktif");
    if (transfer.status === "Pending") throw new Error("Transfer masih berstatus Pending");
    for (const mutation of transfer.fundMutations.slice().reverse()) {
      await applyFundDelta(tx, { outletId: mutation.outletId, fundAccountId: mutation.fundAccountId, type: "Reversal", delta: toNumber(mutation.balanceBefore) - toNumber(mutation.balanceAfter), referenceType: "bank_transfer_reopen", referenceId: id, bankTransferId: id, note: `Rollback ${transfer.kodeTransfer}`, userId: user.id });
    }
    await tx.financeRecord.deleteMany({ where: { bankTransferId: id } });
    await tx.bankTransfer.update({ where: { id }, data: { status: "Pending", completedAt: null } });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: transfer.outletId, action: "reopen", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer, before: { status: transfer.status }, after: { status: "Pending" } } } });
  });
  revalidateTransferPaths();
}

export async function createBankTransferDeposit(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requirePermission("bankTransfers.manage");
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferDepositSchema.parse(payload);
  const fundAccountId = parsed.fundAccountId || await defaultFundId(activeOutlet.id, "BRI");
  await prisma.$transaction(async (tx) => {
    const deposit = await tx.bankTransferDeposit.create({ data: { outletId: activeOutlet.id, amount: parsed.amount, date: new Date(), note: parsed.note || null, userId: user.id } });
    await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId, type: "Deposit_In", delta: parsed.amount, referenceType: "manual_deposit", note: parsed.note, userId: user.id });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "create", entity: "bank_transfer_deposit", entityId: deposit.id, metadata: { outletId: activeOutlet.id, fundAccountId, amount: parsed.amount } } });
  });
  revalidateTransferPaths();
}