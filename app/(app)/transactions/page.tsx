import { TransactionClient } from "@/components/transaction-client";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

const TRANSACTION_PAGE_SIZE = 10;

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const user = await requireUser();
  const { activeOutlet } = await outletContext(user);
  const outletWhere = { outletId: activeOutlet.id };
  const where = q ? { AND: [outletWhere, { OR: [{ kodeTransaksi: { contains: q } }, { customerName: { contains: q } }, { items: { some: { item: { namaBarang: { contains: q } } } } }] }] } : outletWhere;
  const [items, customers, transactions, total] = await Promise.all([
    prisma.item.findMany({ where: { ...outletWhere, stok: { gt: 0 } }, include: { category: true }, orderBy: { namaBarang: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where,
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * TRANSACTION_PAGE_SIZE,
      take: TRANSACTION_PAGE_SIZE
    }),
    prisma.transaction.count({ where })
  ]);
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
        pagination={{ page, pageSize: TRANSACTION_PAGE_SIZE, total, query: queryValues(params) }}
      />
    </>
  );
}
