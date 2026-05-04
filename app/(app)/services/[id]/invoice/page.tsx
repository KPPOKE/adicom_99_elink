import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PrintControls } from "@/components/print-controls";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency, formatDateTime, toNumber } from "@/lib/utils";

export default async function ServiceInvoicePage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, rawQuery] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const query = rawQuery as Record<string, string | string[] | undefined>;
  const [service, setting] = await Promise.all([
    prisma.service.findUnique({
      where: { id: Number(id) },
      include: { user: true, customer: true }
    }),
    prisma.setting.findFirst()
  ]);
  if (!service) notFound();

  const selectedFormat = String(query.format ?? setting?.defaultPrintFormat ?? "thermal_80");
  const formatClass = selectedFormat === "a4" ? "print-a4 max-w-3xl" : selectedFormat === "thermal_58" ? "print-thermal-58 max-w-[260px]" : "print-thermal-80 max-w-[360px]";
  const cost = toNumber(service.finalCost) || toNumber(service.estimatedCost);

  return (
    <div>
      <div className="no-print mb-4 flex items-center justify-between gap-3">
        <Button asChild variant="outline">
          <Link href="/services">
            <ArrowLeft className="h-4 w-4" />
            Kembali
          </Link>
        </Button>
        <PrintControls defaultFormat={setting?.defaultPrintFormat ?? "thermal_80"} />
      </div>
      <article className={cn("mx-auto rounded-lg bg-white p-6 text-sm text-slate-900 shadow-sm print:shadow-none", formatClass)}>
        <header className="border-b border-slate-200 pb-4 text-center">
          {setting?.logo ? <img src={setting.logo} alt="" className="mx-auto mb-2 h-12 w-12 object-contain" /> : null}
          <h1 className="text-lg font-bold">{setting?.storeName ?? "Adicom99"}</h1>
          <p className="text-xs text-slate-500">{setting?.address ?? "Service hardware, komponen, dan produk digital"}</p>
          {setting?.whatsapp ? <p className="text-xs text-slate-500">WA: {setting.whatsapp}</p> : null}
        </header>

        <section className="my-4 grid gap-1 text-xs">
          <Row label="Kode Service" value={service.kodeService} />
          <Row label="Tanggal Masuk" value={formatDateTime(service.receivedDate)} />
          <Row label="Customer" value={service.customerName} />
          <Row label="No. HP" value={service.customerPhone ?? "-"} />
          <Row label="Teknisi/Admin" value={service.user.name} />
        </section>

        <section className="space-y-3 border-y border-slate-200 py-4 text-xs">
          <div>
            <p className="text-slate-500">Perangkat</p>
            <p className="font-semibold">{[service.deviceType, service.deviceBrand, service.deviceModel].filter(Boolean).join(" ")}</p>
          </div>
          <div>
            <p className="text-slate-500">Keluhan</p>
            <p>{service.problemDescription}</p>
          </div>
          {service.diagnosis ? (
            <div>
              <p className="text-slate-500">Diagnosa</p>
              <p>{service.diagnosis}</p>
            </div>
          ) : null}
          {service.technicianNote ? (
            <div>
              <p className="text-slate-500">Catatan Teknisi</p>
              <p>{service.technicianNote}</p>
            </div>
          ) : null}
        </section>

        <section className="mt-4 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-4">
            <span>Status Service</span>
            <ServiceStatusBadge status={service.status} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span>Status Bayar</span>
            <PaymentStatusBadge status={service.paymentStatus} />
          </div>
          <Row label="Estimasi" value={formatCurrency(toNumber(service.estimatedCost))} />
          <Row label="Biaya Final" value={formatCurrency(cost)} strong />
          {service.paidAt ? <Row label="Dibayar" value={formatDateTime(service.paidAt)} /> : null}
        </section>

        <footer className="mt-6 border-t border-slate-200 pt-4 text-center text-xs text-slate-500">
          {setting?.invoiceFooter ?? "Terima kasih."}
        </footer>
      </article>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4", strong && "text-sm font-bold")}>
      <span>{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
