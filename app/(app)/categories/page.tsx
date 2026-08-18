import { upsertCategory, deleteCategory } from "@/app/actions/master-data";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { PageHeader } from "@/components/shared/page-header";
import { canCurrentUser, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export default async function CategoriesPage() {
  await requirePermission("categories.view");
  const [data, canAdd, canManage, canDelete] = await Promise.all([
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    canCurrentUser("categories.manage"),
    canCurrentUser("categories.edit"),
    canCurrentUser("categories.delete")
  ]);
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
        canAdd={canAdd}
        canManage={canManage}
        canDelete={canDelete}
      />
    </>
  );
}

