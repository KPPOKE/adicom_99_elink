import { FundsClient } from "@/components/funds-client";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function FundsPage() {
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const funds = await prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  return <><PageHeader title="Sumber Dana" description="Kelola LACI, bank, e-wallet, dan saldo awal outlet." /><FundsClient funds={funds.map((item) => ({ id: item.id, name: item.name, type: item.type, balance: toNumber(item.balance), openingBalance: toNumber(item.openingBalance), note: item.note, isActive: item.isActive }))} /></>;
}
