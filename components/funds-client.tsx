"use client";

import { Banknote, CircleDollarSign, History, Landmark, Pencil, Plus, Search, Server, Smartphone, Wallet } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { upsertFundAccount } from "@/app/actions/funds";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency, formatDateTime } from "@/lib/utils";

type FundType = "Cash" | "Bank" | "Ewallet" | "Pulsa_Server" | "Other";
type FundRow = { id: number; name: string; image: string | null; type: FundType; balance: number; openingBalance: number; note: string | null; isActive: boolean; updatedAt: string };
type FundForm = { id?: number; name: string; type: FundType; balance: number; adjustmentReason: string; note: string; isActive: boolean };

const empty: FundForm = { name: "", type: "Bank", balance: 0, adjustmentReason: "", note: "", isActive: true };
const typeConfig = {
  Cash: { label: "Cash / Laci", icon: Wallet, badge: "blue", accent: "border-blue-200 bg-blue-50 text-blue-700" },
  Bank: { label: "Bank", icon: Landmark, badge: "green", accent: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  Ewallet: { label: "E-wallet", icon: Smartphone, badge: "cyan", accent: "border-cyan-200 bg-cyan-50 text-cyan-700" },
  Pulsa_Server: { label: "Server Pulsa", icon: Server, badge: "orange", accent: "border-orange-200 bg-orange-50 text-orange-700" },
  Other: { label: "Lainnya", icon: Banknote, badge: "slate", accent: "border-slate-200 bg-slate-50 text-slate-700" }
} as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="space-y-1.5"><span className="block text-sm font-medium text-slate-700">{label}</span>{children}{hint ? <span className="block text-xs text-slate-500">{hint}</span> : null}</label>;
}

function AssetSummary({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof Wallet; tone: string }) {
  return <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950">{formatCurrency(value)}</p></div><div className={cn("flex h-11 w-11 items-center justify-center rounded-lg border", tone)}><Icon className="h-5 w-5" aria-hidden="true" /></div></div></div>;
}

export function FundsClient({ funds, canManage }: { funds: FundRow[]; canManage: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FundForm>(empty);
  const selected = form.id ? funds.find((item) => item.id === form.id) : undefined;
  const balanceChanged = Boolean(selected && selected.balance !== form.balance);
  const visibleFunds = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase("id-ID");
    if (!keyword) return funds;
    return funds.filter((item) => [item.name, item.note, typeConfig[item.type].label].some((value) => value?.toLocaleLowerCase("id-ID").includes(keyword)));
  }, [funds, query]);
  const totalCash = funds.filter((item) => item.type === "Cash").reduce((sum, item) => sum + item.balance, 0);
  const totalNonCash = funds.filter((item) => item.type !== "Cash").reduce((sum, item) => sum + item.balance, 0);

  function openFund(fund?: FundRow) {
    setForm(fund ? { id: fund.id, name: fund.name, type: fund.type, balance: fund.balance, adjustmentReason: "", note: fund.note ?? "", isActive: fund.isActive } : empty);
    setOpen(true);
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (balanceChanged && !form.adjustmentReason.trim()) return void toast.error("Alasan penyesuaian saldo wajib diisi");
    const payload = new FormData(event.currentTarget);
    Object.entries(form).forEach(([key, value]) => payload.set(key, String(value)));
    startTransition(async () => {
      try {
        await upsertFundAccount(payload);
        toast.success(form.id ? "Sumber dana diperbarui" : "Sumber dana dibuat");
        setOpen(false);
        setForm(empty);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan sumber dana");
      }
    });
  }

  return <div className="space-y-6">
    <section className="grid gap-4 md:grid-cols-3">
      <AssetSummary label="Total Aset" value={totalCash + totalNonCash} icon={CircleDollarSign} tone="border-blue-200 bg-blue-50 text-blue-700" />
      <AssetSummary label="Aset Cash" value={totalCash} icon={Wallet} tone="border-emerald-200 bg-emerald-50 text-emerald-700" />
      <AssetSummary label="Aset Non Tunai" value={totalNonCash} icon={Landmark} tone="border-violet-200 bg-violet-50 text-violet-700" />
    </section>

    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-lg font-semibold text-slate-950">Daftar Sumber Dana</h2><p className="mt-1 text-sm text-slate-600">Klik kartu untuk melihat detail, menyesuaikan saldo, atau membuka riwayat.</p></div>
        {canManage ? <Button type="button" onClick={() => openFund()}><Plus className="h-4 w-4" />Tambah Sumber Dana</Button> : null}
      </div>
      <div className="relative my-5 max-w-sm"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Cari bank, e-wallet, atau laci..." aria-label="Cari sumber dana" /></div>
      {visibleFunds.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visibleFunds.map((fund) => {
          const config = typeConfig[fund.type];
          const Icon = config.icon;
          return <button key={fund.id} type="button" onClick={() => openFund(fund)} className="group min-h-[190px] rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30" aria-label={`Buka detail ${fund.name}`}>
            <div className="flex items-start justify-between gap-3"><div className={cn("flex h-11 w-14 items-center justify-center overflow-hidden rounded-lg border", config.accent)}>{fund.image ? <img src={fund.image} alt="" className="h-full w-full bg-white object-contain p-1" /> : <Icon className="h-5 w-5" aria-hidden="true" />}</div><Badge variant={fund.isActive ? "green" : "red"}>{fund.isActive ? "Aktif" : "Nonaktif"}</Badge></div>
            <div className="mt-4 flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold text-slate-950" title={fund.name}>{fund.name}</h3><p className="mt-1 text-xs text-slate-500">{config.label}</p></div><Pencil className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-blue-600" aria-hidden="true" /></div>
            <p className="mt-4 text-xl font-semibold text-blue-700">{formatCurrency(fund.balance)}</p>
            <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500"><span>Saldo awal {formatCurrency(fund.openingBalance)}</span><span>{formatDateTime(fund.updatedAt)}</span></div>
          </button>;
        })}
      </div> : <div className="rounded-lg border border-dashed border-slate-300 px-6 py-12 text-center text-sm text-slate-500">Sumber dana tidak ditemukan.</div>}
    </section>

    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) setForm(empty); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{form.id ? (canManage ? "Edit Sumber Dana" : "Detail Sumber Dana") : "Tambah Sumber Dana"}</DialogTitle><DialogDescription>{form.id ? "Saldo yang diubah akan dicatat sebagai penyesuaian dan tetap memiliki riwayat." : "Saldo pertama akan disimpan sebagai saldo awal."}</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jenis Saldo"><Select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as FundType })} disabled={!canManage}><option value="Cash">Cash / Laci</option><option value="Bank">Bank</option><option value="Ewallet">E-wallet</option><option value="Pulsa_Server">Server Pulsa</option><option value="Other">Lainnya</option></Select></Field>
            <Field label="Nama Sumber Dana"><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Contoh: BRI, DANA, LACI" required disabled={!canManage} /></Field>
            <Field label={form.id ? "Saldo Sekarang" : "Saldo Awal"} hint={form.id ? `Saldo awal historis tetap ${formatCurrency(selected?.openingBalance ?? 0)}.` : undefined}><CurrencyInput name="balance" value={form.balance} onChange={(balance) => setForm({ ...form, balance })} disabled={!canManage || Boolean(form.id && !form.isActive)} /></Field>
            <Field label="Status"><label className="flex h-10 items-center gap-3 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"><input type="checkbox" checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} disabled={!canManage} className="h-4 w-4 accent-blue-600" />Sumber dana aktif</label></Field>
          </div>
          {balanceChanged ? <Field label="Alasan Penyesuaian" hint="Wajib diisi karena saldo berjalan berubah."><Textarea value={form.adjustmentReason} onChange={(event) => setForm({ ...form, adjustmentReason: event.target.value })} placeholder="Contoh: koreksi hasil rekonsiliasi kas" required disabled={!canManage} /></Field> : null}
          <Field label="Gambar Bank / E-wallet" hint="Opsional. JPG, PNG, atau WebP maksimal 2 MB."><Input type="file" name="imageFile" accept="image/jpeg,image/png,image/webp" disabled={!canManage} /></Field>
          <Field label="Keterangan"><Textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="Catatan rekening atau penggunaan sumber dana" disabled={!canManage} /></Field>
          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div>{form.id ? <Button asChild type="button" variant="outline"><Link href={`/fund-mutations?mode=saldo&fund=${form.id}`}><History className="h-4 w-4" />Lihat Riwayat</Link></Button> : null}</div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={() => setOpen(false)}>Tutup</Button>{canManage ? <Button type="submit" disabled={pending}>{pending ? "Menyimpan..." : form.id ? "Simpan Perubahan" : "Tambah Sumber Dana"}</Button> : null}</div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  </div>;
}

