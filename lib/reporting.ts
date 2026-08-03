import "server-only";

import { getCurrentUser } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { safeSpreadsheetValue } from "@/lib/spreadsheet";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export type ReportPeriod = "today" | "week" | "month" | "custom" | "all";

export type ReportFilters = {
  period: ReportPeriod;
  from?: string;
  to?: string;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endExclusive(date: Date) {
  const next = startOfDay(date);
  next.setDate(next.getDate() + 1);
  return next;
}


export const REPORT_EXPORT_ROW_LIMIT = 5000;

type ProfitTransaction = { grossProfit: unknown; status: string };
type ProfitService = { grossProfit: unknown; paymentStatus: string; status: string };
type ProfitFinance = { type: "income" | "expense"; amount: unknown; referenceType: string | null };

function grossProfitFrom(transactions: ProfitTransaction[], services: ProfitService[], finance: ProfitFinance[]) {
  const sales = transactions.filter((item) => item.status === "Berhasil").reduce((sum, item) => sum + toNumber(item.grossProfit), 0);
  const service = services.filter((item) => item.status !== "Batal" && item.paymentStatus === "paid").reduce((sum, item) => sum + toNumber(item.grossProfit), 0);
  const miniAtm = finance.filter((item) => item.referenceType === "bank_transfer").reduce((sum, item) => sum + (item.type === "income" ? toNumber(item.amount) : -toNumber(item.amount)), 0);
  return sales + service + miniAtm;
}
export function parseReportFilters(params: Record<string, string | string[] | undefined>): ReportFilters {
  const rawPeriod = Array.isArray(params.period) ? params.period[0] : params.period;
  const period = ["today", "week", "month", "custom", "all"].includes(rawPeriod ?? "") ? (rawPeriod as ReportPeriod) : "today";
  const from = Array.isArray(params.from) ? params.from[0] : params.from;
  const to = Array.isArray(params.to) ? params.to[0] : params.to;
  return { period, from, to };
}

export function reportDateRange(filters: ReportFilters) {
  const now = new Date();
  if (filters.period === "all") return {};
  if (filters.period === "custom" && filters.from && filters.to) {
    return { start: startOfDay(new Date(filters.from)), end: endExclusive(new Date(filters.to)) };
  }
  if (filters.period === "week") {
    const start = startOfDay(now);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return { start, end };
  }
  if (filters.period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return { start, end };
  }
  return { start: startOfDay(now), end: endExclusive(now) };
}

export async function loadReportData(filters: ReportFilters) {
  const range = reportDateRange(filters);
  const user = await getCurrentUser();
  if (!user) throw new Error("User tidak ditemukan");
  const { activeOutlet } = await outletContext(user);
  const dateWhere = range.start && range.end ? { gte: range.start, lt: range.end } : undefined;
  const outletWhere = { outletId: activeOutlet.id };
  const [transactions, services, items, finance] = await Promise.all([
    prisma.transaction.findMany({
      where: dateWhere ? { ...outletWhere, createdAt: dateWhere } : outletWhere,
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      take: REPORT_EXPORT_ROW_LIMIT
    }),
    prisma.service.findMany({
      where: dateWhere ? { ...outletWhere, receivedDate: dateWhere } : outletWhere,
      orderBy: { receivedDate: "desc" },
      take: REPORT_EXPORT_ROW_LIMIT
    }),
    prisma.item.findMany({ where: outletWhere, include: { category: true }, orderBy: [{ stok: "asc" }, { namaBarang: "asc" }], take: REPORT_EXPORT_ROW_LIMIT }),
    prisma.financeRecord.findMany({
      where: dateWhere ? { ...outletWhere, date: dateWhere } : outletWhere,
      orderBy: { date: "desc" },
      take: REPORT_EXPORT_ROW_LIMIT
    })
  ]);

  const income = finance.filter((item) => item.type === "income").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const expense = finance.filter((item) => item.type === "expense").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const grossProfit = grossProfitFrom(transactions, services, finance);
  const netProfit = grossProfit - expense;
  const chartData = [
    { name: "Penjualan", ref: "transaction" },
    { name: "Service", ref: "service" },
    { name: "Transfer Bank", ref: "bank_transfer" },
    { name: "Manual", ref: "manual" }
  ].map(({ name, ref }) => ({
    name,
    income: finance.filter((item) => item.type === "income" && (item.referenceType === ref || (!item.referenceType && ref === "manual"))).reduce((sum, item) => sum + toNumber(item.amount), 0),
    expense: finance.filter((item) => item.type === "expense" && (item.referenceType === ref || (!item.referenceType && ref === "manual"))).reduce((sum, item) => sum + toNumber(item.amount), 0)
  }));

  return { transactions, services, items, finance, income, expense, grossProfit, netProfit, chartData, range };
}

export async function loadReportPreview(filters: ReportFilters) {
  const range = reportDateRange(filters);
  const user = await getCurrentUser();
  if (!user) throw new Error("User tidak ditemukan");
  const { activeOutlet } = await outletContext(user);
  const dateWhere = range.start && range.end ? { gte: range.start, lt: range.end } : undefined;
  const outletWhere = { outletId: activeOutlet.id };
  const financeWhere = dateWhere ? { ...outletWhere, date: dateWhere } : outletWhere;
  const [transactions, services, items, finance, totals, grouped, transactionProfit, serviceProfit] = await Promise.all([
    prisma.transaction.findMany({ where: dateWhere ? { ...outletWhere, createdAt: dateWhere } : outletWhere, include: { items: { include: { item: true } } }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.service.findMany({ where: dateWhere ? { ...outletWhere, receivedDate: dateWhere } : outletWhere, include: { parts: { include: { item: true } } }, orderBy: { receivedDate: "desc" }, take: 8 }),
    prisma.item.findMany({ where: outletWhere, include: { category: true }, orderBy: [{ stok: "asc" }, { namaBarang: "asc" }], take: 8 }),
    prisma.financeRecord.findMany({ where: financeWhere, orderBy: { date: "desc" }, take: 8 }),
    prisma.financeRecord.groupBy({ by: ["type"], where: financeWhere, _sum: { amount: true } }),
    prisma.financeRecord.groupBy({ by: ["type", "referenceType"], where: financeWhere, _sum: { amount: true } }),
    prisma.transaction.aggregate({ where: { ...outletWhere, status: "Berhasil", ...(dateWhere ? { createdAt: dateWhere } : {}) }, _sum: { grossProfit: true } }),
    prisma.service.aggregate({ where: { ...outletWhere, status: { not: "Batal" }, paymentStatus: "paid", ...(dateWhere ? { receivedDate: dateWhere } : {}) }, _sum: { grossProfit: true } })
  ]);
  const total = (type: "income" | "expense") => toNumber(totals.find((item) => item.type === type)?._sum.amount);
  const miniAtmProfit = grouped.filter((item) => item.referenceType === "bank_transfer").reduce((sum, item) => sum + (item.type === "income" ? toNumber(item._sum.amount) : -toNumber(item._sum.amount)), 0);
  const grossProfit = toNumber(transactionProfit._sum.grossProfit) + toNumber(serviceProfit._sum.grossProfit) + miniAtmProfit;
  const netProfit = grossProfit - total("expense");
  const chartData = [
    { name: "Penjualan", ref: "transaction" },
    { name: "Service", ref: "service" },
    { name: "Transfer Bank", ref: "bank_transfer" },
    { name: "Manual", ref: "manual" }
  ].map(({ name, ref }) => ({
    name,
    income: toNumber(grouped.find((item) => item.type === "income" && (item.referenceType === ref || (!item.referenceType && ref === "manual")))?._sum.amount),
    expense: toNumber(grouped.find((item) => item.type === "expense" && (item.referenceType === ref || (!item.referenceType && ref === "manual")))?._sum.amount)
  }));
  return { transactions, services, items, finance, income: total("income"), expense: total("expense"), grossProfit, netProfit, chartData, range };
}

function csvCell(value: unknown) {
  const text = safeSpreadsheetValue(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function reportCsv(kind: string, data: Awaited<ReturnType<typeof loadReportData>>) {
  if (kind === "finance") {
    const rows = data.finance.map((item) => [
      formatDate(item.date),
      item.type === "income" ? "Pemasukan" : "Pengeluaran",
      item.category,
      toNumber(item.amount),
      item.referenceType ?? "manual",
      item.description ?? ""
    ]);
    return [["Tanggal", "Tipe", "Kategori", "Nominal", "Referensi", "Deskripsi"], ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  }

  const rows = data.transactions.map((item) => [
    item.kodeTransaksi,
    formatDate(item.createdAt),
    item.customerName ?? "Umum",
    item.status,
    item.paymentMethod,
    toNumber(item.total),
    toNumber(item.diskon),
    toNumber(item.grandTotal)
  ]);
  return [["Kode", "Tanggal", "Pelanggan", "Status", "Pembayaran", "Subtotal", "Diskon", "Grand Total"], ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
}

export function reportDataset(kind: string, data: Awaited<ReturnType<typeof loadReportData>>) {
  if (kind === "finance") {
    return {
      title: "Laporan Keuangan",
      headers: ["Tanggal", "Tipe", "Kategori", "Nominal", "Referensi", "Deskripsi"],
      rows: data.finance.map((item) => [
        formatDate(item.date),
        item.type === "income" ? "Pemasukan" : "Pengeluaran",
        item.category,
        toNumber(item.amount),
        item.referenceType ?? "manual",
        item.description ?? ""
      ])
    };
  }
  if (kind === "service") {
    return {
      title: "Laporan Service",
      headers: ["Kode", "Tanggal Masuk", "Pelanggan", "Perangkat", "Status", "Pembayaran", "Biaya Final"],
      rows: data.services.map((item) => [
        item.kodeService,
        formatDate(item.receivedDate),
        item.customerName,
        [item.deviceType, item.deviceBrand, item.deviceModel].filter(Boolean).join(" "),
        item.status.replace("_", " "),
        item.paymentStatus === "paid" ? "Lunas" : "Belum Dibayar",
        toNumber(item.finalCost)
      ])
    };
  }
  if (kind === "stock") {
    return {
      title: "Laporan Stok",
      headers: ["Kode", "Nama Barang", "Kategori", "Stok Tersedia", "Dipesan Service", "Stok Minimum", "Satuan"],
      rows: data.items.map((item) => [item.kodeBarang, item.namaBarang, item.category.name, item.stok, item.reservedStock, item.stokMinimum, item.satuan])
    };
  }
  if (kind === "profit-loss") {
    return {
      title: "Laporan Laba Rugi",
      headers: ["Komponen", "Nominal"],
      rows: [
        ["Pemasukan", data.income],
        ["Pengeluaran", data.expense],
        ["Laba/Rugi", data.income - data.expense]
      ]
    };
  }
  return {
    title: "Laporan Penjualan",
    headers: ["Kode", "Tanggal", "Pelanggan", "Status", "Pembayaran", "Subtotal", "Diskon", "Grand Total"],
    rows: data.transactions.map((item) => [
      item.kodeTransaksi,
      formatDate(item.createdAt),
      item.customerName ?? "Umum",
      item.status,
      item.paymentMethod,
      toNumber(item.total),
      toNumber(item.diskon),
      toNumber(item.grandTotal)
    ])
  };
}

export function reportTitle(filters: ReportFilters) {
  const range = reportDateRange(filters);
  if (!range.start || !range.end) return "Semua Data";
  return `${formatDate(range.start)} - ${formatDate(new Date(range.end.getTime() - 1))}`;
}

export function reportCurrency(value: unknown) {
  return formatCurrency(toNumber(value));
}

