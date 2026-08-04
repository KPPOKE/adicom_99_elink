import "server-only";

import { prisma } from "@/lib/prisma";

export const BACKUP_ROW_LIMIT = 5000;
export const BACKUP_FORMAT = "pospintar-backup";
export const BACKUP_VERSION = 2;

export async function buildBackupPayload({ isAdmin, outletId, outletName }: { isAdmin: boolean; outletId: number; outletName: string }) {
  const outletWhere = isAdmin ? {} : { outletId };
  const customerWhere = isAdmin ? {} : { outlets: { some: { outletId } } };
  const directOutletWhere = isAdmin ? {} : { id: outletId };
  const newest = { createdAt: "desc" as const };
  const [outlets, users, categories, suppliers, customers, customerOutlets, items, transactions, services, bankTransfers, bankTransferDeposits, fundAccounts, fundMutations, financeRecords, receivables, payrolls, receiptBanks, receiptSettings, settings] = await Promise.all([
    prisma.outlet.findMany({ where: directOutletWhere, take: BACKUP_ROW_LIMIT }),
    isAdmin ? prisma.user.findMany({ select: { id: true, email: true }, take: BACKUP_ROW_LIMIT }) : [],
    prisma.category.findMany({ take: BACKUP_ROW_LIMIT }),
    prisma.supplier.findMany({ orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.customer.findMany({ where: customerWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.customerOutlet.findMany({ where: isAdmin ? {} : { outletId }, take: BACKUP_ROW_LIMIT }),
    prisma.item.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.transaction.findMany({ where: outletWhere, include: { items: true }, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.service.findMany({ where: outletWhere, include: { parts: true }, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.bankTransfer.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.bankTransferDeposit.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.fundAccount.findMany({ where: outletWhere, take: BACKUP_ROW_LIMIT }),
    prisma.fundMutation.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.financeRecord.findMany({ where: outletWhere, orderBy: { date: "desc" }, take: BACKUP_ROW_LIMIT }),
    prisma.receivable.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.payroll.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.receiptBankAccount.findMany({ where: outletWhere, take: BACKUP_ROW_LIMIT }),
    prisma.receiptSetting.findMany({ where: outletWhere, take: BACKUP_ROW_LIMIT }),
    isAdmin ? prisma.setting.findMany({ take: BACKUP_ROW_LIMIT }) : []
  ]);
  const data = { outlets, users, categories, suppliers, customers, customerOutlets, items, transactions, services, bankTransfers, bankTransferDeposits, fundAccounts, fundMutations, financeRecords, receivables, payrolls, receiptBanks, receiptSettings, settings };
  const counts = Object.fromEntries(Object.entries(data).map(([key, rows]) => [key, rows.length]));
  const complete = Object.values(counts).every((count) => count < BACKUP_ROW_LIMIT);
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    generatedAt: new Date().toISOString(),
    scope: isAdmin ? "all" : outletName,
    rowLimit: BACKUP_ROW_LIMIT,
    complete,
    counts,
    note: complete ? "Backup operasional lengkap dan dapat divalidasi untuk restore pada instalasi yang sama." : "Backup terpotong dan hanya dapat digunakan untuk pemeriksaan data.",
    data
  };
}

export type BackupPayload = Awaited<ReturnType<typeof buildBackupPayload>>;