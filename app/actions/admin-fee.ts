"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { handleActionError } from "@/lib/errors";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { adminFeeRuleSchema } from "@/lib/validators";

export async function updateAdminFeeStatus(outletId: number, isActive: boolean) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("settings.adminFee");
    await prisma.adminFeeSetting.upsert({
      where: { outletId },
      update: { isActive },
      create: { outletId, isActive }
    });
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId, action: "update", entity: "admin_fee_setting", metadata: { isActive } });
    revalidatePath("/settings/admin-otomatis");
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertAdminFeeRule(payload: unknown) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("settings.adminFee");
    const parsed = adminFeeRuleSchema.parse(payload);
    const data = {
      outletId: parsed.outletId,
      kind: parsed.kind,
      nominalFrom: parsed.nominalFrom,
      nominalTo: parsed.nominalTo,
      adminAmount: parsed.adminAmount,
      adminType: parsed.adminType
    };
    const rule = parsed.id
      ? await prisma.adminFeeRule.update({ where: { id: parsed.id }, data })
      : await prisma.adminFeeRule.create({ data });
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: parsed.outletId, action: parsed.id ? "update" : "create", entity: "admin_fee_rule", entityId: rule.id, metadata: data });
    revalidatePath("/settings/admin-otomatis");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteAdminFeeRule(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("settings.adminFee");
    const existing = await prisma.adminFeeRule.findUnique({ where: { id } });
    if (!existing) throw new Error("Aturan tidak ditemukan");
    await prisma.adminFeeRule.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: existing.outletId, action: "delete", entity: "admin_fee_rule", entityId: id });
    revalidatePath("/settings/admin-otomatis");
  } catch (error) {
    handleActionError(error);
  }
}
