import "server-only";

import { cookies } from "next/headers";
import type { RoleName } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const DEFAULT_OUTLET_CODE = "ADICOM99_CIPUTAT";
const COOKIE_NAME = "pospintar_outlet";

type OutletUser = { role: { name: RoleName }; outletId: number | null };

export async function outletCookie() {
  const store = await cookies();
  const value = store.get(COOKIE_NAME)?.value;
  if (value === "all") return "all" as const;
  return Number(value) || null;
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
  const requestedId = requested === "all" ? null : requested;
  const activeOutlet = outlets.find((item) => item.id === requestedId) ?? outlets.find((item) => item.id === user.outletId) ?? outlets[0];
  return { activeOutlet, outlets };
}

export async function dashboardOutletContext(user: OutletUser) {
  const context = await outletContext(user);
  const requested = await outletCookie();
  return user.role.name === "admin" && requested === "all"
    ? { ...context, mode: "all" as const, outletLabel: "Semua Cabang" }
    : { ...context, mode: "single" as const, outletLabel: context.activeOutlet.name };
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
