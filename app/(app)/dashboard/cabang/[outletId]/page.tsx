import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote, CircleDollarSign, Filter, PackageCheck, Smartphone, TrendingDown } from "lucide-react";
import { OutletProfitChart } from "@/components/dashboard-charts";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { outletContext } from "@/lib/outlet";
import { buildOutletReport, outletReportPeriod } from "@/lib/outlet-dashboard-report";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

export default async function DashboardOutletDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ outletId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { outletId } = await params;
  const query = (await searchParams) ?? {};
  const rawPeriod = Array.isArray(query.periode) ? query.periode[0] : query.periode;
  const period = outletReportPeriod(rawPeriod);
  const user = await requirePermission("dashboard.view");
  const { activeOutlet, outlets } = await outletContext(user);
  const selectedOutlet = user.role.name === "admin" ? outlets.find((item) => item.id === Number(outletId)) : activeOutlet.id === Number(outletId) ? activeOutlet : null;
  if (!selectedOutlet) redirect("/dashboard");

  const outletIdValue = selectedOutlet.id;
  const dateRange = { gte: period.start, lt: period.end };
  const [transactions, services, finance, miniAtm] = await Promise.all([
    prisma.transaction.findMany({
      where: { outletId: outletIdValue, status: "Berhasil", createdAt: dateRange },
      select: {
        createdAt: true,
        diskon: true,
        items: { select: { qty: true, price: true, item: { select: { hargaModal: true, category: { select: { name: true } } } } } }
      }
    }),
    prisma.service.findMany({
      where: { outletId: outletIdValue, paymentStatus: "paid", paidAt: dateRange },
      select: {
        paidAt: true,
        laborCost: true,
        parts: { select: { qty: true, price: true, item: { select: { hargaModal: true } } } }
      }
    }),
    prisma.financeRecord.findMany({
      where: { outletId: outletIdValue, date: dateRange, OR: [{ type: "expense" }, { referenceType: "bank_transfer" }] },
      select: { date: true, type: true, amount: true, referenceType: true }
    }),
    prisma.bankTransfer.findMany({
      where: { outletId: outletIdValue, status: "Berhasil", completedAt: dateRange },
      select: { completedAt: true }
    })
  ]);

  const report = buildOutletReport({
    start: period.start,
    visibleEnd: period.visibleEnd,
    transactions: transactions.map((transaction) => ({
      date: transaction.createdAt,
      discount: toNumber(transaction.diskon),
      items: transaction.items.map((item) => ({
        qty: item.qty,
        price: toNumber(item.price),
        cost: toNumber(item.item.hargaModal),
        categoryName: item.item.category.name
      }))
    })),
    services: services.flatMap((service) => service.paidAt ? [{
      date: service.paidAt,
      laborCost: toNumber(service.laborCost),
      parts: service.parts.map((part) => ({ qty: part.qty, price: toNumber(part.price), cost: toNumber(part.item.hargaModal) }))
    }] : []),
    finance: finance.map((record) => ({
      date: record.date,
      type: record.type,
      amount: toNumber(record.amount),
      referenceType: record.referenceType
    })),
    miniAtm: miniAtm.flatMap((transaction) => transaction.completedAt ? [{ date: transaction.completedAt }] : [])
  });

  const monthLabel = period.start.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  const chartData = report.days.map((day) => ({
    date: day.date.toLocaleDateString("id-ID", { day: "2-digit" }),
    profit: day.profit,
    expense: day.expense,
    netProfit: day.netProfit
  }));

  return (
    <>
      <h1 className="sr-only">Detail Dasbor Cabang</h1>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-100">{selectedOutlet.name}</p>
          <p className="mt-1 text-sm text-slate-400">Laporan operasional {monthLabel}.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="periode">Periode</Label>
              <Input id="periode" name="periode" type="month" defaultValue={period.value} max={period.current} className="w-44" />
            </div>
            <Button type="submit" variant="outline">
              <Filter className="h-4 w-4" />
              Terapkan
            </Button>
          </form>
          <Button asChild variant="outline">
            <Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Semua Cabang</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard title="Transaksi Digital" value={String(report.summary.digitalTransactions)} icon={Smartphone} tone="cyan" helper={monthLabel} />
        <StatCard title="Transaksi Fisik" value={String(report.summary.physicalTransactions)} icon={PackageCheck} tone="blue" helper={monthLabel} />
        <StatCard title="Profit" value={formatCurrency(report.summary.profit)} icon={CircleDollarSign} tone="blue" helper="Penjualan, service, MiniATM" />
        <StatCard title="Pengeluaran" value={formatCurrency(report.summary.expense)} icon={TrendingDown} tone="red" helper="Biaya operasional" />
        <StatCard title="Profit Bersih" value={formatCurrency(report.summary.netProfit)} icon={Banknote} tone="green" helper="Profit - pengeluaran" />
      </div>

      <div className="mt-6">
        <OutletProfitChart data={chartData} />
      </div>

      <section className="mt-6" aria-labelledby="daily-report-title">
        <div className="mb-4">
          <h2 id="daily-report-title" className="text-lg font-semibold text-slate-100">Ringkasan Harian</h2>
          <p className="mt-1 text-sm text-slate-400">Rincian operasional setiap hari pada {monthLabel}.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...report.days].reverse().map((day) => (
            <Card key={day.date.toISOString()}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{day.date.toLocaleDateString("id-ID", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-2 text-sm">
                  <DailyRow label="Transaksi Digital" value={String(day.digitalTransactions)} />
                  <DailyRow label="Transaksi Fisik" value={String(day.physicalTransactions)} />
                  <div className="my-3 border-t border-slate-800" />
                  <DailyRow label="Profit" value={formatCurrency(day.profit)} />
                  <DailyRow label="Pengeluaran" value={formatCurrency(day.expense)} />
                  <div className="mt-3 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-2">
                    <DailyRow label="Profit Bersih" value={formatCurrency(day.netProfit)} strong />
                  </div>
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function DailyRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className={strong ? "font-medium text-cyan-200" : "text-slate-400"}>{label}</dt>
      <dd className={strong ? "font-semibold text-cyan-200" : "font-medium text-slate-200"}>{value}</dd>
    </div>
  );
}
