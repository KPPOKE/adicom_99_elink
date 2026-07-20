"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Landmark, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toggleFundAccount, upsertFundAccount } from "@/app/actions/funds";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";

type FundRow = { id: number; name: string; type: "Cash" | "Bank" | "Ewallet" | "Pulsa_Server" | "Other"; balance: number; openingBalance: number; note: string | null; isActive: boolean };
type FundForm = { id?: number; name: string; type: FundRow["type"]; balance: number; note: string; isActive: boolean };

const empty: FundForm = { name: "", type: "Bank", balance: 0, note: "", isActive: true };

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>{children}{hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}</label>;
}

export function FundsClient({ funds }: { funds: FundRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FundForm>(empty);
  const run = (action: () => Promise<void>, message: string) => startTransition(async () => {
    try { await action(); toast.success(message); setForm(empty); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan data"); }
  });
  const totalCash = funds.filter((f) => f.type === "Cash").reduce((s, f) => s + f.balance, 0);
  const totalNonCash = funds.filter((f) => f.type !== "Cash").reduce((s, f) => s + f.balance, 0);
  const columns: ColumnDef<FundRow>[] = [
    { header: "Sumber Dana", cell: ({ row }) => <div><p className="font-medium text-slate-100">{row.original.name}</p><p className="text-xs text-slate-500">{row.original.note || "-"}</p></div> },
    { header: "Tipe", cell: ({ row }) => <Badge variant="blue">{row.original.type.replace("_", " ")}</Badge> },
    { header: "Saldo", cell: ({ row }) => <span className="font-semibold text-cyan-300">{formatCurrency(row.original.balance)}</span> },
    { header: "Saldo Awal", cell: ({ row }) => formatCurrency(row.original.openingBalance) },
    { header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "green" : "red"}>{row.original.isActive ? "Aktif" : "Nonaktif"}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setForm({ id: row.original.id, name: row.original.name, type: row.original.type, balance: row.original.balance, note: row.original.note ?? "", isActive: row.original.isActive })}>Edit</Button><Button type="button" variant="outline" size="sm" onClick={() => run(() => toggleFundAccount(row.original.id, !row.original.isActive), row.original.isActive ? "Sumber dana dinonaktifkan" : "Sumber dana diaktifkan")}>{row.original.isActive ? "Nonaktifkan" : "Aktifkan"}</Button></div> }
  ];
  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-3">
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5"><div className="flex items-center gap-3 text-slate-400"><Wallet className="h-5 w-5 text-cyan-300" /><span className="text-sm">Total Aset</span></div><p className="mt-3 text-2xl font-semibold text-cyan-300">{formatCurrency(totalCash + totalNonCash)}</p></div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5"><div className="flex items-center gap-3 text-slate-400"><Wallet className="h-5 w-5 text-emerald-300" /><span className="text-sm">Aset Cash</span></div><p className="mt-3 text-2xl font-semibold text-cyan-300">{formatCurrency(totalCash)}</p></div>
      <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5"><div className="flex items-center gap-3 text-slate-400"><Landmark className="h-5 w-5 text-blue-300" /><span className="text-sm">Aset Bank/E-wallet</span></div><p className="mt-3 text-2xl font-semibold text-cyan-300">{formatCurrency(totalNonCash)}</p></div>
    </section>

    <section className="rounded-xl border border-slate-700/60 bg-slate-900/60 p-5 shadow-lg sm:p-6">
      <div className="mb-5"><h2 className="font-semibold text-slate-100">{form.id ? "Edit Sumber Dana" : "Tambah Sumber Dana"}</h2><p className="mt-1 text-sm text-slate-500">Saldo awal hanya saat membuat sumber dana baru. Perubahan saldo berikutnya lewat Mutasi Saldo.</p></div>
      <form action={() => run(() => upsertFundAccount(form), form.id ? "Sumber dana diperbarui" : "Sumber dana dibuat")} className="space-y-5">
        <div className="grid gap-4 lg:grid-cols-[1.1fr_0.8fr_0.9fr_1.4fr]">
          <Field label="Nama"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Contoh: BCA, BRI, DANA" required /></Field>
          <Field label="Tipe"><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FundRow["type"] })}><option value="Cash">Cash</option><option value="Bank">Bank</option><option value="Ewallet">E-wallet</option><option value="Pulsa_Server">Server Pulsa</option><option value="Other">Lainnya</option></Select></Field>
          <Field label={form.id ? "Saldo Sekarang" : "Saldo Awal"} hint={form.id ? "Edit saldo via Mutasi Saldo." : undefined}><CurrencyInput name="balance" value={form.balance} onChange={(value) => setForm({ ...form, balance: value })} disabled={Boolean(form.id)} /></Field>
          <Field label="Catatan"><Textarea className="min-h-10" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Contoh: rekening operasional utama" /></Field>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end"><Button type="submit" disabled={pending}>{form.id ? "Simpan Perubahan" : "Tambah Sumber Dana"}</Button>{form.id ? <Button type="button" variant="outline" onClick={() => setForm(empty)}>Batal Edit</Button> : null}</div>
      </form>
    </section>

    <DataTable columns={columns} data={funds} searchPlaceholder="Cari sumber dana..." />
  </div>;
}
