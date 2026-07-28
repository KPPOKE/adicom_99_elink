import type { Prisma } from "@prisma/client";
import { AuditLogClient, type AuditRow } from "@/components/audit-log-client";
import { PageHeader } from "@/components/shared/page-header";
import { requireAdmin } from "@/lib/auth";
import { PAGE_SIZE, parseListParams, queryValues, type ListSearchParams } from "@/lib/pagination";
import { prisma } from "@/lib/prisma";

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function dateBoundary(value: string, end = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const date = new Date(`${value}T00:00:00+07:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (end) date.setDate(date.getDate() + 1);
  return date;
}

export default async function ActivityPage({ searchParams }: { searchParams?: Promise<ListSearchParams> }) {
  await requireAdmin();
  const params = (await searchParams) ?? {};
  const { page, q } = parseListParams(params);
  const outlet = first(params.outlet);
  const action = first(params.action);
  const entity = first(params.entity);
  const from = first(params.from);
  const to = first(params.to);
  const outletId = Number(outlet);
  const start = dateBoundary(from);
  const end = dateBoundary(to, true);
  const where: Prisma.AuditLogWhereInput = {
    ...(q ? { OR: [{ userEmail: { contains: q } }, { action: { contains: q } }, { entity: { contains: q } }] } : {}),
    ...(Number.isInteger(outletId) && outletId > 0 ? { outletId } : {}),
    ...(action ? { action } : {}),
    ...(entity ? { entity } : {}),
    ...(start || end ? { createdAt: { ...(start ? { gte: start } : {}), ...(end ? { lt: end } : {}) } } : {})
  };
  const [logs, total, outlets] = await Promise.all([
    prisma.auditLog.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE }),
    prisma.auditLog.count({ where }),
    prisma.outlet.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } })
  ]);
  const outletNames = new Map(outlets.map((item) => [item.id, item.name]));
  const rows: AuditRow[] = logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt.toISOString(),
    userEmail: log.userEmail ?? "Sistem",
    outletName: log.outletId ? outletNames.get(log.outletId) ?? `Cabang #${log.outletId}` : "Tidak tercatat",
    action: log.action,
    entity: log.entity,
    entityId: log.entityId,
    metadata: log.metadata && typeof log.metadata === "object" && !Array.isArray(log.metadata) ? log.metadata as Record<string, unknown> : null
  }));

  return (
    <>
      <PageHeader title="Riwayat Aktivitas" description="Catatan perubahan penting, akses akun, saldo, dan pengaturan aplikasi." />
      <AuditLogClient rows={rows} outlets={outlets} filters={{ outlet, action, entity, from, to }} pagination={{ page, pageSize: PAGE_SIZE, total, query: queryValues(params) }} />
    </>
  );
}
