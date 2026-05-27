"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { deleteFinanceRecord, upsertFinanceRecord } from "@/app/actions/operations";
import { formatCurrency, formatDate } from "@/lib/utils";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { financeSchema, type FinanceFormValues } from "@/lib/schema";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

type FinanceRow = {
  id: number;
  type: "income" | "expense";
  category: string;
  amount: number;
  description: string | null;
  date: string | Date;
  referenceType: string | null;
};

export function FinanceClient({ records, role }: { records: FinanceRow[]; role: "admin" | "staff" }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceRow | null>(null);
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [isPending, startTransition] = useTransition();
  const categories = Array.from(new Set(records.map((record) => record.category))).sort();
  
  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(financeSchema) as any,
    defaultValues: {
      type: "expense",
      category: "",
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      description: ""
    }
  });

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditing(null);
      form.reset({
        type: "expense",
        category: "",
        amount: 0,
        date: new Date().toISOString().slice(0, 10),
        description: ""
      });
    }
    setOpen(newOpen);
  };

  const handleEdit = (record: FinanceRow) => {
    setEditing(record);
    form.reset({
      id: record.id,
      type: record.type,
      category: record.category,
      amount: record.amount,
      date: new Date(record.date).toISOString().slice(0, 10),
      description: record.description ?? ""
    });
    setOpen(true);
  };

  const onSubmit = (values: FinanceFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (values.id) formData.append("id", String(values.id));
        formData.append("type", values.type);
        formData.append("category", values.category);
        formData.append("amount", String(values.amount));
        formData.append("date", values.date);
        formData.append("description", values.description ?? "");
        
        await upsertFinanceRecord(formData);
        toast.success("Catatan keuangan disimpan");
        handleOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan catatan");
      }
    });
  };

  const filteredRecords = records.filter((record) => {
    const typeMatch = typeFilter === "all" || record.type === typeFilter;
    const categoryMatch = categoryFilter === "all" || record.category === categoryFilter;
    return typeMatch && categoryMatch;
  });
  const income = filteredRecords.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const expense = filteredRecords.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);

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
        role === "admin" && (row.original.referenceType === "manual" || !row.original.referenceType) ? (
          <div className="flex justify-end gap-2">
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
                    await deleteFinanceRecord(row.original.id);
                    toast.success("Catatan keuangan dihapus");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menghapus catatan");
                  }
                })
              }
              trigger={
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4 text-red-300" />
                </Button>
              }
            />
          </div>
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
      {role === "admin" ? <div className="flex justify-end">
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenChange(true)}>
              <Plus className="h-4 w-4" />
              Catat Manual
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Catatan Keuangan" : "Catatan Keuangan Manual"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipe</FormLabel>
                      <Select onChange={(e) => field.onChange(e.target.value)} value={field.value}>
                        <option value="income">Pemasukan</option>
                        <option value="expense">Pengeluaran</option>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kategori</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Listrik, Gaji, dll" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominal</FormLabel>
                      <FormControl>
                        <CurrencyInput value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tanggal</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deskripsi</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Keterangan..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div> : null}
      <DataTable
        columns={columns}
        data={filteredRecords}
        searchPlaceholder="Cari catatan keuangan..."
        filters={
          <>
            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)} className="w-[160px]">
              <option value="all">Semua tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </Select>
            <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="w-[180px]">
              <option value="all">Semua kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
          </>
        }
      />
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-5 shadow-[0_18px_45px_rgba(2,6,23,0.18)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-100">{formatCurrency(value)}</p>
    </div>
  );
}


