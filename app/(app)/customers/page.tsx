import { deleteCustomer, upsertCustomer } from "@/app/actions/master-data";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function CustomersPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { email: { contains: q } }] } : undefined;
  const [user, data, total] = await Promise.all([
    getCurrentUser(),
    prisma.customer.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.customer.count({ where })
  ]);
  return (
    <>
      <PageHeader title="Customer" description="Data customer beserta riwayat transaksi dan service." />
      <SimpleCrud
        title="Customer"
        data={data}
        fields={[
          { name: "name", label: "Nama Customer" },
          { name: "phone", label: "Telepon" },
          { name: "email", label: "Email", type: "email" },
          { name: "address", label: "Alamat", type: "textarea" }
        ]}
        upsertAction={upsertCustomer}
        deleteAction={deleteCustomer}
        canManage
        canDelete={user?.role.name === "admin"}
        detailHrefPrefix="/customers"
        pagination={{ page, pageSize: PAGE_SIZE, total, query: queryValues(params) }}
      />
    </>
  );
}
