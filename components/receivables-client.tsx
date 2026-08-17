"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Edit, MoreHorizontal, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteReceivable, setReceivableStatus, upsertReceivable } from "@/app/actions/elink-core";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

type Row = { id: number; customerId: number; customerName: string; loanDate: string; amount: number; description: string | null; status: "Belum_Lunas" | "Lunas"; recordExpense: boolean; sourceFundId: number | null; sourceFundName: string | null; creatorName: string };
type FormState = { id?: number; customerId: number; loanDate: string; amount: number; description: string; recordExpense: boolean; sourceFundId?: number };
const empty = (): FormState => ({ customerId: 0, loanDate: new Date().toISOString().slice(0, 10), amount: 0, description: "", recordExpense: false });

export function ReceivablesClient({ rows, customers, funds, canManage }: { rows: Row[]; customers: Array<{ id: number; name: string }>; funds: Array<{ id: number; name: string; balance: number }>; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>, message: string, close = false) => startTransition(async () => {
    try { await action(); toast.success(message); if (close) { setOpen(false); setForm(empty()); } router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Operasi gagal"); }
  });
  const edit = (row: Row) => { setForm({ id: row.id, customerId: row.customerId, loanDate: row.loanDate.slice(0, 10), amount: row.amount, description: row.description ?? "", recordExpense: row.recordExpense, sourceFundId: row.sourceFundId ?? undefined }); setOpen(true); };
  const columns: ColumnDef<Row>[] = [
    { header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "Lunas" ? "green" : "red"}>{row.original.status === "Lunas" ? "Lunas" : "Belum Lunas"}</Badge> },
    { header: "Pelanggan", cell: ({ row }) => <div><p className="font-medium">{row.original.customerName}</p><p className="text-xs text-slate-500">{formatDate(row.original.loanDate)}</p></div> },
    { accessorKey: "description", header: "Keterangan", cell: ({ row }) => row.original.description || "-" },
    { header: "Sumber Dana", cell: ({ row }) => row.original.recordExpense ? row.original.sourceFundName : "Tidak dicatat" },
    { header: "Nominal", cell: ({ row }) => <span className="font-semibold text-emerald-700">{formatCurrency(row.original.amount)}</span> },
    { accessorKey: "creatorName", header: "Pembuat" },
    { id: "actions", header: () => <div className="text-center">Aksi</div>, meta: { headerClassName: "text-center", cellClassName: "text-center" }, cell: ({ row }) => canManage ? <div className="flex w-full justify-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs" title="Menu Aksi"><MoreHorizontal className="h-4 w-4 text-slate-600" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-48 p-1.5">
      {row.original.status === "Belum_Lunas" ? <DropdownMenuItem onClick={() => edit(row.original)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"><Edit className="h-3.5 w-3.5 text-blue-600" /><span>Edit</span></DropdownMenuItem> : null}
      <DropdownMenuItem
        onClick={() => run(() => setReceivableStatus(row.original.id, row.original.status === "Lunas" ? "Belum_Lunas" : "Lunas"), row.original.status === "Lunas" ? "Piutang dibuka kembali" : "Piutang ditandai lunas")}
        className={row.original.status === "Lunas" ? "text-slate-700 focus:bg-slate-50" : "text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50"}
      >
        {row.original.status === "Lunas" ? <RotateCcw className="h-3.5 w-3.5 text-slate-500" /> : <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
        <span>{row.original.status === "Lunas" ? "Buka kembali" : "Tandai lunas"}</span>
      </DropdownMenuItem>
      {row.original.status === "Belum_Lunas" ? (
        <>
          <DropdownMenuSeparator />
          <ConfirmDialog onConfirm={() => run(() => deleteReceivable(row.original.id), "Piutang dihapus")} trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /><span>Hapus</span></DropdownMenuItem>} />
        </>
      ) : null}
    </DropdownMenuContent></DropdownMenu></div> : null }
  ];
  const total = rows.filter((row) => row.status === "Belum_Lunas").reduce((sum, row) => sum + row.amount, 0);
  return <div className="space-y-6">
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">Total Piutang Belum Lunas</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(total)}</p></div>
    <DataTable columns={columns} data={rows} searchPlaceholder="Cari pelanggan atau keterangan..." filters={canManage ? <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setForm(empty()); }}><DialogTrigger asChild><Button type="button"><Plus className="h-4 w-4" />Hutang Baru</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{form.id ? "Edit Piutang" : "Form Piutang"}</DialogTitle></DialogHeader><form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); run(() => upsertReceivable(form), "Piutang disimpan", true); }}>
      <Field label="Tanggal Peminjaman"><Input type="date" value={form.loanDate} onChange={(e) => setForm({ ...form, loanDate: e.target.value })} required /></Field>
      <Field label="Nominal"><CurrencyInput value={form.amount} onChange={(amount) => setForm({ ...form, amount })} required /></Field>
      <Field label="Pilih Pelanggan"><Select value={form.customerId || ""} onChange={(e) => setForm({ ...form, customerId: Number(e.target.value) })} required><option value="">Pilih pelanggan</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Keterangan"><Textarea className="min-h-10" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
      <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={form.recordExpense} onChange={(e) => setForm({ ...form, recordExpense: e.target.checked, sourceFundId: e.target.checked ? form.sourceFundId : undefined })} />Catat sebagai Pengeluaran di Buku Kas?</label>
      {form.recordExpense ? <div className="sm:col-span-2"><Field label="Pilih Sumber Dana"><Select value={form.sourceFundId || ""} onChange={(e) => setForm({ ...form, sourceFundId: Number(e.target.value) })} required><option value="">Pilih sumber dana</option>{funds.map((item) => <option key={item.id} value={item.id}>{item.name} - {formatCurrency(item.balance)}</option>)}</Select></Field></div> : null}
      <Button className="sm:col-span-2" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
    </form></DialogContent></Dialog> : undefined} />
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }