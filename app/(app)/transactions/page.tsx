import { TransactionClient } from "@/components/transaction-client";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function TransactionsPage() {
  const [items, customers, transactions] = await Promise.all([
    prisma.item.findMany({ where: { stok: { gt: 0 } }, orderBy: { namaBarang: "asc" } }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.transaction.findMany({
      include: { items: { include: { item: true } } },
      orderBy: { createdAt: "desc" },
      take: 100
    })
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
          stok: item.stok
        }))}
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
        transactions={transactions.map((transaction) => ({
          id: transaction.id,
          kodeTransaksi: transaction.kodeTransaksi,
          customerName: transaction.customerName,
          grandTotal: toNumber(transaction.grandTotal),
          paymentMethod: transaction.paymentMethod,
          createdAt: transaction.createdAt.toISOString(),
          items: transaction.items.map((item) => ({
            qty: item.qty,
            item: { namaBarang: item.item.namaBarang }
          }))
        }))}
      />
    </>
  );
}
