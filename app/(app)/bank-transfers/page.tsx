import { BankTransferKind, BankTransferStatus, Prisma } from "@prisma/client";
import { BankTransferClient } from "@/components/bank-transfer-client";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function BankTransfersPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const status = Object.values(BankTransferStatus).includes(query.status as BankTransferStatus) ? query.status as BankTransferStatus : undefined;
  const kind = Object.values(BankTransferKind).includes(query.kind as BankTransferKind) ? query.kind as BankTransferKind : undefined;
  const user = await getCurrentUser();
  if (!user) throw new Error("User tidak ditemukan");
  const { activeOutlet } = await outletContext(user);
  const start = startOfToday();
  const end = tomorrowOf(start);
  const where: Prisma.BankTransferWhereInput = {
    AND: [
      { outletId: activeOutlet.id },
      q ? { OR: [{ kodeTransfer: { contains: q } }, { senderName: { contains: q } }, { senderPhone: { contains: q } }, { destinationBank: { contains: q } }, { accountNumber: { contains: q } }, { accountName: { contains: q } }] } : {},
      status ? { status } : {},
      kind ? { kind } : {},
      query.bank ? { destinationBank: query.bank } : {}
    ]
  };

  const [transfers, total, customers, banks, funds, todayFinance, todayTransfers] = await Promise.all([
    prisma.bankTransfer.findMany({ where, include: { user: { select: { name: true } }, sourceFund: true, targetFund: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.bankTransfer.count({ where }),
    prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    prisma.bankTransfer.groupBy({ by: ["destinationBank"], where: { outletId: activeOutlet.id }, orderBy: { destinationBank: "asc" } }),
    prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id, isActive: true }, orderBy: [{ type: "asc" }, { name: "asc" }] }),
    prisma.financeRecord.groupBy({ by: ["type"], where: { outletId: activeOutlet.id, referenceType: "bank_transfer", date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.bankTransfer.groupBy({ by: ["kind"], where: { outletId: activeOutlet.id, status: "Berhasil", completedAt: { gte: start, lt: end } }, _sum: { amount: true } })
  ]);
  const fundRows = funds.map((item) => ({ id: item.id, name: item.name, type: item.type, balance: toNumber(item.balance) }));
  const totalAsset = fundRows.reduce((sum, item) => sum + item.balance, 0);
  const cash = fundRows.filter((item) => item.type === "Cash").reduce((sum, item) => sum + item.balance, 0);
  const bank = totalAsset - cash;
  const income = toNumber(todayFinance.find((item) => item.type === "income")?._sum.amount);
  const expense = toNumber(todayFinance.find((item) => item.type === "expense")?._sum.amount);

  return (
    <>
      <PageHeader title="MiniATM" description="Transfer, tarik tunai, saldo sumber dana, dan profit loket." />
      <BankTransferClient
        role={user.role.name}
        customers={customers}
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
          adminFee: toNumber(item.adminFee),
          adminBankFee: toNumber(item.adminBankFee),
          externalAdminFee: toNumber(item.externalAdminFee),
          totalReceived: toNumber(item.totalReceived),
          status: item.status,
          note: item.note,
          userName: item.user.name,
          createdAt: item.createdAt.toISOString()
        }))}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ status: query.status ?? "", bank: query.bank ?? "", kind: query.kind ?? "" }}
        outletName={activeOutlet.name}
        summary={{
          totalAsset,
          cash,
          bank,
          profit: income - expense,
          transferAmount: toNumber(todayTransfers.find((item) => item.kind === "Transfer")?._sum.amount),
          tarikAmount: toNumber(todayTransfers.find((item) => item.kind === "Tarik_Tunai")?._sum.amount)
        }}
        funds={fundRows}
        banks={banks.map((item) => item.destinationBank)}
      />
    </>
  );
}
