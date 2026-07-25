import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { formatCurrency, toNumber } from "@/lib/utils";

async function outletSummary(outlet: { id: number; name: string }, start: Date, end: Date) {
  const where = { outletId: outlet.id };
  const [finance, transactions, transferCount] = await Promise.all([
    prisma.financeRecord.groupBy({ by: ["type"], where: { ...where, date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.transaction.count({ where: { ...where, createdAt: { gte: start, lt: end }, status: { not: "Batal" } } }),
    prisma.bankTransfer.count({ where: { ...where, kind: "Transfer", status: "Berhasil", completedAt: { gte: start, lt: end } } })
  ]);
  const income = toNumber(finance.find((item) => item.type === "income")?._sum.amount);
  const expense = toNumber(finance.find((item) => item.type === "expense")?._sum.amount);
  return { id: outlet.id, name: outlet.name, net: income - expense, transactions, transferCount };
}

export default async function DashboardPage() {
  const start = startOfToday();
  const end = tomorrowOf(start);
  const user = await requirePermission("dashboard.view");
  const { activeOutlet, outlets } = await outletContext(user);
  const visibleOutlets = user.role.name === "admin" ? outlets : [activeOutlet];
  const outletSummaries = await Promise.all(visibleOutlets.map((outlet) => outletSummary(outlet, start, end)));

  return (
    <>
      <h1 className="sr-only">Dasbor</h1>
      <p className="mb-4 text-sm text-slate-400">Ringkasan operasional semua cabang. Klik cabang untuk melihat detail.</p>
      <Card>
        <CardHeader><CardTitle>Semua Cabang</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {outletSummaries.map((outlet) => (
            <Link key={outlet.id} href={`/dashboard/cabang/${outlet.id}`} className="rounded-lg border border-slate-800 bg-slate-950/35 p-3 transition hover:border-cyan-400/70 hover:bg-slate-900/60">
              <p className="font-medium text-slate-100">{outlet.name}</p>
              <p className="mt-2 text-sm text-slate-400">Laba bersih {formatCurrency(outlet.net)}</p>
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
