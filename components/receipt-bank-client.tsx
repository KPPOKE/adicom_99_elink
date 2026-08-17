"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteReceiptBank, upsertReceiptBank } from "@/app/actions/elink-core";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Row = { id: number; bankName: string; accountName: string; accountNumber: string };
const empty = { bankName: "", accountName: "", accountNumber: "" };

export function ReceiptBankClient({ rows, canManage }: { rows: Row[]; canManage: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Row | Omit<Row, "id">>(empty);
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<void>, message: string, close = false) => startTransition(async () => {
    try { await action(); toast.success(message); if (close) { setOpen(false); setForm(empty); } router.refresh(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Operasi gagal"); }
  });
  const columns: ColumnDef<Row>[] = [
    { accessorKey: "bankName", header: "Nama Bank" },
    { accessorKey: "accountName", header: "Pemilik Rekening" },
    { accessorKey: "accountNumber", header: "Nomor Rekening" },
    { id: "actions", header: () => <div className="text-center">Aksi</div>, meta: { headerClassName: "text-center", cellClassName: "text-center" }, cell: ({ row }) => canManage ? <div className="flex w-full justify-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-8 w-8 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs" title="Menu Aksi"><MoreHorizontal className="h-4 w-4 text-slate-600" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44 p-1.5"><DropdownMenuItem onClick={() => { setForm(row.original); setOpen(true); }} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"><Edit className="h-3.5 w-3.5 text-blue-600" /><span>Edit</span></DropdownMenuItem><DropdownMenuSeparator /><ConfirmDialog onConfirm={() => run(() => deleteReceiptBank(row.original.id), "Master bank dihapus")} trigger={<DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50"><Trash2 className="h-3.5 w-3.5 text-red-500" /><span>Hapus</span></DropdownMenuItem>} /></DropdownMenuContent></DropdownMenu></div> : null }
  ];
  return <DataTable columns={columns} data={rows} searchPlaceholder="Cari bank atau nomor rekening..." filters={canManage ? <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setForm(empty); }}><DialogTrigger asChild><Button type="button"><Plus className="h-4 w-4" />Tambah Bank</Button></DialogTrigger><DialogContent className="max-w-lg"><DialogHeader><DialogTitle>{"id" in form ? "Edit Bank" : "Tambah Bank"}</DialogTitle></DialogHeader><form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); run(() => upsertReceiptBank(form), "Master bank disimpan", true); }}>
    <Field label="Nama Bank"><Input value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} placeholder="Contoh: BRI" required /></Field>
    <Field label="Nama Pemilik Rekening"><Input value={form.accountName} onChange={(e) => setForm({ ...form, accountName: e.target.value })} required /></Field>
    <Field label="Nomor Rekening"><Input value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} inputMode="numeric" required /></Field>
    <Button disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
  </form></DialogContent></Dialog> : undefined} />;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }