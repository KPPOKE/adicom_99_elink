"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { assertTrustedOrigin } from "@/lib/security";
import { dateCode, toNumber } from "@/lib/utils";
import { outletContext } from "@/lib/outlet";
import { financeSchema, serviceSchema, transactionSchema } from "@/lib/validators";
import { handleActionError } from "@/lib/errors";


async function nextCode(prefix: "TRX" | "SRV", model: "transaction" | "service") {
  const code = `${prefix}-${dateCode()}`;
  if (model === "transaction") {
    const lastRecord = await prisma.transaction.findFirst({
      where: { kodeTransaksi: { startsWith: code } },
      orderBy: { kodeTransaksi: "desc" },
      select: { kodeTransaksi: true }
    });
    const lastSeq = lastRecord ? parseInt(lastRecord.kodeTransaksi.split("-").pop() || "0", 10) : 0;
    return `${code}-${String(lastSeq + 1).padStart(3, "0")}`;
  } else {
    const lastRecord = await prisma.service.findFirst({
      where: { kodeService: { startsWith: code } },
      orderBy: { kodeService: "desc" },
      select: { kodeService: true }
    });
    const lastSeq = lastRecord ? parseInt(lastRecord.kodeService.split("-").pop() || "0", 10) : 0;
    return `${code}-${String(lastSeq + 1).padStart(3, "0")}`;
  }
}

export async function createTransaction(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const parsed = transactionSchema.parse(payload);
  const itemIds = parsed.items.map((item) => item.itemId);
  const stocks = await prisma.item.findMany({ where: { id: { in: itemIds }, outletId: activeOutlet.id } });
  for (const line of parsed.items) {
    const stock = stocks.find((item) => item.id === line.itemId);
    if (!stock) throw new Error("Barang tidak ditemukan");
    if (stock.stok < line.qty) throw new Error(`Stok ${stock.namaBarang} tidak cukup`);
    
    // Keamanan: Timpa harga dari frontend dengan harga asli dari database
    // untuk mencegah manipulasi harga dari client-side
    line.price = Number(stock.hargaJual);
  }

  const total = parsed.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const grandTotal = Math.max(0, total - parsed.diskon);

  if (parsed.paymentMethod === "Cash" && parsed.paidAmount < grandTotal) {
    throw new Error("Uang dibayar tidak boleh kurang dari grand total yang sebenarnya");
  }

  const changeAmount = parsed.paymentMethod === "Cash" ? Math.max(0, parsed.paidAmount - grandTotal) : 0;
  const status = parsed.status ?? "Berhasil";
  if (parsed.digitalStatus === "Gagal" && status === "Berhasil") {
    throw new Error("Produk digital gagal tidak bisa disimpan sebagai transaksi berhasil");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const kodeTransaksi = await nextCode("TRX", "transaction");
    try {
      await prisma.$transaction(async (tx) => {
        const transaction = await tx.transaction.create({
          data: {
            kodeTransaksi,
            customerId: parsed.customerId || null,
            customerName: parsed.customerName || null,
            total,
            diskon: parsed.diskon,
            grandTotal,
            paymentMethod: parsed.paymentMethod,
            paidAmount: parsed.paidAmount,
            changeAmount,
            nomorTujuan: parsed.nomorTujuan || null,
            provider: parsed.provider || null,
            jenisProduk: parsed.jenisProduk || null,
            serialNumber: parsed.serialNumber || null,
            digitalStatus: parsed.digitalStatus || null,
            status,
            userId: user.id,
            outletId: activeOutlet.id,
            items: {
              create: parsed.items.map((item) => ({
                itemId: item.itemId,
                qty: item.qty,
                price: item.price,
                subtotal: item.qty * item.price
              }))
            }
          }
        });

        for (const item of parsed.items) {
          const updated = await tx.item.updateMany({
            where: { id: item.itemId, outletId: activeOutlet.id, stok: { gte: item.qty } },
            data: { stok: { decrement: item.qty } }
          });
          if (updated.count !== 1) throw new Error("Stok barang tidak cukup atau sudah berubah");
          
        }

        if (status === "Berhasil") {
          await tx.financeRecord.create({
            data: {
              type: "income",
              category: "Penjualan",
              amount: grandTotal,
              description: `Transaksi ${kodeTransaksi}`,
              referenceType: "transaction",
              referenceId: transaction.id,
              transactionId: transaction.id,
              outletId: activeOutlet.id,
              userId: user.id
            }
          });
        }

        await tx.auditLog.create({
          data: {
            userId: user.id,
            userEmail: user.email,
            action: "create",
            entity: "transaction",
            entityId: transaction.id,
            metadata: { kodeTransaksi, grandTotal, status }
          }
        });
      });
      revalidatePath("/transactions");
      revalidatePath("/inventory");
      revalidatePath("/finance");
      revalidatePath("/dashboard");
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
      throw error;
    }
  }

  throw new Error("Gagal membuat kode transaksi unik");
}

export async function cancelTransaction(id: number) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { items: true, financeRecords: true }
    });
    if (!transaction || transaction.outletId !== activeOutlet.id) throw new Error("Transaksi tidak ditemukan di cabang aktif");
    if (transaction.status === "Batal") throw new Error("Transaksi sudah dibatalkan");

    for (const line of transaction.items) {
      const updated = await tx.item.updateMany({
        where: { id: line.itemId, outletId: activeOutlet.id },
        data: { stok: { increment: line.qty } }
      });
      if (updated.count !== 1) throw new Error("Barang transaksi tidak ditemukan di cabang aktif");
    }

    await tx.financeRecord.deleteMany({ where: { transactionId: id } });
    await tx.transaction.update({ where: { id }, data: { status: "Batal" } });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: "cancel",
        entity: "transaction",
        entityId: id,
        metadata: { kodeTransaksi: transaction.kodeTransaksi }
      }
    });
  });
  revalidatePath("/transactions");
  revalidatePath("/inventory");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function completePendingTransaction(id: number) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { financeRecords: true }
    });
    if (!transaction || transaction.outletId !== activeOutlet.id) throw new Error("Transaksi tidak ditemukan di cabang aktif");
    if (transaction.status === "Batal") throw new Error("Transaksi sudah dibatalkan");
    if (transaction.status === "Berhasil") throw new Error("Transaksi sudah berhasil");
    if (transaction.digitalStatus === "Gagal") throw new Error("Produk digital gagal tidak bisa diselesaikan");

    await tx.transaction.update({
      where: { id },
      data: { status: "Berhasil", digitalStatus: transaction.digitalStatus ?? "Berhasil" }
    });
    if (!transaction.financeRecords.some((record) => record.type === "income")) {
      await tx.financeRecord.create({
        data: {
          type: "income",
          category: "Penjualan",
          amount: transaction.grandTotal,
          description: `Transaksi ${transaction.kodeTransaksi}`,
          referenceType: "transaction",
          referenceId: transaction.id,
          transactionId: transaction.id,
          outletId: transaction.outletId,
          userId: user.id
        }
      });
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: "complete_pending",
        entity: "transaction",
        entityId: id,
        metadata: { kodeTransaksi: transaction.kodeTransaksi }
      }
    });
  });

  revalidatePath("/transactions");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

type ServiceStockMode = "reserved" | "consumed" | "released";
type ServicePartInput = { itemId: number; qty: number; price: number };

function serviceStockMode(status: string): ServiceStockMode {
  if (["Masuk", "Dicek", "Menunggu_Konfirmasi"].includes(status)) return "reserved";
  if (["Diproses", "Selesai", "Diambil"].includes(status)) return "consumed";
  return "released";
}

async function releaseServiceParts(tx: Prisma.TransactionClient, outletId: number, parts: Array<{ itemId: number; qty: number }>, mode: ServiceStockMode) {
  for (const part of parts) {
    if (mode === "reserved") {
      const updated = await tx.item.updateMany({
        where: { id: part.itemId, outletId, reservedStock: { gte: part.qty } },
        data: { stok: { increment: part.qty }, reservedStock: { decrement: part.qty } }
      });
      if (updated.count !== 1) throw new Error("Reservation stok sparepart tidak valid");
    } else if (mode === "consumed") {
      await tx.item.updateMany({ where: { id: part.itemId, outletId }, data: { stok: { increment: part.qty } } });
    }
  }
}

async function allocateServiceParts(tx: Prisma.TransactionClient, outletId: number, parts: ServicePartInput[], mode: ServiceStockMode) {
  if (mode === "released") return;
  for (const part of parts) {
    const data = mode === "reserved"
      ? { stok: { decrement: part.qty }, reservedStock: { increment: part.qty } }
      : { stok: { decrement: part.qty } };
    const updated = await tx.item.updateMany({
      where: { id: part.itemId, outletId, stok: { gte: part.qty } },
      data
    });
    if (updated.count !== 1) throw new Error("Stok sparepart tidak cukup atau sudah berubah");
  }
}

async function validateServiceParts(tx: Prisma.TransactionClient, outletId: number, parts: ServicePartInput[]) {
  const ids = parts.map((part) => part.itemId);
  if (new Set(ids).size !== ids.length) throw new Error("Sparepart yang sama tidak boleh dipilih dua kali");
  const items = await tx.item.findMany({ where: { id: { in: ids }, outletId }, include: { category: true } });
  if (items.length !== ids.length) throw new Error("Sparepart tidak ditemukan");
  if (items.some((item) => item.category.name === "Produk Digital")) throw new Error("Produk Digital tidak dapat digunakan sebagai sparepart");
}

function parseServiceForm(formData: FormData) {
  const raw = Object.fromEntries(formData);
  let parts: unknown = [];
  try {
    parts = JSON.parse(String(raw.parts || "[]"));
  } catch {
    throw new Error("Data sparepart tidak valid");
  }
  return serviceSchema.parse({ ...raw, parts });
}

function sameServiceParts(existing: Array<{ itemId: number; qty: number; price: Prisma.Decimal }>, next: ServicePartInput[]) {
  const normalize = (parts: Array<{ itemId: number; qty: number; price: Prisma.Decimal | number }>) =>
    parts.map((part) => ({ itemId: part.itemId, qty: part.qty, price: toNumber(part.price) })).sort((a, b) => a.itemId - b.itemId);
  return JSON.stringify(normalize(existing)) === JSON.stringify(normalize(next));
}

function revalidateServicePaths() {
  revalidatePath("/services");
  revalidatePath("/inventory");
  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function upsertService(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const parsed = parseServiceForm(formData);
  const { id, parts, ...fields } = parsed;
  const finalCost = fields.laborCost + parts.reduce((sum, part) => sum + part.qty * part.price, 0);
  const targetMode = serviceStockMode(fields.status);

  if (id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.service.findUnique({ where: { id }, include: { parts: true } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Service tidak ditemukan di cabang aktif");
      if (existing.status === "Batal") throw new Error("Service batal tidak dapat diubah");
      if (existing.paymentStatus === "paid") {
        const costsChanged = toNumber(existing.laborCost) !== fields.laborCost || !sameServiceParts(existing.parts, parts);
        if (costsChanged) throw new Error("Biaya dan sparepart service lunas tidak dapat diubah");
        if (fields.status !== existing.status && fields.status !== "Diambil") throw new Error("Service lunas hanya dapat diubah ke status Diambil");
      }

      await validateServiceParts(tx, activeOutlet.id, parts);
      await releaseServiceParts(tx, activeOutlet.id, existing.parts, serviceStockMode(existing.status));
      await allocateServiceParts(tx, activeOutlet.id, parts, targetMode);
      await tx.service.update({
        where: { id },
        data: {
          ...fields,
          customerId: fields.customerId || null,
          finalCost,
          paymentStatus: fields.status === "Batal" ? "unpaid" : existing.paymentStatus,
          paidAt: fields.status === "Batal" ? null : existing.paidAt,
          completedDate: ["Selesai", "Diambil"].includes(fields.status) ? existing.completedDate ?? new Date() : null,
          pickedUpDate: fields.status === "Diambil" ? existing.pickedUpDate ?? new Date() : null,
          parts: {
            deleteMany: {},
            create: parts.map((part) => ({ ...part, subtotal: part.qty * part.price }))
          }
        }
      });
      if (fields.status === "Batal") await tx.financeRecord.deleteMany({ where: { serviceId: id } });
      await tx.auditLog.create({
        data: { userId: user.id, userEmail: user.email, action: "update", entity: "service", entityId: id, metadata: { kodeService: existing.kodeService, status: fields.status, finalCost } }
      });
    });
  } else {
    let created = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const kodeService = await nextCode("SRV", "service");
      try {
        await prisma.$transaction(async (tx) => {
          await validateServiceParts(tx, activeOutlet.id, parts);
          await allocateServiceParts(tx, activeOutlet.id, parts, targetMode);
          const service = await tx.service.create({
            data: {
              ...fields,
              kodeService,
              customerId: fields.customerId || null,
              finalCost,
              userId: user.id,
              outletId: activeOutlet.id,
              completedDate: ["Selesai", "Diambil"].includes(fields.status) ? new Date() : null,
              pickedUpDate: fields.status === "Diambil" ? new Date() : null,
              parts: { create: parts.map((part) => ({ ...part, subtotal: part.qty * part.price })) }
            }
          });
          await tx.auditLog.create({
            data: { userId: user.id, userEmail: user.email, action: "create", entity: "service", entityId: service.id, metadata: { kodeService, status: service.status, finalCost } }
          });
        });
        created = true;
        break;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
        throw error;
      }
    }
    if (!created) throw new Error("Gagal membuat kode service unik");
  }
  revalidateServicePaths();
}

export async function markServicePaid(id: number) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  await prisma.$transaction(async (tx) => {
    const service = await tx.service.findUnique({ where: { id }, include: { financeRecords: true } });
    if (!service || service.outletId !== activeOutlet.id) throw new Error("Service tidak ditemukan di cabang aktif");
    if (service.status === "Batal") throw new Error("Service batal tidak dapat dibayar");
    if (service.paymentStatus === "paid") throw new Error("Service sudah dibayar");
    if (toNumber(service.finalCost) <= 0) throw new Error("Biaya final wajib diisi sebelum pembayaran");
    await tx.service.update({ where: { id }, data: { paymentStatus: "paid", paidAt: new Date() } });
    if (!service.financeRecords.some((record) => record.type === "income")) {
      await tx.financeRecord.create({
        data: {
          type: "income",
          category: "Service",
          amount: service.finalCost,
          description: `Service ${service.kodeService}`,
          referenceType: "service",
          referenceId: service.id,
          serviceId: service.id,
          outletId: service.outletId,
          userId: user.id
        }
      });
    }
    await tx.auditLog.create({
      data: { userId: user.id, userEmail: user.email, action: "mark_paid", entity: "service", entityId: id, metadata: { kodeService: service.kodeService, finalCost: toNumber(service.finalCost) } }
    });
  });
  revalidateServicePaths();
}

export async function updateServiceStatus(id: number, status: string) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const targetStatus = serviceSchema.shape.status.parse(status);
  await prisma.$transaction(async (tx) => {
    const service = await tx.service.findUnique({ where: { id }, include: { parts: true } });
    if (!service || service.outletId !== activeOutlet.id) throw new Error("Service tidak ditemukan di cabang aktif");
    if (service.status === "Batal") throw new Error("Service batal tidak dapat dibuka kembali");
    if (service.paymentStatus === "paid" && targetStatus !== service.status && targetStatus !== "Diambil") {
      throw new Error("Service lunas hanya dapat diubah ke status Diambil");
    }
    const currentMode = serviceStockMode(service.status);
    const targetMode = serviceStockMode(targetStatus);
    if (currentMode !== targetMode) {
      await releaseServiceParts(tx, service.outletId!, service.parts, currentMode);
      await allocateServiceParts(tx, service.outletId!, service.parts.map((part) => ({ itemId: part.itemId, qty: part.qty, price: toNumber(part.price) })), targetMode);
    }
    await tx.service.update({
      where: { id },
      data: {
        status: targetStatus,
        paymentStatus: targetStatus === "Batal" ? "unpaid" : service.paymentStatus,
        paidAt: targetStatus === "Batal" ? null : service.paidAt,
        completedDate: ["Selesai", "Diambil"].includes(targetStatus) ? service.completedDate ?? new Date() : null,
        pickedUpDate: targetStatus === "Diambil" ? service.pickedUpDate ?? new Date() : null
      }
    });
    if (targetStatus === "Batal") await tx.financeRecord.deleteMany({ where: { serviceId: id } });
    await tx.auditLog.create({
      data: { userId: user.id, userEmail: user.email, action: "update_status", entity: "service", entityId: id, metadata: { kodeService: service.kodeService, from: service.status, to: targetStatus } }
    });
  });
  revalidateServicePaths();
}

export async function deleteService(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const { activeOutlet } = await outletContext(user);
    await prisma.$transaction(async (tx) => {
      const service = await tx.service.findUnique({ where: { id }, include: { parts: true, financeRecords: true } });
      if (!service || service.outletId !== activeOutlet.id) throw new Error("Service tidak ditemukan di cabang aktif");
      if (service.financeRecords.length > 0) throw new Error("Service sudah memiliki catatan keuangan dan tidak bisa dihapus");
      await releaseServiceParts(tx, service.outletId!, service.parts, serviceStockMode(service.status));
      await tx.service.delete({ where: { id } });
      await tx.auditLog.create({
        data: { userId: user.id, userEmail: user.email, action: "delete", entity: "service", entityId: id, metadata: { kodeService: service.kodeService } }
      });
    });
    revalidateServicePaths();
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertFinanceRecord(formData: FormData) {
  await assertTrustedOrigin();
  const parsed = financeSchema.parse(Object.fromEntries(formData));
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const data: Prisma.FinanceRecordUncheckedCreateInput = {
    type: parsed.type,
    category: parsed.category,
    amount: parsed.amount,
    description: parsed.description || null,
    date: new Date(`${parsed.date}T00:00:00`),
    referenceType: "manual",
    outletId: activeOutlet.id,
    userId: user.id
  };
  if (parsed.id) {
    const existing = await prisma.financeRecord.findUnique({ where: { id: parsed.id }, select: { outletId: true, referenceType: true } });
    if (!existing || existing.outletId !== activeOutlet.id || existing.referenceType !== "manual") throw new Error("Catatan keuangan tidak ditemukan di cabang aktif");
    await prisma.financeRecord.update({ where: { id: parsed.id }, data });
  } else await prisma.financeRecord.create({ data });
  await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "finance_record", entityId: parsed.id ?? null });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function deleteFinanceRecord(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const { activeOutlet } = await outletContext(user);
    const record = await prisma.financeRecord.findUnique({ where: { id }, select: { outletId: true, referenceType: true } });
    if (!record || record.outletId !== activeOutlet.id || record.referenceType !== "manual") throw new Error("Catatan keuangan tidak ditemukan di cabang aktif");
    await prisma.financeRecord.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "finance_record", entityId: id });
    revalidatePath("/finance");
  } catch (error) {
    handleActionError(error);
  }
}
