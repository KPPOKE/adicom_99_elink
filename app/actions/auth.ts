"use server";

import { compare } from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { clearSession, getCurrentUser, setSession } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, resetRateLimit } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validators";

export type LoginActionState = {
  error?: string;
  fieldErrors?: {
    email?: string;
    password?: string;
  };
};

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    return {
      fieldErrors: {
        email: errors.email?.[0],
        password: errors.password?.[0]
      }
    } satisfies LoginActionState;
  }

  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwardedFor || headerStore.get("x-real-ip") || "unknown";
  const accountKey = `login:account:${parsed.data.email.toLowerCase()}`;
  const ipKey = `login:ip:${ip}`;
  const rates = [checkRateLimit(accountKey, 20, 15 * 60 * 1000), checkRateLimit(ipKey, 100, 15 * 60 * 1000)];
  const retryAfter = Math.max(...rates.map((rate) => rate.retryAfter));
  if (rates.some((rate) => !rate.allowed)) {
    await writeAuditLog({
      userEmail: parsed.data.email,
      action: "login_rate_limited",
      entity: "auth",
      metadata: { ip, retryAfter }
    });
    return { error: `Terlalu banyak percobaan login. Coba lagi dalam ${retryAfter} detik.` };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { role: true }
  });
  if (!user) {
    await writeAuditLog({ userEmail: parsed.data.email, action: "login_failed", entity: "auth", metadata: { ip } });
    return { error: "Email atau kata sandi salah" };
  }

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) {
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: user.outletId, action: "login_failed", entity: "auth", metadata: { ip } });
    return { error: "Email atau kata sandi salah" };
  }

  resetRateLimit(accountKey);
  resetRateLimit(ipKey);
  if (!user.isActive) {
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: user.outletId, action: "login_disabled", entity: "auth", metadata: { ip } });
    return { error: "Akun tidak aktif. Hubungi admin." };
  }

  await setSession(user.id, user.role.name, user.sessionVersion, parsed.data.remember);
  await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: user.outletId, action: "login_success", entity: "auth", metadata: { ip } });
  redirect("/dashboard");
}

export async function logoutAction() {
  const user = await getCurrentUser();
  if (user) await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: user.outletId, action: "logout", entity: "auth" });
  await clearSession();
  redirect("/login");
}