import { Prisma } from "@prisma/client";
import { InventoryClient } from "@/components/inventory-client";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";

export default async function InventoryPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const categoryId = Number(query.category) || undefined;
  const supplier = query.supplier;
  const stock = query.stock;
  const where: Prisma.ItemWhereInput = { AND: [
    { outletId: activeOutlet.id },
    q ? { OR: [{ namaBarang: { contains: q } }, { kodeBarang: { contains: q } }, { category: { name: { contains: q } } }] } : {},
    categoryId ? { categoryId } : {},
    supplier === "none" ? { supplierId: null } : supplier ? { supplierId: Number(supplier) } : {},
    stock === "empty" ? { stok: { lte: 0 } } : stock === "low" ? { stok: { gt: 0, lte: prisma.item.fields.stokMinimum } } : stock === "safe" ? { stok: { gt: prisma.item.fields.stokMinimum } } : {}
  ] };
  const [items, total, categories, suppliers] = await Promise.all([
    prisma.item.findMany({ where, include: { category: true, supplier: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.item.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" } }),
    prisma.supplier.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Inventory" description={`Kelola stok cabang ${activeOutlet.name}.`} />
      <InventoryClient
        items={items.map((item) => ({
          ...item,
          hargaModal: toNumber(item.hargaModal),
          hargaJual: toNumber(item.hargaJual)
        }))}
        categories={categories}
        suppliers={suppliers}
        role={user.role.name}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ category: query.category ?? "all", supplier: query.supplier ?? "all", stock: query.stock ?? "all" }}
      />
    </>
  );
}
