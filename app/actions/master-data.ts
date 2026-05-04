"use server";

import { revalidatePath } from "next/cache";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { categorySchema, customerSchema, itemSchema, supplierSchema } from "@/lib/validators";

function cleanNullable(value: unknown) {
  if (value === "" || value === "0" || value === 0) return null;
  return value;
}

async function saveUpload(file: File | null) {
  if (!file || file.size === 0) return undefined;
  const bytes = await file.arrayBuffer();
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(bytes));
  return `/uploads/${filename}`;
}

export async function upsertCategory(formData: FormData) {
  await requireUser();
  const parsed = categorySchema.parse(Object.fromEntries(formData));
  const data = { name: parsed.name, description: parsed.description || null };
  if (parsed.id) await prisma.category.update({ where: { id: parsed.id }, data });
  else await prisma.category.create({ data });
  revalidatePath("/categories");
}

export async function deleteCategory(id: number) {
  await requireUser();
  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
}

export async function upsertSupplier(formData: FormData) {
  await requireUser();
  const parsed = supplierSchema.parse(Object.fromEntries(formData));
  const data = {
    name: parsed.name,
    phone: parsed.phone || null,
    address: parsed.address || null,
    note: parsed.note || null
  };
  if (parsed.id) await prisma.supplier.update({ where: { id: parsed.id }, data });
  else await prisma.supplier.create({ data });
  revalidatePath("/suppliers");
}

export async function deleteSupplier(id: number) {
  await requireUser();
  await prisma.supplier.delete({ where: { id } });
  revalidatePath("/suppliers");
}

export async function upsertCustomer(formData: FormData) {
  await requireUser();
  const parsed = customerSchema.parse(Object.fromEntries(formData));
  const data = {
    name: parsed.name,
    phone: parsed.phone || null,
    email: parsed.email || null,
    address: parsed.address || null
  };
  if (parsed.id) await prisma.customer.update({ where: { id: parsed.id }, data });
  else await prisma.customer.create({ data });
  revalidatePath("/customers");
}

export async function deleteCustomer(id: number) {
  await requireUser();
  await prisma.customer.delete({ where: { id } });
  revalidatePath("/customers");
}

export async function upsertItem(formData: FormData) {
  await requireUser();
  const image = await saveUpload(formData.get("image") as File | null);
  const values = Object.fromEntries(formData);
  delete values.image;
  const parsed = itemSchema.parse({
    ...values,
    supplierId: cleanNullable(values.supplierId),
    gambar: image || values.gambar || undefined
  });

  const data = {
    namaBarang: parsed.namaBarang,
    kodeBarang: parsed.kodeBarang,
    categoryId: parsed.categoryId,
    gambar: parsed.gambar || null,
    hargaModal: parsed.hargaModal,
    hargaJual: parsed.hargaJual,
    stok: parsed.stok,
    stokMinimum: parsed.stokMinimum,
    satuan: parsed.satuan,
    supplierId: parsed.supplierId,
    deskripsi: parsed.deskripsi || null
  };
  if (parsed.id) await prisma.item.update({ where: { id: parsed.id }, data });
  else await prisma.item.create({ data });
  revalidatePath("/inventory");
  revalidatePath("/dashboard");
}

export async function deleteItem(id: number) {
  await requireUser();
  await prisma.item.delete({ where: { id } });
  revalidatePath("/inventory");
}
