import { z } from "zod";

export const itemSchema = z.object({
  id: z.number().optional(),
  namaBarang: z.string().min(3, "Nama barang minimal 3 karakter"),
  kodeBarang: z.string().min(3, "Kode barang minimal 3 karakter"),
  categoryId: z.coerce.number().min(1, "Pilih kategori"),
  supplierId: z.coerce.number().optional(),
  hargaModal: z.coerce.number().min(0, "Harga modal tidak boleh negatif"),
  hargaJual: z.coerce.number().min(0, "Harga jual tidak boleh negatif"),
  stok: z.coerce.number().min(0, "Stok tidak boleh negatif"),
  stokMinimum: z.coerce.number().min(0, "Stok minimum tidak boleh negatif"),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  deskripsi: z.string().optional(),
  gambar: z.string().optional()
});

export type ItemFormValues = z.infer<typeof itemSchema>;

export const serviceSchema = z.object({
  id: z.number().optional(),
  customerId: z.coerce.number().optional(),
  customerName: z.string().min(3, "Nama customer minimal 3 karakter"),
  customerPhone: z.string().optional(),
  deviceType: z.string().min(2, "Jenis perangkat wajib diisi"),
  deviceBrand: z.string().optional(),
  deviceModel: z.string().optional(),
  problemDescription: z.string().min(5, "Keluhan minimal 5 karakter"),
  diagnosis: z.string().optional(),
  estimatedCost: z.coerce.number().min(0),
  finalCost: z.coerce.number().min(0),
  status: z.string(),
  technicianNote: z.string().optional()
});

export type ServiceFormValues = z.infer<typeof serviceSchema>;

export const financeSchema = z.object({
  id: z.number().optional(),
  type: z.enum(["income", "expense"]),
  category: z.string().min(2, "Kategori wajib diisi"),
  amount: z.coerce.number().min(1, "Nominal wajib diisi"),
  description: z.string().optional(),
  date: z.string()
});

export type FinanceFormValues = z.infer<typeof financeSchema>;
