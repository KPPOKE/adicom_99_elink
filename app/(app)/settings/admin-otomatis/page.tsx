import { AdminFeeRuleClient } from "@/components/admin-fee-rule-client";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function AdminOtomatisPage({ searchParams }: { searchParams?: Promise<{ outletId?: string }> }) {
  await requirePermission("settings.adminFee");
  const params = (await searchParams) ?? {};
  const outlets = await prisma.outlet.findMany({ orderBy: { name: "asc" } });
  const requestedOutletId = Number(params.outletId);
  const selectedOutletId = outlets.some((outlet) => outlet.id === requestedOutletId) ? requestedOutletId : outlets[0]?.id ?? 0;

  const [setting, rules] = selectedOutletId
    ? await Promise.all([
        prisma.adminFeeSetting.findUnique({ where: { outletId: selectedOutletId } }),
        prisma.adminFeeRule.findMany({ where: { outletId: selectedOutletId }, orderBy: { nominalFrom: "asc" } })
      ])
    : [null, []];

  return (
    <>
      <PageHeader title="Pengaturan Admin Otomatis" description="Atur admin otomatis untuk tarik tunai dan transfer per toko." />
      <AdminFeeRuleClient
        outlets={outlets.map((outlet) => ({ id: outlet.id, name: outlet.name }))}
        selectedOutletId={selectedOutletId}
        isActive={setting?.isActive ?? false}
        rules={rules.map((rule) => ({
          id: rule.id,
          kind: rule.kind,
          nominalFrom: toNumber(rule.nominalFrom),
          nominalTo: toNumber(rule.nominalTo),
          adminAmount: toNumber(rule.adminAmount),
          adminType: rule.adminType
        }))}
      />
    </>
  );
}
