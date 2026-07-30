"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { outletSchema } from "@/lib/validators";
import { assertTrustedOrigin } from "@/lib/security";
import { handleActionError } from "@/lib/errors";

const COOKIE_NAME = "pospintar_outlet";
const defaultFunds = [
  { name: "LACI", type: "Cash" as const, note: "Kas tunai outlet" },
  { name: "BRI", type: "Bank" as const, note: "Rekening operasional" },
  { name: "SEABANK", type: "Bank" as const, note: "Saldo bank SEABANK" },
  { name: "DANA", type: "Ewallet" as const, note: "Saldo e-wallet" }
];

export async function setActiveOutletAction(formData: FormData) {
  await requireAdmin();
  const outletValue = String(formData.get("outletId") ?? "");
  const store = await cookies();
  if (outletValue === "all") {
    store.set(COOKIE_NAME, "all", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
    revalidatePath("/", "layout");
    return;
  }
  const outletId = Number(outletValue);
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true } });
  if (!outlet) throw new Error("Outlet tidak ditemukan");
  store.set(COOKIE_NAME, String(outlet.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}

export async function openOutletBankTransfersAction(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const outletId = Number(formData.get("outletId"));
  if (!Number.isInteger(outletId) || outletId < 1) throw new Error("Cabang tidak valid");
  if (user.role.name === "staff") {
    if (user.outletId !== outletId) throw new Error("Cabang tidak dapat diakses");
  } else {
    const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true } });
    if (!outlet) throw new Error("Cabang tidak ditemukan");
    const store = await cookies();
    store.set(COOKIE_NAME, String(outlet.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  }
  redirect("/bank-transfers");
}
export async function upsertOutlet(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const parsed = outletSchema.parse(Object.fromEntries(formData));
    const data = { code: parsed.code.toUpperCase(), name: parsed.name, address: parsed.address || null };
    await prisma.$transaction(async (tx) => {
      if (parsed.id) {
        const existing = await tx.outlet.findUnique({ where: { id: parsed.id } });
        if (!existing) throw new Error("Cabang tidak ditemukan");
        const outlet = await tx.outlet.update({ where: { id: parsed.id }, data });
        await tx.auditLog.create({
          data: {
            userId: user.id,
            userEmail: user.email,
            outletId: outlet.id,
            action: "update",
            entity: "outlet",
            entityId: outlet.id,
            metadata: { before: { code: existing.code, name: existing.name, address: existing.address }, after: { code: outlet.code, name: outlet.name, address: outlet.address } }
          }
        });
      } else {
        const outlet = await tx.outlet.create({ data });
        await tx.fundAccount.createMany({ data: defaultFunds.map((fund) => ({ outletId: outlet.id, ...fund })) });
        await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: outlet.id, action: "create", entity: "outlet", entityId: outlet.id, metadata: { code: outlet.code, name: outlet.name } } });
      }
    });
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
    const outlet = await prisma.outlet.findUnique({
      where: { id },
      include: { _count: { select: { users: true, items: true, transactions: true, services: true, financeRecords: true, bankTransfers: true, fundAccounts: true } } }
    });
    if (!outlet) throw new Error("Cabang tidak ditemukan");
    const used = Object.values(outlet._count).some((value) => value > 0);
    if (used) throw new Error("Cabang sudah memiliki data dan tidak bisa dihapus");
    await prisma.$transaction(async (tx) => {
      await tx.outlet.delete({ where: { id } });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: id, action: "delete", entity: "outlet", entityId: id, metadata: { code: outlet.code, name: outlet.name } } });
    });
    revalidatePath("/settings");
    revalidatePath("/", "layout");
  } catch (error) {
    handleActionError(error);
  }
}
