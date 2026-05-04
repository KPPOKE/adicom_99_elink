"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { dateCode, toNumber } from "@/lib/utils";
import { financeSchema, serviceSchema, transactionSchema } from "@/lib/validators";

async function nextCode(prefix: "TRX" | "SRV", model: "transaction" | "service") {
  const code = `${prefix}-${dateCode()}`;
  const count =
    model === "transaction"
      ? await prisma.transaction.count({ where: { kodeTransaksi: { startsWith: code } } })
      : await prisma.service.count({ where: { kodeService: { startsWith: code } } });
  return `${code}-${String(count + 1).padStart(3, "0")}`;
}

export async function createTransaction(payload: unknown) {
  const user = await requireUser();
  const parsed = transactionSchema.parse(payload);
  const itemIds = parsed.items.map((item) => item.itemId);
  const stocks = await prisma.item.findMany({ where: { id: { in: itemIds } } });
  for (const line of parsed.items) {
    const stock = stocks.find((item) => item.id === line.itemId);
    if (!stock) throw new Error("Barang tidak ditemukan");
    if (stock.stok < line.qty) throw new Error(`Stok ${stock.namaBarang} tidak cukup`);
  }

  const total = parsed.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const grandTotal = Math.max(0, total - parsed.diskon);
  const changeAmount = parsed.paymentMethod === "Cash" ? Math.max(0, parsed.paidAmount - grandTotal) : 0;
  const kodeTransaksi = await nextCode("TRX", "transaction");
  const status = parsed.status ?? "Berhasil";

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
      await tx.item.update({
        where: { id: item.itemId },
        data: { stok: { decrement: item.qty } }
      });
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
  });

  revalidatePath("/transactions");
  revalidatePath("/inventory");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function cancelTransaction(id: number) {
  await requireUser();
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
  });
  revalidatePath("/transactions");
  revalidatePath("/inventory");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function upsertService(formData: FormData) {
  const user = await requireUser();
  const parsed = serviceSchema.parse(Object.fromEntries(formData));

  if (parsed.id) {
    await prisma.service.update({
      where: { id: parsed.id },
      data: {
        ...parsed,
        customerId: parsed.customerId || null,
        completedDate: ["Selesai", "Diambil"].includes(parsed.status) ? new Date() : undefined,
        pickedUpDate: parsed.status === "Diambil" ? new Date() : undefined
      }
    });
  } else {
    const kodeService = await nextCode("SRV", "service");
    await prisma.service.create({
      data: {
        ...parsed,
        kodeService,
        customerId: parsed.customerId || null,
        userId: user.id,
        completedDate: ["Selesai", "Diambil"].includes(parsed.status) ? new Date() : null,
        pickedUpDate: parsed.status === "Diambil" ? new Date() : null
      }
    });
  }

  revalidatePath("/services");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function markServicePaid(id: number) {
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
  });
  revalidatePath("/services");
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function updateServiceStatus(id: number, status: string) {
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
  await requireUser();
  await prisma.service.delete({ where: { id } });
  revalidatePath("/services");
}

export async function upsertFinanceRecord(formData: FormData) {
  const user = await requireUser();
  const parsed = financeSchema.parse(Object.fromEntries(formData));
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
  revalidatePath("/finance");
  revalidatePath("/dashboard");
}

export async function deleteFinanceRecord(id: number) {
  await requireUser();
  await prisma.financeRecord.delete({ where: { id } });
  revalidatePath("/finance");
}
