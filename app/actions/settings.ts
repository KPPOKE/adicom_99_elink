"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

async function saveUpload(file: File | null) {
  if (!file || file.size === 0) return undefined;
  const bytes = await file.arrayBuffer();
  const ext = path.extname(file.name) || ".png";
  const filename = `logo-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(bytes));
  return `/uploads/${filename}`;
}

export async function updateSettings(formData: FormData) {
  await requireUser();
  const logo = await saveUpload(formData.get("logoFile") as File | null);
  const id = Number(formData.get("id"));
  const data = {
    storeName: String(formData.get("storeName") || "Adicom99"),
    logo: logo || String(formData.get("logo") || "") || null,
    address: String(formData.get("address") || "") || null,
    whatsapp: String(formData.get("whatsapp") || "") || null,
    email: String(formData.get("email") || "") || null,
    invoicePrefix: String(formData.get("invoicePrefix") || "INV"),
    invoiceFooter: String(formData.get("invoiceFooter") || "") || null,
    defaultPrintFormat: String(formData.get("defaultPrintFormat") || "thermal_80")
  };
  if (id) await prisma.setting.update({ where: { id }, data });
  else await prisma.setting.create({ data });
  revalidatePath("/settings");
}
