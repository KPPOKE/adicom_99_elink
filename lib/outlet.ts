import "server-only";

import { cookies } from "next/headers";
import type { RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_OUTLET_CODE = "ADICOM99_CIPUTAT";
const COOKIE_NAME = "pospintar_outlet";

type OutletUser = { role: { name: RoleName }; outletId: number | null };

export async function outletCookie() {
  const store = await cookies();
  return Number(store.get(COOKIE_NAME)?.value) || null;
}

export async function outletContext(user: OutletUser) {
  const outlets = await prisma.outlet.findMany({ orderBy: { name: "asc" } });
  if (outlets.length === 0) throw new Error("Outlet belum tersedia. Jalankan migration/seed terlebih dahulu.");
  if (user.role.name !== "admin") {
    const activeOutlet = outlets.find((item) => item.id === user.outletId);
    if (!activeOutlet) throw new Error("User belum terhubung ke cabang. Hubungi admin.");
    return { activeOutlet, outlets: [activeOutlet] };
  }
  const requested = await outletCookie();
  const activeOutlet = outlets.find((item) => item.id === requested) ?? outlets.find((item) => item.id === user.outletId) ?? outlets[0];
  return { activeOutlet, outlets };
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function tomorrowOf(date: Date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  return next;
}
