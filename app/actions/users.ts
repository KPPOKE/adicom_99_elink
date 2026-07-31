"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/permission-keys";
import { userSchema } from "@/lib/validators";
import { handleActionError } from "@/lib/errors";
import { assertTrustedOrigin } from "@/lib/security";

const validPermissions = new Set<string>(PERMISSIONS.map((item) => item.key));

export async function upsertUser(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const current = await requireAdmin();
    const parsed = userSchema.parse(Object.fromEntries(formData));
    const role = await prisma.role.findUniqueOrThrow({ where: { name: parsed.role } });
    if (parsed.outletId) {
      const outlet = await prisma.outlet.findUnique({ where: { id: parsed.outletId }, select: { id: true } });
      if (!outlet) throw new Error("Cabang tidak ditemukan");
    }
    const data = {
      name: parsed.name,
      email: parsed.email,
      roleId: role.id,
      outletId: parsed.outletId || null,
      ...(parsed.password ? { passwordHash: await hash(parsed.password, 10) } : {})
    };
    const permissions = formData.getAll("permissions").map(String).filter((key) => validPermissions.has(key));

    await prisma.$transaction(async (tx) => {
      const existing = parsed.id ? await tx.user.findUnique({ where: { id: parsed.id }, include: { role: true, permissions: true } }) : null;
      if (parsed.id && !existing) throw new Error("User tidak ditemukan");
      const target = parsed.id ? await tx.user.update({ where: { id: parsed.id }, data }) : await tx.user.create({ data: data as typeof data & { passwordHash: string } });
      await tx.userPermission.deleteMany({ where: { userId: target.id } });
      if (parsed.role === "staff" && permissions.length) {
        await tx.userPermission.createMany({ data: permissions.map((key) => ({ userId: target.id, key })), skipDuplicates: true });
      }
      await tx.auditLog.create({
        data: {
          userId: current.id,
          userEmail: current.email,
          outletId: target.outletId,
          action: existing ? "update" : "create",
          entity: "user",
          entityId: target.id,
          metadata: {
            targetEmail: target.email,
            passwordChanged: Boolean(parsed.password),
            before: existing ? { name: existing.name, email: existing.email, role: existing.role.name, outletId: existing.outletId, permissions: existing.permissions.map((item) => item.key) } : {},
            after: { name: target.name, email: target.email, role: parsed.role, outletId: target.outletId, permissions: parsed.role === "staff" ? permissions : [] }
          }
        }
      });
    });
    revalidatePath("/settings/access");
    revalidatePath("/", "layout");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteUser(id: number) {
  try {
    await assertTrustedOrigin();
    const current = await requireAdmin();
    if (current.id === id) throw new Error("User yang sedang login tidak bisa dihapus");
    const target = await prisma.user.findUnique({ where: { id }, include: { role: true, permissions: true, _count: { select: { transactions: true, services: true, financeRecords: true, receivablesCreated: true, payrolls: true, payrollsCreated: true } } } });
    if (!target) throw new Error("User tidak ditemukan");
    const used = Object.values(target._count).reduce((sum, count) => sum + count, 0);
    if (used > 0) throw new Error("User sudah memiliki data operasional dan tidak bisa dihapus");
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          userId: current.id,
          userEmail: current.email,
          outletId: target.outletId,
          action: "delete",
          entity: "user",
          entityId: id,
          metadata: { targetEmail: target.email, role: target.role.name, outletId: target.outletId, permissions: target.permissions.map((item) => item.key) }
        }
      });
    });
    revalidatePath("/settings/access");
  } catch (error) {
    handleActionError(error);
  }
}

export async function getCurrentRoleName() {
  const user = await requireUser();
  return user.role.name;
}

