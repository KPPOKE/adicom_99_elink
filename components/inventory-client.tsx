"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { StockBadge } from "@/components/shared/status-badge";
import { deleteItem, upsertItem } from "@/app/actions/master-data";
import { formatCurrency } from "@/lib/utils";

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
  suppliers
}: {
  items: ItemRow[];
  categories: { id: number; name: string }[];
  suppliers: { id: number; name: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ItemRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<ItemRow>[] = [
    {
      accessorKey: "namaBarang",
      header: "Barang",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="relative h-11 w-11 overflow-hidden rounded-md bg-slate-100">
            {row.original.gambar ? <Image src={row.original.gambar} alt="" fill className="object-cover" /> : null}
          </div>
          <div>
            <p className="font-medium text-slate-950">{row.original.namaBarang}</p>
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
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            onConfirm={() =>
              startTransition(async () => {
                await deleteItem(row.original.id);
                toast.success("Barang dihapus");
              })
            }
            trigger={
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            }
          />
        </div>
      )
    }
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              Tambah Barang
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Barang" : "Tambah Barang"}</DialogTitle>
            </DialogHeader>
            <form
              action={(formData) =>
                startTransition(async () => {
                  try {
                    await upsertItem(formData);
                    toast.success("Barang disimpan");
                    setOpen(false);
                    setEditing(null);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyimpan barang");
                  }
                })
              }
              className="grid gap-4 sm:grid-cols-2"
            >
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <input type="hidden" name="gambar" value={editing?.gambar ?? ""} />
              <Field name="namaBarang" label="Nama Barang" value={editing?.namaBarang} />
              <Field name="kodeBarang" label="Kode Barang" value={editing?.kodeBarang} />
              <div className="space-y-1.5">
                <Label>Kategori</Label>
                <Select name="categoryId" defaultValue={String(editing?.categoryId ?? "")} required>
                  <option value="">Pilih kategori</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Supplier</Label>
                <Select name="supplierId" defaultValue={String(editing?.supplierId ?? "")}>
                  <option value="">Tanpa supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Field type="number" name="hargaModal" label="Harga Modal" value={editing?.hargaModal} />
              <Field type="number" name="hargaJual" label="Harga Jual" value={editing?.hargaJual} />
              <Field type="number" name="stok" label="Stok" value={editing?.stok} />
              <Field type="number" name="stokMinimum" label="Stok Minimum" value={editing?.stokMinimum} />
              <Field name="satuan" label="Satuan" value={editing?.satuan ?? "pcs"} />
              <div className="space-y-1.5">
                <Label>Gambar</Label>
                <Input type="file" name="image" accept="image/*" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Deskripsi</Label>
                <Textarea name="deskripsi" defaultValue={editing?.deskripsi ?? ""} />
              </div>
              <Button className="sm:col-span-2" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Barang"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={items} searchPlaceholder="Cari barang, kode, kategori..." />
    </>
  );
}

function Field({
  label,
  name,
  value,
  type = "text"
}: {
  label: string;
  name: string;
  value?: string | number | null;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} name={name} defaultValue={value ?? ""} required />
    </div>
  );
}
