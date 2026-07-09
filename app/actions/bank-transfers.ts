"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireAdmin, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { dateCode, toNumber } from "@/lib/utils";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { bankTransferDepositSchema, bankTransferSchema } from "@/lib/validators";

async function nextTransferCode() {
  const prefix = `TRF-${dateCode()}`;
  const last = await prisma.bankTransfer.findFirst({
    where: { kodeTransfer: { startsWith: prefix } },
    orderBy: { kodeTransfer: "desc" },
    select: { kodeTransfer: true }
  });
  const sequence = last ? Number(last.kodeTransfer.split("-").pop()) : 0;
  return `${prefix}-${String(sequence + 1).padStart(3, "0")}`;
}

function revalidateTransferPaths() {
  revalidatePath("/bank-transfers");
  revalidatePath("/finance");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
}

export async function upsertBankTransfer(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferSchema.parse(payload);
  const data = {
    customerId: parsed.customerId || null,
    senderName: parsed.senderName || null,
    senderPhone: parsed.senderPhone || null,
    destinationBank: parsed.destinationBank,
    accountNumber: parsed.accountNumber,
    accountName: parsed.accountName,
    amount: parsed.amount,
    adminFee: parsed.adminFee,
    totalReceived: parsed.amount + parsed.adminFee,
    outletId: activeOutlet.id,
    note: parsed.note || null
  };

  if (parsed.id) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.bankTransfer.findUnique({ where: { id: parsed.id } });
      if (!existing) throw new Error("Transfer tidak ditemukan");
      if (existing.status !== "Pending") throw new Error("Transfer yang sudah final tidak dapat diedit");
      await tx.bankTransfer.update({ where: { id: parsed.id }, data });
      await tx.auditLog.create({
        data: { userId: user.id, userEmail: user.email, action: "update", entity: "bank_transfer", entityId: parsed.id, metadata: { kodeTransfer: existing.kodeTransfer } }
      });
    });
    revalidateTransferPaths();
    return;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const kodeTransfer = await nextTransferCode();
    try {
      await prisma.$transaction(async (tx) => {
        const transfer = await tx.bankTransfer.create({ data: { ...data, kodeTransfer, userId: user.id } });
        await tx.auditLog.create({
          data: { userId: user.id, userEmail: user.email, action: "create", entity: "bank_transfer", entityId: transfer.id, metadata: { kodeTransfer } }
        });
      });
      revalidateTransferPaths();
      return;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002" && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("Gagal membuat kode transfer unik");
}

export async function finalizeBankTransfer(id: number, status: "Berhasil" | "Gagal") {
  await assertTrustedOrigin();
  const user = await requireUser();
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id } });
    if (!transfer) throw new Error("Transfer tidak ditemukan");
    if (transfer.status !== "Pending") throw new Error("Transfer sudah diproses");

    if (status === "Berhasil") {
      const start = startOfToday();
      const end = tomorrowOf(start);
      const [deposit, used] = await Promise.all([
        tx.bankTransferDeposit.aggregate({ where: { outletId: transfer.outletId ?? undefined, date: { gte: start, lt: end } }, _sum: { amount: true } }),
        tx.bankTransfer.aggregate({ where: { outletId: transfer.outletId, status: "Berhasil", completedAt: { gte: start, lt: end } }, _sum: { amount: true } })
      ]);
      const available = toNumber(deposit._sum.amount) - toNumber(used._sum.amount);
      if (available < toNumber(transfer.amount)) throw new Error("Saldo deposit transfer tidak cukup");
    }

    await tx.bankTransfer.update({ where: { id }, data: { status, completedAt: new Date() } });
    if (status === "Berhasil" && toNumber(transfer.adminFee) > 0) {
      await tx.financeRecord.create({
        data: {
          type: "income",
          category: "Biaya Admin Transfer",
          amount: transfer.adminFee,
          description: `Biaya admin ${transfer.kodeTransfer}`,
          referenceType: "bank_transfer",
          referenceId: transfer.id,
          bankTransferId: transfer.id,
          outletId: transfer.outletId,
          userId: user.id
        }
      });
    }
    await tx.auditLog.create({
      data: { userId: user.id, userEmail: user.email, action: status === "Berhasil" ? "complete" : "fail", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer } }
    });
  });
  revalidateTransferPaths();
}

export async function reopenBankTransfer(id: number) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  await prisma.$transaction(async (tx) => {
    const transfer = await tx.bankTransfer.findUnique({ where: { id } });
    if (!transfer) throw new Error("Transfer tidak ditemukan");
    if (transfer.status === "Pending") throw new Error("Transfer masih berstatus Pending");
    await tx.financeRecord.deleteMany({ where: { bankTransferId: id } });
    await tx.bankTransfer.update({ where: { id }, data: { status: "Pending", completedAt: null } });
    await tx.auditLog.create({
      data: { userId: user.id, userEmail: user.email, action: "reopen", entity: "bank_transfer", entityId: id, metadata: { kodeTransfer: transfer.kodeTransfer } }
    });
  });
  revalidateTransferPaths();
}

export async function createBankTransferDeposit(payload: unknown) {
  await assertTrustedOrigin();
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const parsed = bankTransferDepositSchema.parse(payload);
  await prisma.bankTransferDeposit.create({
    data: {
      outletId: activeOutlet.id,
      amount: parsed.amount,
      date: startOfToday(),
      note: parsed.note || null,
      userId: user.id
    }
  });
  await prisma.auditLog.create({
    data: { userId: user.id, userEmail: user.email, action: "create", entity: "bank_transfer_deposit", metadata: { outletId: activeOutlet.id, amount: parsed.amount } }
  });
  revalidateTransferPaths();
}
