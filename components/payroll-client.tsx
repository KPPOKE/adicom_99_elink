"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deletePayroll, upsertPayroll } from "@/app/actions/elink-core";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency, formatDate } from "@/lib/utils";

type Row = { id: number; employeeId: number; employeeName: string; period: string; baseSalary: number; allowance: number; deduction: number; totalSalary: number; paymentDate: string | null; status: "Pending" | "Dibayar"; note: string | null };
type FormState = { id?: number; employeeId: number; period: string; baseSalary: number; allowance: number; deduction: number; paymentDate: string; status: "Pending" | "Dibayar"; note: string };
const empty = (): FormState => ({ employeeId: 0, period: new Date().toISOString().slice(0, 7), baseSalary: 0, allowance: 0, deduction: 0, paymentDate: "", status: "Pending", note: "" });

export function PayrollClient({ rows, employees, canManage }: { rows: Row[]; employees: Array<{ id: number; name: string }>; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(empty);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>, message: string, close = false) => startTransition(async () => {
    try { await action(); toast.success(message); if (close) { setOpen(false); setForm(empty()); } router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Operasi gagal"); }
  });
  const edit = (row: Row) => { setForm({ id: row.id, employeeId: row.employeeId, period: row.period.slice(0, 7), baseSalary: row.baseSalary, allowance: row.allowance, deduction: row.deduction, paymentDate: row.paymentDate?.slice(0, 10) ?? "", status: row.status, note: row.note ?? "" }); setOpen(true); };
  const columns: ColumnDef<Row>[] = [
    { accessorKey: "employeeName", header: "Pegawai" },
    { header: "Periode", cell: ({ row }) => new Date(row.original.period).toLocaleDateString("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }) },
    { header: "Gaji Pokok", cell: ({ row }) => formatCurrency(row.original.baseSalary) },
    { header: "Tunjangan", cell: ({ row }) => formatCurrency(row.original.allowance) },
    { header: "Potongan", cell: ({ row }) => formatCurrency(row.original.deduction) },
    { header: "Total Gaji", cell: ({ row }) => <span className="font-semibold text-emerald-700">{formatCurrency(row.original.totalSalary)}</span> },
    { header: "Tanggal Bayar", cell: ({ row }) => row.original.paymentDate ? formatDate(row.original.paymentDate) : "-" },
    { header: "Status", cell: ({ row }) => <Badge variant={row.original.status === "Dibayar" ? "green" : "slate"}>{row.original.status}</Badge> },
    { id: "actions", header: "", cell: ({ row }) => canManage ? <div className="flex justify-end gap-2"><Button variant="outline" size="icon" title="Edit" onClick={() => edit(row.original)}><Edit className="h-4 w-4" /></Button><ConfirmDialog onConfirm={() => run(() => deletePayroll(row.original.id), "Penggajian dihapus")} trigger={<Button variant="outline" size="icon" title="Hapus"><Trash2 className="h-4 w-4 text-red-600" /></Button>} /></div> : null }
  ];
  const paid = rows.filter((row) => row.status === "Dibayar").reduce((sum, row) => sum + row.totalSalary, 0);
  const pendingTotal = rows.filter((row) => row.status === "Pending").reduce((sum, row) => sum + row.totalSalary, 0);
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-2"><Summary label="Total Dibayar" value={paid} /><Summary label="Menunggu Pembayaran" value={pendingTotal} /></div>
    <DataTable columns={columns} data={rows} searchPlaceholder="Cari pegawai..." filters={canManage ? <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setForm(empty()); }}><DialogTrigger asChild><Button type="button"><Plus className="h-4 w-4" />Tambah Penggajian</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{form.id ? "Edit Penggajian" : "Tambah Penggajian"}</DialogTitle></DialogHeader><form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => { event.preventDefault(); run(() => upsertPayroll(form), "Penggajian disimpan", true); }}>
      <Field label="Pegawai"><Select value={form.employeeId || ""} onChange={(e) => setForm({ ...form, employeeId: Number(e.target.value) })} required><option value="">Pilih pegawai</option>{employees.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Periode"><Input type="month" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} required /></Field>
      <Field label="Gaji Pokok"><CurrencyInput value={form.baseSalary} onChange={(baseSalary) => setForm({ ...form, baseSalary })} /></Field>
      <Field label="Tunjangan"><CurrencyInput value={form.allowance} onChange={(allowance) => setForm({ ...form, allowance })} /></Field>
      <Field label="Potongan"><CurrencyInput value={form.deduction} onChange={(deduction) => setForm({ ...form, deduction })} /></Field>
      <Field label="Total Gaji"><Input readOnly value={formatCurrency(Math.max(0, form.baseSalary + form.allowance - form.deduction))} /></Field>
      <Field label="Status"><Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as FormState["status"], paymentDate: e.target.value === "Dibayar" ? form.paymentDate || new Date().toISOString().slice(0, 10) : "" })}><option value="Pending">Pending</option><option value="Dibayar">Dibayar</option></Select></Field>
      <Field label="Tanggal Bayar"><Input type="date" value={form.paymentDate} disabled={form.status !== "Dibayar"} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required={form.status === "Dibayar"} /></Field>
      <div className="sm:col-span-2"><Field label="Keterangan"><Textarea value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field></div>
      <Button className="sm:col-span-2" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
    </form></DialogContent></Dialog> : undefined} />
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }
function Summary({ label, value }: { label: string; value: number }) { return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-emerald-700">{formatCurrency(value)}</p></div>; }