import { TransactionClient } from "@/components/transaction-client";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function TransactionsPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const where = q ? { OR: [{ kodeTransaksi: { contains: q } }, { customerName: { contains: q } }, { items: { some: { item: { namaBarang: { contains: q } } } } }] } : undefined;
  const [user, items, customers, transactions, total] = await Promise.all([
    getCurrentUser(),
    prisma.item.findMany({ where: { stok: { gt: 0 } }, include: { category: true }, orderBy: { namaBarang: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      where,
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.transaction.count({ where })
  ]);
  return (
    <>
      <PageHeader title="Transaksi Penjualan" description="Buat transaksi multi-item, hitung diskon, pembayaran, dan update stok otomatis." />
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
          items: transaction.items.map((item) => ({
            qty: item.qty,
            item: { namaBarang: item.item.namaBarang }
          }))
        }))}
        role={user?.role.name ?? "staff"}
        pagination={{ page, pageSize: PAGE_SIZE, total, query: queryValues(params) }}
      />
    </>
  );
}
