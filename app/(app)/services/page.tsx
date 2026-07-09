import { PaymentStatus, Prisma, ServiceStatus } from "@prisma/client";
import { ServiceClient } from "@/components/service-client";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function ServicesPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const status = Object.values(ServiceStatus).find((value) => value === query.status);
  const payment = Object.values(PaymentStatus).find((value) => value === query.payment);
  const where: Prisma.ServiceWhereInput = { AND: [
    q ? { OR: [{ kodeService: { contains: q } }, { customerName: { contains: q } }, { customerPhone: { contains: q } }] } : {},
    status ? { status } : {},
    payment ? { paymentStatus: payment } : {}
  ] };
  const [user, services, total, customers, items] = await Promise.all([
    getCurrentUser(),
    prisma.service.findMany({ where, include: { parts: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.service.count({ where }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { category: { name: { not: "Produk Digital" } } }, orderBy: { namaBarang: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Manajemen Service" description="Kelola service masuk, diagnosa, biaya, status, dan pemasukan service." />
      <ServiceClient
        services={services.map((service) => ({
          ...service,
          status: service.status,
          paymentStatus: service.paymentStatus,
          estimatedCost: toNumber(service.estimatedCost),
          laborCost: toNumber(service.laborCost),
          finalCost: toNumber(service.finalCost),
          parts: service.parts.map((part) => ({ id: part.id, itemId: part.itemId, qty: part.qty, price: toNumber(part.price), subtotal: toNumber(part.subtotal) })),
          receivedDate: service.receivedDate.toISOString(),
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
          completedDate: service.completedDate?.toISOString() ?? null,
          pickedUpDate: service.pickedUpDate?.toISOString() ?? null,
          paidAt: service.paidAt?.toISOString() ?? null
        }))}
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
        items={items.map((item) => ({ id: item.id, namaBarang: item.namaBarang, kodeBarang: item.kodeBarang, hargaJual: toNumber(item.hargaJual), stok: item.stok }))}
        role={user?.role.name ?? "staff"}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ status: query.status ?? "", payment: query.payment ?? "" }}
      />
    </>
  );
}
