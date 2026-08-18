import { Filter } from "lucide-react";
import { PayrollClient } from "@/components/payroll-client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { hasPermission } from "@/lib/permission-keys";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function PayrollPage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePermission("payroll.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const query = (await searchParams) ?? {};
  const now = new Date();
  const year = Number(typeof query.year === "string" ? query.year : now.getFullYear());
  const month = Number(typeof query.month === "string" ? query.month : now.getMonth() + 1);
  const from = new Date(Date.UTC(year, month - 1, 1));
  const to = new Date(Date.UTC(year, month, 1));
  const [rows, employees] = await Promise.all([
    prisma.payroll.findMany({ where: { outletId: activeOutlet.id, period: { gte: from, lt: to } }, include: { employee: true }, orderBy: { period: "desc" } }),
    prisma.user.findMany({ where: { outletId: activeOutlet.id, role: { name: "staff" } }, orderBy: { name: "asc" }, select: { id: true, name: true } })
  ]);
  return <><PageHeader title="Penggajian Pegawai" description={`Penggajian cabang ${activeOutlet.name}.`} /><form className="mb-6 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"><label className="block space-y-1"><span className="block text-xs font-medium text-slate-600">Bulan</span><Select name="month" defaultValue={String(month)} className="w-44">{Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2026, index, 1).toLocaleDateString("id-ID", { month: "long" })}</option>)}</Select></label><label className="block space-y-1"><span className="block text-xs font-medium text-slate-600">Tahun</span><Select name="year" defaultValue={String(year)} className="w-32">{Array.from({ length: now.getFullYear() - 2019 }, (_, index) => now.getFullYear() - index).map((item) => <option key={item}>{item}</option>)}</Select></label><Button><Filter className="h-4 w-4" />Terapkan</Button></form><PayrollClient canManage={hasPermission(user.role.name, permissions, "payroll.manage")} canEdit={hasPermission(user.role.name, permissions, "payroll.edit")} canDelete={hasPermission(user.role.name, permissions, "payroll.delete")} employees={employees} rows={rows.map((item) => ({ id: item.id, employeeId: item.employeeId, employeeName: item.employee.name, period: item.period.toISOString(), baseSalary: toNumber(item.baseSalary), allowance: toNumber(item.allowance), deduction: toNumber(item.deduction), totalSalary: toNumber(item.totalSalary), paymentDate: item.paymentDate?.toISOString() ?? null, status: item.status, note: item.note }))} /></>;
}