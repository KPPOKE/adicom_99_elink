import { deleteCustomer, upsertCustomer } from "@/app/actions/master-data";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { canCurrentUser, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const user = await requirePermission("customers.view");
  const { activeOutlet } = await outletContext(user);
  const where = { AND: [{ outlets: { some: { outletId: activeOutlet.id } } }, q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : {}] };
  const [data, total, canAdd, canManage, canDelete] = await Promise.all([
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.customer.count({ where }),
    canCurrentUser("customers.manage"),
    canCurrentUser("customers.edit"),
    canCurrentUser("customers.delete")
  ]);
  return (
    <>
      <PageHeader title="Pelanggan" description="Data pelanggan beserta riwayat transaksi dan service." />
      <SimpleCrud
        title="Pelanggan"
        data={data}
        fields={[
          { name: "name", label: "Nama Pelanggan" },
          { name: "phone", label: "Telepon" },
          { name: "email", label: "Email", type: "email" },
          { name: "address", label: "Alamat", type: "textarea" }
        ]}
        upsertAction={upsertCustomer}
        deleteAction={deleteCustomer}
        canAdd={canAdd}
        canManage={canManage}
        canDelete={canDelete}
        detailHrefPrefix="/customers"
        pagination={{ page, pageSize: PAGE_SIZE, total, query: queryValues(params) }}
      />
    </>
  );
}



