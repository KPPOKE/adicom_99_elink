import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await requirePermission("settings.backup");
  const { activeOutlet } = await outletContext(user);
  const outletWhere = user.role.name === "admin" ? {} : { outletId: activeOutlet.id };
  const [outlets, users, categories, suppliers, customers, items, transactions, services, bankTransfers, bankTransferDeposits, fundAccounts, fundMutations, financeRecords, settings] = await Promise.all([
    prisma.outlet.findMany({ where: user.role.name === "admin" ? {} : { id: activeOutlet.id } }),
    user.role.name === "admin" ? prisma.user.findMany({ select: { id: true, name: true, email: true, roleId: true, outletId: true, createdAt: true, updatedAt: true, permissions: true } }) : [],
    prisma.category.findMany(),
    prisma.supplier.findMany(),
    prisma.customer.findMany(),
    prisma.item.findMany({ where: outletWhere }),
    prisma.transaction.findMany({ where: outletWhere, include: { items: true } }),
    prisma.service.findMany({ where: outletWhere, include: { parts: true } }),
    prisma.bankTransfer.findMany({ where: outletWhere }),
    prisma.bankTransferDeposit.findMany({ where: outletWhere }),
    prisma.fundAccount.findMany({ where: outletWhere }),
    prisma.fundMutation.findMany({ where: outletWhere }),
    prisma.financeRecord.findMany({ where: outletWhere }),
    user.role.name === "admin" ? prisma.setting.findMany() : []
  ]);
  const payload = { generatedAt: new Date().toISOString(), scope: user.role.name === "admin" ? "all" : activeOutlet.name, data: { outlets, users, categories, suppliers, customers, items, transactions, services, bankTransfers, bankTransferDeposits, fundAccounts, fundMutations, financeRecords, settings } };
  const filename = `backup-adicom99-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}.json`;
  return new NextResponse(JSON.stringify(payload, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` } });
}
