import Link from "next/link";
import { ArrowRight, Building2, CreditCard, ReceiptText, Send, Stethoscope } from "lucide-react";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

const DEFAULT_OUTLET_COLOR = "#2563EB";
const OUTLET_CARD_COLORS = ["#2563EB", "#059669", "#D97706", "#DC2626", "#7C3AED", "#0891B2", "#DB2777", "#4F46E5", "#65A30D", "#EA580C"];

function outletCardColor({ id, color }: { id: number; color: string }) {
  if (color.toUpperCase() !== DEFAULT_OUTLET_COLOR) return color;
  return OUTLET_CARD_COLORS[(id - 1) % OUTLET_CARD_COLORS.length];
}

async function outletSummaries(outlets: Array<{ id: number; name: string; color: string }>, start: Date, end: Date, includeProfit: boolean) {
  const outletIds = outlets.map((outlet) => outlet.id);
  const [finance, transactions, transfers, services] = await Promise.all([
    includeProfit ? prisma.financeRecord.groupBy({ by: ["outletId", "type"], where: { outletId: { in: outletIds }, date: { gte: start, lt: end } }, _sum: { amount: true } }) : Promise.resolve([]),
    prisma.transaction.groupBy({ by: ["outletId"], where: { outletId: { in: outletIds }, createdAt: { gte: start, lt: end }, status: { not: "Batal" } }, _count: { id: true }, _sum: { grandTotal: true } }),
    prisma.bankTransfer.groupBy({ by: ["outletId"], where: { outletId: { in: outletIds }, kind: "Transfer", status: "Berhasil", completedAt: { gte: start, lt: end } }, _count: { id: true } }),
    prisma.service.groupBy({ by: ["outletId"], where: { outletId: { in: outletIds }, paymentStatus: "paid", paidAt: { gte: start, lt: end } }, _count: { id: true } })
  ]);

  return outlets.map((outlet) => {
    const income = finance.filter((item) => item.outletId === outlet.id && item.type === "income").reduce((sum, item) => sum + toNumber(item._sum.amount), 0);
    const expense = finance.filter((item) => item.outletId === outlet.id && item.type === "expense").reduce((sum, item) => sum + toNumber(item._sum.amount), 0);
    const transaction = transactions.find((item) => item.outletId === outlet.id);
    const transfer = transfers.find((item) => item.outletId === outlet.id);
    const service = services.find((item) => item.outletId === outlet.id);
    return {
      id: outlet.id,
      name: outlet.name,
      net: income - expense,
      color: outlet.color,
      sales: toNumber(transaction?._sum.grandTotal),
      transactions: transaction?._count.id ?? 0,
      transferCount: transfer?._count.id ?? 0,
      serviceCount: service?._count.id ?? 0,
    };
  });
}

export default async function DashboardPage() {
  const start = startOfToday();
  const end = tomorrowOf(start);
  const user = await requirePermission("dashboard.view");
  const { activeOutlet, outlets } = await outletContext(user);
  const visibleOutlets = user.role.name === "admin" ? outlets : [activeOutlet];
  const title = user.role.name === "admin" ? "Semua Cabang" : "Cabang Saya";
  const description = user.role.name === "admin" ? "Ringkasan operasional semua cabang. Klik cabang untuk melihat detail." : `Ringkasan operasional cabang ${activeOutlet.name}. Klik cabang untuk melihat detail.`;
  const summaries = await outletSummaries(visibleOutlets, start, end, user.role.name === "admin");

  if (user.role.name === "staff") {
    const outlet = summaries[0];

    return (
      <>
        <h1 className="sr-only">Dasbor</h1>
        <section
          aria-labelledby="staff-dashboard-title"
          style={{ borderLeftColor: outletCardColor(outlet) }}
          className="flex flex-col gap-5 rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:flex-row lg:items-center lg:justify-between"
        >
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700">
              <Building2 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-blue-700">Cabang Saya</p>
              <h2 id="staff-dashboard-title" className="mt-1 break-words text-xl font-semibold text-slate-900 sm:text-2xl">
                Selamat bekerja, {user.name}
              </h2>
              <p className="mt-2 text-sm text-slate-600">Ringkasan aktivitas {outlet.name} hari ini.</p>
            </div>
          </div>
          <Link
            href={`/dashboard/cabang/${outlet.id}`}
            prefetch={false}
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Lihat ringkasan cabang
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section aria-labelledby="today-activity-title" className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id="today-activity-title" className="text-base font-semibold text-slate-900">Aktivitas Hari Ini</h2>
            <p className="text-xs text-slate-500">Data cabang aktif</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard title="Penjualan Hari Ini" value={formatCurrency(outlet.sales)} icon={CreditCard} tone="blue" helper="Total transaksi fisik" />
            <StatCard title="Transaksi Fisik" value={String(outlet.transactions)} icon={ReceiptText} tone="cyan" helper="Transaksi valid" />
            <StatCard title="Service Dibayar" value={String(outlet.serviceCount)} icon={Stethoscope} tone="orange" helper="Pembayaran hari ini" />
            <StatCard title="Transfer Dana" value={String(outlet.transferCount)} icon={Send} tone="green" helper="Transfer berhasil" />
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <h1 className="sr-only">Dasbor</h1>
      <p className="mb-4 text-sm text-slate-600">{description}</p>
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaries.map((outlet) => (
            <Link key={outlet.id} href={`/dashboard/cabang/${outlet.id}`} prefetch={false} style={{ borderTopColor: outletCardColor(outlet) }} className="rounded-lg border border-t-4 border-slate-200 bg-slate-50 p-3 transition hover:bg-white hover:shadow-sm">
              <p className="font-medium text-slate-900">{outlet.name}</p>
              <p className="mt-2 text-sm text-slate-600">Penjualan Hari Ini {formatCurrency(outlet.sales)}</p>
              {user.role.name === "admin" ? <p className="mt-1 text-sm text-slate-600">Laba bersih {formatCurrency(outlet.net)}</p> : null}
              <div className="mt-3 grid grid-cols-3 gap-2 text-xs text-slate-500">
                <span>{outlet.transactions} transaksi</span>
                <span className="text-center">{outlet.serviceCount} service</span>
                <span className="text-right">{outlet.transferCount} transfer dana</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
