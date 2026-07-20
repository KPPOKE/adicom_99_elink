"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createFundMutation } from "@/app/actions/funds";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type FundOption = { id: number; name: string; balance: number };
type MutationRow = { id: number; fundName: string; type: string; amount: number; adminFee: number; balanceBefore: number; balanceAfter: number; note: string | null; userName: string; createdAt: string };
type MutationMode = "Tambah" | "Ambil" | "Pindah";
type Bearer = "Pengirim" | "Penerima" | "Tidak_Ada";
type MutationForm = { mode: MutationMode; sourceFundId: number; targetFundId: number; amount: number; adminFee: number; operationalBearer: Bearer; note: string };

const empty: MutationForm = { mode: "Tambah", sourceFundId: 0, targetFundId: 0, amount: 0, adminFee: 0, operationalBearer: "Tidak_Ada", note: "" };
const modes: Array<{ mode: MutationMode; label: string; icon: React.ReactNode }> = [
  { mode: "Tambah", label: "Tambah Saldo", icon: <ArrowDownToLine className="h-4 w-4" /> },
  { mode: "Ambil", label: "Ambil Saldo", icon: <ArrowUpFromLine className="h-4 w-4" /> },
  { mode: "Pindah", label: "Pindah Saldo", icon: <ArrowLeftRight className="h-4 w-4" /> }
];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>{children}</label>;
}

export function FundMutationsClient({ funds, mutations }: { funds: FundOption[]; mutations: MutationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<MutationForm>({ ...empty, targetFundId: funds[0]?.id ?? 0, sourceFundId: funds[0]?.id ?? 0 });
  const source = funds.find((item) => item.id === form.sourceFundId);
  const target = funds.find((item) => item.id === form.targetFundId);
  const run = () => startTransition(async () => {
    try { await createFundMutation(form); toast.success("Mutasi saldo disimpan"); setForm({ ...empty, targetFundId: funds[0]?.id ?? 0, sourceFundId: funds[0]?.id ?? 0 }); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan mutasi"); }
  });
  const columns: ColumnDef<MutationRow>[] = [
    { header: "Tanggal", cell: ({ row }) => <div><p>{formatDateTime(row.original.createdAt)}</p><p className="text-xs text-slate-500">{row.original.userName}</p></div> },
    { header: "Sumber Dana", cell: ({ row }) => <span className="font-medium text-slate-100">{row.original.fundName}</span> },
    { header: "Tipe", cell: ({ row }) => <Badge variant={row.original.type.includes("Out") ? "red" : "green"}>{row.original.type.replaceAll("_", " ")}</Badge> },
    { header: "Nominal", cell: ({ row }) => <div><p>{formatCurrency(row.original.amount)}</p><p className="text-xs text-slate-500">Admin {formatCurrency(row.original.adminFee)}</p></div> },
    { header: "Saldo", cell: ({ row }) => <div><p>{formatCurrency(row.original.balanceBefore)}</p><p className="text-xs text-cyan-300">-&gt; {formatCurrency(row.original.balanceAfter)}</p></div> },
    { header: "Catatan", cell: ({ row }) => row.original.note || "-" }
  ];
  const sourceNeeded = form.mode !== "Tambah";
  const targetNeeded = form.mode !== "Ambil";
  return <div className="space-y-6">
    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg sm:p-6">
      <div className="mb-5"><h2 className="font-semibold text-slate-100">Input Mutasi Saldo</h2><p className="mt-1 text-sm text-slate-500">Pakai ini untuk modal harian, setor/ambil kas, dan pindah saldo antar rekening.</p></div>
      <form action={run} className="space-y-5">
        <div className="grid gap-2 sm:grid-cols-3">
          {modes.map((item) => <button key={item.mode} type="button" onClick={() => setForm({ ...form, mode: item.mode })} className={`flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-medium transition ${form.mode === item.mode ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 bg-slate-950/40 text-slate-400 hover:border-slate-500"}`}>{item.icon}{item.label}</button>)}
        </div>
        <div className="grid gap-4 lg:grid-cols-4">
          {sourceNeeded ? <Field label="Dari Sumber Dana"><Select value={String(form.sourceFundId)} onChange={(e) => setForm({ ...form, sourceFundId: Number(e.target.value) })}>{funds.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select></Field> : null}
          {targetNeeded ? <Field label="Ke Sumber Dana"><Select value={String(form.targetFundId)} onChange={(e) => setForm({ ...form, targetFundId: Number(e.target.value) })}>{funds.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select></Field> : null}
          <Field label="Nominal"><CurrencyInput name="amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} /></Field>
          {form.mode !== "Tambah" ? <Field label="Biaya/Admin"><CurrencyInput name="adminFee" value={form.adminFee} onChange={(adminFee) => setForm({ ...form, adminFee })} /></Field> : null}
          {form.mode === "Pindah" ? <Field label="Penanggung Biaya"><Select value={form.operationalBearer} onChange={(e) => setForm({ ...form, operationalBearer: e.target.value as Bearer })}><option value="Tidak_Ada">Tidak Ada</option><option value="Pengirim">Pengirim</option><option value="Penerima">Penerima</option></Select></Field> : null}
          <Field label="Catatan"><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Keterangan mutasi" /></Field>
        </div>
        <div className="flex flex-col gap-4 rounded-lg border border-slate-800 bg-slate-950/35 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid gap-3 text-sm text-slate-400 sm:grid-cols-3"><div><p className="text-xs uppercase text-slate-500">Dari</p><p className="font-medium text-slate-200">{sourceNeeded ? source?.name ?? "-" : "Setoran baru"}</p></div><div><p className="text-xs uppercase text-slate-500">Ke</p><p className="font-medium text-slate-200">{targetNeeded ? target?.name ?? "-" : "Diambil keluar"}</p></div><div><p className="text-xs uppercase text-slate-500">Nominal</p><p className="font-semibold text-cyan-300">{formatCurrency(form.amount)}</p></div></div>
          <Button type="submit" disabled={pending || funds.length === 0}>{pending ? "Menyimpan..." : `Simpan ${form.mode}`}</Button>
        </div>
      </form>
    </section>
    <DataTable columns={columns} data={mutations} searchPlaceholder="Cari mutasi saldo..." />
  </div>;
}
