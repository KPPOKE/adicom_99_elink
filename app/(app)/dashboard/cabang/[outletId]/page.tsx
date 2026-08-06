import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Banknote, BarChart3, BriefcaseBusiness, CalendarDays, CircleDollarSign, CreditCard, Filter, Landmark, ReceiptText, Send, TrendingDown, Wallet } from "lucide-react";
import { openOutletBankTransfersAction } from "@/app/actions/outlets";
import { StatCard } from "@/components/shared/stat-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { loadOutletReport, requireDashboardOutlet } from "@/lib/outlet-dashboard-data";
import { outletReportDate } from "@/lib/outlet-dashboard-report";
import { hasPermission } from "@/lib/permission-keys";
import { canCurrentUser, getUserPermissionKeys } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

const months = Array.from({ length: 12 }, (_, month) => ({
  value: month + 1,
  label: new Date(2000, month, 1).toLocaleDateString("id-ID", { month: "long" })
}));

function queryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function DashboardOutletDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ outletId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { outletId } = await params;
  const query = (await searchParams) ?? {};
  const legacyPeriod = queryValue(query.periode);
  if (legacyPeriod) redirect(`/dashboard/cabang/${outletId}/bulanan?periode=${encodeURIComponent(legacyPeriod)}`);

  const { user, outlet } = await requireDashboardOutlet(Number(outletId));
  const period = outletReportDate(queryValue(query.tahun), queryValue(query.bulan), queryValue(query.tanggal));
  const staff = user.role.name === "admin"
    ? await prisma.user.findMany({
        where: { outletId: outlet.id, role: { name: "staff" } },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
      })
    : [];
  const requestedStaffId = Number(queryValue(query.pegawai));
  const selectedStaff = staff.find((item) => item.id === requestedStaffId);
  const [report, funds, canOpenMiniAtm, permissions] = await Promise.all([
    loadOutletReport(outlet.id, period.start, period.end, period.end, selectedStaff?.id),
    prisma.fundAccount.findMany({
      where: { outletId: outlet.id, isActive: true },
      select: { type: true, balance: true }
    }),
    canCurrentUser("bankTransfers.view"),
    getUserPermissionKeys(user)
  ]);
  const can = (key: Parameters<typeof hasPermission>[2]) => hasPermission(user.role.name, permissions, key);
  const summary = report.summary;
  const cashAsset = funds.filter((fund) => fund.type === "Cash").reduce((sum, fund) => sum + toNumber(fund.balance), 0);
  const balanceAsset = funds.filter((fund) => fund.type !== "Cash").reduce((sum, fund) => sum + toNumber(fund.balance), 0);
  const selectedDate = period.start.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  const daysInMonth = new Date(period.year, period.month, 0).getDate();
  const reportPeriod = `${period.year}-${String(period.month).padStart(2, "0")}`;

  return (
    <>
      <h1 className="sr-only">Ringkasan Cabang</h1>
      {can("dashboard.filterDate") ? <form className="mb-5 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex w-full flex-col gap-1.5 sm:w-40">
          <Label htmlFor="tahun">Tahun</Label>
          <Select id="tahun" name="tahun" defaultValue={String(period.year)}>
            {period.years.map((year) => <option key={year} value={year}>{year}</option>)}
          </Select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-40">
          <Label htmlFor="bulan">Bulan</Label>
          <Select id="bulan" name="bulan" defaultValue={String(period.month)}>
            {months.map((month) => <option key={month.value} value={month.value}>{month.label}</option>)}
          </Select>
        </div>
        <div className="flex w-full flex-col gap-1.5 sm:w-40">
          <Label htmlFor="tanggal">Tanggal</Label>
          <Select id="tanggal" name="tanggal" defaultValue={String(period.day)}>
            {Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}</option>)}
          </Select>
        </div>
        {user.role.name === "admin" ? (
          <div className="flex w-full flex-col gap-1.5 sm:min-w-52 sm:flex-1 lg:max-w-64">
            <Label htmlFor="pegawai">Transaksi oleh</Label>
            <Select id="pegawai" name="pegawai" defaultValue={selectedStaff ? String(selectedStaff.id) : ""}>
              <option value="">Semua Pegawai</option>
              {staff.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </Select>
          </div>
        ) : null}
        <Button type="submit" variant="outline" className="w-full sm:w-auto"><Filter className="h-4 w-4" />Terapkan</Button>
        <Button asChild variant="ghost" className="w-full sm:w-auto"><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Semua Cabang</Link></Button>
      </form> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white" aria-labelledby="outlet-summary-title">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
          <div>
            <h2 id="outlet-summary-title" className="text-lg font-semibold text-slate-900">{outlet.name}</h2>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><CalendarDays className="h-4 w-4" />{selectedDate}</p>
          </div>
          {selectedStaff ? <span className="text-sm text-blue-600">{selectedStaff.name}</span> : null}
        </div>

        <div className="space-y-6 p-5">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {can("dashboard.viewTransactions") ? <StatCard title="Total Transaksi" value={String(summary.digitalTransactions + summary.physicalTransactions + summary.serviceTransactions)} icon={ReceiptText} tone="cyan" helper="Digital, fisik, dan service" /> : null}
            {can("dashboard.viewTurnover") ? <StatCard title="Omset" value={formatCurrency(summary.turnover)} icon={CreditCard} tone="green" helper="Nilai transaksi" /> : null}
            {can("dashboard.viewProfit") ? <StatCard title="Profit Kotor" value={formatCurrency(summary.grossProfit)} icon={CircleDollarSign} tone="blue" helper="Sebelum potongan" /> : null}
            {can("dashboard.viewBankFee") ? <StatCard title="Potongan Bank + Ops" value={formatCurrency(summary.bankFee + summary.operational)} icon={TrendingDown} tone="orange" helper="Biaya tercatat" /> : null}
            {can("dashboard.viewProfit") ? <StatCard title="Pengeluaran" value={formatCurrency(summary.expense)} icon={Banknote} tone="red" helper="Pengeluaran harian" /> : null}
            {can("dashboard.viewProfit") ? <StatCard title="Profit Bersih" value={formatCurrency(summary.netProfit)} icon={BriefcaseBusiness} tone="green" helper="Profit - pengeluaran" /> : null}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <StatCard title="Aset Cash" value={formatCurrency(cashAsset)} icon={Wallet} tone="blue" helper="Saldo kas tunai" />
            <StatCard title="Aset Saldo" value={formatCurrency(balanceAsset)} icon={Landmark} tone="green" helper="Bank dan e-wallet" />
            <StatCard title="Total Aset" value={formatCurrency(cashAsset + balanceAsset)} icon={CircleDollarSign} tone="cyan" helper="Seluruh sumber dana" />
          </div>

          <div className={`grid gap-3 ${can("dashboard.annualReport") || can("dashboard.monthlyReport") ? "md:grid-cols-3" : "md:grid-cols-1"}`}>
            {can("dashboard.annualReport") ? <Button asChild variant="secondary" className="w-full"><Link href={`/dashboard/cabang/${outlet.id}/tahunan?tahun=${period.year}`}><BarChart3 className="h-4 w-4" />Laporan Tahunan</Link></Button> : null}
            {can("dashboard.monthlyReport") ? <Button asChild variant="outline" className="w-full"><Link href={`/dashboard/cabang/${outlet.id}/bulanan?periode=${reportPeriod}`}><CalendarDays className="h-4 w-4" />Laporan Bulanan</Link></Button> : null}
            {canOpenMiniAtm ? (
              <form action={openOutletBankTransfersAction}>
                <input type="hidden" name="outletId" value={outlet.id} />
                <Button type="submit" className="w-full"><Send className="h-4 w-4" />Mode Transaksi</Button>
              </form>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}