import Link from "next/link";
import { ArrowLeft, Download, Filter } from "lucide-react";
import { OutletAnnualChart } from "@/components/dashboard-charts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { loadOutletReport, requireDashboardOutlet } from "@/lib/outlet-dashboard-data";
import { buildOutletAnnualReport, outletAnnualReportYear } from "@/lib/outlet-dashboard-report";
import { hasPermission } from "@/lib/permission-keys";
import { canCurrentUser, getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { formatCurrency } from "@/lib/utils";

export default async function DashboardOutletAnnualPage({
  params,
  searchParams
}: {
  params: Promise<{ outletId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { outletId } = await params;
  const query = (await searchParams) ?? {};
  const rawYear = Array.isArray(query.tahun) ? query.tahun[0] : query.tahun;
  const period = outletAnnualReportYear(rawYear);
  const { outlet } = await requireDashboardOutlet(Number(outletId));
  const user = await requirePermission("dashboard.annualReport");
  const permissions = await getUserPermissionKeys(user);
  const canViewBankFee = hasPermission(user.role.name, permissions, "dashboard.viewBankFee");
  const canViewProfit = hasPermission(user.role.name, permissions, "dashboard.viewProfit");
  const [report, canExport] = await Promise.all([
    loadOutletReport(outlet.id, period.start, period.end),
    canCurrentUser("reports.export")
  ]);
  const annual = buildOutletAnnualReport(report.days);
  const years = Array.from({ length: Number(period.current) - 2019 }, (_, index) => Number(period.current) - index);

  return (
    <>
      <h1 className="sr-only">Laporan Tahunan Cabang</h1>
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-900">{outlet.name}</p>
          <p className="mt-1 text-sm text-slate-600">Laporan tahunan {period.year}.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <form className="flex items-end gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="tahun">Tahun</Label>
              <Select id="tahun" name="tahun" defaultValue={period.value} className="w-32">
                {years.map((year) => <option key={year} value={year}>{year}</option>)}
              </Select>
            </div>
            <Button type="submit" variant="outline"><Filter className="h-4 w-4" />Terapkan</Button>
          </form>
          {canExport ? (
            <Button asChild variant="secondary">
              <Link href={`/dashboard/cabang/${outlet.id}/tahunan/export?tahun=${period.year}`}>
                <Download className="h-4 w-4" />Unduh Excel
              </Link>
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/dashboard/cabang/${outlet.id}/bulanan?periode=${period.year}-${String(Math.min(new Date().getMonth() + 1, 12)).padStart(2, "0")}`}>
              <ArrowLeft className="h-4 w-4" />Laporan Bulanan
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statistik Profit Tahun {period.year}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="border-y border-slate-300 bg-white text-xs uppercase text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Bulan</th>
                {canViewBankFee ? <th className="px-4 py-3 text-right">Potongan Bank</th> : null}
                {canViewBankFee ? <th className="px-4 py-3 text-right">Operasional</th> : null}
                {canViewProfit ? <th className="px-4 py-3 text-right">Profit</th> : null}
                {canViewProfit ? <th className="px-4 py-3 text-right">Pengeluaran</th> : null}
                {canViewProfit ? <th className="px-4 py-3 text-right">Profit Bersih</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {annual.months.map((month) => (
                <AnnualRow key={month.month} label={month.name} values={month} canViewBankFee={canViewBankFee} canViewProfit={canViewProfit} />
              ))}
            </tbody>
            <tfoot className="border-t border-slate-300 bg-white font-semibold">
              <AnnualRow label="Total" values={annual.total} canViewBankFee={canViewBankFee} canViewProfit={canViewProfit} />
            </tfoot>
          </table>
        </CardContent>
      </Card>

      {canViewProfit ? (
        <div className="mt-6">
          <OutletAnnualChart data={annual.months} />
        </div>
      ) : null}
    </>
  );
}

function AnnualRow({
  label,
  values,
  canViewBankFee,
  canViewProfit
}: {
  label: string;
  values: { bankFee: number; operational: number; profit: number; expense: number; netProfit: number };
  canViewBankFee: boolean;
  canViewProfit: boolean;
}) {
  return (
    <tr>
      <th scope="row" className="px-4 py-3 text-left font-medium capitalize text-slate-800">{label}</th>
      {canViewBankFee ? <td className="px-4 py-3 text-right text-amber-300">{formatCurrency(values.bankFee)}</td> : null}
      {canViewBankFee ? <td className="px-4 py-3 text-right text-orange-300">{formatCurrency(values.operational)}</td> : null}
      {canViewProfit ? <td className="px-4 py-3 text-right text-blue-600">{formatCurrency(values.profit)}</td> : null}
      {canViewProfit ? <td className="px-4 py-3 text-right text-rose-300">{formatCurrency(values.expense)}</td> : null}
      {canViewProfit ? <td className="px-4 py-3 text-right text-emerald-300">{formatCurrency(values.netProfit)}</td> : null}
    </tr>
  );
}
