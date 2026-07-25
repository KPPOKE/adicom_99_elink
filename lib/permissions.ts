import "server-only";

import { redirect } from "next/navigation";
import { DEFAULT_STAFF_PERMISSIONS, type PermissionKey } from "@/lib/permission-keys";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type PermissionUser = Awaited<ReturnType<typeof requireUser>>;

export async function getUserPermissionKeys(user: PermissionUser) {
  if (user.role.name === "admin") return [];
  const rows = await prisma.userPermission.findMany({ where: { userId: user.id }, select: { key: true } });
  return rows.length ? rows.map((row) => row.key) : DEFAULT_STAFF_PERMISSIONS;
}

export async function requirePermission(key: PermissionKey) {
  const user = await requireUser();
  if (user.role.name === "admin") return user;
  const keys = await getUserPermissionKeys(user);
  if (!keys.includes(key)) redirect("/dashboard");
  return user;
}

export async function canCurrentUser(key: PermissionKey) {
  const user = await requireUser();
  if (user.role.name === "admin") return true;
  return (await getUserPermissionKeys(user)).includes(key);
}
