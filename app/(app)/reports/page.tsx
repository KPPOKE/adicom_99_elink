import { Download } from "lucide-react";
import { ReportChart } from "@/components/dashboard-charts";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate, toNumber } from "@/lib/utils";

export default async function ReportsPage() {
  const [transactions, services, items, finance] = await Promise.all([
    prisma.transaction.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.service.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.item.findMany({ include: { category: true }, orderBy: { stok: "asc" }, take: 50 }),
    prisma.financeRecord.findMany({ orderBy: { date: "desc" }, take: 120 })
  ]);
  const income = finance.filter((item) => item.type === "income").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const expense = finance.filter((item) => item.type === "expense").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const chartData = ["Penjualan", "Service", "Manual"].map((name) => ({
    name,
    income: finance.filter((item) => item.type === "income" && item.category === name).reduce((sum, item) => sum + toNumber(item.amount), 0),
    expense: finance.filter((item) => item.type === "expense" && item.category === name).reduce((sum, item) => sum + toNumber(item.amount), 0)
  }));

  return (
    <>
      <PageHeader
        title="Laporan"
        description="Laporan penjualan, service, stok, pemasukan, pengeluaran, dan laba rugi."
        action={
          <>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4" />
              Export Excel
            </Button>
          </>
        }
      />
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Pemasukan" value={formatCurrency(income)} icon={Download} tone="green" />
        <StatCard title="Total Pengeluaran" value={formatCurrency(expense)} icon={Download} tone="red" />
        <StatCard title="Laba/Rugi" value={formatCurrency(income - expense)} icon={Download} tone="blue" />
      </div>
      <div className="mt-6">
        <ReportChart data={chartData} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ReportTable title="Laporan Penjualan" rows={transactions.map((item) => [item.kodeTransaksi, formatDate(item.createdAt), formatCurrency(toNumber(item.grandTotal))])} />
        <ReportTable title="Laporan Service" rows={services.map((item) => [item.kodeService, item.customerName, item.status.replace("_", " "), formatCurrency(toNumber(item.finalCost))])} />
        <ReportTable title="Laporan Stok" rows={items.map((item) => [item.kodeBarang, item.namaBarang, item.category.name, `${item.stok} ${item.satuan}`])} />
        <ReportTable title="Laporan Keuangan" rows={finance.map((item) => [formatDate(item.date), item.type === "income" ? "Pemasukan" : "Pengeluaran", item.category, formatCurrency(toNumber(item.amount))])} />
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
