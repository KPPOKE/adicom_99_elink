import "server-only";

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
  const dateWhere = range.start && range.end ? { gte: range.start, lt: range.end } : undefined;
  const [transactions, services, items, finance] = await Promise.all([
    prisma.transaction.findMany({
      where: dateWhere ? { createdAt: dateWhere } : undefined,
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" }
    }),
    prisma.service.findMany({
      where: dateWhere ? { receivedDate: dateWhere } : undefined,
      orderBy: { receivedDate: "desc" }
    }),
    prisma.item.findMany({ include: { category: true }, orderBy: [{ stok: "asc" }, { namaBarang: "asc" }] }),
    prisma.financeRecord.findMany({
      where: dateWhere ? { date: dateWhere } : undefined,
      orderBy: { date: "desc" }
    })
  ]);

  const income = finance.filter((item) => item.type === "income").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const expense = finance.filter((item) => item.type === "expense").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const chartData = [
    { name: "Penjualan", ref: "transaction" },
    { name: "Service", ref: "service" },
    { name: "Manual", ref: "manual" }
  ].map(({ name, ref }) => ({
    name,
    income: finance.filter((item) => item.type === "income" && (item.referenceType === ref || (!item.referenceType && ref === "manual"))).reduce((sum, item) => sum + toNumber(item.amount), 0),
    expense: finance.filter((item) => item.type === "expense" && (item.referenceType === ref || (!item.referenceType && ref === "manual"))).reduce((sum, item) => sum + toNumber(item.amount), 0)
  }));

  return { transactions, services, items, finance, income, expense, chartData, range };
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
  return [["Kode", "Tanggal", "Customer", "Status", "Pembayaran", "Subtotal", "Diskon", "Grand Total"], ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
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
      headers: ["Kode", "Tanggal Masuk", "Customer", "Perangkat", "Status", "Pembayaran", "Biaya Final"],
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
      headers: ["Kode", "Nama Barang", "Kategori", "Stok", "Stok Minimum", "Satuan"],
      rows: data.items.map((item) => [item.kodeBarang, item.namaBarang, item.category.name, item.stok, item.stokMinimum, item.satuan])
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
    headers: ["Kode", "Tanggal", "Customer", "Status", "Pembayaran", "Subtotal", "Diskon", "Grand Total"],
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
