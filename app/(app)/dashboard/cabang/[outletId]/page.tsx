import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CircleDollarSign, ClipboardCheck, PackageSearch, Receipt, TrendingDown, TrendingUp, WalletCards, Wrench } from "lucide-react";
import { DashboardCharts } from "@/components/dashboard-charts";
import { StatCard } from "@/components/shared/stat-card";
import { ServiceStatusBadge, StockBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

export default async function DashboardOutletDetailPage({ params }: { params: Promise<{ outletId: string }> }) {
  const { outletId } = await params;
  const start = startOfToday();
  const end = tomorrowOf(start);
  const user = await requirePermission("dashboard.view");
  const { activeOutlet, outlets } = await outletContext(user);
  const selectedOutlet = user.role.name === "admin" ? outlets.find((item) => item.id === Number(outletId)) : activeOutlet.id === Number(outletId) ? activeOutlet : null;
  if (!selectedOutlet) redirect("/dashboard");

  const outletWhere = { outletId: selectedOutlet.id };
  const [todayFinance, todayTransactions, serviceStatusCounts, lowStock, recentTransactions, recentServices, finance7Days, transactionItems, todaySalesItems, paidServicesToday, miniAtmFinance, fundAccounts] = await Promise.all([
    prisma.financeRecord.groupBy({ by: ["type"], where: { ...outletWhere, date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.transaction.count({ where: { ...outletWhere, createdAt: { gte: start, lt: end }, status: { not: "Batal" } } }),
    prisma.service.groupBy({ by: ["status"], where: { ...outletWhere, createdAt: { gte: start, lt: end } }, _count: { _all: true } }),
    prisma.item.findMany({ where: { ...outletWhere, stok: { lte: prisma.item.fields.stokMinimum } }, include: { category: true }, take: 8 }),
    prisma.transaction.findMany({ where: outletWhere, include: { items: true }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.service.findMany({ where: outletWhere, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.financeRecord.findMany({ where: { ...outletWhere, type: "income", date: { gte: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000) } }, orderBy: { date: "asc" } }),
    prisma.transactionItem.findMany({ where: { transaction: { ...outletWhere, status: { not: "Batal" } } }, include: { item: { include: { category: true } } }, orderBy: { createdAt: "desc" }, take: 200 }),
    prisma.transactionItem.findMany({ where: { transaction: { ...outletWhere, status: "Berhasil", createdAt: { gte: start, lt: end } } }, include: { item: true } }),
    prisma.service.findMany({ where: { ...outletWhere, paymentStatus: "paid", paidAt: { gte: start, lt: end } }, include: { parts: { include: { item: true } } } }),
    prisma.financeRecord.findMany({ where: { ...outletWhere, referenceType: "bank_transfer", date: { gte: start, lt: end } } }),
    prisma.fundAccount.findMany({ where: { ...outletWhere, isActive: true }, select: { balance: true } })
  ]);

  const income = toNumber(todayFinance.find((item) => item.type === "income")?._sum.amount);
  const expense = toNumber(todayFinance.find((item) => item.type === "expense")?._sum.amount);
  const totalAsset = fundAccounts.reduce((sum, item) => sum + toNumber(item.balance), 0);
  const salesGrossProfit = todaySalesItems.reduce((sum, line) => sum + line.qty * (toNumber(line.price) - toNumber(line.item.hargaModal)), 0);
  const serviceGrossProfit = paidServicesToday.reduce((sum, service) => sum + toNumber(service.laborCost) + service.parts.reduce((partSum, part) => partSum + part.qty * (toNumber(part.price) - toNumber(part.item.hargaModal)), 0), 0);
  const miniAtmProfit = miniAtmFinance.reduce((sum, record) => sum + (record.type === "income" ? toNumber(record.amount) : -toNumber(record.amount)), 0);
  const grossProfit = salesGrossProfit + serviceGrossProfit + miniAtmProfit;
  const netProfit = grossProfit - expense;
  const serviceStatusMap = new Map<string, number>(serviceStatusCounts.map((item) => [item.status, item._count._all]));
  const statusCount = (status: string) => serviceStatusMap.get(status) ?? 0;
  const serviceTotal = serviceStatusCounts.reduce((sum, item) => sum + item._count._all, 0);
  const dayLabels = Array.from({ length: 7 }).map((_, index) => { const date = new Date(); date.setDate(date.getDate() - (6 - index)); return date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }); });
  const incomeData = dayLabels.map((label) => ({ date: label, income: 0 }));
  finance7Days.forEach((record) => { const label = record.date.toLocaleDateString("id-ID", { day: "2-digit", month: "short" }); const item = incomeData.find((entry) => entry.date === label); if (item) item.income += toNumber(record.amount); });
  const categoryMap = new Map<string, number>();
  transactionItems.forEach((line) => categoryMap.set(line.item.category.name, (categoryMap.get(line.item.category.name) ?? 0) + line.qty));

  return (
    <>
      <h1 className="sr-only">Detail Dasbor Cabang</h1>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-400">Detail operasional cabang {selectedOutlet.name}.</p>
        <Button asChild variant="outline" size="sm"><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />Semua Cabang</Link></Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pemasukan Hari Ini" value={formatCurrency(income)} icon={TrendingUp} tone="green" helper="Total transaksi masuk" />
        <StatCard title="Pengeluaran Hari Ini" value={formatCurrency(expense)} icon={TrendingDown} tone="red" helper="Biaya operasional" />
        <StatCard title="Keuntungan Kotor Hari Ini" value={formatCurrency(grossProfit)} icon={CircleDollarSign} tone="blue" helper="Margin penjualan, service, MiniATM" />
        <StatCard title="Keuntungan Bersih Hari Ini" value={formatCurrency(netProfit)} icon={CircleDollarSign} tone="cyan" helper="Kotor - pengeluaran" />
        <StatCard title="Total Aset" value={formatCurrency(totalAsset)} icon={WalletCards} tone="cyan" helper="Saldo sumber dana" />
        <StatCard title="Transaksi Hari Ini" value={String(todayTransactions)} icon={Receipt} tone="cyan" helper="Penjualan valid" />
        <StatCard title="Service Masuk" value={String(serviceTotal)} icon={Wrench} tone="orange" helper="Total hari ini" />
        <StatCard title="Service Selesai" value={String(statusCount("Selesai") + statusCount("Diambil"))} icon={ClipboardCheck} tone="green" helper="Siap diambil" />
        <StatCard title="Service Proses" value={String(statusCount("Dicek") + statusCount("Diproses") + statusCount("Menunggu_Konfirmasi"))} icon={Wrench} tone="blue" helper="Sedang dikerjakan" />
        <StatCard title="Stok Hampir Habis" value={String(lowStock.length)} icon={PackageSearch} tone="orange" helper="Butuh perhatian" />
      </div>
      <div className="mt-6"><DashboardCharts incomeData={incomeData} categoryData={Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value })).slice(0, 6)} /></div>
      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card><CardHeader><CardTitle>Transaksi Terbaru</CardTitle></CardHeader><CardContent className="space-y-3">{recentTransactions.map((transaction) => <div key={transaction.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3"><div><p className="font-medium text-slate-100">{transaction.kodeTransaksi}</p><p className="text-xs text-slate-500">{formatDateTime(transaction.createdAt)}</p></div><p className="font-semibold text-blue-400">{formatCurrency(toNumber(transaction.grandTotal))}</p></div>)}</CardContent></Card>
        <Card><CardHeader><CardTitle>Service Terbaru</CardTitle></CardHeader><CardContent className="space-y-3">{recentServices.map((service) => <div key={service.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3"><div><p className="font-medium text-slate-100">{service.kodeService}</p><p className="text-xs text-slate-500">{service.customerName}</p></div><ServiceStatusBadge status={service.status} /></div>)}</CardContent></Card>
      </div>
      <Card className="mt-6"><CardHeader><CardTitle>Barang Stok Hampir Habis</CardTitle></CardHeader><CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{lowStock.map((item) => <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/35 p-3"><p className="font-medium text-slate-100">{item.namaBarang}</p><p className="text-xs text-slate-500">{item.category.name}</p><div className="mt-3 flex items-center justify-between"><span className="text-sm text-slate-300">{item.stok} {item.satuan}</span><StockBadge stok={item.stok} minimum={item.stokMinimum} /></div></div>)}</CardContent></Card>
    </>
  );
}
