import { FinanceClient } from "@/components/finance-client";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function FinancePage() {
  const records = await prisma.financeRecord.findMany({ orderBy: { date: "desc" }, take: 200 });
  return (
    <>
      <PageHeader title="Keuangan" description="Pantau pemasukan, pengeluaran, laba bersih, dan catatan manual." />
      <FinanceClient
        records={records.map((record) => ({
          id: record.id,
          type: record.type,
          category: record.category,
          amount: toNumber(record.amount),
          description: record.description,
          date: record.date.toISOString(),
          referenceType: record.referenceType
        }))}
      />
    </>
  );
}
