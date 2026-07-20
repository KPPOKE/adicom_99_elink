"use client";

import type { ColumnDef } from "@tanstack/react-table";
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

export function FundMutationsClient({ funds, mutations }: { funds: FundOption[]; mutations: MutationRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<MutationForm>({ ...empty, targetFundId: funds[0]?.id ?? 0, sourceFundId: funds[0]?.id ?? 0 });
  const run = () => startTransition(async () => {
    try { await createFundMutation(form); toast.success("Mutasi saldo disimpan"); setForm({ ...empty, targetFundId: funds[0]?.id ?? 0, sourceFundId: funds[0]?.id ?? 0 }); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan mutasi"); }
  });
  const columns: ColumnDef<MutationRow>[] = [
    { header: "Tanggal", cell: ({ row }) => <div><p>{formatDateTime(row.original.createdAt)}</p><p className="text-xs text-slate-500">{row.original.userName}</p></div> },
    { header: "Sumber Dana", cell: ({ row }) => <span className="font-medium text-slate-100">{row.original.fundName}</span> },
    { header: "Tipe", cell: ({ row }) => <Badge variant={row.original.type.includes("Out") ? "red" : "green"}>{row.original.type.replaceAll("_", " ")}</Badge> },
    { header: "Nominal", cell: ({ row }) => <div><p>{formatCurrency(row.original.amount)}</p><p className="text-xs text-slate-500">Admin {formatCurrency(row.original.adminFee)}</p></div> },
    { header: "Saldo", cell: ({ row }) => <div><p>{formatCurrency(row.original.balanceBefore)}</p><p className="text-xs text-cyan-300">&rarr; {formatCurrency(row.original.balanceAfter)}</p></div> },
    { header: "Catatan", cell: ({ row }) => row.original.note || "-" }
  ];
  const sourceNeeded = form.mode !== "Tambah";
  const targetNeeded = form.mode !== "Ambil";
  return <div className="space-y-6">
    <section className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-lg sm:p-6"><h2 className="mb-4 font-semibold text-slate-100">Input Mutasi Saldo</h2><form action={run} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value as MutationMode })}><option value="Tambah">Tambah Saldo</option><option value="Ambil">Ambil Saldo</option><option value="Pindah">Pindah Saldo</option></Select>
      {sourceNeeded ? <Select value={String(form.sourceFundId)} onChange={(e) => setForm({ ...form, sourceFundId: Number(e.target.value) })}>{funds.map((item) => <option key={item.id} value={item.id}>Dari {item.name} - {formatCurrency(item.balance)}</option>)}</Select> : <div />}
      {targetNeeded ? <Select value={String(form.targetFundId)} onChange={(e) => setForm({ ...form, targetFundId: Number(e.target.value) })}>{funds.map((item) => <option key={item.id} value={item.id}>Ke {item.name} - {formatCurrency(item.balance)}</option>)}</Select> : <div />}
      <CurrencyInput name="amount" value={form.amount} onChange={(amount) => setForm({ ...form, amount })} />
      {form.mode !== "Tambah" ? <CurrencyInput name="adminFee" value={form.adminFee} onChange={(adminFee) => setForm({ ...form, adminFee })} /> : null}
      {form.mode === "Pindah" ? <Select value={form.operationalBearer} onChange={(e) => setForm({ ...form, operationalBearer: e.target.value as Bearer })}><option value="Tidak_Ada">Operasional: Tidak Ada</option><option value="Pengirim">Operasional: Pengirim</option><option value="Penerima">Operasional: Penerima</option></Select> : null}
      <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Keterangan" />
      <Button type="submit" disabled={pending || funds.length === 0}>Simpan Mutasi</Button>
    </form></section>
    <DataTable columns={columns} data={mutations} searchPlaceholder="Cari mutasi saldo..." />
  </div>;
}



