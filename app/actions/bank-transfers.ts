"use server";

import type { BankTransfer, FundMutation } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { findAdminFeeAmount } from "@/lib/admin-fee";
import { applyFundDelta, cashWithdrawalLedger, feeIncomeLedger, operationalLedger, pulsaLedger, transferLedger } from "@/lib/fund-ledger";
import { outletContext } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { dateCode, toNumber } from "@/lib/utils";
import { bankTransferDepositSchema, bankTransferSchema } from "@/lib/validators";
import { getActionErrorMessage } from "@/lib/errors";

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
function isPulsaKind(kind: BankTransfer["kind"]) {
  return kind === "Mode_Pulsa" || kind === "Pembayaran_Digital";
}
function isOperationalKind(kind: BankTransfer["kind"]) {
  return kind === "Operasional";
}

const kindProfitLabel: Record<string, string> = {
  Jasa_Transfer: "Jasa Transfer",
  Fee_Brilink: "Fee Brilink",
  Mode_Pulsa: "Mode Pulsa",
  Pembayaran_Digital: "Pembayaran Digital",
  Operasional: "Biaya Operasional"
};

function profitRecord(profit: number, transfer: Pick<BankTransfer, "id" | "kodeTransfer" | "outletId" | "kind">, userId: number) {
  if (profit === 0) return null;
  const label = kindProfitLabel[transfer.kind];
  return {
    type: profit > 0 ? "income" as const : "expense" as const,
    category: label ?? (profit > 0 ? "Profit MiniATM" : "Rugi MiniATM"),
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
  if (!transfer.outletId) throw new Error("Cabang tidak valid");

  if (isFeeIncomeKind(transfer.kind)) {
    if (!transfer.targetFundId) throw new Error("Terima dana wajib diisi");
    const target = await tx.fundAccount.findFirst({ where: { id: transfer.targetFundId, outletId: transfer.outletId, isActive: true }, select: { id: true } });
    if (!target) throw new Error("Sumber dana tidak valid");
    return;
  }

  if (isOperationalKind(transfer.kind)) {
    if (!transfer.sourceFundId) throw new Error("Sumber dana wajib dipilih");
    const source = await tx.fundAccount.findFirst({ where: { id: transfer.sourceFundId, outletId: transfer.outletId, isActive: true }, select: { id: true } });
    if (!source) throw new Error("Sumber dana tidak valid");
    return;
  }

  if (!transfer.sourceFundId || !transfer.targetFundId) throw new Error("Sumber dan terima dana wajib diisi");

  if (isPulsaKind(transfer.kind)) {
    const funds = await tx.fundAccount.findMany({
      where: { id: { in: [transfer.sourceFundId, transfer.targetFundId] }, outletId: transfer.outletId, isActive: true },
      select: { id: true }
    });
    if (!funds.some((fund) => fund.id === transfer.sourceFundId) || !funds.some((fund) => fund.id === transfer.targetFundId)) {
      throw new Error("Sumber dana tidak valid");
    }
    return;
  }

  const funds = await tx.fundAccount.findMany({
    where: { id: { in: [transfer.sourceFundId, transfer.targetFundId] }, outletId: transfer.outletId, isActive: true },
    select: { id: true, type: true }
  });
  const source = funds.find((fund) => fund.id === transfer.sourceFundId);
  const target = funds.find((fund) => fund.id === transfer.targetFundId);
  if (!source || !target) throw new Error("Sumber dana tidak valid");
  if (transfer.kind === "Transfer" && source.type === "Cash") {
    throw new Error("Transfer harus memakai saldo bank/e-wallet sebagai sumber dana");
  }
  if (transfer.kind === "Tarik_Tunai" && (source.type !== "Cash" || target.type === "Cash")) {
    throw new Error("Tarik tunai harus memakai kas dan diterima di bank/e-wallet");
  }
}

async function completeBankTransfer(tx: Prisma.TransactionClient, transfer: BankTransfer, userId: number) {
  await validateFundFlow(tx, transfer);
  const amount = toNumber(transfer.amount);
  const feeIncome = isFeeIncomeKind(transfer.kind);
  const pulsa = isPulsaKind(transfer.kind);
  const operational = isOperationalKind(transfer.kind);
  const ledger = feeIncome
    ? feeIncomeLedger(amount)
    : pulsa
    ? pulsaLedger(amount, toNumber(transfer.costAmount))
    : operational
    ? operationalLedger(amount, toNumber(transfer.adminFee))
    : transfer.kind === "Tarik_Tunai"
    ? cashWithdrawalLedger(amount, toNumber(transfer.adminFee), toNumber(transfer.externalAdminFee))
    : transferLedger(amount, toNumber(transfer.adminFee), toNumber(transfer.adminBankFee));

  if (!feeIncome && transfer.sourceFundId) {
    await applyFundDelta(tx, {
      outletId: transfer.outletId!,
      fundAccountId: transfer.sourceFundId,
      type: operational ? "Withdraw_Out" : pulsa ? "Withdraw_Out" : transfer.kind === "Tarik_Tunai" ? "Cash_Out" : "Transfer_Out",
      delta: ledger.sourceDelta,
      adminFee: toNumber(transfer.adminBankFee),
      referenceType: "bank_transfer",
      referenceId: transfer.id,
      bankTransferId: transfer.id,
      note: transfer.note,
      userId
    });
  }
  if (transfer.targetFundId) {
    await applyFundDelta(tx, {
      outletId: transfer.outletId!,
      fundAccountId: transfer.targetFundId,
      type: feeIncome || pulsa ? "Deposit_In" : transfer.kind === "Tarik_Tunai" ? "Cash_In" : "Transfer_In",
      delta: ledger.targetDelta,
      adminFee: toNumber(transfer.adminFee),
      referenceType: "bank_transfer",
      referenceId: transfer.id,
      bankTransferId: transfer.id,
      note: transfer.note,
      userId
    });
  }
  const finance = profitRecord(ledger.profit, transfer, userId);
  if (finance) await tx.financeRecord.create({ data: finance });
  await tx.bankTransfer.update({ where: { id: transfer.id }, data: { status: "Berhasil", completedAt: new Date() } });
  return ledger.profit;
}

async function reverseBankTransfer(tx: Prisma.TransactionClient, transfer: BankTransfer & { fundMutations: FundMutation[] }, userId: number) {
  for (const mutation of transfer.fundMutations.slice().reverse()) {
    await applyFundDelta(tx, { outletId: mutation.outletId, fundAccountId: mutation.fundAccountId, type: "Reversal", delta: toNumber(mutation.balanceBefore) - toNumber(mutation.balanceAfter), referenceType: "bank_transfer_reopen", referenceId: transfer.id, bankTransferId: transfer.id, note: `Rollback ${transfer.kodeTransfer}`, userId });
  }
  await tx.financeRecord.deleteMany({ where: { bankTransferId: transfer.id } });
}

async function defaultFundId(outletId: number, name: string) {
  const fund = await prisma.fundAccount.findFirst({ where: { outletId, name, isActive: true }, select: { id: true } });
  if (!fund) throw new Error(`Sumber dana ${name} belum tersedia`);
  return fund.id;
}

export async function upsertBankTransfer(payload: unknown) {
  try {
    return await upsertBankTransferInner(payload);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function upsertBankTransferInner(payload: unknown) {
  await assertTrustedOrigin();
  const isEditing = Boolean((payload as { id?: unknown } | null)?.id);
  const user = await requirePermission(isEditing ? "bankTransfers.edit" : "bankTransfers.manage");
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferSchema.parse(payload);
  if (parsed.customerId) {
    const customer = await prisma.customerOutlet.findUnique({ where: { customerId_outletId: { customerId: parsed.customerId, outletId: activeOutlet.id } } });
    if (!customer) throw new Error("Pelanggan tidak ditemukan di cabang aktif");
  }
  const isFeeIncome = parsed.kind === "Jasa_Transfer" || parsed.kind === "Fee_Brilink";
  const isPulsa = parsed.kind === "Mode_Pulsa" || parsed.kind === "Pembayaran_Digital";
  const isOperational = parsed.kind === "Operasional";
  const usesBankFields = !isFeeIncome && !isPulsa && !isOperational;

  let effectiveAdminFee = parsed.adminFee;
  let effectiveAdminBankFee = parsed.adminBankFee;
  let effectiveExternalAdminFee = parsed.externalAdminFee;
  if (parsed.kind === "Tarik_Tunai" || parsed.kind === "Transfer") {
    const adminFeeSetting = await prisma.adminFeeSetting.findUnique({ where: { outletId: activeOutlet.id } });
    if (adminFeeSetting?.isActive) {
      const rules = (await prisma.adminFeeRule.findMany({ where: { outletId: activeOutlet.id, kind: parsed.kind } })).map((rule) => ({ kind: rule.kind, nominalFrom: toNumber(rule.nominalFrom), nominalTo: toNumber(rule.nominalTo), adminAmount: toNumber(rule.adminAmount), adminType: rule.adminType }));
      effectiveAdminFee = findAdminFeeAmount(rules, parsed.kind, "Dalam", parsed.amount) ?? 0;
      const luar = findAdminFeeAmount(rules, parsed.kind, "Luar", parsed.amount) ?? 0;
      if (parsed.kind === "Transfer") effectiveAdminBankFee = luar;
      else effectiveExternalAdminFee = luar;
    }
  }

  const data = {
    kind: parsed.kind,
    transactionType: parsed.kind === "Transfer" || parsed.kind === "Pembayaran_Digital" ? parsed.transactionType || null : null,
    sourceFundId: isFeeIncome ? null : parsed.sourceFundId,
    targetFundId: isOperational ? null : parsed.targetFundId,
    customerId: parsed.customerId || null,
    senderName: parsed.senderName || null,
    senderPhone: parsed.senderPhone || null,
    destinationBank: usesBankFields ? parsed.destinationBank! : "-",
    accountNumber: parsed.accountNumber || "",
    accountName: parsed.accountName || "",
    amount: parsed.amount,
    costAmount: isPulsa ? parsed.costAmount : 0,
    adminFee: isFeeIncome || isPulsa ? 0 : effectiveAdminFee,
    adminBankFee: parsed.kind === "Transfer" ? effectiveAdminBankFee : 0,
    externalAdminFee: parsed.kind === "Tarik_Tunai" ? effectiveExternalAdminFee : 0,
    totalReceived: isFeeIncome || isPulsa
      ? parsed.amount
      : isOperational
      ? parsed.amount + effectiveAdminFee
      : parsed.amount + effectiveAdminFee + (parsed.kind === "Tarik_Tunai" ? effectiveExternalAdminFee : 0),
    outletId: activeOutlet.id,
    note: parsed.note || null
  };

  if (parsed.id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankTransfer.findUnique({ where: { id: parsed.id }, include: { fundMutations: true } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Transfer tidak ditemukan di cabang aktif");
      if (existing.status !== "Pending") await reverseBankTransfer(tx, existing, user.id);
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
    return { success: true as const };
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
      return { success: true as const };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("Gagal membuat kode transfer unik");
}

export async function finalizeBankTransfer(id: number, status: "Berhasil" | "Gagal") {
  try {
    return await finalizeBankTransferInner(id, status);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function finalizeBankTransferInner(id: number, status: "Berhasil" | "Gagal") {
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
  return { success: true as const };
}

export async function reopenBankTransfer(id: number) {
  try {
    return await reopenBankTransferInner(id);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function reopenBankTransferInner(id: number) {
  await assertTrustedOrigin();
  const user = await requirePermission("bankTransfers.manage");
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id }, include: { fundMutations: true } });
    if (!transfer || transfer.outletId !== activeOutlet.id) throw new Error("Transfer tidak ditemukan di cabang aktif");
    if (transfer.status === "Pending") throw new Error("Transfer masih berstatus Pending");
    await reverseBankTransfer(tx, transfer, user.id);
    await tx.bankTransfer.update({ where: { id }, data: { status: "Pending", completedAt: null } });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: transfer.outletId, action: "reopen", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer, before: { status: transfer.status }, after: { status: "Pending" } } } });
  });
  revalidateTransferPaths();
  return { success: true as const };
}

export async function deleteBankTransfer(id: number) {
  try {
    return await deleteBankTransferInner(id);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function deleteBankTransferInner(id: number) {
  await assertTrustedOrigin();
  const user = await requirePermission("bankTransfers.delete");
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id }, include: { fundMutations: true } });
    if (!transfer || transfer.outletId !== activeOutlet.id) throw new Error("Transfer tidak ditemukan di cabang aktif");
    if (transfer.status !== "Pending") await reverseBankTransfer(tx, transfer, user.id);
    await tx.bankTransfer.delete({ where: { id } });
    await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: transfer.outletId, action: "delete", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer, before: { status: transfer.status, amount: toNumber(transfer.amount) } } } });
  });
  revalidateTransferPaths();
  return { success: true as const };
}

export async function createBankTransferDeposit(payload: unknown) {
  try {
    return await createBankTransferDepositInner(payload);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function createBankTransferDepositInner(payload: unknown) {
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
  return { success: true as const };
}