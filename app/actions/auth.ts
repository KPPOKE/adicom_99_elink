"use server";

import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import { clearSession, setSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function loginAction(_: unknown, formData: FormData) {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Login tidak valid" };

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    include: { role: true }
  });
  if (!user) return { error: "Email atau password salah" };

  const valid = await compare(parsed.data.password, user.passwordHash);
  if (!valid) return { error: "Email atau password salah" };

  await setSession(user.id, user.role.name);
  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}
