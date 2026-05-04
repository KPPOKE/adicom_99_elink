import { deleteSupplier, upsertSupplier } from "@/app/actions/master-data";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { prisma } from "@/lib/prisma";

export default async function SuppliersPage() {
  const data = await prisma.supplier.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Supplier" description="Kelola kontak supplier komponen dan produk digital." />
      <SimpleCrud
        title="Supplier"
        data={data}
        fields={[
          { name: "name", label: "Nama Supplier" },
          { name: "phone", label: "Telepon" },
          { name: "address", label: "Alamat", type: "textarea" },
          { name: "note", label: "Catatan", type: "textarea" }
        ]}
        upsertAction={upsertSupplier}
        deleteAction={deleteSupplier}
      />
    </>
  );
}
