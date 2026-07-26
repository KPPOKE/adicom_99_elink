import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

async function outletSummaries(outlets: Array<{ id: number; name: string }>, start: Date, end: Date) {
  const outletIds = outlets.map((outlet) => outlet.id);
  const [finance, transactions, transfers] = await Promise.all([
    prisma.financeRecord.groupBy({ by: ["outletId", "type"], where: { outletId: { in: outletIds }, date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.transaction.groupBy({ by: ["outletId"], where: { outletId: { in: outletIds }, createdAt: { gte: start, lt: end }, status: { not: "Batal" } }, _count: { id: true }, _sum: { grandTotal: true } }),
    prisma.bankTransfer.groupBy({ by: ["outletId"], where: { outletId: { in: outletIds }, kind: "Transfer", status: "Berhasil", completedAt: { gte: start, lt: end } }, _count: { id: true } })
  ]);

  return outlets.map((outlet) => {
    const income = finance.filter((item) => item.outletId === outlet.id && item.type === "income").reduce((sum, item) => sum + toNumber(item._sum.amount), 0);
    const expense = finance.filter((item) => item.outletId === outlet.id && item.type === "expense").reduce((sum, item) => sum + toNumber(item._sum.amount), 0);
    const transaction = transactions.find((item) => item.outletId === outlet.id);
    const transfer = transfers.find((item) => item.outletId === outlet.id);
    return {
      id: outlet.id,
      name: outlet.name,
      net: income - expense,
      sales: toNumber(transaction?._sum.grandTotal),
      transactions: transaction?._count.id ?? 0,
      transferCount: transfer?._count.id ?? 0
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
  const summaries = await outletSummaries(visibleOutlets, start, end);

  return (
    <>
      <h1 className="sr-only">Dasbor</h1>
      <p className="mb-4 text-sm text-slate-400">{description}</p>
      <Card>
        <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {summaries.map((outlet) => (
            <Link key={outlet.id} href={`/dashboard/cabang/${outlet.id}`} className="rounded-lg border border-slate-800 bg-slate-950/35 p-3 transition hover:border-cyan-400/70 hover:bg-slate-900/60">
              <p className="font-medium text-slate-100">{outlet.name}</p>
              <p className="mt-2 text-sm text-slate-400">Penjualan Hari Ini {formatCurrency(outlet.sales)}</p>
              <p className="mt-1 text-sm text-slate-400">Laba bersih {formatCurrency(outlet.net)}</p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                <span>{outlet.transactions} transaksi</span>
                <span>{outlet.transferCount} transfer dana</span>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
