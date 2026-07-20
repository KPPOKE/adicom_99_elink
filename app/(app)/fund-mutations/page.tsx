import { FundMutationsClient } from "@/components/fund-mutations-client";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function FundMutationsPage() {
  const user = await requireAdmin();
  const { activeOutlet } = await outletContext(user);
  const [funds, mutations] = await Promise.all([
    prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.fundMutation.findMany({ where: { outletId: activeOutlet.id }, include: { fundAccount: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 })
  ]);
  return <><PageHeader title="Mutasi Saldo" description="Tambah, ambil, dan pindah saldo antar sumber dana." /><FundMutationsClient funds={funds.map((item) => ({ id: item.id, name: item.name, balance: toNumber(item.balance) }))} mutations={mutations.map((item) => ({ id: item.id, fundName: item.fundAccount.name, type: item.type, amount: toNumber(item.amount), adminFee: toNumber(item.adminFee), balanceBefore: toNumber(item.balanceBefore), balanceAfter: toNumber(item.balanceAfter), note: item.note, userName: item.user.name, createdAt: item.createdAt.toISOString() }))} /></>;
}
