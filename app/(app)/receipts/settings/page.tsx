import { PageHeader } from "@/components/shared/page-header";
import { ReceiptSettingsForm } from "@/components/receipt-settings-form";
import { Card, CardContent } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";

export default async function ReceiptSettingsPage() {
  const user = await requirePermission("receipts.manage");
  const { activeOutlet } = await outletContext(user);
  const setting = await prisma.receiptSetting.findUnique({ where: { outletId: activeOutlet.id } });
  return <><PageHeader title="Pengaturan Struk" description={`Identitas struk cabang ${activeOutlet.name}.`} /><Card className="max-w-2xl"><CardContent className="pt-6"><ReceiptSettingsForm setting={setting} defaultStoreName={activeOutlet.name} defaultAddress={activeOutlet.address ?? ""} /></CardContent></Card></>;
}