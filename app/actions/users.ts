"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { PERMISSION_DEPENDENCIES, PERMISSIONS, type PermissionKey } from "@/lib/permission-keys";
import { userSchema } from "@/lib/validators";
import { handleActionError } from "@/lib/errors";
import { assertTrustedOrigin } from "@/lib/security";

const validPermissions = new Set<string>(PERMISSIONS.map((item) => item.key));
function normalizePermissions(values: string[]) {
  const permissions = new Set(values.filter((key) => validPermissions.has(key)));
  permissions.add("dashboard.view");
  for (const key of permissions) {
    const dependency = PERMISSION_DEPENDENCIES[key as PermissionKey];
    if (dependency) permissions.add(dependency);
  }
  return [...permissions];
}


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
      isActive: parsed.isActive,
      ...(parsed.password ? { passwordHash: await hash(parsed.password, 10) } : {})
    };
    const permissions = normalizePermissions(formData.getAll("permissions").map(String));

    await prisma.$transaction(async (tx) => {
      const existing = parsed.id ? await tx.user.findUnique({ where: { id: parsed.id }, include: { role: true, permissions: true } }) : null;
      if (parsed.id && !existing) throw new Error("User tidak ditemukan");
      if (existing && existing.id === current.id && (parsed.role !== "admin" || !parsed.isActive)) {
        throw new Error("Admin yang sedang login tidak dapat menonaktifkan atau menurunkan perannya sendiri");
      }
      if (existing?.role.name === "admin" && existing.isActive && (parsed.role !== "admin" || !parsed.isActive)) {
        const otherAdmins = await tx.user.count({ where: { id: { not: existing.id }, isActive: true, role: { name: "admin" } } });
        if (otherAdmins === 0) throw new Error("Minimal harus ada satu admin aktif");
      }
      const previousPermissions = existing?.permissions.map((item) => item.key).sort() ?? [];
      const securityChanged = Boolean(existing) && (Boolean(parsed.password) || existing!.role.name !== parsed.role || existing!.outletId !== (parsed.outletId || null) || existing!.isActive !== parsed.isActive || previousPermissions.join("|") !== [...permissions].sort().join("|"));
      const target = parsed.id ? await tx.user.update({ where: { id: parsed.id }, data: { ...data, ...(securityChanged ? { sessionVersion: { increment: 1 } } : {}) } }) : await tx.user.create({ data: data as typeof data & { passwordHash: string } });
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
            before: existing ? { name: existing.name, email: existing.email, role: existing.role.name, outletId: existing.outletId, isActive: existing.isActive, permissions: existing.permissions.map((item) => item.key) } : {},
            after: { name: target.name, email: target.email, role: parsed.role, outletId: target.outletId, isActive: target.isActive, permissions: parsed.role === "staff" ? permissions : [] }
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
    if (target.role.name === "admin" && target.isActive) {
      const otherAdmins = await prisma.user.count({ where: { id: { not: target.id }, isActive: true, role: { name: "admin" } } });
      if (otherAdmins === 0) throw new Error("Admin aktif terakhir tidak dapat dihapus");
    }
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

