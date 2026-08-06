"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeftRight, ArrowUpFromLine, Filter, Plus, Scale, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createFundMutation } from "@/app/actions/funds";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { moveLedger } from "@/lib/fund-ledger";

type FundOption = { id: number; name: string; balance: number };
type MutationRow = { id: number; fundName: string; type: string; amount: number; adminFee: number; balanceBefore: number; balanceAfter: number; note: string | null; userName: string; createdAt: string };
type MutationMode = "Tambah" | "Ambil" | "Pindah";
type Bearer = "Pengirim" | "Penerima" | "Tidak_Ada";
type MutationForm = { mode: MutationMode; sourceFundId: number; targetFundId: number; amount: number; adminFee: number; operationalBearer: Bearer; note: string };
type Summary = { added: number; withdrawn: number; balance: number; moved: number };

const empty = (mode: MutationMode, funds: FundOption[]): MutationForm => ({ mode, sourceFundId: funds[0]?.id ?? 0, targetFundId: (mode === "Pindah" ? funds[1] : funds[0])?.id ?? funds[0]?.id ?? 0, amount: 0, adminFee: 0, operationalBearer: "Tidak_Ada", note: "" });
const typeLabels: Record<string, string> = {
  Opening: "Saldo Awal",
  Deposit_In: "Tambah Saldo",
  Withdraw_Out: "Ambil Saldo",
  Move_In: "Saldo Masuk",
  Move_Out: "Saldo Keluar",
  Adjustment: "Penyesuaian"
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-sm font-medium text-slate-700">{label}</span>{children}</label>;
}

function SummaryCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof TrendingUp; tone: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-xl font-semibold text-slate-950">{formatCurrency(value)}</p></div><div className={`flex h-11 w-11 items-center justify-center rounded-lg border ${tone}`}><Icon className="h-5 w-5" aria-hidden="true" /></div></div></div>;
}

export function FundMutationsClient({ funds, filterFunds, mutations, initialMode, canManage, canDeposit, canWithdraw, canMoveCreate, summary, filters }: {
  funds: FundOption[];
  filterFunds: Array<{ id: number; name: string }>;
  mutations: MutationRow[];
  initialMode: MutationMode;
  canManage: boolean;
  canDeposit: boolean;
  canWithdraw: boolean;
  canMoveCreate: boolean;
  summary: Summary;
  filters: { from: string; to: string; fund: string };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [openMode, setOpenMode] = useState<MutationMode | null>(null);
  const [form, setForm] = useState<MutationForm>(empty(initialMode, funds));
  const source = funds.find((item) => item.id === form.sourceFundId);
  const target = funds.find((item) => item.id === form.targetFundId);
  const moving = initialMode === "Pindah";
  const move = moveLedger(form.amount, form.adminFee, form.operationalBearer);
  const sourceAfter = source ? source.balance + (form.mode === "Pindah" ? move.sourceDelta : -(form.amount + form.adminFee)) : 0;
  const targetAfter = target ? target.balance + (form.mode === "Pindah" ? move.targetDelta : form.amount) : 0;

  function show(mode: MutationMode) {
    setForm(empty(mode, funds));
    setOpenMode(mode);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      try {
        await createFundMutation(form);
        toast.success("Mutasi saldo disimpan");
        setOpenMode(null);
        setForm(empty(initialMode, funds));
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan mutasi");
      }
    });
  }

  const columns: ColumnDef<MutationRow>[] = [
    { header: "Tanggal", cell: ({ row }) => <div><p className="whitespace-nowrap">{formatDateTime(row.original.createdAt)}</p><p className="text-xs text-slate-500">{row.original.userName}</p></div> },
    { header: "Sumber Dana", cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.fundName}</span> },
    { header: "Aktivitas", cell: ({ row }) => {
      const outgoing = row.original.balanceAfter < row.original.balanceBefore;
      const variant = row.original.type === "Adjustment" ? "orange" : outgoing ? "red" : row.original.type.includes("Move") ? "blue" : "green";
      return <Badge variant={variant}>{typeLabels[row.original.type] ?? row.original.type.replaceAll("_", " ")}</Badge>;
    } },
    { header: "Nominal", cell: ({ row }) => <div><p>{formatCurrency(row.original.amount)}</p>{row.original.adminFee ? <p className="text-xs text-slate-500">Biaya {formatCurrency(row.original.adminFee)}</p> : null}</div> },
    { header: "Perubahan Saldo", cell: ({ row }) => <div className="whitespace-nowrap"><p>{formatCurrency(row.original.balanceBefore)}</p><p className={`text-xs font-medium ${row.original.balanceAfter < row.original.balanceBefore ? "text-red-600" : "text-emerald-600"}`}>? {formatCurrency(row.original.balanceAfter)}</p></div> },
    { header: "Keterangan", cell: ({ row }) => row.original.note || "-" }
  ];

  return <div className="space-y-6">
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <form method="get" className="grid gap-4 md:grid-cols-[1fr_1fr_1.2fr_auto_auto] md:items-end">
        <input type="hidden" name="mode" value={moving ? "pindah" : "saldo"} />
        <Field label="Dari"><Input type="date" name="from" defaultValue={filters.from} max={filters.to} /></Field>
        <Field label="Sampai"><Input type="date" name="to" defaultValue={filters.to} min={filters.from} /></Field>
        <Field label="Sumber Dana"><Select name="fund" defaultValue={filters.fund}><option value="">Semua sumber dana</option>{filterFunds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name}</option>)}</Select></Field>
        <Button type="submit" variant="outline"><Filter className="h-4 w-4" />Terapkan</Button>
        <Button asChild type="button" variant="ghost"><Link href={`/fund-mutations?mode=${moving ? "pindah" : "saldo"}`}>Reset</Link></Button>
      </form>
    </section>

    <section className={`grid gap-4 ${moving ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
      {moving ? <SummaryCard label="Total Pindah Saldo" value={summary.moved} icon={ArrowLeftRight} tone="border-violet-200 bg-violet-50 text-violet-700" /> : <>
        <SummaryCard label="Total Penambahan" value={summary.added} icon={TrendingUp} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
        <SummaryCard label="Total Pengurangan" value={summary.withdrawn} icon={TrendingDown} tone="border-red-200 bg-red-50 text-red-700" />
        <SummaryCard label="Selisih" value={summary.balance} icon={Scale} tone="border-blue-200 bg-blue-50 text-blue-700" />
      </>}
    </section>

    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-semibold text-slate-950">{moving ? "Data Pindah Saldo" : "Data Ambil & Tambah Saldo"}</h2><p className="mt-1 text-sm text-slate-600">Setiap perubahan menyimpan saldo sebelum, saldo sesudah, dan pengguna pencatat.</p></div>
        {canManage ? <div className="flex flex-wrap gap-2">
          {moving ? (canMoveCreate ? <Button type="button" onClick={() => show("Pindah")}><ArrowLeftRight className="h-4 w-4" />Pindah Saldo</Button> : null) : <>
            {canWithdraw ? <Button type="button" variant="destructive" onClick={() => show("Ambil")}><ArrowUpFromLine className="h-4 w-4" />Ambil Saldo</Button> : null}
            {canDeposit ? <Button type="button" variant="accent" onClick={() => show("Tambah")}><Plus className="h-4 w-4" />Tambah Saldo</Button> : null}
          </>}
        </div> : null}
      </div>
      <DataTable columns={columns} data={mutations} searchPlaceholder="Cari sumber dana, pengguna, atau keterangan..." />
    </section>

    <Dialog open={Boolean(openMode)} onOpenChange={(next) => { if (!next) setOpenMode(null); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.mode === "Pindah" ? "Pindah Saldo Internal" : `${form.mode} Saldo`}</DialogTitle><DialogDescription>Pilih sumber dana dan periksa estimasi saldo sebelum menyimpan.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {form.mode !== "Tambah" ? <Field label="Dari Sumber Dana"><Select aria-label="Dari Sumber Dana" value={String(form.sourceFundId)} onChange={(event) => setForm({ ...form, sourceFundId: Number(event.target.value) })}>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name} ? {formatCurrency(fund.balance)}</option>)}</Select></Field> : null}
            {form.mode !== "Ambil" ? <Field label="Ke Sumber Dana"><Select aria-label="Ke Sumber Dana" value={String(form.targetFundId)} onChange={(event) => setForm({ ...form, targetFundId: Number(event.target.value) })}>{funds.map((fund) => <option key={fund.id} value={fund.id}>{fund.name} ? {formatCurrency(fund.balance)}</option>)}</Select></Field> : null}
            <Field label="Nominal"><CurrencyInput aria-label="Nominal" name="amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required /></Field>
            {form.mode !== "Tambah" ? <Field label="Biaya / Admin"><CurrencyInput aria-label="Biaya / Admin" name="adminFee" value={form.adminFee} onChange={(adminFee) => setForm({ ...form, adminFee })} /></Field> : null}
            {form.mode === "Pindah" ? <Field label="Penanggung Biaya"><Select value={form.operationalBearer} onChange={(event) => setForm({ ...form, operationalBearer: event.target.value as Bearer })}><option value="Tidak_Ada">Tidak Ada</option><option value="Pengirim">Pengirim</option><option value="Penerima">Penerima</option></Select></Field> : null}
            <Field label="Keterangan"><Input value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Keterangan mutasi" /></Field>
          </div>
          <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm sm:grid-cols-2">
            {form.mode !== "Tambah" ? <div><p className="text-xs text-slate-600">Saldo {source?.name ?? "sumber"}</p><p className="mt-1 font-medium text-slate-900">{formatCurrency(source?.balance ?? 0)} ? <span className={sourceAfter < 0 ? "text-red-600" : "text-blue-700"}>{formatCurrency(sourceAfter)}</span></p></div> : null}
            {form.mode !== "Ambil" ? <div><p className="text-xs text-slate-600">Saldo {target?.name ?? "tujuan"}</p><p className="mt-1 font-medium text-slate-900">{formatCurrency(target?.balance ?? 0)} ? <span className="text-emerald-700">{formatCurrency(targetAfter)}</span></p></div> : null}
          </div>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setOpenMode(null)}>Batal</Button><Button type="submit" disabled={pending || funds.length === 0 || (form.mode !== "Tambah" && sourceAfter < 0)}>{pending ? "Menyimpan..." : `Simpan ${form.mode}`}</Button></div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}
