import { deleteCustomer, upsertCustomer } from "@/app/actions/master-data";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CustomersPage() {
  const [user, data] = await Promise.all([
    getCurrentUser(),
    prisma.customer.findMany({ orderBy: { createdAt: "desc" } })
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
      />
    </>
  );
}
