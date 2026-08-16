"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, FileDown, PackagePlus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
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
import { addStockItem, deleteItem, upsertItem } from "@/app/actions/master-data";
import { formatCurrency } from "@/lib/utils";
import { hasPermission } from "@/lib/permission-keys";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormValues } from "@/lib/validators";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type ItemRow = {
  id: number;
  namaBarang: string;
  kodeBarang: string;
  gambar: string | null;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  reservedStock: number;
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
  role = "staff",
  permissions = [],
  pagination,
  filterValues
}: {
  items: ItemRow[];
  categories: { id: number; name: string }[];
  suppliers: { id: number; name: string }[];
  role?: "admin" | "staff";
  permissions?: string[];
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { category: string; supplier: string; stock: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [restockingItem, setRestockingItem] = useState<ItemRow | null>(null);
  const [addQtyInput, setAddQtyInput] = useState<string>("1");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();

  const canAddInventory = hasPermission(role, permissions, "inventory.manage");
  const canEditInventory = hasPermission(role, permissions, "inventory.edit");
  const canDeleteInventory = hasPermission(role, permissions, "inventory.delete");

  const handleRestockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!restockingItem) return;
    const qty = parseInt(addQtyInput, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Jumlah stok tambahan harus minimal 1");
      return;
    }

    startTransition(async () => {
      try {
        await addStockItem(restockingItem.id, qty);
        toast.success("Stok berhasil ditambahkan", {
          description: `Stok ${restockingItem.namaBarang} bertambah +${qty} ${restockingItem.satuan}. Total stok sekarang: ${restockingItem.stok + qty} ${restockingItem.satuan}.`
        });
        setRestockingItem(null);
        setAddQtyInput("1");
        router.refresh();
      } catch (error) {
        toast.error("Gagal menambah stok", {
          description: error instanceof Error ? error.message : "Terjadi kesalahan sistem."
        });
      }
    });
  };

  const form = useForm({
    resolver: zodResolver(itemSchema),
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
      setImageFile(null);
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
        if (imageFile) formData.append("image", imageFile);
        
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

  const columns: ColumnDef<ItemRow>[] = [
    {
      accessorKey: "namaBarang",
      header: "Barang",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-md border border-slate-300 bg-slate-100">
            {row.original.gambar ? <Image src={row.original.gambar} alt="" fill className="object-cover" /> : null}
          </div>
          <div>
            <p className="font-medium text-slate-900">{row.original.namaBarang}</p>
            <p className="text-xs text-slate-500">{row.original.kodeBarang}</p>
          </div>
        </div>
      )
    },
    { header: "Kategori", cell: ({ row }) => row.original.category.name },
    { header: "Harga Jual", cell: ({ row }) => formatCurrency(row.original.hargaJual) },
    { header: "Stok", cell: ({ row }) => (
      <div><p>{row.original.stok} {row.original.satuan} tersedia</p>{row.original.reservedStock > 0 ? <p className="text-xs text-orange-300">{row.original.reservedStock} dipesan service</p> : null}</div>
    ) },
    { header: "Status", cell: ({ row }) => <StockBadge stok={row.original.stok} minimum={row.original.stokMinimum} /> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {canEditInventory ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRestockingItem(row.original);
                  setAddQtyInput("1");
                }}
                className="h-8 gap-1 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 font-semibold shadow-2xs"
                title="Tambah Stok Barang"
              >
                <PackagePlus className="h-3.5 w-3.5 text-emerald-600" />
                <span>+ Stok</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => handleEdit(row.original)}
                title="Edit Detail Barang"
              >
                <Edit className="h-4 w-4 text-slate-600" />
              </Button>
            </>
          ) : null}
          {canDeleteInventory ? (
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
                <Button variant="outline" size="icon" className="h-8 w-8">
                  <Trash2 className="h-4 w-4 text-red-400" />
                </Button>
              }
            />
          ) : null}
        </div>
      )
    }
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800">
          <Link href="/reports/export?kind=stock&format=pdf">
            <FileDown className="h-4 w-4" />
            Unduh PDF Barang Harus Dipesan
          </Link>
        </Button>
        {canAddInventory ? (
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
                      <Select name="categoryId" onChange={(e) => field.onChange(Number(e.target.value))} value={String(field.value || "")}>
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
                      <Select name="supplierId" onChange={(e) => field.onChange(Number(e.target.value) || undefined)} value={String(field.value || "")}>
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
                        <CurrencyInput name="hargaModal" value={field.value} onChange={field.onChange} />
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
                        <CurrencyInput name="hargaJual" value={field.value} onChange={field.onChange} />
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
                        <CurrencyInput name="stok" value={field.value} onChange={field.onChange} prefix="" decimalScale={0} />
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
                        <CurrencyInput name="stokMinimum" value={field.value} onChange={field.onChange} prefix="" decimalScale={0} />
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

                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Gambar Barang</Label>
                  <Input name="image" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} />
                  <p className="text-xs text-slate-500">JPG, PNG, atau WebP. Maksimal 2MB.</p>
                </div>

                <Button type="submit" className="sm:col-span-2" disabled={isPending}>
                  {isPending ? "Menyimpan..." : "Simpan Barang"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
        ) : null}
      </div>
      <DataTable
        columns={columns}
        data={items}
        serverPagination={pagination}
        searchPlaceholder="Cari barang, kode, kategori..."
        filters={
          <>
            <Select name="category" value={filterValues.category} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-[170px]">
              <option value="all">Semua kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
            <Select name="supplier" value={filterValues.supplier} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-[170px]">
              <option value="all">Semua supplier</option>
              <option value="none">Tanpa supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
            <Select name="stock" value={filterValues.stock} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-[150px]">
              <option value="all">Semua stok</option>
              <option value="safe">Aman</option>
              <option value="low">Hampir habis</option>
              <option value="empty">Habis</option>
            </Select>
          </>
        }
      />

      <Dialog open={Boolean(restockingItem)} onOpenChange={(openState) => { if (!openState) setRestockingItem(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700 font-bold">
              <PackagePlus className="h-5 w-5 text-emerald-600" />
              <span>Tambah Stok Barang</span>
            </DialogTitle>
          </DialogHeader>

          {restockingItem ? (
            <form onSubmit={handleRestockSubmit} className="space-y-4 pt-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Nama Barang:</span>
                  <span className="font-bold text-slate-800">{restockingItem.namaBarang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Kode Barang:</span>
                  <span className="font-mono text-slate-700">{restockingItem.kodeBarang}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 font-medium">Stok Saat Ini:</span>
                  <span className="font-bold text-blue-600">{restockingItem.stok} {restockingItem.satuan}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="addQtyInput" className="text-xs font-semibold text-slate-700">
                  Jumlah Stok Masuk (+)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="addQtyInput"
                    type="number"
                    min="1"
                    step="1"
                    autoFocus
                    value={addQtyInput}
                    onChange={(e) => setAddQtyInput(e.target.value)}
                    className="h-10 text-sm font-semibold focus:ring-emerald-500"
                    placeholder="Masukkan jumlah barang masuk..."
                  />
                  <span className="text-xs font-semibold text-slate-500 shrink-0">{restockingItem.satuan}</span>
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs flex items-center justify-between text-emerald-950 font-medium">
                <span>Total Stok Baru:</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {restockingItem.stok} + {parseInt(addQtyInput, 10) || 0} = {(restockingItem.stok + (parseInt(addQtyInput, 10) || 0))} {restockingItem.satuan}
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setRestockingItem(null)}>
                  Batal
                </Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold" disabled={isPending}>
                  {isPending ? "Memproses..." : "Simpan Tambah Stok"}
                </Button>
              </div>
            </form>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
