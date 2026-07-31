import { FundMutationsClient } from "@/components/fund-mutations-client";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function FundMutationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("fundMutations.view");
  const { activeOutlet } = await outletContext(user);
  const query = (await searchParams) ?? {};
  const pindah = query.mode === "pindah";
  const [funds, mutations] = await Promise.all([
    prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.fundMutation.findMany({ where: { outletId: activeOutlet.id, ...(pindah ? { referenceType: "move_fund" } : { referenceType: { in: ["manual_fund", "opening"] } }) }, include: { fundAccount: true, user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 200 })
  ]);
  const title = pindah ? "Pindah Saldo" : "Ambil & Tambah Saldo";
  return <><PageHeader title={title} description={`${title} cabang ${activeOutlet.name}.`} /><FundMutationsClient initialMode={pindah ? "Pindah" : "Tambah"} funds={funds.map((item) => ({ id: item.id, name: item.name, balance: toNumber(item.balance) }))} mutations={mutations.map((item) => ({ id: item.id, fundName: item.fundAccount.name, type: item.type, amount: toNumber(item.amount), adminFee: toNumber(item.adminFee), balanceBefore: toNumber(item.balanceBefore), balanceAfter: toNumber(item.balanceAfter), note: item.note, userName: item.user.name, createdAt: item.createdAt.toISOString() }))} /></>;
}