import "server-only";

import { redirect } from "next/navigation";
import type { PermissionKey } from "@/lib/permission-keys";
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
  if (user.role.name === "admin" || key === "dashboard.view") return user;
  const keys = await getUserPermissionKeys(user);
  if (!keys.includes(key)) redirect("/dashboard");
  return user;
}

export async function canCurrentUser(key: PermissionKey) {
  const user = await requireUser();
  if (user.role.name === "admin" || key === "dashboard.view") return true;
  return (await getUserPermissionKeys(user)).includes(key);
}

export async function requireProfitAccess() {
  const user = await requireUser();
  if (user.role.name !== "admin") redirect("/dashboard");
  return user;
}
