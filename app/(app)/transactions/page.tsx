import { TransactionClient } from "@/components/transaction-client";
import { PageHeader } from "@/components/shared/page-header";
import { canCurrentUser, requirePermission } from "@/lib/permissions";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { SELECT_OPTION_LIMIT, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

const TRANSACTION_PAGE_SIZE = 10;

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const user = await requirePermission("transactions.view");
  const { activeOutlet } = await outletContext(user);
  const outletWhere = { outletId: activeOutlet.id };
  const where = q ? { AND: [outletWhere, { OR: [{ kodeTransaksi: { contains: q } }, { customerName: { contains: q } }, { items: { some: { item: { namaBarang: { contains: q } } } } }] }] } : outletWhere;
  
  const start = startOfToday();
  const end = tomorrowOf(start);

  const [items, customers, transactions, total, canDelete, todayTransactions] = await Promise.all([
    prisma.item.findMany({ where: { ...outletWhere, stok: { gt: 0 } }, include: { category: true }, orderBy: { namaBarang: "asc" }, take: SELECT_OPTION_LIMIT }),
    prisma.customer.findMany({ where: { outlets: { some: { outletId: activeOutlet.id } } }, orderBy: { name: "asc" }, take: SELECT_OPTION_LIMIT }),
    prisma.transaction.findMany({
      where,
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * TRANSACTION_PAGE_SIZE,
      take: TRANSACTION_PAGE_SIZE
    }),
    prisma.transaction.count({ where }),
    canCurrentUser("transactions.delete"),
    prisma.transaction.findMany({
      where: {
        outletId: activeOutlet.id,
        createdAt: { gte: start, lt: end }
      },
      select: {
        grandTotal: true,
        status: true
      }
    })
  ]);

  const todaySummary = {
    totalSales: todayTransactions
      .filter((t) => t.status === "Berhasil")
      .reduce((sum, t) => sum + toNumber(t.grandTotal), 0),
    countSuccess: todayTransactions.filter((t) => t.status === "Berhasil").length,
    countPending: todayTransactions.filter((t) => t.status === "Pending").length,
    countCancelled: todayTransactions.filter((t) => t.status === "Batal").length,
  };

  return (
    <>
      <PageHeader title="Transaksi Penjualan" description={`Transaksi cabang ${activeOutlet.name}.`} />
      <TransactionClient
        items={items.map((item) => ({
          id: item.id,
          namaBarang: item.namaBarang,
          kodeBarang: item.kodeBarang,
          hargaJual: toNumber(item.hargaJual),
          stok: item.stok,
          categoryName: item.category.name
        }))}
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
        transactions={transactions.map((transaction) => ({
          id: transaction.id,
          kodeTransaksi: transaction.kodeTransaksi,
          customerName: transaction.customerName,
          grandTotal: toNumber(transaction.grandTotal),
          paymentMethod: transaction.paymentMethod,
          status: transaction.status,
          createdAt: transaction.createdAt.toISOString(),
          items: transaction.items.map((item) => ({ qty: item.qty, item: { namaBarang: item.item.namaBarang } }))
        }))}
        role={user.role.name}
        canDelete={canDelete}
        pagination={{ page, pageSize: TRANSACTION_PAGE_SIZE, total, query: queryValues(params) }}
        todaySummary={todaySummary}
      />
    </>
  );
}


