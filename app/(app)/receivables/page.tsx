import { ReceivablesClient } from "@/components/receivables-client";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission } from "@/lib/permission-keys";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function ReceivablesPage() {
  const user = await requirePermission("receivables.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const [rows, customers, funds] = await Promise.all([
    prisma.receivable.findMany({ where: { outletId: activeOutlet.id }, include: { customer: true, sourceFund: true, createdBy: true }, orderBy: [{ status: "asc" }, { loanDate: "desc" }] }),
    prisma.customer.findMany({ where: { outlets: { some: { outletId: activeOutlet.id } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.fundAccount.findMany({ where: { outletId: activeOutlet.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, balance: true } })
  ]);
  return <><PageHeader title="Utang Piutang" description={`Pencatatan piutang pelanggan cabang ${activeOutlet.name}.`} /><ReceivablesClient canManage={hasPermission(user.role.name, permissions, "receivables.manage")} canEdit={hasPermission(user.role.name, permissions, "receivables.edit")} canDelete={hasPermission(user.role.name, permissions, "receivables.delete")} customers={customers} funds={funds.map((item) => ({ ...item, balance: toNumber(item.balance) }))} rows={rows.map((item) => ({ id: item.id, customerId: item.customerId, customerName: item.customer.name, loanDate: item.loanDate.toISOString(), amount: toNumber(item.amount), description: item.description, status: item.status, recordExpense: item.recordExpense, sourceFundId: item.sourceFundId, sourceFundName: item.sourceFund?.name ?? null, creatorName: item.createdBy.name }))} /></>;
}