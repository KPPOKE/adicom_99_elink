import { BankTransferKind, BankTransferStatus, Prisma } from "@prisma/client";
import { BankTransferClient } from "@/components/bank-transfer-client";
import { PageHeader } from "@/components/shared/page-header";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";
import { hasPermission } from "@/lib/permission-keys";
import { canCurrentUser, getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

function dateValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function BankTransfersPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const status = Object.values(BankTransferStatus).includes(query.status as BankTransferStatus) ? query.status as BankTransferStatus : undefined;
  const kind = Object.values(BankTransferKind).includes(query.kind as BankTransferKind) ? query.kind as BankTransferKind : undefined;
  const user = await requirePermission("bankTransfers.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const start = startOfToday();
  const end = tomorrowOf(start);
  const selectedDate = query.date === "all" ? "all" : /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "") ? query.date : dateValue(start);
  const historyStart = selectedDate === "all" ? null : new Date(`${selectedDate}T00:00:00`);
  const historyRange = historyStart ? { gte: historyStart, lt: tomorrowOf(historyStart) } : undefined;
  const requestedStaffId = Number(query.pegawai);
  const requestedFundId = Number(query.fund);

  const staff = user.role.name === "admin"
    ? await prisma.user.findMany({ where: { outletId: activeOutlet.id, role: { name: "staff" } }, select: { id: true, name: true }, orderBy: { name: "asc" } })
    : [];
  const staffId = staff.some((item) => item.id === requestedStaffId) ? requestedStaffId : undefined;
  const funds = await prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] });
  const fundId = funds.some((item) => item.id === requestedFundId) ? requestedFundId : undefined;
  const where: Prisma.BankTransferWhereInput = {
    AND: [
      { outletId: activeOutlet.id },
      historyRange ? { createdAt: historyRange } : {},
      q ? { OR: [{ kodeTransfer: { contains: q } }, { destinationBank: { contains: q } }, { note: { contains: q } }] } : {},
      status ? { status } : {},
      kind ? { kind } : {},
      fundId ? { OR: [{ sourceFundId: fundId }, { targetFundId: fundId }] } : {},
      staffId ? { userId: staffId } : {}
    ]
  };

  const [transfers, total, todayTransfers, todayOperations, canManage, canEdit, canDelete, setting, adminFeeSetting, adminFeeRules] = await Promise.all([
    prisma.bankTransfer.findMany({
      where,
      include: {
        user: { select: { name: true } },
        sourceFund: true,
        targetFund: true,
        fundMutations: { where: { referenceType: "bank_transfer" }, orderBy: { createdAt: "asc" } }
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.bankTransfer.count({ where }),
    prisma.bankTransfer.findMany({
      where: { outletId: activeOutlet.id, status: "Berhasil", completedAt: { gte: start, lt: end } },
      select: { kind: true, amount: true, costAmount: true, adminFee: true, adminBankFee: true, externalAdminFee: true }
    }),
    prisma.fundMutation.aggregate({
      where: { outletId: activeOutlet.id, bankTransferId: null, adminFee: { gt: 0 }, createdAt: { gte: start, lt: end } },
      _sum: { adminFee: true }
    }),
    canCurrentUser("bankTransfers.manage"),
    canCurrentUser("bankTransfers.edit"),
    canCurrentUser("bankTransfers.delete"),
    prisma.setting.findFirst({ select: { whatsapp: true } }),
    prisma.adminFeeSetting.findUnique({ where: { outletId: activeOutlet.id } }),
    prisma.adminFeeRule.findMany({ where: { outletId: activeOutlet.id } })
  ]);
  const fundRows = funds.map((item) => ({ id: item.id, name: item.name, type: item.type, balance: toNumber(item.balance), image: item.image }));
  const transferAmount = todayTransfers.filter((item) => item.kind === "Transfer").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const tarikAmount = todayTransfers.filter((item) => item.kind === "Tarik_Tunai").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const bankFee = todayTransfers.reduce((sum, item) => sum + toNumber(item.adminBankFee), 0);
  const feeIncome = todayTransfers.filter((item) => item.kind === "Jasa_Transfer" || item.kind === "Fee_Brilink").reduce((sum, item) => sum + toNumber(item.amount), 0);
  const pulsaProfit = todayTransfers.filter((item) => item.kind === "Mode_Pulsa" || item.kind === "Pembayaran_Digital").reduce((sum, item) => sum + toNumber(item.amount) - toNumber(item.costAmount), 0);
  const operationalFromMiniAtm = todayTransfers.filter((item) => item.kind === "Operasional").reduce((sum, item) => sum + toNumber(item.adminFee), 0);
  const operational = toNumber(todayOperations._sum.adminFee) + operationalFromMiniAtm;
  const nonOperationalTransfers = todayTransfers.filter((item) => item.kind !== "Operasional");
  const profit = nonOperationalTransfers.reduce((sum, item) => sum + toNumber(item.adminFee) + toNumber(item.externalAdminFee) - toNumber(item.adminBankFee), 0) - operational + feeIncome + pulsaProfit;

  return (
    <>
      <PageHeader title="MiniATM" description={`Mode transaksi cabang ${activeOutlet.name}.`} />
      <BankTransferClient
        role={user.role.name}
        canManage={canManage}
        canEdit={canEdit}
        canDelete={canDelete}
        adminFeeActive={adminFeeSetting?.isActive ?? false}
        adminFeeRules={adminFeeRules.map((rule) => ({ kind: rule.kind, nominalFrom: toNumber(rule.nominalFrom), nominalTo: toNumber(rule.nominalTo), adminAmount: toNumber(rule.adminAmount), adminType: rule.adminType }))}
        canViewAsset={hasPermission(user.role.name, permissions, "transactions.viewAsset")}
        canViewBankFee={hasPermission(user.role.name, permissions, "dashboard.viewBankFee")}
        canViewProfit={hasPermission(user.role.name, permissions, "dashboard.viewProfit")}
        transfers={transfers.map((item) => ({
          id: item.id,
          kodeTransfer: item.kodeTransfer,
          kind: item.kind,
          transactionType: item.transactionType,
          sourceFundId: item.sourceFundId,
          targetFundId: item.targetFundId,
          sourceFundName: item.sourceFund?.name ?? null,
          targetFundName: item.targetFund?.name ?? null,
          customerId: item.customerId,
          senderName: item.senderName,
          senderPhone: item.senderPhone,
          destinationBank: item.destinationBank,
          accountNumber: item.accountNumber,
          accountName: item.accountName,
          amount: toNumber(item.amount),
          costAmount: toNumber(item.costAmount),
          adminFee: toNumber(item.adminFee),
          adminBankFee: toNumber(item.adminBankFee),
          externalAdminFee: toNumber(item.externalAdminFee),
          totalReceived: toNumber(item.totalReceived),
          status: item.status,
          note: item.note,
          userName: item.user.name,
          createdAt: item.createdAt.toISOString(),
          mutations: item.fundMutations.map((mutation) => ({
            fundAccountId: mutation.fundAccountId,
            balanceBefore: toNumber(mutation.balanceBefore),
            balanceAfter: toNumber(mutation.balanceAfter)
          }))
        }))}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ status: query.status ?? "", kind: query.kind ?? "", date: selectedDate, fund: fundId ? String(fundId) : "", pegawai: staffId ? String(staffId) : "" }}
        outletName={activeOutlet.name}
        userName={user.name}
        whatsapp={setting?.whatsapp ?? ""}
        summary={{ transferAmount, tarikAmount, turnover: transferAmount + tarikAmount, bankFee, operational, profit: user.role.name === "admin" ? profit : 0 }}
        funds={fundRows}
        staff={staff}
      />
    </>
  );
}