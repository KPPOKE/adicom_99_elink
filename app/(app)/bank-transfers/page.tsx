import { BankTransferStatus, Prisma } from "@prisma/client";
import { BankTransferClient } from "@/components/bank-transfer-client";
import { PageHeader } from "@/components/shared/page-header";
import { getCurrentUser } from "@/lib/auth";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";
import { outletContext, startOfToday, tomorrowOf } from "@/lib/outlet";
import { toNumber } from "@/lib/utils";

export default async function BankTransfersPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const query = queryValues(params);
  const status = Object.values(BankTransferStatus).includes(query.status as BankTransferStatus)
    ? query.status as BankTransferStatus
    : undefined;
  const user = await getCurrentUser();
  if (!user) throw new Error("User tidak ditemukan");
  const { activeOutlet } = await outletContext(user);
  const start = startOfToday();
  const end = tomorrowOf(start);
  const where: Prisma.BankTransferWhereInput = {
    AND: [
      { outletId: activeOutlet.id },
      q ? {
        OR: [
          { kodeTransfer: { contains: q } },
          { senderName: { contains: q } },
          { senderPhone: { contains: q } },
          { destinationBank: { contains: q } },
          { accountNumber: { contains: q } },
          { accountName: { contains: q } }
        ]
      } : {},
      status ? { status } : {},
      query.bank ? { destinationBank: query.bank } : {}
    ]
  };

  const [transfers, total, customers, banks, deposits, completedTransfers, adminFees] = await Promise.all([
    prisma.bankTransfer.findMany({
      where,
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE
    }),
    prisma.bankTransfer.count({ where }),
    prisma.customer.findMany({ select: { id: true, name: true, phone: true }, orderBy: { name: "asc" } }),
    prisma.bankTransfer.groupBy({ by: ["destinationBank"], where: { outletId: activeOutlet.id }, orderBy: { destinationBank: "asc" } }),
    prisma.bankTransferDeposit.aggregate({ where: { outletId: activeOutlet.id, date: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.bankTransfer.aggregate({ where: { outletId: activeOutlet.id, status: "Berhasil", completedAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.bankTransfer.aggregate({ where: { outletId: activeOutlet.id, status: "Berhasil", completedAt: { gte: start, lt: end } }, _sum: { adminFee: true } })
  ]);

  return (
    <>
      <PageHeader title="Transfer Bank" description="Catat dan proses layanan pengiriman uang pelanggan." />
      <BankTransferClient
        role={user?.role.name ?? "staff"}
        customers={customers}
        transfers={transfers.map((item) => ({
          id: item.id,
          kodeTransfer: item.kodeTransfer,
          customerId: item.customerId,
          senderName: item.senderName,
          senderPhone: item.senderPhone,
          destinationBank: item.destinationBank,
          accountNumber: item.accountNumber,
          accountName: item.accountName,
          amount: toNumber(item.amount),
          adminFee: toNumber(item.adminFee),
          totalReceived: toNumber(item.totalReceived),
          status: item.status,
          note: item.note,
          userName: item.user.name,
          createdAt: item.createdAt.toISOString()
        }))}
        pagination={{ page, pageSize: PAGE_SIZE, total, query }}
        filterValues={{ status: query.status ?? "", bank: query.bank ?? "" }}
        outletName={activeOutlet.name}
        summary={{
          deposit: toNumber(deposits._sum.amount),
          used: toNumber(completedTransfers._sum.amount),
          adminFee: toNumber(adminFees._sum.adminFee)
        }}
        banks={banks.map((item) => item.destinationBank)}
      />
    </>
  );
}
