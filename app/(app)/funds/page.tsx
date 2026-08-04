import { FundsClient } from "@/components/funds-client";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission } from "@/lib/permission-keys";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function FundsPage() {
  const user = await requirePermission("funds.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const funds = await prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  return <><PageHeader title="Saldo Awal" description={`Kelola LACI, bank, e-wallet, dan sumber dana cabang ${activeOutlet.name}.`} /><FundsClient canManage={hasPermission(user.role.name, permissions, "funds.manage")} funds={funds.map((item) => ({ id: item.id, name: item.name, image: item.image, type: item.type, balance: toNumber(item.balance), openingBalance: toNumber(item.openingBalance), note: item.note, isActive: item.isActive, updatedAt: item.updatedAt.toISOString() }))} /></>;
}

