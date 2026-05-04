import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrintControls } from "@/components/print-controls";
import { Button } from "@/components/ui/button";
import { loadReportData, parseReportFilters, reportTitle } from "@/lib/reporting";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export default async function ReportPrintPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const filters = parseReportFilters(params);
  const [setting, data] = await Promise.all([
    import("@/lib/prisma").then(({ prisma }) => prisma.setting.findFirst()),
    loadReportData(filters)
  ]);

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href={`/reports?${new URLSearchParams(Object.entries(filters).filter((entry): entry is [string, string] => Boolean(entry[1]))).toString()}`}>
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <PrintControls defaultFormat="a4" />
      </div>
      <article className="mx-auto max-w-4xl rounded-lg bg-white p-8 text-sm text-slate-900 shadow-sm print:shadow-none">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-xl font-bold">{setting?.storeName ?? "Adicom99"} - Laporan Operasional</h1>
          <p className="text-slate-500">{reportTitle(filters)}</p>
        </header>

        <section className="my-6 grid grid-cols-3 gap-3">
          <Summary label="Pemasukan" value={data.income} />
          <Summary label="Pengeluaran" value={data.expense} />
          <Summary label="Laba/Rugi" value={data.income - data.expense} />
        </section>

        <ReportTable
          title="Penjualan"
          headers={["Kode", "Tanggal", "Customer", "Status", "Total"]}
          rows={data.transactions.map((item) => [item.kodeTransaksi, formatDate(item.createdAt), item.customerName ?? "Umum", item.status, formatCurrency(toNumber(item.grandTotal))])}
        />
        <ReportTable
          title="Service"
          headers={["Kode", "Customer", "Status", "Bayar", "Biaya"]}
          rows={data.services.map((item) => [item.kodeService, item.customerName, item.status.replace("_", " "), item.paymentStatus === "paid" ? "Lunas" : "Belum Dibayar", formatCurrency(toNumber(item.finalCost))])}
        />
        <ReportTable
          title="Keuangan"
          headers={["Tanggal", "Tipe", "Kategori", "Nominal"]}
          rows={data.finance.map((item) => [formatDate(item.date), item.type === "income" ? "Pemasukan" : "Pengeluaran", item.category, formatCurrency(toNumber(item.amount))])}
        />
      </article>
    </div>
  );
}

function Summary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-200 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="font-semibold">{formatCurrency(value)}</p>
    </div>
  );
}

function ReportTable({ title, headers, rows }: { title: string; headers: string[]; rows: string[][] }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-slate-50 text-left">
            {headers.map((header) => (
              <th key={header} className="border border-slate-200 p-2">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 80).map((row, index) => (
            <tr key={index}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-slate-200 p-2">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
