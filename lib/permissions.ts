import "server-only";

import { redirect } from "next/navigation";
import { hasPermission, type PermissionKey } from "@/lib/permission-keys";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PermissionUser = Awaited<ReturnType<typeof requireUser>>;

export async function getUserPermissionKeys(user: PermissionUser) {
  if (user.role.name === "admin") return [];
  const rows = await prisma.userPermission.findMany({ where: { userId: user.id }, select: { key: true } });
  return rows.map((row) => row.key);
}

export async function requirePermission(key: PermissionKey) {
  const user = await requireUser();
  const keys = await getUserPermissionKeys(user);
  if (!hasPermission(user.role.name, keys, key)) redirect("/dashboard");
  return user;
}

export async function canCurrentUser(key: PermissionKey) {
  const user = await requireUser();
  const keys = await getUserPermissionKeys(user);
  return hasPermission(user.role.name, keys, key);
}

export async function requireProfitAccess() {
  const user = await requireUser();
  if (user.role.name === "admin") return user;
  const keys = await getUserPermissionKeys(user);
  if (
    !keys.includes("dashboard.viewProfit") &&
    !keys.includes("dashboard.annualReport") &&
    !keys.includes("dashboard.monthlyReport")
  ) {
    redirect("/dashboard");
  }
  return user;
}
