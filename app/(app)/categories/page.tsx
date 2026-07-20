import { upsertCategory, deleteCategory } from "@/app/actions/master-data";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CategoriesPage() {
  await requireAdmin();
  const data = await prisma.category.findMany({ orderBy: { name: "asc" } });
  return (
    <>
      <PageHeader title="Kategori Barang" description="Kelola kategori inventory termasuk produk digital." />
      <SimpleCrud
        title="Kategori"
        data={data}
        fields={[
          { name: "name", label: "Nama Kategori" },
          { name: "description", label: "Deskripsi", type: "textarea" }
        ]}
        upsertAction={upsertCategory}
        deleteAction={deleteCategory}
      />
    </>
  );
}
