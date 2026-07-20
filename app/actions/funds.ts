"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { applyFundDelta, moveLedger } from "@/lib/fund-ledger";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { toNumber } from "@/lib/utils";
import { fundAccountSchema, fundMutationSchema } from "@/lib/validators";

function revalidateFunds() {
  ["/funds", "/fund-mutations", "/bank-transfers", "/dashboard", "/reports"].forEach((path) => revalidatePath(path));
}

export async function upsertFundAccount(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const parsed = fundAccountSchema.parse(payload);
  await prisma.$transaction(async (tx) => {
    if (parsed.id) {
      const existing = await tx.fundAccount.findUnique({ where: { id: parsed.id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Sumber dana tidak ditemukan");
      await tx.fundAccount.update({ where: { id: parsed.id }, data: { name: parsed.name, type: parsed.type, note: parsed.note || null, isActive: parsed.isActive } });
      return;
    }
    const account = await tx.fundAccount.create({ data: { outletId: activeOutlet.id, name: parsed.name, type: parsed.type, balance: parsed.balance, openingBalance: parsed.balance, note: parsed.note || null, isActive: parsed.isActive } });
    if (parsed.balance > 0) {
      await tx.fundMutation.create({ data: { outletId: activeOutlet.id, fundAccountId: account.id, type: "Opening", amount: parsed.balance, balanceBefore: 0, balanceAfter: parsed.balance, referenceType: "opening", note: parsed.note || null, userId: user.id } });
    }
  });
  revalidateFunds();
}

export async function createFundMutation(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const parsed = fundMutationSchema.parse(payload);
  await prisma.$transaction(async (tx) => {
    if (parsed.mode === "Tambah") {
      await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.targetFundId!, type: "Deposit_In", delta: parsed.amount, note: parsed.note, userId: user.id, referenceType: "manual_fund" });
    } else if (parsed.mode === "Ambil") {
      await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.sourceFundId!, type: "Withdraw_Out", delta: -(parsed.amount + parsed.adminFee), adminFee: parsed.adminFee, note: parsed.note, userId: user.id, referenceType: "manual_fund" });
    } else {
      const ledger = moveLedger(parsed.amount, parsed.adminFee, parsed.operationalBearer);
      await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.sourceFundId!, type: "Move_Out", delta: ledger.sourceDelta, adminFee: parsed.operationalBearer === "Pengirim" ? parsed.adminFee : 0, note: parsed.note, userId: user.id, referenceType: "move_fund" });
      await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.targetFundId!, type: "Move_In", delta: ledger.targetDelta, adminFee: parsed.operationalBearer === "Penerima" ? parsed.adminFee : 0, note: parsed.note, userId: user.id, referenceType: "move_fund" });
    }
  });
  revalidateFunds();
}

export async function toggleFundAccount(id: number, isActive: boolean) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const account = await prisma.fundAccount.findUnique({ where: { id } });
  if (!account || account.outletId !== activeOutlet.id) throw new Error("Sumber dana tidak ditemukan");
  if (!isActive && toNumber(account.balance) !== 0) throw new Error("Saldo harus nol sebelum dinonaktifkan");
  await prisma.fundAccount.update({ where: { id }, data: { isActive } });
  revalidateFunds();
}

