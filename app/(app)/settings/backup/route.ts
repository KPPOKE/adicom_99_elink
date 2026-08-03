import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";

const BACKUP_ROW_LIMIT = 5000;

export async function GET() {
  return NextResponse.json({ error: "Gunakan tombol backup dari halaman Pengaturan." }, { status: 405 });
}

export async function POST() {
  await assertTrustedOrigin();
  const user = await requirePermission("settings.backup");
  const { activeOutlet } = await outletContext(user);
  const outletWhere = user.role.name === "admin" ? {} : { outletId: activeOutlet.id };
  const customerWhere = user.role.name === "admin" ? {} : { outlets: { some: { outletId: activeOutlet.id } } };
  const newest = { createdAt: "desc" as const };

  const [outlets, users, categories, suppliers, customers, items, transactions, services, bankTransfers, bankTransferDeposits, fundAccounts, fundMutations, financeRecords, settings] = await Promise.all([
    prisma.outlet.findMany({ where: user.role.name === "admin" ? {} : { id: activeOutlet.id }, take: BACKUP_ROW_LIMIT }),
    user.role.name === "admin" ? prisma.user.findMany({ select: { id: true, name: true, email: true, roleId: true, outletId: true, createdAt: true, updatedAt: true, permissions: true }, take: BACKUP_ROW_LIMIT }) : [],
    prisma.category.findMany({ take: BACKUP_ROW_LIMIT }),
    prisma.supplier.findMany({ orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.customer.findMany({ where: customerWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.item.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.transaction.findMany({ where: outletWhere, include: { items: true }, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.service.findMany({ where: outletWhere, include: { parts: true }, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.bankTransfer.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.bankTransferDeposit.findMany({ where: outletWhere, orderBy: newest, take: BACKUP_ROW_LIMIT }),
    prisma.fundAccount.findMany({ where: outletWhere, take: BACKUP_ROW_LIMIT }),
    prisma.fundMutation.findMany({ where: outletWhere, orderBy: { createdAt: "desc" }, take: BACKUP_ROW_LIMIT }),
    prisma.financeRecord.findMany({ where: outletWhere, orderBy: { date: "desc" }, take: BACKUP_ROW_LIMIT }),
    user.role.name === "admin" ? prisma.setting.findMany({ take: BACKUP_ROW_LIMIT }) : []
  ]);

  const payload = {
    generatedAt: new Date().toISOString(),
    scope: user.role.name === "admin" ? "all" : activeOutlet.name,
    rowLimit: BACKUP_ROW_LIMIT,
    note: "Setiap tabel dibatasi agar backup tidak membebani server. Gunakan backup database langsung untuk arsip penuh.",
    data: { outlets, users, categories, suppliers, customers, items, transactions, services, bankTransfers, bankTransferDeposits, fundAccounts, fundMutations, financeRecords, settings }
  };
  await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: user.role.name === "admin" ? null : activeOutlet.id, action: "download", entity: "backup", metadata: { scope: payload.scope, rowLimit: BACKUP_ROW_LIMIT } });
  const filename = `backup-adicom99-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}.json`;
  return new NextResponse(JSON.stringify(payload), { headers: { "cache-control": "private, no-store", "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` } });
}
