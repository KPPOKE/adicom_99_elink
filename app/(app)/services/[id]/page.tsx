import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArrowLeft, Printer } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const service = await prisma.service.findUnique({
    where: { id: Number(id) },
    include: { customer: true, user: true, financeRecords: true }
  });
  if (!service) notFound();

  return (
    <>
      <PageHeader
        title={service.kodeService}
        description={`Detail service ${service.customerName}`}
        action={
          <>
            <Button asChild variant="outline">
              <Link href="/services">
                <ArrowLeft className="h-4 w-4" />
                Kembali
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/services/${service.id}/invoice`}>
                <Printer className="h-4 w-4" />
                Cetak Service
              </Link>
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Service</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <Section title="Perangkat">
              {[service.deviceType, service.deviceBrand, service.deviceModel].filter(Boolean).join(" ")}
            </Section>
            <Section title="Keluhan">{service.problemDescription}</Section>
            <Section title="Diagnosa">{service.diagnosis || "-"}</Section>
            <Section title="Catatan Teknisi">{service.technicianNote || "-"}</Section>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ringkasan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Info label="Status" value={<ServiceStatusBadge status={service.status} />} />
              <Info label="Pembayaran" value={<PaymentStatusBadge status={service.paymentStatus} />} />
              <Info label="Customer" value={service.customerName} />
              <Info label="No. HP" value={service.customerPhone || "-"} />
              <Info label="Admin/Teknisi" value={service.user.name} />
              <Info label="Tanggal Masuk" value={formatDateTime(service.receivedDate)} />
              <Info label="Tanggal Selesai" value={service.completedDate ? formatDateTime(service.completedDate) : "-"} />
              <Info label="Tanggal Diambil" value={service.pickedUpDate ? formatDateTime(service.pickedUpDate) : "-"} />
              <Info label="Estimasi" value={formatCurrency(toNumber(service.estimatedCost))} />
              <Info label="Biaya Final" value={formatCurrency(toNumber(service.finalCost))} strong />
              <Info label="Dibayar" value={service.paidAt ? formatDateTime(service.paidAt) : "-"} />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-1 whitespace-pre-wrap text-slate-900">{children}</p>
    </div>
  );
}

function Info({ label, value, strong }: { label: string; value: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className={strong ? "font-semibold text-blue-700" : "text-right font-medium text-slate-900"}>{value}</span>
    </div>
  );
}
