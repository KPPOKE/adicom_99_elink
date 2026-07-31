"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Filter } from "lucide-react";
import Link from "next/link";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { AUDIT_ACTION_LABELS, AUDIT_ENTITY_LABELS } from "@/lib/audit-display";
import { PERMISSIONS } from "@/lib/permission-keys";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export type AuditRow = {
  id: number;
  createdAt: string;
  userEmail: string;
  outletName: string;
  action: string;
  entity: string;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
};

const FIELD_LABELS: Record<string, string> = {
  before: "Sebelum",
  after: "Sesudah",
  changes: "Perubahan saldo",
  name: "Nama",
  code: "Kode",
  kodeTransaksi: "Kode transaksi",
  kodeService: "Kode service",
  kodeTransfer: "Kode MiniATM",
  targetEmail: "Email pengguna",
  email: "Email",
  role: "Peran",
  permissions: "Hak akses",
  outletId: "ID cabang",
  fundAccountId: "ID sumber dana",
  mode: "Jenis mutasi",
  type: "Jenis",
  kind: "Jenis MiniATM",
  status: "Status",
  paymentStatus: "Status pembayaran",
  from: "Dari",
  to: "Menjadi",
  amount: "Nominal",
  adminFee: "Biaya admin",
  grandTotal: "Total akhir",
  finalCost: "Biaya akhir",
  profit: "Laba",
  openingBalance: "Saldo awal",
  balanceBefore: "Saldo sebelum",
  balanceAfter: "Saldo sesudah",
  cost: "Harga modal",
  price: "Harga jual",
  stock: "Stok",
  minimumStock: "Stok minimum",
  isActive: "Aktif",
  passwordChanged: "Password diubah",
  address: "Alamat",
  whatsapp: "WhatsApp",
  invoicePrefix: "Awalan invoice",
  defaultPrintFormat: "Format cetak",
  date: "Tanggal",
  scope: "Cakupan",
  rowLimit: "Batas baris",
  ip: "Alamat IP",
  retryAfter: "Coba lagi dalam (detik)"
};

const MONEY_FIELDS = new Set(["amount", "adminFee", "grandTotal", "finalCost", "profit", "openingBalance", "balanceBefore", "balanceAfter", "cost", "price"]);
const permissionLabels = new Map<string, string>(PERMISSIONS.map((permission) => [permission.key, permission.label]));
const VALUE_LABELS: Record<string, string> = {
  admin: "Admin",
  staff: "Staff",
  paid: "Lunas",
  unpaid: "Belum lunas",
  Cash: "Tunai",
  Ewallet: "Dompet digital",
  Pulsa_Server: "Server pulsa",
  Other: "Lainnya",
  Opening: "Saldo awal",
  Transfer_Out: "Transfer keluar",
  Transfer_In: "Transfer masuk",
  Cash_Out: "Kas keluar",
  Cash_In: "Kas masuk",
  Deposit_In: "Setoran masuk",
  Withdraw_Out: "Penarikan keluar",
  Move_In: "Pemindahan masuk",
  Move_Out: "Pemindahan keluar",
  Adjustment: "Penyesuaian",
  Reversal: "Pembalikan",
  thermal_58: "Termal 58 mm",
  thermal_80: "Termal 80 mm",
  all: "Semua cabang"
};

function valueLabel(key: string, value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (typeof value === "number" && MONEY_FIELDS.has(key)) return formatCurrency(value);
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    if (key === "permissions") return value.map((item) => permissionLabels.get(String(item)) ?? String(item)).join(", ");
    return <div className="space-y-2">{value.map((item, index) => <div key={index} className="border-l border-slate-300 pl-3">{valueLabel(key, item)}</div>)}</div>;
  }
  if (typeof value === "object") {
    return <dl className="grid gap-1.5">{Object.entries(value).map(([childKey, childValue]) => <div key={childKey} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2"><dt className="text-slate-500">{FIELD_LABELS[childKey] ?? childKey}</dt><dd className="min-w-0 break-words text-slate-700">{valueLabel(childKey, childValue)}</dd></div>)}</dl>;
  }
  const text = String(value);
  return VALUE_LABELS[text] ?? text.replaceAll("_", " ");
}

function AuditDetails({ metadata }: { metadata: AuditRow["metadata"] }) {
  if (!metadata || !Object.keys(metadata).length) return <span className="text-slate-500">-</span>;
  return (
    <details className="max-w-xl">
      <summary className="cursor-pointer text-blue-600 hover:text-blue-700">Lihat detail</summary>
      <dl className="mt-3 grid min-w-[320px] gap-2 rounded-lg border border-slate-300 bg-white p-3 text-xs">
        {Object.entries(metadata).map(([key, value]) => <div key={key} className="grid grid-cols-[130px_minmax(0,1fr)] gap-2"><dt className="text-slate-500">{FIELD_LABELS[key] ?? key}</dt><dd className="min-w-0 break-words text-slate-700">{valueLabel(key, value)}</dd></div>)}
      </dl>
    </details>
  );
}

const columns: ColumnDef<AuditRow>[] = [
  { accessorKey: "createdAt", header: "Waktu", cell: ({ row }) => <span className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</span> },
  { accessorKey: "userEmail", header: "Pelaku", cell: ({ row }) => <span className="break-all">{row.original.userEmail}</span> },
  { accessorKey: "outletName", header: "Cabang" },
  { accessorKey: "action", header: "Aktivitas", cell: ({ row }) => AUDIT_ACTION_LABELS[row.original.action] ?? row.original.action },
  { accessorKey: "entity", header: "Objek", cell: ({ row }) => <span>{AUDIT_ENTITY_LABELS[row.original.entity] ?? row.original.entity}{row.original.entityId ? ` #${row.original.entityId}` : ""}</span> },
  { accessorKey: "metadata", header: "Detail", cell: ({ row }) => <AuditDetails metadata={row.original.metadata} /> }
];

export function AuditLogClient({ rows, outlets, filters, pagination }: {
  rows: AuditRow[];
  outlets: Array<{ id: number; name: string }>;
  filters: { outlet: string; action: string; entity: string; from: string; to: string };
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
}) {
  return (
    <DataTable
      columns={columns}
      data={rows}
      searchPlaceholder="Cari email, tindakan, atau objek..."
      serverPagination={pagination}
      tableClassName="min-w-[1080px]"
      filters={<>
        <Select name="outlet" aria-label="Filter cabang" defaultValue={filters.outlet} className="w-44"><option value="">Semua cabang</option>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</Select>
        <Select name="entity" aria-label="Filter objek" defaultValue={filters.entity} className="w-40"><option value="">Semua objek</option>{Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <Select name="action" aria-label="Filter aktivitas" defaultValue={filters.action} className="w-48"><option value="">Semua aktivitas</option>{Object.entries(AUDIT_ACTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select>
        <div className="flex basis-full flex-wrap items-end gap-2">
          <fieldset aria-label="Rentang tanggal" className="grid w-full min-w-0 grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-600">Dari<Input type="date" name="from" aria-label="Dari tanggal" defaultValue={filters.from} className="w-full min-w-0 sm:w-36" /></label>
            <label className="grid min-w-0 gap-1 text-xs font-medium text-slate-600">Sampai<Input type="date" name="to" aria-label="Sampai tanggal" defaultValue={filters.to} className="w-full min-w-0 sm:w-36" /></label>
          </fieldset>
          <div className="flex w-full gap-2 sm:w-auto">
            <Button type="submit" variant="outline" className="flex-1 sm:w-28 sm:flex-none"><Filter className="h-4 w-4" />Terapkan</Button>
            <Button asChild type="button" variant="ghost" className="flex-1 sm:w-28 sm:flex-none"><Link href="/settings/activity">Reset</Link></Button>
          </div>
        </div>
      </>}
    />
  );
}
