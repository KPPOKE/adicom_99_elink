"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { categorySchema, customerSchema, itemSchema, supplierSchema } from "@/lib/validators";
import { handleActionError } from "@/lib/errors";
import { assertTrustedOrigin } from "@/lib/security";
import { deletePublicUpload, saveImageUpload } from "@/lib/upload";

function cleanNullable(value: unknown) {
  if (value === "" || value === "0" || value === 0) return null;
  return value;
}

export async function upsertCategory(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const parsed = categorySchema.parse(Object.fromEntries(formData));
    const data = { name: parsed.name, description: parsed.description || null };
    if (parsed.id) await prisma.category.update({ where: { id: parsed.id }, data });
    else await prisma.category.create({ data });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "category", entityId: parsed.id ?? null });
    revalidatePath("/categories");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteCategory(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    await prisma.category.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "category", entityId: id });
    revalidatePath("/categories");
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertSupplier(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const parsed = supplierSchema.parse(Object.fromEntries(formData));
    const data = {
      name: parsed.name,
      phone: parsed.phone || null,
      address: parsed.address || null,
      note: parsed.note || null
    };
    if (parsed.id) await prisma.supplier.update({ where: { id: parsed.id }, data });
    else await prisma.supplier.create({ data });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "supplier", entityId: parsed.id ?? null });
    revalidatePath("/suppliers");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteSupplier(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    await prisma.supplier.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "supplier", entityId: id });
    revalidatePath("/suppliers");
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertCustomer(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireUser();
    const parsed = customerSchema.parse(Object.fromEntries(formData));
    const data = {
      name: parsed.name,
      phone: parsed.phone || null,
      email: parsed.email || null,
      address: parsed.address || null
    };
    if (parsed.id) await prisma.customer.update({ where: { id: parsed.id }, data });
    else await prisma.customer.create({ data });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "customer", entityId: parsed.id ?? null });
    revalidatePath("/customers");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteCustomer(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    await prisma.customer.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "customer", entityId: id });
    revalidatePath("/customers");
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertItem(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const image = await saveImageUpload(formData.get("image") as File | null, "item");
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
    if (image) await deletePublicUpload(typeof values.gambar === "string" ? values.gambar : null);
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "item", entityId: parsed.id ?? null });
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteItem(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const item = await prisma.item.delete({ where: { id } });
    await deletePublicUpload(item.gambar);
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "item", entityId: id });
    revalidatePath("/inventory");
  } catch (error) {
    handleActionError(error);
  }
}
