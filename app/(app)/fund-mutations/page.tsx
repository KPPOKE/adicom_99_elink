import { FundMutationsClient } from "@/components/fund-mutations-client";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission } from "@/lib/permission-keys";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function dateValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function validDate(value: string | undefined, fallback: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

export default async function FundMutationsPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("fundMutations.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const query = (await searchParams) ?? {};
  const moving = first(query.mode) === "pindah";
  const today = dateValue(new Date());
  let from = validDate(first(query.from), today);
  let to = validDate(first(query.to), today);
  if (from > to) [from, to] = [to, from];

  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  end.setDate(end.getDate() + 1);

  const allFunds = await prisma.fundAccount.findMany({
    where: { outletId: activeOutlet.id },
    orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { id: true, name: true, balance: true, isActive: true }
  });
  const requestedFundId = Number(first(query.fund));
  const fundId = allFunds.some((item) => item.id === requestedFundId) ? requestedFundId : undefined;
  const referenceWhere = moving ? { referenceType: "move_fund" } : { referenceType: { in: ["manual_fund", "opening", "manual_adjustment"] } };
  const mutationWhere = {
    outletId: activeOutlet.id,
    createdAt: { gte: start, lt: end },
    ...(fundId ? { fundAccountId: fundId } : {}),
    ...referenceWhere
  };

  const [mutations, grouped, adjustments] = await Promise.all([
    prisma.fundMutation.findMany({
      where: mutationWhere,
      include: { fundAccount: true, user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200
    }),
    prisma.fundMutation.groupBy({ by: ["type"], where: mutationWhere, _sum: { amount: true } }),
    moving ? Promise.resolve([]) : prisma.fundMutation.findMany({
      where: { ...mutationWhere, type: "Adjustment" },
      select: { amount: true, balanceBefore: true, balanceAfter: true }
    })
  ]);

  const total = (type: string) => toNumber(grouped.find((item) => item.type === type)?._sum.amount);
  const adjustmentAdded = adjustments.filter((item) => toNumber(item.balanceAfter) > toNumber(item.balanceBefore)).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const adjustmentWithdrawn = adjustments.filter((item) => toNumber(item.balanceAfter) < toNumber(item.balanceBefore)).reduce((sum, item) => sum + toNumber(item.amount), 0);
  const added = total("Opening") + total("Deposit_In") + adjustmentAdded;
  const withdrawn = total("Withdraw_Out") + adjustmentWithdrawn;
  const title = moving ? "Pindah Saldo" : "Ambil & Tambah Saldo";

  return <>
    <PageHeader title={title} description={`${title} cabang ${activeOutlet.name}.`} />
    <FundMutationsClient
      initialMode={moving ? "Pindah" : "Tambah"}
      canManage={hasPermission(user.role.name, permissions, "fundMutations.manage")}
      funds={allFunds.filter((item) => item.isActive).map((item) => ({ id: item.id, name: item.name, balance: toNumber(item.balance) }))}
      filterFunds={allFunds.map((item) => ({ id: item.id, name: item.name }))}
      filters={{ from, to, fund: fundId ? String(fundId) : "" }}
      summary={{ added, withdrawn, balance: added - withdrawn, moved: total("Move_Out") }}
      mutations={mutations.map((item) => ({
        id: item.id,
        fundName: item.fundAccount.name,
        type: item.type,
        amount: toNumber(item.amount),
        adminFee: toNumber(item.adminFee),
        balanceBefore: toNumber(item.balanceBefore),
        balanceAfter: toNumber(item.balanceAfter),
        note: item.note,
        userName: item.user.name,
        createdAt: item.createdAt.toISOString()
      }))}
    />
  </>;
}
