import Link from "next/link";
import { Download, Filter, Printer } from "lucide-react";
import { ReportChart } from "@/components/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { loadReportData, parseReportFilters, reportCurrency, reportTitle } from "@/lib/reporting";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export default async function ReportsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = (await searchParams) ?? {};
  const filters = parseReportFilters(params);
  const query = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const { transactions, services, items, finance, income, expense, chartData } = await loadReportData(filters);

  return (
    <>
      <PageHeader
        title="Laporan"
        description={`Periode: ${reportTitle(filters)}`}
        action={
          <>
            <Button asChild variant="outline">
              <Link href={`/reports/export?${query.toString()}&kind=profit-loss&format=pdf`}>
                <Printer className="h-4 w-4" />
                PDF Laba/Rugi
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/reports/export?${query.toString()}&kind=sales`}>
                <Download className="h-4 w-4" />
                Excel Penjualan
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/reports/export?${query.toString()}&kind=finance`}>
                <Download className="h-4 w-4" />
                Excel Keuangan
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/reports/export?${query.toString()}&kind=service`}>
                <Download className="h-4 w-4" />
                Excel Service
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/reports/export?${query.toString()}&kind=stock`}>
                <Download className="h-4 w-4" />
                Excel Stok
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/reports/print?${query.toString()}`}>
                <Printer className="h-4 w-4" />
                Print View
              </Link>
            </Button>
          </>
        }
      />
      <Card className="mb-6">
        <CardContent className="pt-6">
          <form className="grid gap-4 md:grid-cols-[220px_1fr_1fr_auto]">
            <div className="space-y-1.5">
              <Label>Periode</Label>
              <Select name="period" defaultValue={filters.period}>
                <option value="today">Hari Ini</option>
                <option value="week">Minggu Ini</option>
                <option value="month">Bulan Ini</option>
                <option value="custom">Custom</option>
                <option value="all">Semua Data</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dari</Label>
              <Input type="date" name="from" defaultValue={filters.from ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label>Sampai</Label>
              <Input type="date" name="to" defaultValue={filters.to ?? ""} />
            </div>
            <Button className="self-end">
              <Filter className="h-4 w-4" />
              Terapkan
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Pemasukan" value={formatCurrency(income)} icon={Download} tone="green" />
        <StatCard title="Total Pengeluaran" value={formatCurrency(expense)} icon={Download} tone="red" />
        <StatCard title="Laba/Rugi" value={formatCurrency(income - expense)} icon={Download} tone="blue" />
      </div>
      <div className="mt-6">
        <ReportChart data={chartData} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportTable title="Laporan Penjualan" rows={transactions.map((item) => [item.kodeTransaksi, formatDate(item.createdAt), item.status, formatCurrency(toNumber(item.grandTotal))])} />
        <ReportTable title="Laporan Service" rows={services.map((item) => [item.kodeService, item.customerName, item.status.replace("_", " "), item.paymentStatus === "paid" ? "Lunas" : "Belum Dibayar", formatCurrency(toNumber(item.finalCost))])} />
        <ReportTable title="Laporan Stok" rows={items.map((item) => [item.kodeBarang, item.namaBarang, item.category.name, `${item.stok} ${item.satuan}`])} />
        <ReportTable title="Laporan Keuangan" rows={finance.map((item) => [formatDate(item.date), item.type === "income" ? "Pemasukan" : "Pengeluaran", item.category, reportCurrency(item.amount)])} />
      </div>
    </>
  );
}

function ReportTable({ title, rows }: { title: string; rows: string[][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {rows.slice(0, 8).map((row, index) => (
                <tr key={index}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="py-2 pr-3 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
