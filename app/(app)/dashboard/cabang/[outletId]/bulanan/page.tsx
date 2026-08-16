import Link from "next/link";
import { ArrowLeft, Banknote, BarChart3, CalendarDays, CircleDollarSign, Filter, PackageCheck, Smartphone, Stethoscope, TrendingDown } from "lucide-react";
import { OutletProfitChart } from "@/components/dashboard-charts";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { loadOutletReport, requireDashboardOutlet } from "@/lib/outlet-dashboard-data";
import { outletReportPeriod } from "@/lib/outlet-dashboard-report";
import { hasPermission } from "@/lib/permission-keys";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { cn, formatCurrency } from "@/lib/utils";
export default async function DashboardOutletDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ outletId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { outletId } = await params;
  const query = (await searchParams) ?? {};
  const queryValue = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const legacyPeriod = queryValue(query.periode);
  const rawYear = queryValue(query.tahun);
  const rawMonth = queryValue(query.bulan);
  const period = outletReportPeriod(legacyPeriod ?? (rawYear && rawMonth ? `${rawYear}-${String(rawMonth).padStart(2, "0")}` : undefined));
  const years = Array.from({ length: Number(period.current.slice(0, 4)) - 2019 }, (_, index) => Number(period.current.slice(0, 4)) - index);
  const { outlet: selectedOutlet } = await requireDashboardOutlet(Number(outletId));
  const user = await requirePermission("dashboard.monthlyReport");
  const permissions = await getUserPermissionKeys(user);
  const can = (key: Parameters<typeof hasPermission>[2]) => hasPermission(user.role.name, permissions, key);
  const report = await loadOutletReport(selectedOutlet.id, period.start, period.end, period.visibleEnd);
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
          <p className="text-lg font-semibold text-slate-900">{selectedOutlet.name}</p>
          <p className="mt-1 text-sm text-slate-600">Laporan operasional {monthLabel}.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="bulan">Bulan</Label>
              <Select id="bulan" name="bulan" defaultValue={String(period.start.getMonth() + 1)} className="w-36">
                {Array.from({ length: 12 }, (_, month) => <option key={month} value={month + 1}>{new Date(2000, month, 1).toLocaleDateString("id-ID", { month: "long" })}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tahun">Tahun</Label>
              <Select id="tahun" name="tahun" defaultValue={String(period.start.getFullYear())} className="w-28">
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </Select>
            </div>
            <Button type="submit" variant="outline"><Filter className="h-4 w-4" />Terapkan</Button>
          </form>
          <Button asChild variant="outline">
            <Link href={`/dashboard/cabang/${selectedOutlet.id}/tahunan?tahun=${period.start.getFullYear()}`}><BarChart3 className="h-4 w-4" />Laporan Tahunan</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={`/dashboard/cabang/${selectedOutlet.id}?tahun=${period.start.getFullYear()}&bulan=${period.start.getMonth() + 1}&tanggal=1`}><ArrowLeft className="h-4 w-4" />Ringkasan Cabang</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatCard title="Transaksi Digital" value={String(report.summary.digitalTransactions)} icon={Smartphone} tone="cyan" helper={monthLabel} />
        <StatCard title="Transaksi Fisik" value={String(report.summary.physicalTransactions)} icon={PackageCheck} tone="blue" helper={monthLabel} />
        {can("dashboard.viewProfit") ? <StatCard title="Profit" value={formatCurrency(report.summary.profit)} icon={CircleDollarSign} tone="blue" helper="Kotor - potongan - operasional" /> : null}
        <StatCard title="Transaksi Service" value={String(report.summary.serviceTransactions)} icon={Stethoscope} tone="green" helper={monthLabel} />
        {can("dashboard.viewProfit") ? <StatCard title="Pengeluaran" value={formatCurrency(report.summary.expense)} icon={TrendingDown} tone="red" helper="Pengeluaran tercatat" /> : null}
        {can("dashboard.viewProfit") ? <StatCard title="Profit Bersih" value={formatCurrency(report.summary.netProfit)} icon={Banknote} tone="green" helper="Profit - pengeluaran" /> : null}
      </div>

      {can("dashboard.viewProfit") ? (
        <div className="mt-6">
          <OutletProfitChart data={chartData} />
        </div>
      ) : null}

      <section className="mt-6" aria-labelledby="daily-report-title">
        <div className="mb-4">
          <h2 id="daily-report-title" className="text-lg font-semibold text-slate-900">Ringkasan Harian</h2>
          <p className="mt-1 text-sm text-slate-600">Rincian operasional setiap hari pada {monthLabel}.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...report.days].reverse().map((day, index) => (
            <Card key={day.date.toISOString()} className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between gap-3 p-4 pb-3">
                <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
                  <CalendarDays className="h-4 w-4 shrink-0 text-cyan-400" />
                  {day.date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}
                </CardTitle>
                <span className="shrink-0 rounded-md bg-orange-500/10 px-2 py-1 text-xs font-semibold text-orange-300">#{index + 1}</span>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="grid gap-3 border-b border-slate-300/70 pb-3 text-xs sm:grid-cols-3">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Smartphone className="h-4 w-4 shrink-0 text-cyan-400" />
                    <span>Transaksi Digital</span>
                    <strong className="ml-auto text-blue-600">{day.digitalTransactions}</strong>
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <PackageCheck className="h-4 w-4 shrink-0 text-emerald-400" />
                    <span>Transaksi Fisik</span>
                    <strong className="ml-auto text-emerald-300">{day.physicalTransactions}</strong>
                  </div>
                </div>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Stethoscope className="h-4 w-4 shrink-0 text-violet-500" />
                    <span>Transaksi Service</span>
                    <strong className="ml-auto text-violet-700">{day.serviceTransactions}</strong>
                  </div>
                  {can("dashboard.viewProfit") ? <DailyRow label="Profit Kotor" value={formatCurrency(day.grossProfit)} /> : null}
                  {can("dashboard.viewBankFee") ? <DailyRow label="Potongan Bank" value={formatCurrency(day.bankFee)} valueClassName="text-amber-300" /> : null}
                  {can("dashboard.viewBankFee") ? <DailyRow label="Operasional" value={formatCurrency(day.operational)} valueClassName="text-orange-300" /> : null}
                  {can("dashboard.viewProfit") ? <DailyRow className="rounded-md border border-emerald-300 bg-emerald-100/90 px-3 py-2 shadow-sm" label="Profit" value={formatCurrency(day.profit)} strong labelClassName="text-emerald-950 font-extrabold" valueClassName="text-emerald-950 font-extrabold text-base" /> : null}
                  {can("dashboard.viewProfit") ? <DailyRow label="Pengeluaran" value={formatCurrency(day.expense)} valueClassName="text-rose-300" /> : null}
                  {can("dashboard.viewProfit") ? <DailyRow className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-2" label="Profit Bersih" value={formatCurrency(day.netProfit)} strong labelClassName="text-blue-700" valueClassName="text-blue-700" /> : null}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}

function DailyRow({
  label,
  value,
  className,
  strong = false,
  labelClassName,
  valueClassName
}: {
  label: string;
  value: string;
  className?: string;
  strong?: boolean;
  labelClassName?: string;
  valueClassName?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <dt className={cn(strong ? "font-medium" : "text-slate-600", labelClassName)}>{label}</dt>
      <dd className={cn(strong ? "font-semibold" : "font-medium text-slate-800", valueClassName)}>{value}</dd>
    </div>
  );
}
