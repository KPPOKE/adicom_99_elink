"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { financeSchema, type FinanceFormValues } from "@/lib/validators";
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

export function FinanceClient({ records, canManage, canEdit, canDelete, canViewProfit, pagination, filterValues, categories, summary }: {
  records: FinanceRow[];
  canManage: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canViewProfit: boolean;
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { type: string; category: string };
  categories: string[];
  summary: { income: number; expense: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FinanceRow | null>(null);
  const [isPending, startTransition] = useTransition();
  
  const form = useForm({
    resolver: zodResolver(financeSchema),
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
        
        const result = await upsertFinanceRecord(formData);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Catatan keuangan disimpan");
        handleOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan catatan");
      }
    });
  };

  const { income, expense } = summary;

  const columns: ColumnDef<FinanceRow>[] = [
    { header: "Tanggal", cell: ({ row }) => formatDate(row.original.date) },
    { header: "Tipe", cell: ({ row }) => <Badge variant={row.original.type === "income" ? "green" : "red"}>{row.original.type === "income" ? "Pemasukan" : "Pengeluaran"}</Badge> },
    { accessorKey: "category", header: "Kategori" },
    { header: "Nominal", cell: ({ row }) => formatCurrency(row.original.amount) },
    { header: "Referensi", cell: ({ row }) => row.original.referenceType ?? "manual" },
    { accessorKey: "description", header: "Deskripsi" },
    {
      id: "actions",
      header: () => <div className="text-center">Aksi</div>,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
      cell: ({ row }) =>
        (canEdit || canDelete) && (row.original.referenceType === "manual" || !row.original.referenceType) ? (
          <div className="flex w-full justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs" title="Menu Aksi">
                  <MoreHorizontal className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1.5">
                {canEdit ? (
                  <DropdownMenuItem onClick={() => handleEdit(row.original)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    {canEdit ? <DropdownMenuSeparator /> : null}
                    <ConfirmDialog
                      onConfirm={() =>
                        startTransition(async () => {
                          const result = await deleteFinanceRecord(row.original.id);
                          if (!result.success) {
                            toast.error(result.error);
                            return;
                          }
                          toast.success("Catatan keuangan dihapus");
                          router.refresh();
                        })
                      }
                      trigger={
                        <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span>Hapus</span>
                        </DropdownMenuItem>
                      }
                    />
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null
    }
  ];

  return (
    <div className="space-y-6">
      <div className={`grid gap-4 ${canViewProfit ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
        <Summary label="Pemasukan" value={income} />
        <Summary label="Pengeluaran" value={expense} />
        {canViewProfit ? <Summary label="Laba Bersih" value={income - expense} signed /> : null}
      </div>

      <DataTable
        columns={columns}
        data={records}
        serverPagination={pagination}
        searchPlaceholder="Cari catatan keuangan..."
        filters={
          <>
            <Select name="typeFilter" value={filterValues.type} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-[160px]">
              <option value="">Semua tipe</option>
              <option value="income">Pemasukan</option>
              <option value="expense">Pengeluaran</option>
            </Select>
            <Select name="category" value={filterValues.category} onChange={(e) => e.currentTarget.form?.requestSubmit()} className="w-[180px]">
              <option value="">Semua kategori</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </Select>
            {canManage ? (
              <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button type="button" onClick={() => handleOpenChange(true)}>
                    <Plus className="h-4 w-4" />
                    Tambah Pengeluaran
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editing ? "Edit Pengeluaran" : "Tambah Pengeluaran"}</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipe</FormLabel>
                            <Select name="type" onChange={(e) => field.onChange(e.target.value)} value={field.value}>
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
                              <CurrencyInput name="amount" value={field.value} onChange={field.onChange} />
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
            ) : null}
          </>
        }
      />
    </div>
  );
}

function Summary({ label, value, signed }: { label: string; value: number; signed?: boolean }) {
  const tone = signed ? (value < 0 ? "text-red-600" : value > 0 ? "text-emerald-600" : "text-slate-900") : "text-slate-900";
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-5 shadow-[0_18px_45px_rgba(2,6,23,0.18)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-semibold ${tone}`}>{formatCurrency(value)}</p>
    </div>
  );
}
