"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StockBadge } from "@/components/shared/status-badge";
import { deleteItem, upsertItem } from "@/app/actions/master-data";
import { formatCurrency } from "@/lib/utils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormValues } from "@/lib/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type ItemRow = {
  id: number;
  namaBarang: string;
  kodeBarang: string;
  gambar: string | null;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  stokMinimum: number;
  satuan: string;
  deskripsi: string | null;
  categoryId: number;
  supplierId: number | null;
  category: { name: string };
  supplier: { name: string } | null;
};

export function InventoryClient({
  items,
  categories,
  suppliers,
  role
}: {
  items: ItemRow[];
  categories: { id: number; name: string }[];
  suppliers: { id: number; name: string }[];
  role: "admin" | "staff";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [isPending, startTransition] = useTransition();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema) as any,
    defaultValues: {
      namaBarang: "",
      kodeBarang: "",
      categoryId: 0,
      supplierId: 0,
      hargaModal: 0,
      hargaJual: 0,
      stok: 0,
      stokMinimum: 0,
      satuan: "pcs",
      deskripsi: "",
      gambar: ""
    }
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditing(null);
      form.reset({
        namaBarang: "",
        kodeBarang: "",
        categoryId: 0,
        supplierId: 0,
        hargaModal: 0,
        hargaJual: 0,
        stok: 0,
        stokMinimum: 0,
        satuan: "pcs",
        deskripsi: "",
        gambar: ""
      });
    }
    setOpen(newOpen);
  };

  const handleEdit = (item: ItemRow) => {
    setEditing(item);
    form.reset({
      id: item.id,
      namaBarang: item.namaBarang,
      kodeBarang: item.kodeBarang,
      categoryId: item.categoryId,
      supplierId: item.supplierId ?? 0,
      hargaModal: item.hargaModal,
      hargaJual: item.hargaJual,
      stok: item.stok,
      stokMinimum: item.stokMinimum,
      satuan: item.satuan,
      deskripsi: item.deskripsi ?? "",
      gambar: item.gambar ?? ""
    });
    setOpen(true);
  };

  const onSubmit = (values: ItemFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (values.id) formData.append("id", String(values.id));
        formData.append("namaBarang", values.namaBarang);
        formData.append("kodeBarang", values.kodeBarang);
        formData.append("categoryId", String(values.categoryId));
        if (values.supplierId) formData.append("supplierId", String(values.supplierId));
        formData.append("hargaModal", String(values.hargaModal));
        formData.append("hargaJual", String(values.hargaJual));
        formData.append("stok", String(values.stok));
        formData.append("stokMinimum", String(values.stokMinimum));
        formData.append("satuan", values.satuan);
        formData.append("deskripsi", values.deskripsi ?? "");
        formData.append("gambar", values.gambar ?? "");
        
        await upsertItem(formData);
        toast.success("Barang disimpan", {
          description: "Data barang telah berhasil diperbarui di sistem."
        });
        handleOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error("Gagal menyimpan barang", {
          description: error instanceof Error ? error.message : "Terjadi kesalahan sistem."
        });
      }
    });
  };

  const filteredItems = items.filter((item) => {
    const categoryMatch = categoryFilter === "all" || String(item.categoryId) === categoryFilter;
    const supplierMatch = supplierFilter === "all" || String(item.supplierId ?? "none") === supplierFilter;
    const stockStatus = item.stok <= 0 ? "empty" : item.stok <= item.stokMinimum ? "low" : "safe";
    const stockMatch = stockFilter === "all" || stockFilter === stockStatus;
    return categoryMatch && supplierMatch && stockMatch;
  });

  const columns: ColumnDef<ItemRow>[] = [
    {
      accessorKey: "namaBarang",
      header: "Barang",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-md border border-slate-700 bg-slate-800">
            {row.original.gambar ? <Image src={row.original.gambar} alt="" fill className="object-cover" /> : null}
          </div>
          <div>
            <p className="font-medium text-slate-100">{row.original.namaBarang}</p>
            <p className="text-xs text-slate-500">{row.original.kodeBarang}</p>
          </div>
        </div>
      )
    },
    { header: "Kategori", cell: ({ row }) => row.original.category.name },
    { header: "Harga Jual", cell: ({ row }) => formatCurrency(row.original.hargaJual) },
    { header: "Stok", cell: ({ row }) => `${row.original.stok} ${row.original.satuan}` },
    { header: "Status", cell: ({ row }) => <StockBadge stok={row.original.stok} minimum={row.original.stokMinimum} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {role === "admin" ? (
            <>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleEdit(row.original)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                onConfirm={() =>
                  startTransition(async () => {
                    try {
                      await deleteItem(row.original.id);
                      toast.success("Barang dihapus", {
                        description: `Data ${row.original.namaBarang} telah dihapus.`
                      });
                      router.refresh();
                    } catch (error) {
                      toast.error("Gagal menghapus barang", {
                        description: error instanceof Error ? error.message : "Terjadi kesalahan sistem."
                      });
                    }
                  })
                }
                trigger={
                  <Button variant="outline" size="icon">
                    <Trash2 className="h-4 w-4 text-red-300" />
                  </Button>
                }
              />
            </>
          ) : null}
        </div>
      )
    }
  ];

  return (
    <>
      {role === "admin" ? (
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenChange(true)}>
              <Plus className="h-4 w-4" />
              Tambah Barang
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="namaBarang"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Barang</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: RAM 8GB DDR4" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="kodeBarang"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode Barang</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: BRG-001" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="categoryId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <Select onChange={(e) => field.onChange(Number(e.target.value))} value={String(field.value || "")}>
                        <option value="" disabled hidden>Pilih kategori</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier</FormLabel>
                      <Select onChange={(e) => field.onChange(Number(e.target.value) || undefined)} value={String(field.value || "")}>
                        <option value="">Tanpa supplier</option>
                        {suppliers.map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hargaModal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Modal</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hargaJual"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Harga Jual</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stok"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok Awal / Saat Ini</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} prefix="" decimalScale={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="stokMinimum"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stok Minimum (Peringatan)</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} prefix="" decimalScale={0} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="satuan"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Satuan</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: pcs, unit, meter" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deskripsi"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Keterangan tambahan..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="sm:col-span-2" disabled={isPending}>
                  {isPending ? "Menyimpan..." : "Simpan Barang"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      ) : null}
      <DataTable
        columns={columns}
        data={filteredItems}
        searchPlaceholder="Cari barang, kode, kategori..."
        filters={
          <>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-[170px]">
              <option value="all">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select value={supplierFilter} onChange={(event) => setSupplierFilter(event.target.value)} className="w-[170px]">
              <option value="all">Semua supplier</option>
              <option value="none">Tanpa supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
            <Select value={stockFilter} onChange={(event) => setStockFilter(event.target.value)} className="w-[150px]">
              <option value="all">Semua stok</option>
              <option value="safe">Aman</option>
              <option value="low">Hampir habis</option>
              <option value="empty">Habis</option>
            </Select>
          </>
        }
      />
    </>
  );
}


