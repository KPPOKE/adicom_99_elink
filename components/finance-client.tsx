"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteFinanceRecord, upsertFinanceRecord } from "@/app/actions/operations";
import { formatCurrency, formatDate } from "@/lib/utils";

type FinanceRow = {
  id: number;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  date: string | Date;
  referenceType: string | null;
};

export function FinanceClient({ records }: { records: FinanceRow[] }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const income = records.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = records.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

  const columns: ColumnDef<FinanceRow>[] = [
    { header: "Tanggal", cell: ({ row }) => formatDate(row.original.date) },
    { header: "Tipe", cell: ({ row }) => <Badge variant={row.original.type === "income" ? "green" : "red"}>{row.original.type === "income" ? "Pemasukan" : "Pengeluaran"}</Badge> },
    { accessorKey: "category", header: "Kategori" },
    { header: "Nominal", cell: ({ row }) => formatCurrency(row.original.amount) },
    { header: "Referensi", cell: ({ row }) => row.original.referenceType ?? "manual" },
    { accessorKey: "description", header: "Deskripsi" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.referenceType === "manual" || !row.original.referenceType ? (
          <ConfirmDialog
            onConfirm={() =>
              startTransition(async () => {
                await deleteFinanceRecord(row.original.id);
                toast.success("Catatan keuangan dihapus");
              })
            }
            trigger={
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            }
          />
        ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Summary label="Pemasukan" value={income} />
        <Summary label="Pengeluaran" value={expense} />
        <Summary label="Laba Bersih" value={income - expense} />
      </div>
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Catat Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Catatan Keuangan Manual</DialogTitle>
            </DialogHeader>
            <form
              action={(formData) =>
                startTransition(async () => {
                  try {
                    await upsertFinanceRecord(formData);
                    toast.success("Catatan keuangan disimpan");
                    setOpen(false);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyimpan catatan");
                  }
                })
              }
              className="grid gap-4"
            >
              <div className="space-y-1.5">
                <Label>Tipe</Label>
                <Select name="type" defaultValue="expense">
                  <option value="income">Pemasukan</option>
                  <option value="expense">Pengeluaran</option>
                </Select>
              </div>
              <Field name="category" label="Kategori" />
              <Field type="number" name="amount" label="Nominal" />
              <Field type="date" name="date" label="Tanggal" value={new Date().toISOString().slice(0, 10)} />
              <div className="space-y-1.5">
                <Label>Deskripsi</Label>
                <Textarea name="description" />
              </div>
              <Button disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={records} searchPlaceholder="Cari catatan keuangan..." />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(value)}</p>
    </div>
  );
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value?: string; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} name={name} defaultValue={value ?? ""} required />
    </div>
  );
}
