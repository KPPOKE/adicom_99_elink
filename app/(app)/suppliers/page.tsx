import { deleteSupplier, upsertSupplier } from "@/app/actions/master-data";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function SuppliersPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const where = q ? { OR: [{ name: { contains: q } }, { phone: { contains: q } }, { address: { contains: q } }] } : undefined;
  const [data, total] = await Promise.all([
    prisma.supplier.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.supplier.count({ where })
  ]);
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
        pagination={{ page, pageSize: PAGE_SIZE, total, query: queryValues(params) }}
      />
    </>
  );
}
