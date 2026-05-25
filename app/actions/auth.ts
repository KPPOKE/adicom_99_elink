"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Login tidak valid" };

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || headerStore.get("x-real-ip") || "unknown";
  const rateKey = `login:${ip}:${parsed.data.email.toLowerCase()}`;
  const rate = checkRateLimit(rateKey, 20, 15 * 60 * 1000);
  if (!rate.allowed) {
    void writeAuditLog({
      userEmail: parsed.data.email,
      action: "login_rate_limited",
      entity: "auth",
      metadata: { ip, retryAfter: rate.retryAfter }
  });
    return { error: `Terlalu banyak percobaan login. Coba lagi dalam ${rate.retryAfter} detik.` };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { role: true }
  });
  if (!user) {
    void writeAuditLog({ userEmail: parsed.data.email, action: "login_failed", entity: "auth", metadata: { ip } });
    return { error: "Email atau password salah" };
  }

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    void writeAuditLog({ userId: user.id, userEmail: user.email, action: "login_failed", entity: "auth", metadata: { ip } });
    return { error: "Email atau password salah" };
  }

  resetRateLimit(rateKey);
  await setSession(user.id, user.role.name);
  void writeAuditLog({ userId: user.id, userEmail: user.email, action: "login_success", entity: "auth", metadata: { ip } });
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
