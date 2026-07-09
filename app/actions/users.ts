"use server";

import { hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { userSchema } from "@/lib/validators";
import { handleActionError } from "@/lib/errors";

export async function upsertUser(formData: FormData) {
  try {
    await requireAdmin();
    const parsed = userSchema.parse(Object.fromEntries(formData));
    const role = await prisma.role.findUniqueOrThrow({ where: { name: parsed.role } });
    const data = {
      name: parsed.name,
      email: parsed.email,
      roleId: role.id,
      outletId: parsed.outletId || null,
      ...(parsed.password ? { passwordHash: await hash(parsed.password, 10) } : {})
    };

    if (parsed.id) await prisma.user.update({ where: { id: parsed.id }, data });
    else await prisma.user.create({ data: data as typeof data & { passwordHash: string } });
    revalidatePath("/settings");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteUser(id: number) {
  try {
    const current = await requireAdmin();
    if (current.id === id) throw new Error("User yang sedang login tidak bisa dihapus");
    const usage = await prisma.user.findUnique({
      where: { id },
      select: {
        _count: {
          select: { transactions: true, services: true, financeRecords: true }
        }
      }
    });
    if (!usage) throw new Error("User tidak ditemukan");
    const used = usage._count.transactions + usage._count.services + usage._count.financeRecords;
    if (used > 0) throw new Error("User sudah dipakai di transaksi/service/keuangan dan tidak bisa dihapus");
    await prisma.user.delete({ where: { id } });
    revalidatePath("/settings");
  } catch (error) {
    handleActionError(error);
  }
}

export async function getCurrentRoleName() {
  const user = await requireUser();
  return user.role.name;
}
