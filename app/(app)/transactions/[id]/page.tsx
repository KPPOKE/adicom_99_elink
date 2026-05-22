import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

export default async function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const transaction = await prisma.transaction.findUnique({
    where: { id: Number(id) },
    include: {
      customer: true,
      user: true,
      financeRecords: true,
      items: { include: { item: { include: { category: true } } } }
    }
  });
  if (!transaction) notFound();

  return (
    <>
      <PageHeader
        title={transaction.kodeTransaksi}
        description={`Detail transaksi ${formatDateTime(transaction.createdAt)}`}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/transactions">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/transactions/${transaction.id}/invoice`}>
                <Printer className="h-4 w-4" />
                Cetak Invoice
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Item Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-800 text-left text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2">Barang</th>
                    <th className="py-2">Kategori</th>
                    <th className="py-2 text-center">Qty</th>
                    <th className="py-2 text-right">Harga</th>
                    <th className="py-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {transaction.items.map((line) => (
                    <tr key={line.id}>
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-100">{line.item.namaBarang}</p>
                        <p className="text-xs text-slate-500">{line.item.kodeBarang}</p>
                      </td>
                      <td className="py-3 pr-3">{line.item.category.name}</td>
                      <td className="py-3 text-center">{line.qty}</td>
                      <td className="py-3 text-right">{formatCurrency(toNumber(line.price))}</td>
                      <td className="py-3 text-right font-medium">{formatCurrency(toNumber(line.subtotal))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="Status" value={<TransactionStatusBadge status={transaction.status} />} />
              <Info label="Customer" value={transaction.customerName || transaction.customer?.name || "Umum"} />
              <Info label="Kasir" value={transaction.user.name} />
              <Info label="Metode" value={transaction.paymentMethod} />
              <Info label="Subtotal" value={formatCurrency(toNumber(transaction.total))} />
              <Info label="Diskon" value={formatCurrency(toNumber(transaction.diskon))} />
              <Info label="Grand Total" value={formatCurrency(toNumber(transaction.grandTotal))} strong />
              <Info label="Dibayar" value={formatCurrency(toNumber(transaction.paidAmount))} />
              <Info label="Kembalian" value={formatCurrency(toNumber(transaction.changeAmount))} />
            </CardContent>
          </Card>
          {(transaction.nomorTujuan || transaction.serialNumber || transaction.digitalStatus) ? (
            <Card>
              <CardHeader>
                <CardTitle>Produk Digital</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Info label="Nomor Tujuan" value={transaction.nomorTujuan ?? "-"} />
                <Info label="Provider" value={transaction.provider ?? "-"} />
                <Info label="Jenis Produk" value={transaction.jenisProduk ?? "-"} />
                <Info label="SN/Token" value={transaction.serialNumber ?? "-"} />
                <Info label="Status Digital" value={transaction.digitalStatus ?? "-"} />
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}

function Info({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? "font-semibold text-blue-300" : "text-right font-medium text-slate-200"}>{value}</span>
    </div>
  );
}
