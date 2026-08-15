import { PageHeader } from "@/components/shared/page-header";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { ServiceCatalogClient } from "@/components/service-catalog-client";

export default async function ServicesCatalogPage() {
  const user = await requirePermission("services.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);

  let jasaCategory = await prisma.category.findFirst({ where: { name: "Jasa" } });
  if (!jasaCategory) {
    jasaCategory = await prisma.category.create({ data: { name: "Jasa", description: "Kategori Layanan Service" } });
  }

  const items = await prisma.item.findMany({
    where: { outletId: activeOutlet.id, categoryId: jasaCategory.id },
    orderBy: { namaBarang: "asc" }
  });

  return (
    <>
      <PageHeader
        title="Master Data Jasa"
        description={`Daftar tarif dan katalog layanan service di ${activeOutlet.name}.`}
      />
      <ServiceCatalogClient
        items={items.map((item) => ({
          ...item,
          hargaModal: toNumber(item.hargaModal),
          hargaJual: toNumber(item.hargaJual)
        }))}
        jasaCategoryId={jasaCategory.id}
        role={user.role.name}
        permissions={permissions}
      />
    </>
  );
}
