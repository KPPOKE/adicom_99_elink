export const AUDIT_ACTION_LABELS: Record<string, string> = {
  create: "Tambah",
  update: "Ubah",
  delete: "Hapus",
  cancel: "Batalkan",
  complete_pending: "Selesaikan transaksi tertunda",
  mark_paid: "Tandai lunas",
  update_status: "Ubah status",
  complete: "Tandai berhasil",
  fail: "Tandai gagal",
  reopen: "Buka kembali",
  toggle: "Ubah status aktif",
  download: "Unduh",
  login_success: "Masuk berhasil",
  login_failed: "Masuk gagal",
  login_rate_limited: "Masuk dibatasi",
  logout: "Keluar"
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  auth: "Autentikasi",
  transaction: "Transaksi",
  service: "Service",
  finance_record: "Keuangan",
  bank_transfer: "MiniATM",
  bank_transfer_deposit: "Deposit MiniATM",
  fund_account: "Sumber dana",
  fund_mutation: "Mutasi saldo",
  user: "Pengguna",
  outlet: "Cabang",
  settings: "Pengaturan",
  backup: "Backup",
  item: "Barang",
  category: "Kategori",
  supplier: "Supplier",
  customer: "Pelanggan"
};
