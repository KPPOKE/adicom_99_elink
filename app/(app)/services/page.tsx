import { PaymentStatus, Prisma, ServiceStatus } from "@prisma/client";
import { ServiceClient } from "@/components/service-client";
import { PageHeader } from "@/components/shared/page-header";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PAGE_SIZE, SELECT_OPTION_LIMIT, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function ServicesPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const user = await requirePermission("services.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const status = Object.values(ServiceStatus).find((value) => value === query.status);
  const payment = Object.values(PaymentStatus).find((value) => value === query.payment);
  const where: Prisma.ServiceWhereInput = { AND: [
    { outletId: activeOutlet.id },
    q ? { OR: [{ kodeService: { contains: q } }, { customerName: { contains: q } }, { customerPhone: { contains: q } }] } : {},
    status ? { status } : {},
    payment ? { paymentStatus: payment } : {}
  ] };
  const [services, total, customers, items, fundAccounts] = await Promise.all([
    prisma.service.findMany({ where, include: { parts: true, fundAccount: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.service.count({ where }),
    prisma.customer.findMany({ where: { outlets: { some: { outletId: activeOutlet.id } } }, orderBy: { name: "asc" }, take: SELECT_OPTION_LIMIT }),
    prisma.item.findMany({ where: { outletId: activeOutlet.id, isActive: true, category: { name: { not: "Produk Digital" } } }, include: { category: true }, orderBy: { namaBarang: "asc" }, take: SELECT_OPTION_LIMIT }),
    prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] })
  ]);
  return (
    <>
      <PageHeader title="Manajemen Service" description={`Service dan sparepart cabang ${activeOutlet.name}.`} />
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
          grossProfit: toNumber(service.grossProfit),
          createdAt: service.createdAt.toISOString(),
          updatedAt: service.updatedAt.toISOString(),
          completedDate: service.completedDate?.toISOString() ?? null,
          pickedUpDate: service.pickedUpDate?.toISOString() ?? null,
          paidAt: service.paidAt?.toISOString() ?? null,
          paymentMethod: service.paymentMethod,
          paidAmount: toNumber(service.paidAmount),
          changeAmount: toNumber(service.changeAmount),
          fundAccountId: service.fundAccountId,
          fundAccountName: service.fundAccount?.name ?? null
        }))}
        customers={customers.map((customer) => ({ id: customer.id, name: customer.name, phone: customer.phone }))}
        items={items.map((item) => ({ id: item.id, namaBarang: item.namaBarang, kodeBarang: item.kodeBarang, hargaJual: toNumber(item.hargaJual), stok: item.stok, categoryName: item.category.name }))}
        fundAccounts={fundAccounts.map((acc) => ({ id: acc.id, name: acc.name, type: acc.type }))}
        role={user.role.name}
        permissions={permissions}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ status: query.status ?? "", payment: query.payment ?? "" }}
      />
    </>
  );
}

