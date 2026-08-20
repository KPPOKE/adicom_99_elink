"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Edit, MoreHorizontal, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteAdminFeeRule, updateAdminFeeStatus, upsertAdminFeeRule } from "@/app/actions/admin-fee";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

type Kind = "Tarik_Tunai" | "Transfer";
type AdminType = "Dalam" | "Luar";
type Rule = { id: number; kind: Kind; nominalFrom: number; nominalTo: number; adminAmount: number; adminType: AdminType };
type Outlet = { id: number; name: string };

const emptyForm = { kind: "Tarik_Tunai" as Kind, nominalFrom: 0, nominalTo: 0, adminAmount: 0, adminType: "Dalam" as AdminType };

export function AdminFeeRuleClient({ outlets, selectedOutletId, isActive, rules }: { outlets: Outlet[]; selectedOutletId: number; isActive: boolean; rules: Rule[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [statusPending, startStatusTransition] = useTransition();
  const [editing, setEditing] = useState<Rule | null>(null);
  const [form, setForm] = useState(emptyForm);

  const run = (action: () => Promise<{ success: boolean; error?: string }>, message: string, onDone?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error || "Operasi gagal");
        return;
      }
      toast.success(message);
      onDone?.();
      router.refresh();
    });

  const changeOutlet = (outletId: number) => router.push(`/settings/admin-otomatis?outletId=${outletId}`);

  const toggleStatus = (next: boolean) =>
    startStatusTransition(async () => {
      const result = await updateAdminFeeStatus(selectedOutletId, next);
      if (!result.success) {
        toast.error(result.error);
        return;
      }
      toast.success(next ? "Admin otomatis diaktifkan" : "Admin otomatis dinonaktifkan");
      router.refresh();
    });

  const submitRule = (event: React.FormEvent) => {
    event.preventDefault();
    run(
      () => upsertAdminFeeRule({ ...form, id: editing?.id, outletId: selectedOutletId }),
      editing ? "Aturan diperbarui" : "Aturan ditambahkan",
      () => {
        setEditing(null);
        setForm(emptyForm);
      }
    );
  };

  const editRule = (rule: Rule) => {
    setEditing(rule);
    setForm({ kind: rule.kind, nominalFrom: rule.nominalFrom, nominalTo: rule.nominalTo, adminAmount: rule.adminAmount, adminType: rule.adminType });
  };

  const columnsFor = (kind: Kind): ColumnDef<Rule>[] => [
    { id: "no", header: "No", cell: ({ row }) => rules.filter((item) => item.kind === kind).findIndex((item) => item.id === row.original.id) + 1 },
    { header: "Nominal Dari", cell: ({ row }) => formatCurrency(row.original.nominalFrom) },
    { header: "Nominal Sampai", cell: ({ row }) => formatCurrency(row.original.nominalTo) },
    { header: "Admin", cell: ({ row }) => <span className="font-semibold text-emerald-700">{formatCurrency(row.original.adminAmount)}</span> },
    { header: "Tipe", cell: ({ row }) => <Badge variant={row.original.adminType === "Dalam" ? "blue" : "orange"}>{row.original.adminType === "Dalam" ? "Dalam" : "Luar"}</Badge> },
    {
      id: "actions",
      header: () => <div className="text-center">Aksi</div>,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
      cell: ({ row }) => (
        <div className="flex w-full justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs" title="Menu Aksi">
                <MoreHorizontal className="h-4 w-4 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 p-1.5">
              <DropdownMenuItem onClick={() => editRule(row.original)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                <Edit className="h-3.5 w-3.5 text-blue-600" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <ConfirmDialog
                title="Hapus aturan?"
                description="Aturan admin otomatis ini akan dihapus permanen."
                onConfirm={() => run(() => deleteAdminFeeRule(row.original.id), "Aturan dihapus")}
                trigger={
                  <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    <span>Hapus</span>
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  const tarikTunaiRules = rules.filter((rule) => rule.kind === "Tarik_Tunai");
  const transferRules = rules.filter((rule) => rule.kind === "Transfer");

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full space-y-1.5 sm:max-w-xs">
            <Label>Pilih Toko</Label>
            <Select value={selectedOutletId || ""} onChange={(event) => changeOutlet(Number(event.target.value))}>
              {outlets.map((outlet) => (
                <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
              ))}
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">Status Admin Otomatis</span>
            <label className="relative inline-flex cursor-pointer items-center">
              <input type="checkbox" className="peer sr-only" checked={isActive} disabled={statusPending} onChange={(event) => toggleStatus(event.target.checked)} />
              <div className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600 peer-disabled:opacity-60" />
              <div className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
            </label>
            <Badge variant={isActive ? "green" : "red"}>{isActive ? "AKTIF" : "NONAKTIF"}</Badge>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-4">
        <h2 className="font-semibold text-slate-900">{editing ? "Edit Aturan" : "Tambah Aturan Baru"}</h2>
        <form onSubmit={submitRule} className="grid gap-4 md:grid-cols-2 xl:grid-cols-5 xl:items-end">
          <div className="space-y-1.5">
            <Label>Jenis Transaksi</Label>
            <Select value={form.kind} onChange={(event) => setForm({ ...form, kind: event.target.value as Kind })}>
              <option value="Tarik_Tunai">Tarik Tunai</option>
              <option value="Transfer">Transfer</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Nominal Dari (Rp)</Label>
            <CurrencyInput value={form.nominalFrom} onChange={(value) => setForm({ ...form, nominalFrom: value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Nominal Sampai (Rp)</Label>
            <CurrencyInput value={form.nominalTo} onChange={(value) => setForm({ ...form, nominalTo: value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Nominal Admin (Rp)</Label>
            <CurrencyInput value={form.adminAmount} onChange={(value) => setForm({ ...form, adminAmount: value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Tipe Admin</Label>
            <Select value={form.adminType} onChange={(event) => setForm({ ...form, adminType: event.target.value as AdminType })}>
              <option value="Dalam">Admin Dalam</option>
              <option value="Luar">Admin Luar</option>
            </Select>
          </div>
          <div className="flex gap-2 xl:col-span-5">
            <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : "Simpan"}</Button>
            {editing ? <Button type="button" variant="ghost" onClick={() => { setEditing(null); setForm(emptyForm); }}>Batal</Button> : null}
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Aturan Tarik Tunai</h2>
        <DataTable columns={columnsFor("Tarik_Tunai")} data={tarikTunaiRules} searchPlaceholder="Cari aturan..." />
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5 space-y-3">
        <h2 className="font-semibold text-slate-900">Aturan Transfer</h2>
        <DataTable columns={columnsFor("Transfer")} data={transferRules} searchPlaceholder="Cari aturan..." />
      </section>

      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-slate-700">
        <strong>Cara kerja:</strong> Saat pegawai input nominal transaksi, sistem otomatis mengisi admin berdasarkan range nominal yang sudah diatur. Field admin tetap bisa diubah manual bila diperlukan.
      </div>
    </div>
  );
}
