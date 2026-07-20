import { z } from "zod";

const numeric = z.custom<number>(
  (value) => (typeof value === "number" && Number.isFinite(value)) || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value))),
  "Nominal wajib diisi"
).transform(Number);
const money = numeric.pipe(z.number().min(0, "Nominal tidak boleh negatif"));

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  remember: z.coerce.boolean().default(false)
});


export const outletSchema = z.object({
  id: z.coerce.number<number>().optional(),
  code: z.string().trim().min(2, "Kode cabang wajib diisi").max(40).regex(/^[A-Z0-9_-]+$/i, "Kode hanya boleh huruf, angka, underscore, dan strip"),
  name: z.string().trim().min(2, "Nama cabang wajib diisi").max(100),
  address: z.string().trim().max(500, "Alamat maksimal 500 karakter").optional()
});
export type OutletFormValues = z.output<typeof outletSchema>;
export const userSchema = z.object({
  id: z.coerce.number<number>().optional(),
  name: z.string().min(2, "Nama user wajib diisi"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["admin", "staff"]),
  outletId: z.coerce.number<number>().optional().nullable(),
  password: z.string().optional()
}).superRefine((value, context) => {
  if (!value.id && (!value.password || value.password.length < 6)) {
    context.addIssue({
      code: "custom",
      path: ["password"],
      message: "Password minimal 6 karakter"
    });
  }
  if (value.password && value.password.length > 0 && value.password.length < 6) {
    context.addIssue({
      code: "custom",
      path: ["password"],
      message: "Password minimal 6 karakter"
    });
  }
});

export const categorySchema = z.object({
  id: z.coerce.number<number>().optional(),
  name: z.string().min(2, "Nama kategori wajib diisi"),
  description: z.string().optional()
});

export const supplierSchema = z.object({
  id: z.coerce.number<number>().optional(),
  name: z.string().min(2, "Nama supplier wajib diisi"),
  phone: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional()
});

export const customerSchema = z.object({
  id: z.coerce.number<number>().optional(),
  name: z.string().min(2, "Nama customer wajib diisi"),
  phone: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  address: z.string().optional()
});

export const itemSchema = z.object({
  id: z.coerce.number<number>().optional(),
  namaBarang: z.string().min(2, "Nama barang wajib diisi"),
  kodeBarang: z.string().min(2, "Kode barang wajib diisi"),
  categoryId: z.coerce.number<number>().min(1, "Kategori wajib dipilih"),
  gambar: z.string().optional(),
  hargaModal: money,
  hargaJual: money,
  stok: z.coerce.number<number>().int().min(0),
  stokMinimum: z.coerce.number<number>().int().min(0),
  satuan: z.string().min(1),
  supplierId: z.coerce.number<number>().optional().nullable(),
  deskripsi: z.string().optional()
});
export type ItemFormValues = z.output<typeof itemSchema>;

export const financeSchema = z.object({
  id: z.coerce.number<number>().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(2, "Kategori wajib diisi"),
  amount: numeric.pipe(z.number().min(1, "Nominal wajib diisi")),
  description: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
});
export type FinanceFormValues = z.output<typeof financeSchema>;

export const bankTransferSchema = z.object({
  id: z.coerce.number<number>().optional(),
  kind: z.enum(["Transfer", "Tarik_Tunai"]).default("Transfer"),
  transactionType: z.string().trim().max(80).optional(),
  sourceFundId: z.coerce.number<number>().int().min(1, "Sumber dana wajib dipilih"),
  targetFundId: z.coerce.number<number>().int().min(1, "Terima dana wajib dipilih"),
  customerId: z.coerce.number<number>().optional().nullable(),
  senderName: z.string().trim().max(100, "Nama pengirim maksimal 100 karakter").optional(),
  senderPhone: z.string().trim().max(30, "Nomor telepon maksimal 30 karakter").optional(),
  destinationBank: z.string().trim().min(2, "Bank tujuan wajib diisi").max(80),
  accountNumber: z.string().trim().regex(/^\d{5,30}$/, "Nomor rekening harus 5-30 digit"),
  accountName: z.string().trim().min(2, "Nama pemilik rekening wajib diisi").max(100),
  amount: numeric.pipe(z.number().min(1, "Nominal wajib diisi")),
  adminFee: money,
  adminBankFee: money.default(0),
  externalAdminFee: money.default(0),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional()
}).superRefine((value, context) => {
  if (value.sourceFundId === value.targetFundId) {
    context.addIssue({ code: "custom", path: ["targetFundId"], message: "Sumber dan terima dana harus berbeda" });
  }
});
export type BankTransferFormValues = z.output<typeof bankTransferSchema>;

export const bankTransferDepositSchema = z.object({
  fundAccountId: z.coerce.number<number>().int().min(1, "Sumber dana wajib dipilih").optional(),
  amount: numeric.pipe(z.number().min(1, "Nominal deposit wajib diisi")),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional()
});
export type BankTransferDepositFormValues = z.output<typeof bankTransferDepositSchema>;

export const fundAccountSchema = z.object({
  id: z.coerce.number<number>().optional(),
  name: z.string().trim().min(2, "Nama sumber dana wajib diisi").max(80),
  type: z.enum(["Cash", "Bank", "Ewallet", "Pulsa_Server", "Other"]),
  balance: money.default(0),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional(),
  isActive: z.coerce.boolean().default(true)
});
export type FundAccountFormValues = z.output<typeof fundAccountSchema>;

export const fundMutationSchema = z.object({
  mode: z.enum(["Tambah", "Ambil", "Pindah"]),
  sourceFundId: z.coerce.number<number>().int().min(1).optional(),
  targetFundId: z.coerce.number<number>().int().min(1).optional(),
  amount: numeric.pipe(z.number().min(1, "Nominal wajib diisi")),
  adminFee: money.default(0),
  operationalBearer: z.enum(["Pengirim", "Penerima", "Tidak_Ada"]).default("Tidak_Ada"),
  note: z.string().trim().max(500, "Catatan maksimal 500 karakter").optional()
}).superRefine((value, context) => {
  if (value.mode === "Tambah" && !value.targetFundId) context.addIssue({ code: "custom", path: ["targetFundId"], message: "Tujuan saldo wajib dipilih" });
  if (value.mode === "Ambil" && !value.sourceFundId) context.addIssue({ code: "custom", path: ["sourceFundId"], message: "Sumber saldo wajib dipilih" });
  if (value.mode === "Pindah") {
    if (!value.sourceFundId) context.addIssue({ code: "custom", path: ["sourceFundId"], message: "Sumber saldo wajib dipilih" });
    if (!value.targetFundId) context.addIssue({ code: "custom", path: ["targetFundId"], message: "Tujuan saldo wajib dipilih" });
    if (value.sourceFundId && value.sourceFundId === value.targetFundId) context.addIssue({ code: "custom", path: ["targetFundId"], message: "Tujuan harus berbeda" });
  }
});
export type FundMutationFormValues = z.output<typeof fundMutationSchema>;

export const serviceSchema = z.object({
  id: z.coerce.number<number>().optional(),
  customerId: z.coerce.number<number>().optional().nullable(),
  customerName: z.string().min(2, "Nama customer wajib diisi"),
  customerPhone: z.string().optional(),
  deviceType: z.string().min(2, "Jenis perangkat wajib diisi"),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  problemDescription: z.string().min(5, "Keluhan wajib diisi"),
  diagnosis: z.string().optional(),
  estimatedCost: money,
  laborCost: money,
  status: z.enum(["Masuk", "Dicek", "Menunggu_Konfirmasi", "Diproses", "Selesai", "Diambil", "Batal"]),
  technicianNote: z.string().optional(),
  parts: z.array(z.object({
    itemId: z.coerce.number<number>().int().min(1),
    qty: z.coerce.number<number>().int().min(1, "Qty minimal 1"),
    price: money
  })).default([])
});
export type ServiceFormValues = z.output<typeof serviceSchema>;

export const transactionSchema = z.object({
  customerId: z.coerce.number<number>().optional().nullable(),
  customerName: z.string().optional(),
  diskon: money,
  paymentMethod: z.enum(["Cash", "Transfer", "QRIS", "Ewallet"]),
  paidAmount: money,
  nomorTujuan: z.string().optional(),
  provider: z.string().optional(),
  jenisProduk: z.string().optional(),
  serialNumber: z.string().optional(),
  digitalStatus: z.enum(["Berhasil", "Pending", "Gagal"]).optional(),
  status: z.enum(["Berhasil", "Pending", "Batal"]).optional(),
  items: z
    .array(
      z.object({
        itemId: z.coerce.number<number>().min(1),
        qty: z.coerce.number<number>().int().min(1),
        price: money
      })
    )
    .min(1, "Minimal satu item")
}).superRefine((value, context) => {
  const total = value.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const grandTotal = Math.max(0, total - value.diskon);
  if (value.paymentMethod === "Cash" && value.paidAmount < grandTotal) {
    context.addIssue({
      code: "custom",
      path: ["paidAmount"],
      message: "Uang dibayar tidak boleh kurang dari grand total"
    });
  }
});
export type TransactionPayload = z.output<typeof transactionSchema>;

