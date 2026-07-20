"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { outletSchema } from "@/lib/validators";
import { assertTrustedOrigin } from "@/lib/security";
import { handleActionError } from "@/lib/errors";

const COOKIE_NAME = "pospintar_outlet";
const defaultFunds = [
  { name: "LACI", type: "Cash" as const, note: "Kas tunai outlet" },
  { name: "BRI", type: "Bank" as const, note: "Rekening operasional" },
  { name: "DANA", type: "Ewallet" as const, note: "Saldo e-wallet" }
];

export async function setActiveOutletAction(formData: FormData) {
  await requireAdmin();
  const outletId = Number(formData.get("outletId"));
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true } });
  if (!outlet) throw new Error("Outlet tidak ditemukan");
  const store = await cookies();
  store.set(COOKIE_NAME, String(outlet.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}

export async function upsertOutlet(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const parsed = outletSchema.parse(Object.fromEntries(formData));
    const data = { code: parsed.code.toUpperCase(), name: parsed.name, address: parsed.address || null };
    if (parsed.id) {
      await prisma.outlet.update({ where: { id: parsed.id }, data });
    } else {
      await prisma.$transaction(async (tx) => {
        const outlet = await tx.outlet.create({ data });
        await tx.fundAccount.createMany({ data: defaultFunds.map((fund) => ({ outletId: outlet.id, ...fund })) });
        await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "create", entity: "outlet", entityId: outlet.id } });
      });
    }
    revalidatePath("/settings");
    revalidatePath("/", "layout");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteOutlet(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const count = await prisma.outlet.count();
    if (count <= 1) throw new Error("Minimal harus ada satu cabang aktif");
    const usage = await prisma.outlet.findUnique({
      where: { id },
      select: { _count: { select: { users: true, items: true, transactions: true, services: true, financeRecords: true, bankTransfers: true, fundAccounts: true } } }
    });
    if (!usage) throw new Error("Outlet tidak ditemukan");
    const used = Object.values(usage._count).some((value) => value > 0);
    if (used) throw new Error("Cabang sudah memiliki data dan tidak bisa dihapus");
    await prisma.outlet.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "delete", entity: "outlet", entityId: id } });
    revalidatePath("/settings");
    revalidatePath("/", "layout");
  } catch (error) {
    handleActionError(error);
  }
}
