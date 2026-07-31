export const PERMISSIONS = [
  { key: "dashboard.view", label: "Lihat dasbor", group: "Dasbor" },
  { key: "inventory.view", label: "Lihat inventori", group: "Inventori" },
  { key: "inventory.manage", label: "Kelola inventori", group: "Inventori" },
  { key: "categories.view", label: "Lihat kategori", group: "Kategori" },
  { key: "categories.manage", label: "Kelola kategori", group: "Kategori" },
  { key: "suppliers.view", label: "Lihat supplier", group: "Supplier" },
  { key: "suppliers.manage", label: "Kelola supplier", group: "Supplier" },
  { key: "customers.view", label: "Lihat pelanggan", group: "Pelanggan" },
  { key: "customers.manage", label: "Kelola pelanggan", group: "Pelanggan" },
  { key: "transactions.view", label: "Lihat transaksi", group: "Transaksi" },
  { key: "transactions.manage", label: "Kelola transaksi", group: "Transaksi" },
  { key: "bankTransfers.view", label: "Lihat MiniATM", group: "MiniATM" },
  { key: "bankTransfers.manage", label: "Kelola MiniATM", group: "MiniATM" },
  { key: "funds.view", label: "Lihat sumber dana", group: "Sumber Dana" },
  { key: "funds.manage", label: "Kelola sumber dana", group: "Sumber Dana" },
  { key: "fundMutations.view", label: "Lihat mutasi saldo", group: "Mutasi Saldo" },
  { key: "fundMutations.manage", label: "Kelola mutasi saldo", group: "Mutasi Saldo" },
  { key: "services.view", label: "Lihat service", group: "Service" },
  { key: "services.manage", label: "Kelola service", group: "Service" },
  { key: "finance.view", label: "Lihat keuangan", group: "Keuangan" },
  { key: "finance.manage", label: "Kelola keuangan", group: "Keuangan" },
  { key: "reports.view", label: "Lihat laporan", group: "Laporan" },
  { key: "reports.export", label: "Export laporan", group: "Laporan" },
  { key: "receivables.view", label: "Lihat utang piutang", group: "Utang Piutang" },
  { key: "receivables.manage", label: "Kelola utang piutang", group: "Utang Piutang" },
  { key: "receipts.view", label: "Lihat dan cetak struk", group: "Cetak Struk" },
  { key: "receipts.manage", label: "Kelola master dan pengaturan struk", group: "Cetak Struk" },
  { key: "payroll.view", label: "Lihat penggajian", group: "Penggajian" },
  { key: "payroll.manage", label: "Kelola penggajian", group: "Penggajian" },
  { key: "settings.view", label: "Lihat pengaturan", group: "Pengaturan" },
  { key: "settings.backup", label: "Unduh backup", group: "Pengaturan" }
] as const;

export type PermissionKey = typeof PERMISSIONS[number]["key"];

export const DEFAULT_STAFF_PERMISSIONS: PermissionKey[] = [
  "dashboard.view",
  "customers.view",
  "customers.manage",
  "transactions.view",
  "transactions.manage",
  "bankTransfers.view",
  "bankTransfers.manage",
  "services.view",
  "services.manage",
  "settings.view",
  "settings.backup"
];

export function hasPermission(role: "admin" | "staff", permissions: string[], key: PermissionKey) {
  return role === "admin" || permissions.includes(key);
}
