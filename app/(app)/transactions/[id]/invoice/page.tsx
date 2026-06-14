import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintControls } from "@/components/print-controls";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

export default async function TransactionInvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const query = rawQuery as Record<string, string | string[] | undefined>;
  const [transaction, setting] = await Promise.all([
    prisma.transaction.findUnique({
      where: { id: Number(id) },
      include: { user: true, customer: true, items: { include: { item: true } } }
    }),
    prisma.setting.findFirst()
  ]);
  if (!transaction) notFound();

  const selectedFormat = String(query.format ?? setting?.defaultPrintFormat ?? "thermal_80");
  const formatClass = selectedFormat === "a4" ? "print-a4 max-w-3xl" : selectedFormat === "thermal_58" ? "print-thermal-58 max-w-[260px]" : "print-thermal-80 max-w-[360px]";

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/transactions">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <PrintControls defaultFormat={setting?.defaultPrintFormat ?? "thermal_80"} />
      </div>
      <article id="invoice-content" className={cn("mx-auto rounded-lg bg-white p-6 text-sm text-slate-900 shadow-sm print:shadow-none", formatClass)}>
        <header className="border-b border-slate-200 pb-4 text-center">
          {setting?.logo ? <img src={setting.logo} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
          <h1 className="text-lg font-bold">{setting?.storeName ?? "PosPintar"}</h1>
          <p className="text-xs text-slate-500">{setting?.address ?? "Service hardware, komponen, dan produk digital"}</p>
          {setting?.whatsapp ? <p className="text-xs text-slate-500">WA: {setting.whatsapp}</p> : null}
        </header>

        <section className="my-4 grid gap-1 text-xs">
          <div className="flex justify-between gap-4">
            <span>Kode</span>
            <strong>{transaction.kodeTransaksi}</strong>
          </div>
          <div className="flex justify-between gap-4">
            <span>Tanggal</span>
            <span>{formatDateTime(transaction.createdAt)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Customer</span>
            <span>{transaction.customerName || transaction.customer?.name || "Umum"}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Kasir</span>
            <span>{transaction.user.name}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span>Status</span>
            <TransactionStatusBadge status={transaction.status} />
          </div>
        </section>

        <table className="w-full border-y border-slate-200 text-xs">
          <thead>
            <tr className="text-left">
              <th className="py-2">Item</th>
              <th className="py-2 text-center">Qty</th>
              <th className="py-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transaction.items.map((line) => (
              <tr key={line.id}>
                <td className="py-2 pr-2">
                  <p className="font-medium">{line.item.namaBarang}</p>
                  <p className="text-slate-500">{formatCurrency(toNumber(line.price))}</p>
                </td>
                <td className="py-2 text-center">{line.qty}</td>
                <td className="py-2 text-right">{formatCurrency(toNumber(line.subtotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {(transaction.nomorTujuan || transaction.serialNumber) && (
          <section className="mt-4 rounded-md bg-slate-50 p-3 text-xs">
            <p className="font-semibold">Produk Digital</p>
            {transaction.nomorTujuan ? <p>Nomor: {transaction.nomorTujuan}</p> : null}
            {transaction.provider ? <p>Provider: {transaction.provider}</p> : null}
            {transaction.jenisProduk ? <p>Produk: {transaction.jenisProduk}</p> : null}
            {transaction.serialNumber ? <p>SN/Token: {transaction.serialNumber}</p> : null}
            {transaction.digitalStatus ? <p>Status: {transaction.digitalStatus}</p> : null}
          </section>
        )}

        <section className="mt-4 space-y-1 text-xs">
          <Row label="Subtotal" value={formatCurrency(toNumber(transaction.total))} />
          <Row label="Diskon" value={formatCurrency(toNumber(transaction.diskon))} />
          <Row label="Grand Total" value={formatCurrency(toNumber(transaction.grandTotal))} strong />
          <Row label="Metode" value={transaction.paymentMethod} />
          <Row label="Dibayar" value={formatCurrency(toNumber(transaction.paidAmount))} />
          <Row label="Kembalian" value={formatCurrency(toNumber(transaction.changeAmount))} />
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          {setting?.invoiceFooter ?? "Terima kasih."}
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "text-sm font-bold")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
