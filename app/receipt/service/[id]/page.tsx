import { notFound } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDateTime, formatWhatsAppPhone, toNumber } from "@/lib/utils";
import { PrintButton } from "./print-button";

export const metadata = {
  title: "Tanda Terima Service Online - PosPintar",
  description: "Lihat dan unduh bukti tanda terima service online."
};

export default async function PublicServiceReceiptPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const serviceId = Number(id);
  if (!serviceId || isNaN(serviceId)) notFound();

  const [service, setting] = await Promise.all([
    prisma.service.findUnique({
      where: { id: serviceId },
      include: { user: true, customer: true, outlet: true, parts: { include: { item: true } } }
    }),
    prisma.setting.findFirst()
  ]);

  if (!service) notFound();

  const cost = toNumber(service.finalCost) || toNumber(service.estimatedCost);
  const storeName = service.outlet?.name || setting?.storeName || "Adicom99";
  const storeAddress = setting?.address || "Service hardware, laptop, PC, HP, pulsa, token listrik, dan produk digital.";
  const storeWA = setting?.whatsapp || "+62 812-3456-8987";

  return (
    <div className="min-h-screen bg-slate-100 py-4 sm:py-8 px-3 sm:px-4 text-slate-900 font-sans">
      <div className="mx-auto max-w-md bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
        {/* Banner Header */}
        <header className="p-6 text-center border-b border-slate-100 bg-slate-50/50">
          {setting?.logo ? (
            <img src={setting.logo} alt={storeName} className="mx-auto mb-2 h-14 w-14 object-contain" />
          ) : null}
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{storeName}</h1>
          <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">{storeAddress}</p>
          {storeWA ? (
            <p className="mt-1.5 text-xs font-semibold text-emerald-600 flex items-center justify-center gap-1">
              <span>WA: {storeWA}</span>
            </p>
          ) : null}
        </header>

        {/* Metadata Details */}
        <div className="p-5 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-y-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-slate-400 block text-[11px]">Kode Service</span>
              <span className="font-bold text-slate-900 text-sm">{service.kodeService}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">Tanggal Masuk</span>
              <span className="font-medium text-slate-800">{formatDateTime(service.receivedDate)}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px]">Customer</span>
              <span className="font-semibold text-slate-900">{service.customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[11px]">No. HP</span>
              <span className="font-medium text-slate-800">{service.customerPhone || "-"}</span>
            </div>
            <div className="col-span-2 pt-1 border-t border-slate-100 flex justify-between items-center">
              <span className="text-slate-400">Teknisi / Admin</span>
              <span className="font-medium text-slate-800">{service.user?.name || "Admin Adicom99"}</span>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Perangkat</span>
              <span className="font-bold text-slate-900 text-sm">
                {[service.deviceType, service.deviceBrand, service.deviceModel].filter(Boolean).join(" ")}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[11px] font-medium">Keluhan</span>
              <p className="text-slate-800 bg-slate-50 p-2 rounded-md mt-0.5">{service.problemDescription}</p>
            </div>
            {service.diagnosis ? (
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Diagnosa</span>
                <p className="text-slate-800 bg-slate-50 p-2 rounded-md mt-0.5">{service.diagnosis}</p>
              </div>
            ) : null}
            {service.technicianNote ? (
              <div>
                <span className="text-slate-400 block text-[11px] font-medium">Catatan Teknisi</span>
                <p className="text-slate-800 bg-slate-50 p-2 rounded-md mt-0.5">{service.technicianNote}</p>
              </div>
            ) : null}
          </div>

          {/* Status & Costs Section */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Status Service</span>
              <ServiceStatusBadge status={service.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600 font-medium">Status Bayar</span>
              <PaymentStatusBadge status={service.paymentStatus} />
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5">
              <Row label="Estimasi" value={formatCurrency(toNumber(service.estimatedCost))} />
              {service.parts?.length ? (
                <div className="bg-slate-50 p-2 rounded-md space-y-1 my-1">
                  {service.parts.map((part) => (
                    <Row key={part.id} label={`${part.item.namaBarang} x${part.qty}`} value={formatCurrency(toNumber(part.subtotal))} />
                  ))}
                </div>
              ) : null}
              <Row label="Biaya Jasa" value={formatCurrency(toNumber(service.laborCost))} />
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-extrabold text-slate-900">
                <span>Biaya Final</span>
                <span className="text-base text-blue-700">{formatCurrency(cost)}</span>
              </div>
              {service.paidAt ? <Row label="Tanggal Dibayar" value={formatDateTime(service.paidAt)} /> : null}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          <PrintButton />
          {storeWA ? (
            <Button asChild variant="outline" className="w-full text-emerald-700 border-emerald-300 hover:bg-emerald-50">
              <a href={`https://api.whatsapp.com/send?phone=${formatWhatsAppPhone(storeWA)}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-4 w-4 mr-2 text-emerald-600" />
                Hubungi WhatsApp Toko
              </a>
            </Button>
          ) : null}
        </div>

        {/* Footer */}
        <footer className="py-3 px-4 text-center text-[11px] text-slate-400 bg-slate-100 border-t border-slate-200">
          Tanda terima digital ini diterbitkan secara resmi oleh {storeName}.
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  );
}
