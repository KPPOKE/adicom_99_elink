"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireUser } from "@/lib/auth";
import { writeAuditLog } from "@/lib/audit";
import { assertTrustedOrigin } from "@/lib/security";
import { dateCode, toNumber } from "@/lib/utils";
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
  const parsed = transactionSchema.parse(payload);
  const itemIds = parsed.items.map((item) => item.itemId);
  const stocks = await prisma.item.findMany({ where: { id: { in: itemIds } } });
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
            where: { id: item.itemId, stok: { gte: item.qty } },
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
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { items: true, financeRecords: true }
    });
    if (!transaction) throw new Error("Transaksi tidak ditemukan");
    if (transaction.status === "Batal") throw new Error("Transaksi sudah dibatalkan");

    for (const line of transaction.items) {
      await tx.item.update({
        where: { id: line.itemId },
        data: { stok: { increment: line.qty } }
      });
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
  await prisma.$transaction(async (tx) => {
    const transaction = await tx.transaction.findUnique({
      where: { id },
      include: { financeRecords: true }
    });
    if (!transaction) throw new Error("Transaksi tidak ditemukan");
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

export async function upsertService(formData: FormData) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const parsed = serviceSchema.parse(Object.fromEntries(formData));

  if (parsed.id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.service.findUniqueOrThrow({ where: { id: parsed.id } });
      const isBatal = parsed.status === "Batal";
      const paymentStatusToSet = isBatal ? "unpaid" : existing.paymentStatus;
      const paidAtToSet = isBatal ? null : existing.paidAt;

      await tx.service.update({
        where: { id: parsed.id },
        data: {
          ...parsed,
          customerId: parsed.customerId || null,
          paymentStatus: paymentStatusToSet,
          paidAt: paidAtToSet,
          completedDate: ["Selesai", "Diambil"].includes(parsed.status) ? existing.completedDate ?? new Date() : undefined,
          pickedUpDate: parsed.status === "Diambil" ? existing.pickedUpDate ?? new Date() : undefined
        }
      });

      if (isBatal) {
        await tx.financeRecord.deleteMany({
          where: { serviceId: parsed.id }
        });
      } else if (existing.paymentStatus === "paid") {
        await tx.financeRecord.updateMany({
          where: { serviceId: parsed.id, type: "income" },
          data: {
            amount: parsed.finalCost,
            description: `Service ${existing.kodeService}`
          }
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          action: "update",
          entity: "service",
          entityId: parsed.id,
          metadata: { kodeService: existing.kodeService, status: parsed.status }
        }
      });
    });
  } else {
    let created = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const kodeService = await nextCode("SRV", "service");
      try {
        await prisma.$transaction(async (tx) => {
          const service = await tx.service.create({
            data: {
              ...parsed,
              kodeService,
              customerId: parsed.customerId || null,
              userId: user.id,
              completedDate: ["Selesai", "Diambil"].includes(parsed.status) ? new Date() : null,
              pickedUpDate: parsed.status === "Diambil" ? new Date() : null
            }
          });
          await tx.auditLog.create({
            data: {
              userId: user.id,
              userEmail: user.email,
              action: "create",
              entity: "service",
              entityId: service.id,
              metadata: { kodeService, status: service.status }
            }
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

  revalidatePath("/services");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function markServicePaid(id: number) {
  await assertTrustedOrigin();
  const user = await requireUser();
  await prisma.$transaction(async (tx) => {
    const service = await tx.service.findUnique({
      where: { id },
      include: { financeRecords: true }
    });
    if (!service) throw new Error("Service tidak ditemukan");
    if (service.paymentStatus === "paid") throw new Error("Service sudah dibayar");
    if (toNumber(service.finalCost) <= 0) throw new Error("Biaya final wajib diisi sebelum pembayaran");
    const hasIncomeRecord = service.financeRecords.some((record) => record.type === "income");

    await tx.service.update({
      where: { id },
      data: { paymentStatus: "paid", paidAt: new Date() }
    });
    if (!hasIncomeRecord) {
      await tx.financeRecord.create({
        data: {
          type: "income",
          category: "Service",
          amount: service.finalCost,
          description: `Service ${service.kodeService}`,
          referenceType: "service",
          referenceId: service.id,
          serviceId: service.id,
          userId: user.id
        }
      });
    }
    await tx.auditLog.create({
      data: {
        userId: user.id,
        userEmail: user.email,
        action: "mark_paid",
        entity: "service",
        entityId: id,
        metadata: { kodeService: service.kodeService, finalCost: toNumber(service.finalCost) }
      }
    });
  });
  revalidatePath("/services");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function updateServiceStatus(id: number, status: string) {
  await assertTrustedOrigin();
  await requireUser();
  const form = new FormData();
  const service = await prisma.service.findUniqueOrThrow({ where: { id } });
  Object.entries({
    id,
    customerId: service.customerId ?? "",
    customerName: service.customerName,
    customerPhone: service.customerPhone ?? "",
    deviceType: service.deviceType,
    deviceBrand: service.deviceBrand ?? "",
    deviceModel: service.deviceModel ?? "",
    problemDescription: service.problemDescription,
    diagnosis: service.diagnosis ?? "",
    estimatedCost: toNumber(service.estimatedCost),
    finalCost: toNumber(service.finalCost),
    status,
    technicianNote: service.technicianNote ?? ""
  }).forEach(([key, value]) => form.set(key, String(value)));
  await upsertService(form);
}

export async function deleteService(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    const recordCount = await prisma.financeRecord.count({ where: { serviceId: id } });
    if (recordCount > 0) throw new Error("Service sudah memiliki catatan keuangan dan tidak bisa dihapus");
    const service = await prisma.service.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "service", entityId: id, metadata: { kodeService: service.kodeService } });
    revalidatePath("/services");
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertFinanceRecord(formData: FormData) {
  await assertTrustedOrigin();
  const parsed = financeSchema.parse(Object.fromEntries(formData));
  const user = await requireAdmin();
  const data: Prisma.FinanceRecordUncheckedCreateInput = {
    type: parsed.type,
    category: parsed.category,
    amount: parsed.amount,
    description: parsed.description || null,
    date: parsed.date,
    referenceType: "manual",
    userId: user.id
  };
  if (parsed.id) await prisma.financeRecord.update({ where: { id: parsed.id }, data });
  else await prisma.financeRecord.create({ data });
  await writeAuditLog({ userId: user.id, userEmail: user.email, action: parsed.id ? "update" : "create", entity: "finance_record", entityId: parsed.id ?? null });
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function deleteFinanceRecord(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requireAdmin();
    await prisma.financeRecord.delete({ where: { id } });
    await writeAuditLog({ userId: user.id, userEmail: user.email, action: "delete", entity: "finance_record", entityId: id });
    revalidatePath("/finance");
  } catch (error) {
    handleActionError(error);
  }
}
