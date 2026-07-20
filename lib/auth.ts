import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "pospintar_session";
const DAY = 24 * 60 * 60 * 1000;
const SHORT_SESSION = 12 * 60 * 60 * 1000;
const REMEMBER_SESSION = 30 * DAY;

type SessionPayload = {
  userId: number;
  role: "admin" | "staff";
  exp: number;
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (value && value.length >= 32) return value;
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET minimal 32 karakter wajib diset untuk production");
  }
  return "dev-secret-change-me-for-production-32";
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createSessionToken(payload: Omit<SessionPayload, "exp">, ttlMs = SHORT_SESSION) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + ttlMs })).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function verifySessionToken(token?: string): SessionPayload | null {
  try {
    if (!token) return null;
    const [body, signature] = token.split(".");
    if (!body || !signature) return null;
    const expected = sign(body);
    const valid =
      expected.length === signature.length &&
      timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    if (!valid) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.userId || !["admin", "staff"].includes(payload.role) || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSession(userId: number, role: "admin" | "staff", remember = false) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, createSessionToken({ userId, role }, remember ? REMEMBER_SESSION : SHORT_SESSION), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(remember ? { maxAge: Math.floor(REMEMBER_SESSION / 1000) } : {})
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(COOKIE_NAME)?.value);
}

export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({
    where: { id: session.userId },
    include: { role: true }
  });
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Array<"admin" | "staff">) {
  const user = await requireUser();
  if (!roles.includes(user.role.name)) redirect("/dashboard");
  return user;
}

export async function requireAdmin() {
  return requireRole(["admin"]);
}
