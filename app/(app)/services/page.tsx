import { ServiceClient } from "@/components/service-client";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function ServicesPage() {
  const [services, customers] = await Promise.all([
    prisma.service.findMany({ orderBy: { createdAt: "desc" }, take: 150 }),
    prisma.customer.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Manajemen Service" description="Kelola service masuk, diagnosa, biaya, status, dan pemasukan service." />
      <ServiceClient
        services={services.map((service) => ({
          ...service,
          status: service.status,
          estimatedCost: toNumber(service.estimatedCost),
          finalCost: toNumber(service.finalCost),
          receivedDate: service.receivedDate.toISOString(),
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
          completedDate: service.completedDate?.toISOString() ?? null,
          pickedUpDate: service.pickedUpDate?.toISOString() ?? null
        }))}
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
      />
    </>
  );
}
