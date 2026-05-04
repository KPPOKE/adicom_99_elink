import { InventoryClient } from "@/components/inventory-client";
import { PageHeader } from "@/components/shared/page-header";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function InventoryPage() {
  const [items, categories, suppliers] = await Promise.all([
    prisma.item.findMany({ include: { category: true, supplier: true }, orderBy: { createdAt: "desc" } }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Inventory" description="Kelola barang, stok, harga, supplier, dan status stok minimum." />
      <InventoryClient
        items={items.map((item) => ({
          ...item,
          hargaModal: toNumber(item.hargaModal),
          hargaJual: toNumber(item.hargaJual)
        }))}
        categories={categories}
        suppliers={suppliers}
      />
    </>
  );
}
