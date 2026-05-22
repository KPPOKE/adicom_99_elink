"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { handleActionError } from "@/lib/errors";

async function saveUpload(file: File | null) {
  if (!file || file.size === 0) return undefined;
  if (!file.type.startsWith("image/")) throw new Error("File logo harus berupa gambar");
  if (file.size > 2 * 1024 * 1024) throw new Error("Ukuran logo maksimal 2MB");
  const bytes = await file.arrayBuffer();
  const ext = path.extname(file.name) || ".png";
  const filename = `logo-${Date.now()}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(bytes));
  return `/uploads/${filename}`;
}

export async function updateSettings(formData: FormData) {
  try {
    await requireAdmin();
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
  } catch (error) {
    handleActionError(error);
  }
}
