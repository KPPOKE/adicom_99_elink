"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
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
  const user = await requirePermission("funds.manage");
  const { activeOutlet } = await outletContext(user);
  const parsed = fundAccountSchema.parse(payload);
  await prisma.$transaction(async (tx) => {
    if (parsed.id) {
      const existing = await tx.fundAccount.findUnique({ where: { id: parsed.id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Sumber dana tidak ditemukan");
      await tx.fundAccount.update({ where: { id: parsed.id }, data: { name: parsed.name, type: parsed.type, note: parsed.note || null, isActive: parsed.isActive } });
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          outletId: activeOutlet.id,
          action: "update",
          entity: "fund_account",
          entityId: existing.id,
          metadata: {
            name: existing.name,
            before: { name: existing.name, type: existing.type, isActive: existing.isActive },
            after: { name: parsed.name, type: parsed.type, isActive: parsed.isActive }
          }
        }
      });
      return;
    }
    const account = await tx.fundAccount.create({ data: { outletId: activeOutlet.id, name: parsed.name, type: parsed.type, balance: parsed.balance, openingBalance: parsed.balance, note: parsed.note || null, isActive: parsed.isActive } });
    if (parsed.balance > 0) {
      await tx.fundMutation.create({ data: { outletId: activeOutlet.id, fundAccountId: account.id, type: "Opening", amount: parsed.balance, balanceBefore: 0, balanceAfter: parsed.balance, referenceType: "opening", note: parsed.note || null, userId: user.id } });
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        outletId: activeOutlet.id,
        action: "create",
        entity: "fund_account",
        entityId: account.id,
        metadata: { name: account.name, type: account.type, openingBalance: parsed.balance, isActive: account.isActive }
      }
    });
  });
  revalidateFunds();
}

export async function createFundMutation(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requirePermission("funds.manage");
  const { activeOutlet } = await outletContext(user);
  const parsed = fundMutationSchema.parse(payload);
  await prisma.$transaction(async (tx) => {
    const mutations = [];
    if (parsed.mode === "Tambah") {
      const mutation = await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.targetFundId!, type: "Deposit_In", delta: parsed.amount, note: parsed.note, userId: user.id, referenceType: "manual_fund" });
      if (mutation) mutations.push(mutation);
    } else if (parsed.mode === "Ambil") {
      const mutation = await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.sourceFundId!, type: "Withdraw_Out", delta: -(parsed.amount + parsed.adminFee), adminFee: parsed.adminFee, note: parsed.note, userId: user.id, referenceType: "manual_fund" });
      if (mutation) mutations.push(mutation);
    } else {
      const ledger = moveLedger(parsed.amount, parsed.adminFee, parsed.operationalBearer);
      const source = await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.sourceFundId!, type: "Move_Out", delta: ledger.sourceDelta, adminFee: parsed.operationalBearer === "Pengirim" ? parsed.adminFee : 0, note: parsed.note, userId: user.id, referenceType: "move_fund" });
      const target = await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: parsed.targetFundId!, type: "Move_In", delta: ledger.targetDelta, adminFee: parsed.operationalBearer === "Penerima" ? parsed.adminFee : 0, note: parsed.note, userId: user.id, referenceType: "move_fund" });
      if (source) mutations.push(source);
      if (target) mutations.push(target);
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        outletId: activeOutlet.id,
        action: "create",
        entity: "fund_mutation",
        entityId: mutations[0]?.id,
        metadata: {
          mode: parsed.mode,
          amount: parsed.amount,
          adminFee: parsed.adminFee,
          changes: mutations.map((mutation) => ({
            fundAccountId: mutation.fundAccountId,
            type: mutation.type,
            balanceBefore: toNumber(mutation.balanceBefore),
            balanceAfter: toNumber(mutation.balanceAfter)
          }))
        }
      }
    });
  });
  revalidateFunds();
}

export async function toggleFundAccount(id: number, isActive: boolean) {
  await assertTrustedOrigin();
  const user = await requirePermission("funds.manage");
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const account = await tx.fundAccount.findUnique({ where: { id } });
    if (!account || account.outletId !== activeOutlet.id) throw new Error("Sumber dana tidak ditemukan");
    if (!isActive && toNumber(account.balance) !== 0) throw new Error("Saldo harus nol sebelum dinonaktifkan");
    await tx.fundAccount.update({ where: { id }, data: { isActive } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        outletId: activeOutlet.id,
        action: "toggle",
        entity: "fund_account",
        entityId: id,
        metadata: { name: account.name, before: { isActive: account.isActive }, after: { isActive } }
      }
    });
  });
  revalidateFunds();
}
