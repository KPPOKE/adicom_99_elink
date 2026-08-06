"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Landmark, Plus, RotateCcw, Send, Wallet, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { finalizeBankTransfer, reopenBankTransfer, upsertBankTransfer } from "@/app/actions/bank-transfers";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { ClosingCashDialog } from "@/components/closing-cash-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cashWithdrawalLedger, transferLedger } from "@/lib/fund-ledger";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
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
  mutations: Array<{ fundAccountId: number; balanceBefore: number; balanceAfter: number }>;
};

type FundOption = { id: number; name: string; type: string; balance: number; image: string | null };
type StaffOption = { id: number; name: string };

const transferTypes = ["Sesama Bank", "Antar Bank", "E-wallet", "Virtual Account", "BPJS", "PDAM", "PLN", "Internet", "Lainnya"];
const commonBanks = ["BCA", "BNI", "BRI", "BSI", "Bank Mandiri", "Bank Jago", "CIMB Niaga", "DANA", "OVO", "GoPay", "ShopeePay"];

function emptyValues(funds: FundOption[]): BankTransferFormValues {
  const cash = funds.find((item) => item.type === "Cash") ?? funds[0];
  const balance = funds.find((item) => item.type !== "Cash") ?? funds[0];
  return {
    kind: "Transfer",
    transactionType: "Sesama Bank",
    sourceFundId: balance?.id ?? 0,
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

function SummaryCard({
  label,
  value,
  helper,
  icon,
  image,
  className
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  image?: string | null;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border p-4 shadow-sm transition", className || "border-slate-200 bg-white text-slate-900")}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", className ? "text-white/80" : "text-slate-500")}>{label}</p>
        <div className={cn("flex h-8 w-10 items-center justify-center overflow-hidden rounded-md border", className ? "border-white/20 bg-white/10 text-white" : "border-cyan-500/20 bg-cyan-500/10 text-blue-600")}>
          {image ? <img src={image} alt="" className="h-full w-full bg-white object-contain p-1" /> : icon}
        </div>
      </div>
      <p className="mt-3 text-lg font-bold tracking-tight">{formatCurrency(value)}</p>
      <p className={cn("mt-1 text-xs", className ? "text-white/70" : "text-slate-500")}>{helper}</p>
    </div>
  );
}

export function BankTransferClient({ transfers, role, canManage, pagination, filterValues, outletName, userName, whatsapp, summary, funds, staff }: {
  transfers: TransferRow[];
  role: "admin" | "staff";
  canManage: boolean;
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { status: string; kind: string; date: string; fund: string; pegawai: string };
  outletName: string;
  userName: string;
  whatsapp: string;
  summary: { transferAmount: number; tarikAmount: number; turnover: number; bankFee: number; operational: number; profit: number };
  funds: FundOption[];
  staff: StaffOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TransferRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const defaults = useMemo(() => emptyValues(funds), [funds]);
  const form = useForm<BankTransferFormValues>({ resolver: zodResolver(bankTransferSchema) as never, defaultValues: defaults });
  const kind = form.watch("kind");
  const sourceFundId = form.watch("sourceFundId");
  const targetFundId = form.watch("targetFundId");
  const amount = form.watch("amount") || 0;
  const adminFee = form.watch("adminFee") || 0;
  const adminBankFee = form.watch("adminBankFee") || 0;
  const externalAdminFee = form.watch("externalAdminFee") || 0;
  const cashFunds = useMemo(() => funds.filter((item) => item.type === "Cash"), [funds]);
  const balanceFunds = useMemo(() => funds.filter((item) => item.type !== "Cash"), [funds]);
  const sourceOptions = kind === "Transfer" ? balanceFunds : cashFunds;
  const targetOptions = kind === "Transfer" ? cashFunds : balanceFunds;
  const source = funds.find((item) => item.id === Number(sourceFundId));
  const target = funds.find((item) => item.id === Number(targetFundId));
  const ledger = kind === "Transfer"
    ? transferLedger(amount, adminFee, adminBankFee)
    : cashWithdrawalLedger(amount, adminFee, externalAdminFee);

  useEffect(() => {
    if (!sourceOptions.some((item) => item.id === Number(sourceFundId))) form.setValue("sourceFundId", sourceOptions[0]?.id ?? 0);
    if (!targetOptions.some((item) => item.id === Number(targetFundId))) form.setValue("targetFundId", targetOptions[0]?.id ?? 0);
  }, [form, kind, sourceFundId, sourceOptions, targetFundId, targetOptions]);

  useEffect(() => {
    if (kind === "Tarik_Tunai" && target) form.setValue("destinationBank", target.name);
  }, [form, kind, target]);

  const closeForm = () => {
    setOpen(false);
    setEditing(null);
    form.reset(defaults);
  };
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
    setOpen(true);
  };
  const run = (action: () => Promise<void>, message: string, close = false) => startTransition(async () => {
    try {
      await action();
      toast.success(message);
      if (close) closeForm();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal memproses data");
    }
  });
  const onSubmit = (values: BankTransferFormValues) => {
    const payload = kind === "Tarik_Tunai" ? { ...values, destinationBank: target?.name ?? "Saldo tujuan" } : values;
    run(() => upsertBankTransfer(payload), editing ? "MiniATM diperbarui dan diproses" : "MiniATM berhasil diproses", true);
  };

  const columns: ColumnDef<TransferRow>[] = [
    { header: "Transaksi", cell: ({ row }) => <div><p className="font-medium text-slate-900">{row.original.kodeTransfer}</p><p className="text-xs text-slate-500">{formatDate(row.original.createdAt)} - {row.original.userName}</p></div> },
    { header: "Alur Dana", cell: ({ row }) => <div><p>{row.original.sourceFundName || "-"} menjadi {row.original.targetFundName || "-"}</p><p className="mt-1 text-xs text-slate-500">{row.original.kind === "Transfer" ? row.original.destinationBank : row.original.transactionType || "Tarik Tunai"}</p></div> },
    { header: "Jenis", cell: ({ row }) => <Badge variant={row.original.kind === "Transfer" ? "blue" : "orange"}>{row.original.kind === "Transfer" ? "Transfer" : "Tarik Tunai"}</Badge> },
    { header: "Nominal", cell: ({ row }) => <div><p className="font-semibold text-slate-900">{formatCurrency(row.original.amount)}</p><p className="text-xs text-slate-500">Admin {formatCurrency(row.original.adminFee + row.original.adminBankFee + row.original.externalAdminFee)}</p></div> },
    { header: "Perubahan Saldo", cell: ({ row }) => {
      const sourceMutation = row.original.mutations.find((item) => item.fundAccountId === row.original.sourceFundId);
      const targetMutation = row.original.mutations.find((item) => item.fundAccountId === row.original.targetFundId);
      return <div className="space-y-1 text-xs"><p>{row.original.sourceFundName}: {sourceMutation ? `${formatCurrency(sourceMutation.balanceBefore)} menjadi ${formatCurrency(sourceMutation.balanceAfter)}` : "-"}</p><p>{row.original.targetFundName}: {targetMutation ? `${formatCurrency(targetMutation.balanceBefore)} menjadi ${formatCurrency(targetMutation.balanceAfter)}` : "-"}</p></div>;
    } },
    { header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "Berhasil" ? "green" : row.original.status === "Gagal" ? "red" : "orange"}>{row.original.status}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => {
      const item = row.original;
      if (!canManage) return null;
      if (item.status === "Pending") return <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="icon" title="Edit dan proses" onClick={() => editTransfer(item)}><Edit className="h-4 w-4" /></Button><ConfirmDialog title="Tandai gagal?" description="Tidak ada mutasi saldo yang dibuat." confirmLabel="Gagal" onConfirm={() => run(() => finalizeBankTransfer(item.id, "Gagal"), "MiniATM ditandai gagal")} trigger={<Button type="button" variant="outline" size="icon" title="Tandai gagal"><X className="h-4 w-4 text-red-300" /></Button>} /></div>;
      return role === "admin" ? <ConfirmDialog title="Buka ulang?" description="Mutasi saldo dan catatan keuangan akan dibalik." confirmLabel="Buka Ulang" onConfirm={() => run(() => reopenBankTransfer(item.id), "MiniATM dibuka ulang")} trigger={<Button type="button" variant="outline" size="icon" title="Buka ulang"><RotateCcw className="h-4 w-4" /></Button>} /> : null;
    } }
  ];

  const cashAsset = cashFunds.reduce((sum, item) => sum + item.balance, 0);
  const balanceAsset = balanceFunds.reduce((sum, item) => sum + item.balance, 0);

  return <div className="space-y-6">
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      <SummaryCard label="Transfer" value={summary.transferAmount} helper="Hari ini" icon={<Send className="h-4 w-4" />} className="bg-[#1d4ed8] text-white border-transparent" />
      <SummaryCard label="Tarik Tunai" value={summary.tarikAmount} helper="Hari ini" icon={<Wallet className="h-4 w-4" />} className="bg-[#166534] text-white border-transparent" />
      <SummaryCard label="Omset" value={summary.turnover} helper="Nominal transaksi" icon={<Landmark className="h-4 w-4" />} className="bg-[#0284c7] text-white border-transparent" />
      <SummaryCard label="Admin Bank" value={summary.bankFee} helper="Biaya bank" icon={<Landmark className="h-4 w-4" />} className="bg-[#ea580c] text-white border-transparent" />
      <SummaryCard label="Operasional" value={summary.operational} helper="Biaya saldo" icon={<Wallet className="h-4 w-4" />} className="bg-[#991b1b] text-white border-transparent" />
      {role === "admin" ? <SummaryCard label="Profit" value={summary.profit} helper="Setelah biaya" icon={<Send className="h-4 w-4" />} className="bg-[#065f46] text-white border-transparent" /> : null}
    </section>

    <div 
      className="w-full rounded-md bg-[#1e3a8a] text-white py-2 px-4 shadow-sm overflow-hidden select-none"
      dangerouslySetInnerHTML={{
        __html: `
          <marquee scrollamount="5" class="text-sm font-medium tracking-wide block">
            "Bekerjalah dengan jujur, karena kejujuran adalah kunci kepercayaan." &nbsp;|&nbsp; 
            "Profesionalisme bukan hanya tentang keahlian, tetapi juga tentang integritas dan tanggung jawab." &nbsp;|&nbsp; 
            "Setiap transaksi adalah amanah, layani pelanggan dengan senyum dan ketulusan."
          </marquee>
        `
      }}
    />

    <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-semibold text-slate-900">Aset {outletName}</h2>
          <p className="mt-1 text-sm text-slate-500">Saldo kas, bank, dan e-wallet aktif.</p>
        </div>
        <p className="text-lg font-bold text-slate-900">{formatCurrency(cashAsset + balanceAsset)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <SummaryCard label="Aset Cash" value={cashAsset} helper="Kas tunai" icon={<Wallet className="h-4 w-4" />} />
        <SummaryCard label="Aset Saldo" value={balanceAsset} helper="Bank dan e-wallet" icon={<Landmark className="h-4 w-4" />} />
        <SummaryCard label="Total Aset" value={cashAsset + balanceAsset} helper="Seluruh sumber dana" icon={<Landmark className="h-4 w-4" />} />
      </div>

      <hr className="border-slate-100" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {funds.map((fund) => (
          <div key={fund.id} className="flex items-center justify-between gap-2 rounded-lg bg-[#2563eb] p-3 text-white shadow-sm transition hover:bg-[#1d4ed8]">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-wider opacity-85">{fund.name}:</p>
              <p className="mt-1 text-sm font-bold truncate">{formatCurrency(fund.balance)}</p>
            </div>
            {fund.image ? (
              <div className="h-8 w-10 shrink-0 overflow-hidden rounded bg-white p-1 flex items-center justify-center shadow-xs">
                <img src={fund.image} alt="" className="h-full w-full object-contain" />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>

    <section className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold text-slate-900">Riwayat Transaksi</h2><p className="mt-1 text-sm text-slate-500">Transfer dan tarik tunai cabang aktif.</p></div><ClosingCashDialog funds={cashFunds} outletName={outletName} userName={userName} whatsapp={whatsapp} /></div>
      <DataTable
        data={transfers}
        columns={columns}
        searchPlaceholder="Cari kode, bank, atau catatan..."
        serverPagination={pagination}
        tableClassName="min-w-[1080px]"
        filters={<>
          <label className="flex w-full flex-col gap-1.5 sm:w-44"><span className="text-xs text-slate-600">Tanggal</span><Input type="date" name="date" aria-label="Filter tanggal" defaultValue={filterValues.date === "all" ? "" : filterValues.date} /></label>
          <label className="flex w-full flex-col gap-1.5 sm:w-40"><span className="text-xs text-slate-600">Jenis</span><Select name="kind" aria-label="Filter jenis" defaultValue={filterValues.kind}><option value="">Semua Jenis</option><option value="Transfer">Transfer</option><option value="Tarik_Tunai">Tarik Tunai</option></Select></label>
          <label className="flex w-full flex-col gap-1.5 sm:w-44"><span className="text-xs text-slate-600">Sumber dana</span><Select name="fund" aria-label="Filter sumber dana" defaultValue={filterValues.fund}><option value="">Semua Dana</option>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</Select></label>
          {role === "admin" ? <label className="flex w-full flex-col gap-1.5 sm:min-w-48 sm:flex-1 lg:max-w-64"><span className="text-xs text-slate-600">Transaksi oleh</span><Select name="pegawai" aria-label="Filter pegawai" defaultValue={filterValues.pegawai}><option value="">Semua Pegawai</option>{staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label> : null}
          <label className="flex w-full flex-col gap-1.5 sm:w-40"><span className="text-xs text-slate-600">Status</span><Select name="status" aria-label="Filter status" defaultValue={filterValues.status}><option value="">Semua Status</option><option value="Berhasil">Berhasil</option><option value="Pending">Pending</option><option value="Gagal">Gagal</option></Select></label>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">Terapkan</Button>
          <Button asChild type="button" variant="ghost" className="w-full sm:w-auto"><Link href="?date=all">Semua Tanggal</Link></Button>
          {canManage ? <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { setEditing(null); form.reset(defaults); } }}><DialogTrigger asChild><Button type="button"><Plus className="h-4 w-4" />Tambah Transaksi</Button></DialogTrigger><DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>{editing ? `Proses ${editing.kodeTransfer}` : "Input Transaksi MiniATM"}</DialogTitle><DialogDescription>Pilih jenis transaksi, isi nominal, lalu periksa estimasi saldo sebelum diproses.</DialogDescription></DialogHeader><Form {...form}><form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="kind" render={({ field }) => <FormItem><FormLabel>Jenis Transaksi</FormLabel><Select {...field}><option value="Transfer">Transfer</option><option value="Tarik_Tunai">Tarik Tunai</option></Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="transactionType" render={({ field }) => <FormItem><FormLabel>Tipe Transaksi</FormLabel><Select {...field}>{transferTypes.map((type) => <option key={type} value={type}>{type}</option>)}</Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="sourceFundId" render={({ field }) => <FormItem><FormLabel>Sumber Dana</FormLabel><Select name={field.name} aria-label="Sumber Dana" value={String(field.value || "")} onChange={(event) => field.onChange(Number(event.target.value))}>{sourceOptions.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select><FormMessage /></FormItem>} />
              <FormField control={form.control} name="targetFundId" render={({ field }) => <FormItem><FormLabel>Terima Dana</FormLabel><Select name={field.name} aria-label="Terima Dana" value={String(field.value || "")} onChange={(event) => field.onChange(Number(event.target.value))}>{targetOptions.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select><FormMessage /></FormItem>} />
              {kind === "Transfer" ? <FormField control={form.control} name="destinationBank" render={({ field }) => <FormItem><FormLabel>Bank Tujuan</FormLabel><FormControl><Input list="bank-options" placeholder="Pilih atau ketik bank" {...field} /></FormControl><datalist id="bank-options">{commonBanks.map((bank) => <option key={bank} value={bank} />)}</datalist><FormMessage /></FormItem>} /> : null}
              <FormField control={form.control} name="amount" render={({ field }) => <FormItem><FormLabel>Nominal</FormLabel><FormControl><CurrencyInput name="amount" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
              <FormField control={form.control} name="adminFee" render={({ field }) => <FormItem><FormLabel>{kind === "Transfer" ? "Admin Loket" : "Admin Dalam"}</FormLabel><FormControl><CurrencyInput name="adminFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />
              {kind === "Transfer" ? <FormField control={form.control} name="adminBankFee" render={({ field }) => <FormItem><FormLabel>Admin Bank</FormLabel><FormControl><CurrencyInput name="adminBankFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} /> : <FormField control={form.control} name="externalAdminFee" render={({ field }) => <FormItem><FormLabel>Admin Luar</FormLabel><FormControl><CurrencyInput name="externalAdminFee" value={field.value} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>} />}
              <FormField control={form.control} name="note" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Catatan</FormLabel><FormControl><Input placeholder="Keterangan transaksi" {...field} /></FormControl><FormMessage /></FormItem>} />
            </div>
            <div className={`grid gap-3 rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm ${role === "admin" ? "md:grid-cols-3" : "md:grid-cols-2"}`}><div><p className="text-xs text-slate-600">Sumber Dana</p><p className="mt-1 font-medium">{source?.name ?? "-"}</p><p className="text-xs text-slate-600">{formatCurrency(source?.balance ?? 0)} menjadi {formatCurrency((source?.balance ?? 0) + ledger.sourceDelta)}</p></div><div><p className="text-xs text-slate-600">Terima Dana</p><p className="mt-1 font-medium">{target?.name ?? "-"}</p><p className="text-xs text-slate-600">{formatCurrency(target?.balance ?? 0)} menjadi {formatCurrency((target?.balance ?? 0) + ledger.targetDelta)}</p></div>{role === "admin" ? <div><p className="text-xs text-slate-600">Estimasi Profit</p><p className="mt-1 font-semibold text-emerald-700">{formatCurrency(ledger.profit)}</p></div> : null}</div>
            <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={closeForm}>Batal</Button><Button type="submit" disabled={isPending}>{isPending ? "Memproses..." : "Proses"}</Button></div>
          </form></Form></DialogContent></Dialog> : null}
        </>}
      />
    </section>
  </div>;
}