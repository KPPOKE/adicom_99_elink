"use client";

import { Calculator, RotateCcw, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CASH_DENOMINATIONS, calculateCashClosing, normalizeWhatsAppNumber } from "@/lib/closing-cash";
import { formatCurrency } from "@/lib/utils";

type CashFund = { id: number; name: string; balance: number };

export function ClosingCashDialog({ funds, outletName, userName, whatsapp }: { funds: CashFund[]; outletName: string; userName: string; whatsapp: string }) {
  const preferred = funds.find((fund) => fund.name.toUpperCase() === "LACI") ?? funds[0];
  const [fundId, setFundId] = useState(preferred?.id ?? 0);
  const [counts, setCounts] = useState<Record<number, number>>({});
  const fund = funds.find((item) => item.id === fundId) ?? preferred;
  const result = useMemo(() => calculateCashClosing(counts, fund?.balance ?? 0), [counts, fund?.balance]);
  const statusTone = result.status === "SESUAI" ? "text-emerald-700" : result.status === "UANG KURANG" ? "text-orange-700" : "text-blue-700";

  function reset() { setCounts({}); }
  function sendWhatsApp() {
    const phone = normalizeWhatsAppNumber(whatsapp);
    if (!phone) return void toast.error("Isi nomor WhatsApp pada Pengaturan Toko terlebih dahulu");
    const details = CASH_DENOMINATIONS.filter((value) => counts[value]).map((value) => `${formatCurrency(value)} x ${counts[value]} = ${formatCurrency(value * counts[value])}`);
    const message = [
      "LAPORAN CLOSING PECAHAN",
      `Cabang: ${outletName}`,
      `Petugas: ${userName}`,
      `Waktu: ${new Date().toLocaleString("id-ID")}`,
      `Sumber kas: ${fund?.name ?? "-"}`,
      `Saldo sistem: ${formatCurrency(fund?.balance ?? 0)}`,
      `Uang dihitung: ${formatCurrency(result.total)}`,
      `Total lembar: ${result.totalSheets}`,
      `Selisih: ${formatCurrency(Math.abs(result.difference))}`,
      `Status: ${result.status}`,
      ...(details.length ? ["", "Rincian:", ...details] : [])
    ].join("\n");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return <Dialog>
    <DialogTrigger asChild><Button type="button" variant="outline"><Calculator className="h-4 w-4" />Closing Pecahan</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
      <div className="bg-emerald-700 px-6 py-5 text-white"><DialogHeader><DialogTitle className="flex items-center gap-2 text-white"><Calculator className="h-5 w-5" />Closing Pecahan</DialogTitle><DialogDescription className="text-emerald-50">Hitung uang fisik dan kirim laporan melalui WhatsApp.</DialogDescription></DialogHeader></div>
      <div className="space-y-4 p-5 sm:p-6">
        {!fund ? <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">Sumber dana kas belum tersedia.</div> : <>
          {funds.length > 1 ? <label className="block space-y-1.5 text-sm font-medium text-slate-700">Sumber Kas<Select value={String(fund.id)} onChange={(event) => setFundId(Number(event.target.value))}>{funds.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></label> : null}
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary label="Saldo Laci" value={formatCurrency(fund.balance)} />
            <Summary label="Selisih" value={formatCurrency(Math.abs(result.difference))} />
            <Summary label="Status" value={result.status} valueClassName={statusTone} />
          </div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <div className="grid grid-cols-[1fr_110px_1fr] bg-slate-50 px-3 py-2 text-xs font-semibold uppercase text-slate-600"><span>Pecahan</span><span className="text-center">Lembar</span><span className="text-right">Subtotal</span></div>
            {CASH_DENOMINATIONS.map((value) => <div key={value} className="grid grid-cols-[1fr_110px_1fr] items-center border-t border-slate-200 px-3 py-2 text-sm"><span>{formatCurrency(value)}</span><Input type="number" min="0" step="1" inputMode="numeric" aria-label={`Jumlah pecahan ${formatCurrency(value)}`} value={counts[value] || ""} onChange={(event) => setCounts({ ...counts, [value]: Math.max(0, Number(event.target.value) || 0) })} className="h-9 text-center" /><span className="text-right font-medium">{formatCurrency(value * (counts[value] || 0))}</span></div>)}
          </div>
          <div className="flex flex-col gap-3 rounded-lg border-l-4 border-emerald-600 bg-emerald-50 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs text-slate-600">Total Closing</p><p className="text-2xl font-semibold text-emerald-700">{formatCurrency(result.total)}</p></div><div className="text-left sm:text-right"><p className="text-xs text-slate-600">Total Lembar</p><p className="text-xl font-semibold text-slate-900">{result.totalSheets}</p></div></div>
        </>}
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={reset}><RotateCcw className="h-4 w-4" />Reset</Button><Button type="button" onClick={sendWhatsApp} disabled={!fund} className="bg-emerald-700 hover:bg-emerald-800"><Send className="h-4 w-4" />Kirim WhatsApp</Button></div>
      </div>
    </DialogContent>
  </Dialog>;
}

function Summary({ label, value, valueClassName = "text-slate-900" }: { label: string; value: string; valueClassName?: string }) { return <div className="rounded-lg border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 font-semibold ${valueClassName}`}>{value}</p></div>; }