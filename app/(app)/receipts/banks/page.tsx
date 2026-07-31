import { ReceiptBankClient } from "@/components/receipt-bank-client";
import { PageHeader } from "@/components/shared/page-header";
import { hasPermission } from "@/lib/permission-keys";
import { getUserPermissionKeys, requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";

export default async function ReceiptBanksPage() {
  const user = await requirePermission("receipts.view");
  const permissions = await getUserPermissionKeys(user);
  const { activeOutlet } = await outletContext(user);
  const rows = await prisma.receiptBankAccount.findMany({ where: { outletId: activeOutlet.id }, orderBy: { bankName: "asc" } });
  return <><PageHeader title="Master Bank Struk" description={`Rekening pengirim cabang ${activeOutlet.name}.`} /><ReceiptBankClient rows={rows} canManage={hasPermission(user.role.name, permissions, "receipts.manage")} /></>;
}