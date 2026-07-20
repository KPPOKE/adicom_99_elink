"use client";

import type { ColumnDef } from "@tanstack/react-table";
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

export function FundsClient({ funds }: { funds: FundRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [form, setForm] = useState<FundForm>(empty);
  const run = (action: () => Promise<void>, message: string) => startTransition(async () => {
    try { await action(); toast.success(message); setForm(empty); router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan data"); }
  });
  const columns: ColumnDef<FundRow>[] = [
    { header: "Sumber Dana", cell: ({ row }) => <div><p className="font-medium text-slate-100">{row.original.name}</p><p className="text-xs text-slate-500">{row.original.note || "-"}</p></div> },
    { header: "Tipe", cell: ({ row }) => <Badge variant="blue">{row.original.type.replace("_", " ")}</Badge> },
    { header: "Saldo", cell: ({ row }) => <span className="font-semibold text-cyan-300">{formatCurrency(row.original.balance)}</span> },
    { header: "Saldo Awal", cell: ({ row }) => formatCurrency(row.original.openingBalance) },
    { header: "Status", cell: ({ row }) => <Badge variant={row.original.isActive ? "green" : "red"}>{row.original.isActive ? "Aktif" : "Nonaktif"}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setForm({ id: row.original.id, name: row.original.name, type: row.original.type, balance: row.original.balance, note: row.original.note ?? "", isActive: row.original.isActive })}>Edit</Button><Button type="button" variant="outline" size="sm" onClick={() => run(() => toggleFundAccount(row.original.id, !row.original.isActive), row.original.isActive ? "Sumber dana dinonaktifkan" : "Sumber dana diaktifkan")}>{row.original.isActive ? "Nonaktifkan" : "Aktifkan"}</Button></div> }
  ];
  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-3">{[
      ["Total Aset", funds.reduce((s, f) => s + f.balance, 0)],
      ["Aset Cash", funds.filter((f) => f.type === "Cash").reduce((s, f) => s + f.balance, 0)],
      ["Aset Bank/E-wallet", funds.filter((f) => f.type !== "Cash").reduce((s, f) => s + f.balance, 0)]
    ].map(([label, value]) => <div key={label} className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold text-cyan-300">{formatCurrency(Number(value))}</p></div>)}</section>
    <section className="rounded-lg border border-slate-700/60 bg-slate-900/60 p-4 shadow-lg sm:p-6"><h2 className="mb-4 font-semibold text-slate-100">{form.id ? "Edit Sumber Dana" : "Tambah Sumber Dana"}</h2><form action={() => run(() => upsertFundAccount(form), form.id ? "Sumber dana diperbarui" : "Sumber dana dibuat")} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nama, contoh BCA" required /><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as FundRow["type"] })}><option value="Cash">Cash</option><option value="Bank">Bank</option><option value="Ewallet">E-wallet</option><option value="Pulsa_Server">Server Pulsa</option><option value="Other">Lainnya</option></Select><CurrencyInput name="balance" value={form.balance} onChange={(value) => setForm({ ...form, balance: value })} disabled={Boolean(form.id)} /><Textarea className="xl:col-span-1" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Catatan" /><div className="flex gap-2"><Button type="submit" disabled={pending}>{form.id ? "Simpan" : "Tambah"}</Button>{form.id ? <Button type="button" variant="outline" onClick={() => setForm(empty)}>Batal</Button> : null}</div></form></section>
    <DataTable columns={columns} data={funds} searchPlaceholder="Cari sumber dana..." />
  </div>;
}


