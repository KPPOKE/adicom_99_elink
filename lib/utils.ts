import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number | string) {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export function formatDateTime(value: Date | string) {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta"
  }).format(new Date(value));
}

export function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export function dateCode(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const normalized = value.replace(/[^\d,.-]/g, "");
    const decimalAware = normalized.includes(",")
      ? normalized.replaceAll(".", "").replace(",", ".")
      : normalized.replace(/\.(?=\d{3})/g, "");
    return Number(decimalAware) || 0;
  }
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return Number(value) || 0;
}

export function formatWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

export function formatWhatsAppServiceReceipt(data: {
  kodeService: string;
  receivedDate: Date | string;
  customerName: string;
  customerPhone?: string | null;
  technicianOrAdminName?: string | null;
  deviceType: string;
  deviceBrand?: string | null;
  deviceModel?: string | null;
  problemDescription: string;
  diagnosis?: string | null;
  technicianNote?: string | null;
  status: string;
  paymentStatus: string;
  estimatedCost?: unknown;
  laborCost?: unknown;
  finalCost?: unknown;
}) {
  const dateStr = formatDateTime(data.receivedDate);
  const deviceStr = [data.deviceType, data.deviceBrand, data.deviceModel].filter(Boolean).join(" ");
  const statusStr = data.status.replace("_", " ");
  const paymentStr = data.paymentStatus === "paid" ? "Lunas" : "Belum Dibayar";
  const estCost = formatCurrency(toNumber(data.estimatedCost));
  const laborCost = formatCurrency(toNumber(data.laborCost));
  const finalCost = formatCurrency(toNumber(data.finalCost) || toNumber(data.estimatedCost));

  return [
    `*Adicom99*`,
    `_Service hardware, laptop, PC, HP, pulsa, token listrik, dan produk digital._`,
    `WA: 081234567899`,
    `--------------------------------------------------`,
    `*Kode Service:* ${data.kodeService}`,
    `*Tanggal Masuk:* ${dateStr}`,
    `*Customer:* ${data.customerName}`,
    `*No. HP:* ${data.customerPhone || "-"}`,
    `*Teknisi/Admin:* ${data.technicianOrAdminName || "Admin Adicom99"}`,
    `--------------------------------------------------`,
    `*Perangkat:*`,
    deviceStr,
    ``,
    `*Keluhan:*`,
    data.problemDescription || "-",
    ``,
    `*Diagnosa:*`,
    data.diagnosis || "-",
    ``,
    `*Catatan Teknisi:*`,
    data.technicianNote || "-",
    `--------------------------------------------------`,
    `*Status Service:* ${statusStr}`,
    `*Status Bayar:* ${paymentStr}`,
    `*Estimasi:* ${estCost}`,
    `*Biaya Jasa:* ${laborCost}`,
    `*Biaya Final:* ${finalCost}`
  ].join("\n");
}
