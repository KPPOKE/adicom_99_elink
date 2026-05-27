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
