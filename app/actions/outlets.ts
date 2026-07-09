"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pospintar_outlet";

export async function setActiveOutletAction(formData: FormData) {
  await requireAdmin();
  const outletId = Number(formData.get("outletId"));
  const outlet = await prisma.outlet.findUnique({ where: { id: outletId }, select: { id: true } });
  if (!outlet) throw new Error("Outlet tidak ditemukan");
  const store = await cookies();
  store.set(COOKIE_NAME, String(outlet.id), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  revalidatePath("/", "layout");
}
