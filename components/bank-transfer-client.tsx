"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Edit, RotateCcw, Send, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
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
  kind: "Transfer" | "Tarik_Tunai";
  transactionType: string | null;
  sourceFundId: number | null;
  targetFundId: number | null;
  sourceFundName: string | null;
  targetFundName: string | null;
  customerId: number | null;
  senderName: string | null;
  senderPhone: string | null;
  destinationBank: string;
  accountNumber: string;
  accountName: string;
  amount: number;
  adminFee: number;
  adminBankFee: number;
  externalAdminFee: number;
  totalReceived: number;
  status: "Pending" | "Berhasil" | "Gagal";
  note: string | null;
  userName: string;
  createdAt: string;
};

type CustomerOption = { id: number; name: string; phone: string | null };
type FundOption = { id: number; name: string; type: string; balance: number };

const commonBanks = ["BCA", "BNI", "BRI", "BSI", "Bank Mandiri", "Bank Jago", "CIMB Niaga", "DANA", "OVO", "GoPay", "ShopeePay"];

function emptyValues(funds: FundOption[]): BankTransferFormValues {
  const cash = funds.find((item) => item.type === "Cash") ?? funds[0];
  const bank = funds.find((item) => item.type !== "Cash") ?? funds[1] ?? funds[0];
  return {
    kind: "Transfer",
    transactionType: "Sesama Bank",
    sourceFundId: bank?.id ?? 0,
    targetFundId: cash?.id ?? 0,
    customerId: null,
    senderName: "",
    senderPhone: "",
    destinationBank: "",
    accountNumber: "",
    accountName: "",
    amount: 0,
    adminFee: 0,
    adminBankFee: 0,
    externalAdminFee: 0,
    note: ""
  };
}

export function BankTransferClient({ transfers, customers, role, pagination, filterValues, banks, outletName, summary, funds }: {
  transfers: TransferRow[];
  customers: CustomerOption[];
  role: "admin" | "staff";
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { status: string; bank: string; kind: string };
  banks: string[];
  outletName: string;
  summary: { totalAsset: number; cash: number; bank: number; profit: number; transferAmount: number; tarikAmount: number };
  funds: FundOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<TransferRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaults = useMemo(() => emptyValues(funds), [funds]);
  const form = useForm<BankTransferFormValues>({ resolver: zodResolver(bankTransferSchema) as never, defaultValues: defaults });
  const kind = form.watch("kind");
  const amount = form.watch("amount") || 0;
  const adminFee = form.watch("adminFee") || 0;
  const adminBankFee = form.watch("adminBankFee") || 0;
  const externalAdminFee = form.watch("externalAdminFee") || 0;
  const bankOptions = Array.from(new Set([...commonBanks, ...banks])).sort();

  const resetForm = () => { setEditing(null); form.reset(defaults); };
  const editTransfer = (item: TransferRow) => {
    setEditing(item);
    form.reset({
      id: item.id,
      kind: item.kind,
      transactionType: item.transactionType ?? "Sesama Bank",
      sourceFundId: item.sourceFundId ?? defaults.sourceFundId,
      targetFundId: item.targetFundId ?? defaults.targetFundId,
      customerId: item.customerId,
      senderName: item.senderName ?? "",
      senderPhone: item.senderPhone ?? "",
      destinationBank: item.destinationBank,
      accountNumber: item.accountNumber,
      accountName: item.accountName,
      amount: item.amount,
      adminFee: item.adminFee,
      adminBankFee: item.adminBankFee,
      externalAdminFee: item.externalAdminFee,
      note: item.note ?? ""
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const run = (action: () => Promise<void>, message: string) => startTransition(async () => {
    try { await action(); toast.success(message); resetForm(); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Gagal memproses data"); }
  });
  const onSubmit = (values: BankTransferFormValues) => run(() => upsertBankTransfer(values), editing ? "MiniATM diperbarui" : "MiniATM disimpan sebagai Pending");

  const columns: ColumnDef<TransferRow>[] = [
    { header: "Kode", cell: ({ row }) => <div><p className="font-medium text-slate-100">{row.original.kodeTransfer}</p><p className="text-xs text-slate-500">{formatDate(row.original.createdAt)} | {row.original.userName}</p></div> },
    { header: "Jenis", cell: ({ row }) => <div><Badge variant={row.original.kind === "Transfer" ? "blue" : "orange"}>{row.original.kind === "Transfer" ? "Transfer" : "Tarik Tunai"}</Badge><p className="mt-1 text-xs text-slate-500">{row.original.transactionType || "-"}</p></div> },
    { header: "Dana", cell: ({ row }) => <div><p>{row.original.sourceFundName || "-"} &rarr; {row.original.targetFundName || "-"}</p><p className="text-xs text-slate-500">{row.original.destinationBank} | {row.original.accountNumber}</p></div> },
    { header: "Pelanggan", cell: ({ row }) => <div><p>{row.original.senderName || row.original.accountName}</p><p className="text-xs text-slate-500">{row.original.senderPhone || "-"}</p></div> },
    { header: "Nominal", cell: ({ row }) => <div><p className="font-semibold text-slate-100">{formatCurrency(row.original.amount)}</p><p className="text-xs text-slate-500">Admin {formatCurrency(row.original.adminFee + row.original.adminBankFee + row.original.externalAdminFee)}</p></div> },
    { header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "Berhasil" ? "green" : row.original.status === "Gagal" ? "red" : "orange"}>{row.original.status}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => {
      const item = row.original;
      if (item.status === "Pending") return <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="icon" title="Edit transfer" onClick={() => editTransfer(item)}><Edit className="h-4 w-4" /></Button><ConfirmDialog title="Tandai berhasil?" description="Saldo sumber dana dan profit akan dihitung otomatis." confirmLabel="Berhasil" onConfirm={() => run(() => finalizeBankTransfer(item.id, "Berhasil"), "MiniATM berhasil diselesaikan")} trigger={<Button type="button" variant="outline" size="icon" title="Transfer berhasil"><Check className="h-4 w-4 text-emerald-300" /></Button>} /><ConfirmDialog title="Tandai gagal?" description="Tidak ada mutasi saldo." confirmLabel="Gagal" onConfirm={() => run(() => finalizeBankTransfer(item.id, "Gagal"), "MiniATM ditandai gagal")} trigger={<Button type="button" variant="outline" size="icon" title="Transfer gagal"><X className="h-4 w-4 text-red-300" /></Button>} /></div>;
      return role === "admin" ? <ConfirmDialog title="Buka ulang?" description="Mutasi saldo dan finance record akan dibalik." confirmLabel="Buka Ulang" onConfirm={() => run(() => reopenBankTransfer(item.id), "MiniATM dibuka ulang")} trigger={<Button type="button" variant="outline" size="icon" title="Buka ulang"><RotateCcw className="h-4 w-4" /></Button>} /> : null;
    } }
  ];

  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
      {[['Total Aset', summary.totalAsset], ['LACI', summary.cash], ['Bank/E-wallet', summary.bank], ['Profit MiniATM', summary.profit], ['Transfer', summary.transferAmount], ['Tarik Tunai', summary.tarikAmount]].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-xl font-semibold text-cyan-300">{formatCurrency(Number(value))}</p><p className="mt-1 text-xs text-slate-500">{outletName}</p></div>)}
    </section>

    <section className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-lg sm:p-6">
      <div className="mb-4 flex items-center gap-2"><Send className="h-5 w-5 text-cyan-300" /><h2 className="font-semibold text-slate-100">{editing ? `Edit ${editing.kodeTransfer}` : "Input MiniATM"}</h2></div>
      <Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <FormField control={form.control} name="kind" render={({ field }) => <FormItem><FormLabel>Jenis</FormLabel><Select {...field}><option value="Transfer">Transfer</option><option value="Tarik_Tunai">Tarik Tunai</option></Select><FormMessage /></FormItem>} />
          <FormField control={form.control} name="transactionType" render={({ field }) => <FormItem><FormLabel>Tipe Transaksi</FormLabel><FormControl><Input placeholder="Sesama Bank / Ewallet / VA" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="sourceFundId" render={({ field }) => <FormItem><FormLabel>Sumber Dana</FormLabel><Select value={String(field.value || "")} onChange={(e) => field.onChange(Number(e.target.value))}>{funds.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select><FormMessage /></FormItem>} />
          <FormField control={form.control} name="targetFundId" render={({ field }) => <FormItem><FormLabel>Terima Dana</FormLabel><Select value={String(field.value || "")} onChange={(e) => field.onChange(Number(e.target.value))}>{funds.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select><FormMessage /></FormItem>} />
          <FormField control={form.control} name="customerId" render={({ field }) => <FormItem><FormLabel>Customer</FormLabel><Select value={field.value ? String(field.value) : ""} onChange={(event) => { const id = event.target.value ? Number(event.target.value) : null; field.onChange(id); const customer = customers.find((item) => item.id === id); if (customer) { form.setValue("senderName", customer.name); form.setValue("senderPhone", customer.phone ?? ""); } }}><option value="">Customer umum</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><FormMessage /></FormItem>} />
          <FormField control={form.control} name="senderName" render={({ field }) => <FormItem><FormLabel>Nama Pengirim</FormLabel><FormControl><Input placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="senderPhone" render={({ field }) => <FormItem><FormLabel>No. HP</FormLabel><FormControl><Input inputMode="tel" placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="destinationBank" render={({ field }) => <FormItem><FormLabel>Bank Tujuan</FormLabel><FormControl><Input list="bank-options" placeholder="Pilih atau ketik bank" {...field} /></FormControl><datalist id="bank-options">{bankOptions.map((bank) => <option key={bank} value={bank} />)}</datalist><FormMessage /></FormItem>} />
          <FormField control={form.control} name="accountNumber" render={({ field }) => <FormItem><FormLabel>Nomor Rekening</FormLabel><FormControl><Input inputMode="numeric" {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="accountName" render={({ field }) => <FormItem><FormLabel>Nama Pemilik Rekening</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="amount" render={({ field }) => <FormItem><FormLabel>Nominal</FormLabel><FormControl><CurrencyInput name="amount" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
          <FormField control={form.control} name="adminFee" render={({ field }) => <FormItem><FormLabel>{kind === "Tarik_Tunai" ? "Admin Dalam" : "Admin Loket"}</FormLabel><FormControl><CurrencyInput name="adminFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
          {kind === "Transfer" ? <FormField control={form.control} name="adminBankFee" render={({ field }) => <FormItem><FormLabel>Admin Bank</FormLabel><FormControl><CurrencyInput name="adminBankFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} /> : <FormField control={form.control} name="externalAdminFee" render={({ field }) => <FormItem><FormLabel>Admin Luar</FormLabel><FormControl><CurrencyInput name="externalAdminFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />}
          <FormField control={form.control} name="note" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Opsional" {...field} /></FormControl><FormMessage /></FormItem>} />
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs uppercase text-slate-500">Estimasi profit</p><p className="mt-1 text-xl font-semibold text-cyan-300">{formatCurrency(kind === "Transfer" ? adminFee - adminBankFee : adminFee + externalAdminFee)}</p><p className="text-xs text-slate-500">Nominal {formatCurrency(amount)}</p></div><div className="flex gap-2">{editing ? <Button type="button" variant="outline" onClick={resetForm}>Batal</Button> : null}<Button type="submit" disabled={isPending || funds.length < 2}>{isPending ? "Menyimpan..." : editing ? "Simpan Perubahan" : kind === "Transfer" ? "Simpan Transfer" : "Simpan Tarik Tunai"}</Button></div></div>
      </form></Form>
    </section>

    <section className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-lg sm:p-6">
      <h2 className="mb-4 font-semibold text-slate-100">Tambah Saldo Cepat</h2>
      <form action={(formData) => run(() => createBankTransferDeposit({ fundAccountId: Number(formData.get("fundAccountId") || 0), amount: Number(formData.get("amount") || 0), note: String(formData.get("note") || "") }), "Deposit transfer disimpan")} className="grid gap-3 md:grid-cols-[220px_220px_minmax(0,1fr)_auto]"><Select name="fundAccountId" required>{funds.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select><Input name="amount" type="number" inputMode="numeric" min="1" placeholder="Nominal deposit" required /><Input name="note" placeholder="Catatan" /><Button type="submit" disabled={isPending}>Tambah Deposit</Button></form>
    </section>

    <DataTable columns={columns} data={transfers} serverPagination={pagination} searchPlaceholder="Cari kode, pengirim, bank, rekening..." filters={<><Select name="status" defaultValue={filterValues.status} className="w-[150px]"><option value="">Semua status</option><option value="Pending">Pending</option><option value="Berhasil">Berhasil</option><option value="Gagal">Gagal</option></Select><Select name="kind" defaultValue={filterValues.kind} className="w-[160px]"><option value="">Semua jenis</option><option value="Transfer">Transfer</option><option value="Tarik_Tunai">Tarik Tunai</option></Select><Select name="bank" defaultValue={filterValues.bank} className="w-[180px]"><option value="">Semua bank</option>{banks.map((bank) => <option key={bank} value={bank}>{bank}</option>)}</Select></>} />
  </div>;
}



