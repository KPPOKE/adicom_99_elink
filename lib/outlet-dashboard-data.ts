import "server-only";

import { redirect } from "next/navigation";
import { outletContext } from "@/lib/outlet";
import { buildOutletReport } from "@/lib/outlet-dashboard-report";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export async function requireDashboardOutlet(outletId: number) {
  const user = await requirePermission("dashboard.view");
  const { activeOutlet, outlets } = await outletContext(user);
  const outlet = user.role.name === "admin"
    ? outlets.find((item) => item.id === outletId)
    : activeOutlet.id === outletId ? activeOutlet : null;
  if (!outlet) redirect("/dashboard");
  return { user, outlet };
}

export async function loadOutletReport(outletId: number, start: Date, end: Date, visibleEnd = end) {
  const dateRange = { gte: start, lt: end };
  const [transactions, services, finance, miniAtm, operations] = await Promise.all([
    prisma.transaction.findMany({
      where: { outletId, status: "Berhasil", createdAt: dateRange },
      select: {
        createdAt: true,
        diskon: true,
        items: { select: { qty: true, price: true, item: { select: { hargaModal: true, category: { select: { name: true } } } } } }
      }
    }),
    prisma.service.findMany({
      where: { outletId, paymentStatus: "paid", paidAt: dateRange },
      select: {
        paidAt: true,
        laborCost: true,
        parts: { select: { qty: true, price: true, item: { select: { hargaModal: true } } } }
      }
    }),
    prisma.financeRecord.findMany({
      where: { outletId, date: dateRange, type: "expense", OR: [{ referenceType: null }, { referenceType: { not: "bank_transfer" } }] },
      select: { date: true, type: true, amount: true, referenceType: true }
    }),
    prisma.bankTransfer.findMany({
      where: { outletId, status: "Berhasil", completedAt: dateRange },
      select: { completedAt: true, kind: true, adminFee: true, adminBankFee: true, externalAdminFee: true }
    }),
    prisma.fundMutation.findMany({
      where: { outletId, createdAt: dateRange, adminFee: { gt: 0 }, bankTransferId: null },
      select: { createdAt: true, adminFee: true }
    })
  ]);

  return buildOutletReport({
    start,
    visibleEnd,
    transactions: transactions.map((transaction) => ({
      date: transaction.createdAt,
      discount: toNumber(transaction.diskon),
      items: transaction.items.map((item) => ({
        qty: item.qty,
        price: toNumber(item.price),
        cost: toNumber(item.item.hargaModal),
        categoryName: item.item.category.name
      }))
    })),
    services: services.flatMap((service) => service.paidAt ? [{
      date: service.paidAt,
      laborCost: toNumber(service.laborCost),
      parts: service.parts.map((part) => ({ qty: part.qty, price: toNumber(part.price), cost: toNumber(part.item.hargaModal) }))
    }] : []),
    finance: finance.map((record) => ({
      date: record.date,
      type: record.type,
      amount: toNumber(record.amount),
      referenceType: record.referenceType
    })),
    miniAtm: miniAtm.flatMap((transaction) => transaction.completedAt ? [{
      date: transaction.completedAt,
      grossProfit: toNumber(transaction.adminFee) + (transaction.kind === "Tarik_Tunai" ? toNumber(transaction.externalAdminFee) : 0),
      bankFee: transaction.kind === "Transfer" ? toNumber(transaction.adminBankFee) : 0
    }] : []),
    operations: operations.map((operation) => ({ date: operation.createdAt, amount: toNumber(operation.adminFee) }))
  });
}
