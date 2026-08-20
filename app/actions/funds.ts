"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/permissions";
import { applyFundDelta, moveLedger } from "@/lib/fund-ledger";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { toNumber } from "@/lib/utils";
import { deletePublicUpload, saveImageUpload } from "@/lib/upload";
import { fundAccountSchema, fundMutationSchema } from "@/lib/validators";
import { getActionErrorMessage } from "@/lib/errors";

function revalidateFunds() {
  ["/funds", "/fund-mutations", "/bank-transfers", "/dashboard", "/reports"].forEach((path) => revalidatePath(path));
}

export async function upsertFundAccount(formData: FormData) {
  try {
    return await upsertFundAccountInner(formData);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function upsertFundAccountInner(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requirePermission(formData.get("id") ? "funds.edit" : "funds.manage");
  const { activeOutlet } = await outletContext(user);
  const parsed = fundAccountSchema.parse({ ...Object.fromEntries(formData), isActive: formData.get("isActive") === "true" });
  const uploadedImage = await saveImageUpload(formData.get("imageFile") as File | null, "fund");
  let previousImage: string | null = null;
  try {
    await prisma.$transaction(async (tx) => {
    if (parsed.id) {
      const existing = await tx.fundAccount.findUnique({ where: { id: parsed.id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Sumber dana tidak ditemukan");
      previousImage = existing.image;
      const before = toNumber(existing.balance);
      const delta = parsed.balance - before;
      if (delta !== 0 && !parsed.adjustmentReason) throw new Error("Alasan penyesuaian saldo wajib diisi");
      if (delta !== 0 && !existing.isActive) throw new Error("Aktifkan sumber dana sebelum mengubah saldo");
      if (!parsed.isActive && parsed.balance !== 0) throw new Error("Saldo harus nol sebelum dinonaktifkan");
      if (delta !== 0) {
        await applyFundDelta(tx, {
          outletId: activeOutlet.id,
          fundAccountId: existing.id,
          type: "Adjustment",
          delta,
          referenceType: "manual_adjustment",
          note: parsed.adjustmentReason,
          userId: user.id
        });
      }
      await tx.fundAccount.update({ where: { id: parsed.id }, data: { name: parsed.name, type: parsed.type, note: parsed.note || null, image: uploadedImage || existing.image, isActive: parsed.isActive } });
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
            before: { name: existing.name, type: existing.type, balance: before, isActive: existing.isActive },
            after: { name: parsed.name, type: parsed.type, balance: parsed.balance, isActive: parsed.isActive },
            adjustmentReason: delta !== 0 ? parsed.adjustmentReason : undefined
          }
        }
      });
      return;
    }
    const account = await tx.fundAccount.create({ data: { outletId: activeOutlet.id, name: parsed.name, type: parsed.type, balance: parsed.balance, openingBalance: parsed.balance, note: parsed.note || null, image: uploadedImage || null, isActive: parsed.isActive } });
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
  } catch (error) {
    await deletePublicUpload(uploadedImage);
    throw error;
  }
  if (uploadedImage) await deletePublicUpload(previousImage);
  revalidateFunds();
  return { success: true as const };
}

export async function createFundMutation(payload: unknown) {
  try {
    return await createFundMutationInner(payload);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function createFundMutationInner(payload: unknown) {
  await assertTrustedOrigin();
  const parsed = fundMutationSchema.parse(payload);
  const permissionKey = parsed.mode === "Tambah" ? "fundMutations.deposit" : parsed.mode === "Ambil" ? "fundMutations.withdraw" : "fundMutations.moveCreate";
  const user = await requirePermission(permissionKey);
  const { activeOutlet } = await outletContext(user);
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
  return { success: true as const };
}

export async function resetFundAccount(id: number, reason: string) {
  try {
    return await resetFundAccountInner(id, reason);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function resetFundAccountInner(id: number, reason: string) {
  await assertTrustedOrigin();
  const user = await requirePermission("funds.reset");
  const { activeOutlet } = await outletContext(user);
  if (!reason.trim()) throw new Error("Alasan reset saldo wajib diisi");
  await prisma.$transaction(async (tx) => {
    const account = await tx.fundAccount.findUnique({ where: { id } });
    if (!account || account.outletId !== activeOutlet.id) throw new Error("Sumber dana tidak ditemukan");
    const before = toNumber(account.balance);
    if (before === 0) throw new Error("Saldo sudah Rp0");
    await applyFundDelta(tx, { outletId: activeOutlet.id, fundAccountId: id, type: "Adjustment", delta: -before, referenceType: "manual_reset", note: reason, userId: user.id });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        outletId: activeOutlet.id,
        action: "reset",
        entity: "fund_account",
        entityId: id,
        metadata: { name: account.name, before, after: 0, reason }
      }
    });
  });
  revalidateFunds();
  return { success: true as const };
}

export async function toggleFundAccount(id: number, isActive: boolean) {
  try {
    return await toggleFundAccountInner(id, isActive);
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

async function toggleFundAccountInner(id: number, isActive: boolean) {
  await assertTrustedOrigin();
  const user = await requirePermission("funds.edit");
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
  return { success: true as const };
}
