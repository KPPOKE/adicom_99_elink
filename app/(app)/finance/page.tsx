import { FinanceType, Prisma } from "@prisma/client";
import { FinanceClient } from "@/components/finance-client";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function FinancePage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const type = query.type === "income" ? FinanceType.income : query.type === "expense" ? FinanceType.expense : undefined;
  const user = await getCurrentUser();
  if (!user) throw new Error("User tidak ditemukan");
  const { activeOutlet } = await outletContext(user);
  const where: Prisma.FinanceRecordWhereInput = { AND: [
    { outletId: activeOutlet.id },
    q ? { OR: [{ category: { contains: q } }, { description: { contains: q } }] } : {},
    type ? { type } : {},
    query.category ? { category: query.category } : {}
  ] };
  const [records, total, income, expense, categories] = await Promise.all([
    prisma.financeRecord.findMany({ where, orderBy: { date: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.financeRecord.count({ where }),
    prisma.financeRecord.aggregate({ where: { AND: [where, { type: "income" }] }, _sum: { amount: true } }),
    prisma.financeRecord.aggregate({ where: { AND: [where, { type: "expense" }] }, _sum: { amount: true } }),
    prisma.financeRecord.groupBy({ by: ["category"], orderBy: { category: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Keuangan" description="Pantau pemasukan, pengeluaran, laba bersih, dan catatan manual." />
      <FinanceClient
        role={user?.role.name ?? "staff"}
        records={records.map((record) => ({
          id: record.id,
          type: record.type,
          category: record.category,
          amount: toNumber(record.amount),
          description: record.description,
          date: record.date.toISOString(),
          referenceType: record.referenceType
        }))}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ type: query.type ?? "", category: query.category ?? "" }}
        categories={categories.map((item) => item.category)}
        summary={{ income: toNumber(income._sum.amount), expense: toNumber(expense._sum.amount) }}
      />
    </>
  );
}
