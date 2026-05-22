import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { ServiceStatusBadge, TransactionStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const customer = await prisma.customer.findUnique({
    where: { id: Number(id) },
    include: {
      transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      services: { orderBy: { receivedDate: "desc" }, take: 20 }
    }
  });
  if (!customer) notFound();

  return (
    <>
      <PageHeader
        title={customer.name}
        description={[customer.phone, customer.email, customer.address].filter(Boolean).join(" • ") || "Detail customer"}
        action={
          <Button asChild variant="outline">
            <Link href="/customers">
              <ArrowLeft className="h-4 w-4" />
              Kembali
            </Link>
          </Button>
        }
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.transactions.length ? customer.transactions.map((transaction) => (
              <Link key={transaction.id} href={`/transactions/${transaction.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3 hover:bg-blue-950/20">
                <div>
                  <p className="font-medium text-slate-100">{transaction.kodeTransaksi}</p>
                  <p className="text-xs text-slate-500">{formatDateTime(transaction.createdAt)}</p>
                </div>
                <div className="text-right">
                  <TransactionStatusBadge status={transaction.status} />
                  <p className="mt-1 font-semibold text-blue-300">{formatCurrency(toNumber(transaction.grandTotal))}</p>
                </div>
              </Link>
            )) : <p className="text-sm text-slate-500">Belum ada transaksi.</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Riwayat Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {customer.services.length ? customer.services.map((service) => (
              <Link key={service.id} href={`/services/${service.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950/35 p-3 hover:bg-blue-950/20">
                <div>
                  <p className="font-medium text-slate-100">{service.kodeService}</p>
                  <p className="text-xs text-slate-500">{[service.deviceType, service.deviceBrand, service.deviceModel].filter(Boolean).join(" ")}</p>
                </div>
                <ServiceStatusBadge status={service.status} />
              </Link>
            )) : <p className="text-sm text-slate-500">Belum ada service.</p>}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
