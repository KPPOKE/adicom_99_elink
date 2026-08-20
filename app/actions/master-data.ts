"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { categorySchema, customerSchema, itemSchema, supplierSchema } from "@/lib/validators";
import { getActionErrorMessage } from "@/lib/errors";
import { assertTrustedOrigin } from "@/lib/security";
import { deletePublicUpload, saveImageUpload } from "@/lib/upload";
import { outletContext } from "@/lib/outlet";

function cleanNullable(value: unknown) {
  if (value === "" || value === "0" || value === 0) return null;
  return value;
}

export async function upsertCategory(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const values = Object.fromEntries(formData);
    const user = await requirePermission(values.id ? "categories.edit" : "categories.manage");
    const parsed = categorySchema.parse(values);
    const data = { name: parsed.name, description: parsed.description || null };
    if (parsed.id) await prisma.category.update({ where: { id: parsed.id }, data });
    else await prisma.category.create({ data });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "category", entityId: parsed.id ?? null });
    revalidatePath("/categories");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function deleteCategory(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("categories.delete");
    await prisma.category.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "category", entityId: id });
    revalidatePath("/categories");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function upsertSupplier(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const values = Object.fromEntries(formData);
    const user = await requirePermission(values.id ? "suppliers.edit" : "suppliers.manage");
    const parsed = supplierSchema.parse(values);
    const data = { name: parsed.name, phone: parsed.phone || null, address: parsed.address || null, note: parsed.note || null };
    if (parsed.id) await prisma.supplier.update({ where: { id: parsed.id }, data });
    else await prisma.supplier.create({ data });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "supplier", entityId: parsed.id ?? null });
    revalidatePath("/suppliers");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function deleteSupplier(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("suppliers.delete");
    await prisma.supplier.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "supplier", entityId: id });
    revalidatePath("/suppliers");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function upsertCustomer(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const values = Object.fromEntries(formData);
    const user = await requirePermission(values.id ? "customers.edit" : "customers.manage");
    const { activeOutlet } = await outletContext(user);
    const parsed = customerSchema.parse(values);
    const data = { name: parsed.name, phone: parsed.phone || null, email: parsed.email || null, address: parsed.address || null };
    const existing = parsed.id ? await prisma.customerOutlet.findUnique({ where: { customerId_outletId: { customerId: parsed.id, outletId: activeOutlet.id } } }) : null;
    if (parsed.id && !existing) throw new Error("Pelanggan tidak ditemukan di cabang aktif");
    const customer = parsed.id
      ? await prisma.customer.update({ where: { id: parsed.id }, data })
      : await prisma.customer.create({ data: { ...data, outlets: { create: { outletId: activeOutlet.id } } } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: parsed.id ? "update" : "create", entity: "customer", entityId: customer.id });
    revalidatePath("/customers");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function deleteCustomer(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("customers.delete");
    const { activeOutlet } = await outletContext(user);
    const customer = await prisma.customer.findFirst({ where: { id, outlets: { some: { outletId: activeOutlet.id } } }, include: { _count: { select: { outlets: true } } } });
    if (!customer) return { success: false as const, error: "Pelanggan tidak ditemukan di cabang aktif" };
    await prisma.$transaction(async (tx) => {
      if (customer._count.outlets > 1) await tx.customerOutlet.delete({ where: { customerId_outletId: { customerId: id, outletId: activeOutlet.id } } });
      else await tx.customer.delete({ where: { id } });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "delete", entity: "customer", entityId: id } });
    });
    revalidatePath("/customers");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function upsertItem(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const values = Object.fromEntries(formData);
    const isEditing = Boolean(values.id);
    const user = await requirePermission(isEditing ? "inventory.edit" : "inventory.manage");
    const { activeOutlet } = await outletContext(user);
    const image = await saveImageUpload(formData.get("image") as File | null, "item");
    delete values.image;
    const parsed = itemSchema.parse({ ...values, supplierId: cleanNullable(values.supplierId), gambar: image || values.gambar || undefined });
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
      outletId: activeOutlet.id,
      deskripsi: parsed.deskripsi || null
    };
    const existing = parsed.id ? await prisma.item.findUnique({ where: { id: parsed.id } }) : null;
    if (parsed.id && (!existing || existing.outletId !== activeOutlet.id)) return { success: false as const, error: "Barang tidak ditemukan di cabang aktif" };
    const item = parsed.id ? await prisma.item.update({ where: { id: parsed.id }, data }) : await prisma.item.create({ data });
    if (image) await deletePublicUpload(typeof values.gambar === "string" ? values.gambar : null);
    await writeAuditLog({
      userId: user.id,
      userEmail: user.email,
      outletId: activeOutlet.id,
      action: existing ? "update" : "create",
      entity: "item",
      entityId: item.id,
      metadata: {
        before: existing ? { name: existing.namaBarang, code: existing.kodeBarang, cost: Number(existing.hargaModal), price: Number(existing.hargaJual), stock: existing.stok, minimumStock: existing.stokMinimum } : {},
        after: { name: item.namaBarang, code: item.kodeBarang, cost: Number(item.hargaModal), price: Number(item.hargaJual), stock: item.stok, minimumStock: item.stokMinimum }
      }
    });
    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function deleteItem(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("inventory.delete");
    const { activeOutlet } = await outletContext(user);
    const item = await prisma.item.findUnique({
      where: { id },
      include: { _count: { select: { transactionItems: true, serviceParts: true } } }
    });
    if (!item || item.outletId !== activeOutlet.id) return { success: false as const, error: "Barang tidak ditemukan di cabang aktif" };
    if (item._count.transactionItems > 0 || item._count.serviceParts > 0) {
      return { success: false as const, error: "Barang tidak bisa dihapus karena sudah memiliki riwayat transaksi/servis." };
    }
    await prisma.item.delete({ where: { id } });
    await deletePublicUpload(item.gambar);
    await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "delete", entity: "item", entityId: id, metadata: { name: item.namaBarang, code: item.kodeBarang, cost: Number(item.hargaModal), price: Number(item.hargaJual), stock: item.stok } });
    revalidatePath("/inventory");
    return { success: true as const };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}

export async function addStockItem(id: number, addQty: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("inventory.edit");
    const { activeOutlet } = await outletContext(user);
    if (!addQty || addQty <= 0 || !Number.isInteger(addQty)) {
      return { success: false as const, error: "Jumlah stok tambahan harus berupa angka bulat positif" };
    }
    const item = await prisma.item.findUnique({ where: { id } });
    if (!item || item.outletId !== activeOutlet.id) return { success: false as const, error: "Barang tidak ditemukan di cabang aktif" };

    const updated = await prisma.item.update({
      where: { id },
      data: { stok: { increment: addQty } }
    });

    await writeAuditLog({
      userId: user.id,
      userEmail: user.email,
      outletId: activeOutlet.id,
      action: "update_stock",
      entity: "item",
      entityId: item.id,
      metadata: {
        name: item.namaBarang,
        code: item.kodeBarang,
        previousStock: item.stok,
        addedQty: addQty,
        newStock: updated.stok
      }
    });

    revalidatePath("/inventory");
    revalidatePath("/dashboard");
    return { success: true as const, newStock: updated.stok };
  } catch (error) {
    return { success: false as const, error: getActionErrorMessage(error) };
  }
}




