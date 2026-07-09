"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Banknote, Check, Edit, RotateCcw, WalletCards, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createBankTransferDeposit, finalizeBankTransfer, reopenBankTransfer, upsertBankTransfer } from "@/app/actions/bank-transfers";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { bankTransferSchema, type BankTransferFormValues } from "@/lib/validators";

type TransferRow = {
  id: number;
  kodeTransfer: string;
  customerId: number | null;
  senderName: string | null;
  senderPhone: string | null;
  destinationBank: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  adminFee: number;
  totalReceived: number;
  status: "Pending" | "Berhasil" | "Gagal";
  note: string | null;
  userName: string;
  createdAt: string;
};

type CustomerOption = { id: number; name: string; phone: string | null };

const commonBanks = ["BCA", "BNI", "BRI", "BSI", "Bank Mandiri", "Bank Jago", "CIMB Niaga", "Danamon", "PermataBank", "SeaBank"];

const emptyValues: BankTransferFormValues = {
  customerId: null,
  senderName: "",
  senderPhone: "",
  destinationBank: "",
  accountNumber: "",
  accountName: "",
  amount: 0,
  adminFee: 0,
  note: ""
};

export function BankTransferClient({
  transfers,
  customers,
  role,
  pagination,
  filterValues,
  banks,
  outletName,
  summary
}: {
  transfers: TransferRow[];
  customers: CustomerOption[];
  role: "admin" | "staff";
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { status: string; bank: string };
  banks: string[];
  outletName: string;
  summary: { deposit: number; used: number; adminFee: number };
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TransferRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const form = useForm<BankTransferFormValues>({
    resolver: zodResolver(bankTransferSchema),
    defaultValues: emptyValues
  });
  const amount = form.watch("amount") || 0;
  const adminFee = form.watch("adminFee") || 0;
  const availableBalance = summary.deposit - summary.used;
  const bankOptions = Array.from(new Set([...commonBanks, ...banks])).sort();

  const resetForm = () => {
    setEditing(null);
    form.reset(emptyValues);
  };

  const editTransfer = (item: TransferRow) => {
    setEditing(item);
    form.reset({
      id: item.id,
      customerId: item.customerId,
      senderName: item.senderName ?? "",
      senderPhone: item.senderPhone ?? "",
      destinationBank: item.destinationBank,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
      amount: item.amount,
      adminFee: item.adminFee,
      note: item.note ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onSubmit = (values: BankTransferFormValues) => {
    startTransition(async () => {
      try {
        await upsertBankTransfer(values);
        toast.success(editing ? "Transfer diperbarui" : "Transfer disimpan sebagai Pending");
        resetForm();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan transfer");
      }
    });
  };

  const runAction = (action: () => Promise<void>, message: string) => {
    startTransition(async () => {
      try {
        await action();
        toast.success(message);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memproses transfer");
      }
    });
  };

  const columns: ColumnDef<TransferRow>[] = [
    {
      header: "Transfer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-100">{row.original.kodeTransfer}</p>
          <p className="text-xs text-slate-500">{formatDate(row.original.createdAt)} | {row.original.userName}</p>
        </div>
      )
    },
    {
      header: "Penerima",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-200">{row.original.accountName}</p>
          <p className="text-xs text-slate-500">{row.original.destinationBank} | {row.original.accountNumber}</p>
        </div>
      )
    },
    {
      header: "Pengirim",
      cell: ({ row }) => (
        <div>
          <p>{row.original.senderName || "Umum"}</p>
          <p className="text-xs text-slate-500">{row.original.senderPhone || "-"}</p>
        </div>
      )
    },
    {
      header: "Nominal",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-100">{formatCurrency(row.original.amount)}</p>
          <p className="text-xs text-slate-500">Fee {formatCurrency(row.original.adminFee)}</p>
        </div>
      )
    },
    { header: "Total Diterima", cell: ({ row }) => <span className="font-semibold text-cyan-300">{formatCurrency(row.original.totalReceived)}</span> },
    {
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "Berhasil" ? "green" : row.original.status === "Gagal" ? "red" : "orange"}>
          {row.original.status}
        </Badge>
      )
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const item = row.original;
        if (item.status === "Pending") {
          return (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="icon" title="Edit transfer" onClick={() => editTransfer(item)}>
                <Edit className="h-4 w-4" />
              </Button>
              <ConfirmDialog
                title="Tandai transfer berhasil?"
                description="Biaya admin akan dicatat sebagai pemasukan."
                confirmLabel="Berhasil"
                onConfirm={() => runAction(() => finalizeBankTransfer(item.id, "Berhasil"), "Transfer berhasil diselesaikan")}
                trigger={<Button type="button" variant="outline" size="icon" title="Transfer berhasil"><Check className="h-4 w-4 text-emerald-300" /></Button>}
              />
              <ConfirmDialog
                title="Tandai transfer gagal?"
                description="Transfer gagal tidak menghasilkan catatan pemasukan."
                confirmLabel="Gagal"
                onConfirm={() => runAction(() => finalizeBankTransfer(item.id, "Gagal"), "Transfer ditandai gagal")}
                trigger={<Button type="button" variant="outline" size="icon" title="Transfer gagal"><X className="h-4 w-4 text-red-300" /></Button>}
              />
            </div>
          );
        }
        return role === "admin" ? (
          <ConfirmDialog
            title="Buka ulang transfer?"
            description="Status kembali ke Pending dan pemasukan biaya admin terkait akan dihapus."
            confirmLabel="Buka Ulang"
            onConfirm={() => runAction(() => reopenBankTransfer(item.id), "Transfer dibuka ulang")}
            trigger={<Button type="button" variant="outline" size="icon" title="Buka ulang"><RotateCcw className="h-4 w-4" /></Button>}
          />
        ) : null;
      }
    }
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">Saldo Transfer Hari Ini</p>
              <p className="mt-2 text-2xl font-semibold text-cyan-300">{formatCurrency(availableBalance)}</p>
              <p className="mt-1 text-xs text-slate-500">{outletName}</p>
            </div>
            <WalletCards className="h-8 w-8 text-cyan-300" />
          </div>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Deposit Masuk</p>
          <p className="mt-2 text-2xl font-semibold text-slate-100">{formatCurrency(summary.deposit)}</p>
          <p className="mt-1 text-xs text-slate-500">Dipakai {formatCurrency(summary.used)}</p>
        </div>
        <div className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">Fee Admin Hari Ini</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{formatCurrency(summary.adminFee)}</p>
          <p className="mt-1 text-xs text-slate-500">Masuk ke finance</p>
        </div>
      </section>

      <section className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-lg sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <Banknote className="h-5 w-5 text-cyan-300" />
          <h2 className="font-semibold text-slate-100">Deposit Modal Transfer</h2>
        </div>
        <form
          action={(formData) =>
            startTransition(async () => {
              try {
                await createBankTransferDeposit({ amount: Number(formData.get("amount") || 0), note: String(formData.get("note") || "") });
                toast.success("Deposit transfer disimpan");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Gagal menyimpan deposit");
              }
            })
          }
          className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]"
        >
          <Input name="amount" type="number" inputMode="numeric" min="1" placeholder="Nominal deposit" required />
          <Input name="note" placeholder="Catatan deposit, opsional" />
          <Button type="submit" disabled={isPending}>Tambah Deposit</Button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-lg sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-100">{editing ? `Edit ${editing.kodeTransfer}` : "Transfer Baru"}</h2>
            <p className="mt-1 text-sm text-slate-500">Data baru disimpan sebagai Pending.</p>
          </div>
          {editing ? <Button type="button" variant="outline" onClick={resetForm}>Batal Edit</Button> : null}
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <FormField control={form.control} name="customerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer (opsional)</FormLabel>
                  <Select
                    name="customerId"
                    value={field.value ? String(field.value) : ""}
                    onChange={(event) => {
                      const id = event.target.value ? Number(event.target.value) : null;
                      field.onChange(id);
                      const customer = customers.find((item) => item.id === id);
                      if (customer) {
                        form.setValue("senderName", customer.name);
                        form.setValue("senderPhone", customer.phone ?? "");
                      }
                    }}
                  >
                    <option value="">Customer umum</option>
                    {customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="senderName" render={({ field }) => (
                <FormItem><FormLabel>Nama Pengirim</FormLabel><FormControl><Input placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="senderPhone" render={({ field }) => (
                <FormItem><FormLabel>Nomor Telepon</FormLabel><FormControl><Input inputMode="tel" placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="destinationBank" render={({ field }) => (
                <FormItem>
                  <FormLabel>Bank Tujuan</FormLabel>
                  <FormControl><Input list="bank-options" placeholder="Pilih atau ketik bank" {...field} /></FormControl>
                  <datalist id="bank-options">{bankOptions.map((bank) => <option key={bank} value={bank} />)}</datalist>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="accountNumber" render={({ field }) => (
                <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input inputMode="numeric" placeholder="Nomor rekening tujuan" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="accountName" render={({ field }) => (
                <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input placeholder="Sesuai rekening" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="amount" render={({ field }) => (
                <FormItem><FormLabel>Nominal Transfer</FormLabel><FormControl><CurrencyInput name="amount" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="adminFee" render={({ field }) => (
                <FormItem><FormLabel>Biaya Admin</FormLabel><FormControl><CurrencyInput name="adminFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="note" render={({ field }) => (
                <FormItem className="md:col-span-2 xl:col-span-1"><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Catatan opsional" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">Total diterima dari pelanggan</p>
                <p className="mt-1 text-xl font-semibold text-cyan-300">{formatCurrency(Number(amount) + Number(adminFee))}</p>
              </div>
              <Button type="submit" disabled={isPending}>{isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Simpan Transfer"}</Button>
            </div>
          </form>
        </Form>
      </section>

      <DataTable
        columns={columns}
        data={transfers}
        serverPagination={pagination}
        searchPlaceholder="Cari kode, pengirim, bank, atau rekening..."
        filters={
          <>
            <Select name="status" defaultValue={filterValues.status} className="w-[150px]">
              <option value="">Semua status</option>
              <option value="Pending">Pending</option>
              <option value="Berhasil">Berhasil</option>
              <option value="Gagal">Gagal</option>
            </Select>
            <Select name="bank" defaultValue={filterValues.bank} className="w-[180px]">
              <option value="">Semua bank</option>
              {banks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}
            </Select>
          </>
        }
      />
    </div>
  );
}
