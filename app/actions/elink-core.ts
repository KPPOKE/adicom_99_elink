"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";
import { handleActionError } from "@/lib/errors";
import { applyFundDelta } from "@/lib/fund-ledger";
import { outletContext } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";
import { deletePublicUpload, saveImageUpload } from "@/lib/upload";
import { payrollSchema, receivableSchema, receiptBankSchema, receiptSettingSchema } from "@/lib/validators";
import { toNumber } from "@/lib/utils";

function revalidateCore() {
  ["/receivables", "/payroll", "/finance", "/funds", "/fund-mutations", "/reports", "/dashboard"].forEach((path) => revalidatePath(path));
}

async function reverseReceivable(tx: Prisma.TransactionClient, receivableId: number, userId: number) {
  const mutations = await tx.fundMutation.findMany({ where: { referenceType: "receivable", referenceId: receivableId, type: "Withdraw_Out" } });
  for (const mutation of mutations) {
    const account = await tx.fundAccount.findUniqueOrThrow({ where: { id: mutation.fundAccountId } });
    const before = toNumber(account.balance);
    const delta = toNumber(mutation.amount);
    const updated = await tx.fundAccount.updateMany({ where: { id: account.id, balance: account.balance }, data: { balance: before + delta } });
    if (updated.count !== 1) throw new Error("Saldo berubah, ulangi transaksi");
    await tx.fundMutation.create({
      data: {
        outletId: mutation.outletId,
        fundAccountId: mutation.fundAccountId,
        type: "Reversal",
        amount: delta,
        balanceBefore: before,
        balanceAfter: before + delta,
        referenceType: "receivable_reversal",
        referenceId: receivableId,
        note: `Pembalikan piutang #${receivableId}`,
        userId
      }
    });
  }
  await tx.financeRecord.deleteMany({ where: { referenceType: "receivable", referenceId: receivableId } });
}

export async function upsertReceivable(payload: unknown) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("receivables.manage");
    const { activeOutlet } = await outletContext(user);
    const parsed = receivableSchema.parse(payload);
    await prisma.$transaction(async (tx) => {
      const existing = parsed.id ? await tx.receivable.findUnique({ where: { id: parsed.id } }) : null;
      if (parsed.id && (!existing || existing.outletId !== activeOutlet.id)) throw new Error("Piutang tidak ditemukan");
      if (existing?.status === "Lunas") throw new Error("Piutang lunas harus dibuka kembali sebelum diubah");
      if (existing) await reverseReceivable(tx, existing.id, user.id);

      const data = {
        outletId: activeOutlet.id,
        customerId: parsed.customerId,
        loanDate: new Date(`${parsed.loanDate}T00:00:00.000Z`),
        amount: parsed.amount,
        description: parsed.description || null,
        recordExpense: parsed.recordExpense,
        sourceFundId: parsed.recordExpense ? parsed.sourceFundId : null,
        createdById: existing?.createdById ?? user.id
      };
      const receivable = existing
        ? await tx.receivable.update({ where: { id: existing.id }, data })
        : await tx.receivable.create({ data });

      if (parsed.recordExpense) {
        await applyFundDelta(tx, {
          outletId: activeOutlet.id,
          fundAccountId: parsed.sourceFundId!,
          type: "Withdraw_Out",
          delta: -parsed.amount,
          referenceType: "receivable",
          referenceId: receivable.id,
          note: parsed.description || `Piutang pelanggan #${receivable.id}`,
          userId: user.id
        });
        await tx.financeRecord.create({
          data: {
            type: "expense",
            category: "Piutang",
            amount: parsed.amount,
            description: parsed.description || `Piutang pelanggan #${receivable.id}`,
            date: data.loanDate,
            referenceType: "receivable",
            referenceId: receivable.id,
            userId: user.id,
            outletId: activeOutlet.id
          }
        });
      }
      await tx.auditLog.create({
        data: {
          userId: user.id,
          userEmail: user.email,
          outletId: activeOutlet.id,
          action: existing ? "update" : "create",
          entity: "receivable",
          entityId: receivable.id,
          metadata: { customerId: receivable.customerId, amount: parsed.amount, recordExpense: parsed.recordExpense, sourceFundId: parsed.sourceFundId ?? null }
        }
      });
    });
    revalidateCore();
  } catch (error) {
    handleActionError(error);
  }
}

export async function setReceivableStatus(id: number, status: "Belum_Lunas" | "Lunas") {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("receivables.manage");
    const { activeOutlet } = await outletContext(user);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.receivable.findUnique({ where: { id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Piutang tidak ditemukan");
      await tx.receivable.update({ where: { id }, data: { status, paidAt: status === "Lunas" ? new Date() : null } });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "update_status", entity: "receivable", entityId: id, metadata: { from: existing.status, to: status } } });
    });
    revalidateCore();
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteReceivable(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("receivables.manage");
    const { activeOutlet } = await outletContext(user);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.receivable.findUnique({ where: { id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Piutang tidak ditemukan");
      if (existing.status === "Lunas") throw new Error("Piutang lunas harus dibuka kembali sebelum dihapus");
      await reverseReceivable(tx, id, user.id);
      await tx.receivable.delete({ where: { id } });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "delete", entity: "receivable", entityId: id, metadata: { customerId: existing.customerId, amount: toNumber(existing.amount) } } });
    });
    revalidateCore();
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertPayroll(payload: unknown) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("payroll.manage");
    const { activeOutlet } = await outletContext(user);
    const parsed = payrollSchema.parse(payload);
    const totalSalary = parsed.baseSalary + parsed.allowance - parsed.deduction;
    const period = new Date(`${parsed.period}-01T00:00:00.000Z`);
    const paymentDate = parsed.paymentDate ? new Date(`${parsed.paymentDate}T00:00:00.000Z`) : null;
    await prisma.$transaction(async (tx) => {
      const employee = await tx.user.findUnique({ where: { id: parsed.employeeId }, select: { id: true, outletId: true, name: true } });
      if (!employee || employee.outletId !== activeOutlet.id) throw new Error("Pegawai tidak ditemukan di cabang aktif");
      const existing = parsed.id ? await tx.payroll.findUnique({ where: { id: parsed.id } }) : null;
      if (parsed.id && (!existing || existing.outletId !== activeOutlet.id)) throw new Error("Penggajian tidak ditemukan");
      const data = {
        outletId: activeOutlet.id,
        employeeId: parsed.employeeId,
        period,
        baseSalary: parsed.baseSalary,
        allowance: parsed.allowance,
        deduction: parsed.deduction,
        totalSalary,
        paymentDate,
        status: parsed.status,
        note: parsed.note || null,
        createdById: existing?.createdById ?? user.id
      };
      const payroll = existing ? await tx.payroll.update({ where: { id: existing.id }, data }) : await tx.payroll.create({ data });
      await tx.financeRecord.deleteMany({ where: { referenceType: "payroll", referenceId: payroll.id } });
      if (parsed.status === "Dibayar") {
        await tx.financeRecord.create({
          data: {
            type: "expense",
            category: "Penggajian",
            amount: totalSalary,
            description: parsed.note || `Gaji ${employee.name} periode ${parsed.period}`,
            date: paymentDate!,
            referenceType: "payroll",
            referenceId: payroll.id,
            userId: user.id,
            outletId: activeOutlet.id
          }
        });
      }
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: existing ? "update" : "create", entity: "payroll", entityId: payroll.id, metadata: { employeeId: employee.id, period: parsed.period, totalSalary, status: parsed.status } } });
    });
    revalidateCore();
  } catch (error) {
    handleActionError(error);
  }
}

export async function deletePayroll(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("payroll.manage");
    const { activeOutlet } = await outletContext(user);
    await prisma.$transaction(async (tx) => {
      const existing = await tx.payroll.findUnique({ where: { id } });
      if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Penggajian tidak ditemukan");
      await tx.financeRecord.deleteMany({ where: { referenceType: "payroll", referenceId: id } });
      await tx.payroll.delete({ where: { id } });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "delete", entity: "payroll", entityId: id, metadata: { employeeId: existing.employeeId, totalSalary: toNumber(existing.totalSalary) } } });
    });
    revalidateCore();
  } catch (error) {
    handleActionError(error);
  }
}

export async function upsertReceiptBank(payload: unknown) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("receipts.manage");
    const { activeOutlet } = await outletContext(user);
    const parsed = receiptBankSchema.parse(payload);
    await prisma.$transaction(async (tx) => {
      const existing = parsed.id ? await tx.receiptBankAccount.findUnique({ where: { id: parsed.id } }) : null;
      if (parsed.id && (!existing || existing.outletId !== activeOutlet.id)) throw new Error("Master bank tidak ditemukan");
      const data = { outletId: activeOutlet.id, bankName: parsed.bankName, accountName: parsed.accountName, accountNumber: parsed.accountNumber };
      const bank = existing ? await tx.receiptBankAccount.update({ where: { id: existing.id }, data }) : await tx.receiptBankAccount.create({ data });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: existing ? "update" : "create", entity: "receipt_bank", entityId: bank.id, metadata: data } });
    });
    revalidatePath("/receipts/banks");
    revalidatePath("/receipts");
  } catch (error) {
    handleActionError(error);
  }
}

export async function deleteReceiptBank(id: number) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("receipts.manage");
    const { activeOutlet } = await outletContext(user);
    const existing = await prisma.receiptBankAccount.findUnique({ where: { id } });
    if (!existing || existing.outletId !== activeOutlet.id) throw new Error("Master bank tidak ditemukan");
    await prisma.$transaction(async (tx) => {
      await tx.receiptBankAccount.delete({ where: { id } });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: "delete", entity: "receipt_bank", entityId: id, metadata: { bankName: existing.bankName, accountNumber: existing.accountNumber } } });
    });
    revalidatePath("/receipts/banks");
    revalidatePath("/receipts");
  } catch (error) {
    handleActionError(error);
  }
}

export async function updateReceiptSetting(formData: FormData) {
  try {
    await assertTrustedOrigin();
    const user = await requirePermission("receipts.manage");
    const { activeOutlet } = await outletContext(user);
    const existing = await prisma.receiptSetting.findUnique({ where: { outletId: activeOutlet.id } });
    const logo = await saveImageUpload(formData.get("logoFile") as File | null, "receipt-logo");
    const parsed = receiptSettingSchema.parse({ ...Object.fromEntries(formData), logo: logo || existing?.logo || "" });
    const setting = await prisma.receiptSetting.upsert({
      where: { outletId: activeOutlet.id },
      update: { storeName: parsed.storeName, address: parsed.address || null, footer: parsed.footer || null, logo: parsed.logo || null },
      create: { outletId: activeOutlet.id, storeName: parsed.storeName, address: parsed.address || null, footer: parsed.footer || null, logo: parsed.logo || null }
    });
    if (logo && existing?.logo) await deletePublicUpload(existing.logo);
    await prisma.auditLog.create({ data: { userId: user.id, userEmail: user.email, outletId: activeOutlet.id, action: existing ? "update" : "create", entity: "receipt_setting", entityId: setting.id, metadata: { storeName: setting.storeName, address: setting.address, footer: setting.footer, logoChanged: Boolean(logo) } } });
    revalidatePath("/receipts/settings");
    revalidatePath("/receipts");
  } catch (error) {
    handleActionError(error);
  }
}