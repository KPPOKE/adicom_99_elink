import { z } from "zod";

const money = z.coerce.number().min(0, "Nominal tidak boleh negatif");

export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter")
});

export const categorySchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(2, "Nama kategori wajib diisi"),
  description: z.string().optional()
});

export const supplierSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(2, "Nama supplier wajib diisi"),
  phone: z.string().optional(),
  address: z.string().optional(),
  note: z.string().optional()
});

export const customerSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(2, "Nama customer wajib diisi"),
  phone: z.string().optional(),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  address: z.string().optional()
});

export const itemSchema = z.object({
  id: z.coerce.number().optional(),
  namaBarang: z.string().min(2, "Nama barang wajib diisi"),
  kodeBarang: z.string().min(2, "Kode barang wajib diisi"),
  categoryId: z.coerce.number().min(1, "Kategori wajib dipilih"),
  gambar: z.string().optional(),
  hargaModal: money,
  hargaJual: money,
  stok: z.coerce.number().int().min(0),
  stokMinimum: z.coerce.number().int().min(0),
  satuan: z.string().min(1),
  supplierId: z.coerce.number().optional().nullable(),
  deskripsi: z.string().optional()
});

export const financeSchema = z.object({
  id: z.coerce.number().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(2, "Kategori wajib diisi"),
  amount: money.min(1, "Nominal wajib diisi"),
  description: z.string().optional(),
  date: z.coerce.date()
});

export const serviceSchema = z.object({
  id: z.coerce.number().optional(),
  customerId: z.coerce.number().optional().nullable(),
  customerName: z.string().min(2, "Nama customer wajib diisi"),
  customerPhone: z.string().optional(),
  deviceType: z.string().min(2, "Jenis perangkat wajib diisi"),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  problemDescription: z.string().min(5, "Keluhan wajib diisi"),
  diagnosis: z.string().optional(),
  estimatedCost: money,
  finalCost: money,
  status: z.enum(["Masuk", "Dicek", "Menunggu_Konfirmasi", "Diproses", "Selesai", "Diambil", "Batal"]),
  technicianNote: z.string().optional()
});

export const transactionSchema = z.object({
  customerId: z.coerce.number().optional().nullable(),
  customerName: z.string().optional(),
  diskon: money,
  paymentMethod: z.enum(["Cash", "Transfer", "QRIS", "Ewallet"]),
  paidAmount: money,
  nomorTujuan: z.string().optional(),
  provider: z.string().optional(),
  jenisProduk: z.string().optional(),
  serialNumber: z.string().optional(),
  digitalStatus: z.enum(["Berhasil", "Pending", "Gagal"]).optional(),
  items: z
    .array(
      z.object({
        itemId: z.coerce.number().min(1),
        qty: z.coerce.number().int().min(1),
        price: money
      })
    )
    .min(1, "Minimal satu item")
});
