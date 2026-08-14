"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2, Wrench } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteItem, upsertItem } from "@/app/actions/master-data";
import { formatCurrency } from "@/lib/utils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { itemSchema, type ItemFormValues } from "@/lib/validators";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type JasaRow = {
  id: number;
  namaBarang: string;
  kodeBarang: string;
  hargaModal: number;
  hargaJual: number;
  stok: number;
  satuan: string;
  deskripsi: string | null;
  categoryId: number;
  supplierId: number | null;
};

export function ServiceCatalogClient({
  items,
  jasaCategoryId,
  role
}: {
  items: JasaRow[];
  jasaCategoryId: number;
  role: "admin" | "staff";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<JasaRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      namaBarang: "",
      kodeBarang: "",
      categoryId: jasaCategoryId,
      supplierId: 0,
      hargaModal: 0,
      hargaJual: 0,
      stok: 999,
      stokMinimum: 1,
      satuan: "jasa",
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
        categoryId: jasaCategoryId,
        supplierId: 0,
        hargaModal: 0,
        hargaJual: 0,
        stok: 999,
        stokMinimum: 1,
        satuan: "jasa",
        deskripsi: "",
        gambar: ""
      });
    }
    setOpen(newOpen);
  };

  const handleEdit = (item: JasaRow) => {
    setEditing(item);
    form.reset({
      id: item.id,
      namaBarang: item.namaBarang,
      kodeBarang: item.kodeBarang,
      categoryId: jasaCategoryId,
      supplierId: item.supplierId ?? 0,
      hargaModal: item.hargaModal,
      hargaJual: item.hargaJual,
      stok: item.stok || 999,
      stokMinimum: 1,
      satuan: item.satuan || "jasa",
      deskripsi: item.deskripsi ?? "",
      gambar: ""
    });
    setOpen(true);
  };

  const onSubmit = (values: ItemFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (values.id) formData.append("id", String(values.id));
        formData.append("namaBarang", values.namaBarang);
        formData.append("kodeBarang", values.kodeBarang || `JSA-${Date.now().toString().slice(-6)}`);
        formData.append("categoryId", String(jasaCategoryId));
        formData.append("hargaModal", "0");
        formData.append("hargaJual", String(values.hargaJual));
        formData.append("stok", "999");
        formData.append("stokMinimum", "1");
        formData.append("satuan", "jasa");
        formData.append("deskripsi", values.deskripsi ?? "");

        await upsertItem(formData);
        toast.success(editing ? "Jasa berhasil diperbarui" : "Jasa baru berhasil ditambahkan");
        handleOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan jasa");
      }
    });
  };

  const columns: ColumnDef<JasaRow>[] = [
    {
      accessorKey: "namaBarang",
      header: "JASA",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600 font-bold shrink-0">
            <Wrench className="h-4 w-4" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">{row.original.namaBarang}</p>
            <p className="text-xs text-slate-500 font-mono">{row.original.kodeBarang}</p>
          </div>
        </div>
      )
    },
    {
      accessorKey: "hargaJual",
      header: "TARIF JASA",
      cell: ({ row }) => (
        <span className="font-extrabold text-blue-600">
          {formatCurrency(row.original.hargaJual)}
        </span>
      )
    },
    {
      accessorKey: "deskripsi",
      header: "DESKRIPSI / GARANSI",
      cell: ({ row }) => (
        <span className="text-xs text-slate-600">
          {row.original.deskripsi || "-"}
        </span>
      )
    },
    {
      id: "actions",
      header: "AKSI",
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(row.original)} title="Edit Jasa">
            <Edit className="h-4 w-4 text-blue-600" />
          </Button>
          {role === "admin" && (
            <ConfirmDialog
              title="Hapus Jasa?"
              description={`Jasa ${row.original.namaBarang} akan dihapus dari katalog.`}
              confirmLabel="Hapus Jasa"
              onConfirm={() =>
                startTransition(async () => {
                  try {
                    await deleteItem(row.original.id);
                    toast.success("Jasa telah dihapus");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menghapus jasa");
                  }
                })
              }
              trigger={
                <Button variant="ghost" size="icon" title="Hapus Jasa">
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              }
            />
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold">
              <Plus className="h-4 w-4 mr-1.5" />
              Tambah Jasa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Jasa" : "Tambah Jasa Baru"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                <FormField
                  control={form.control}
                  name="namaBarang"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Jasa / Layanan</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Instal Ulang OS Windows / Mac" {...field} />
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
                      <FormLabel>Kode Jasa (Opsional)</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: JSA-INSTAL-OS" {...field} />
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
                      <FormLabel>Tarif Jasa (Rp)</FormLabel>
                      <FormControl>
                        <CurrencyInput name="hargaJual" value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deskripsi"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi / Catatan Garansi</FormLabel>
                      <FormControl>
                        <Textarea placeholder="cth: Garansi instalasi 7 hari. Termasuk Office & Drivers." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                    Batal
                  </Button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={isPending}>
                    {isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Tambah Jasa"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      <DataTable columns={columns} data={items} searchPlaceholder="Cari nama atau kode jasa..." />
    </div>
  );
}
