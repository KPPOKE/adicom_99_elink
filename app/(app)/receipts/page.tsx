import { ReceiptPrintClient } from "@/components/receipt-print-client";
import { PageHeader } from "@/components/shared/page-header";
import { requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";

export default async function ReceiptsPage() {
  const user = await requirePermission("receipts.view");
  const { activeOutlet } = await outletContext(user);
  const [banks, transfers, setting, globalSetting] = await Promise.all([
    prisma.receiptBankAccount.findMany({ where: { outletId: activeOutlet.id }, orderBy: { bankName: "asc" } }),
    prisma.bankTransfer.findMany({ where: { outletId: activeOutlet.id, status: "Berhasil" }, include: { sourceFund: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.receiptSetting.findUnique({ where: { outletId: activeOutlet.id } }),
    prisma.setting.findFirst({ select: { defaultPrintFormat: true } })
  ]);
  return <><PageHeader title="Cetak Struk" description="Cetak struk transfer dari MiniATM atau input manual." /><ReceiptPrintClient printFormat={globalSetting?.defaultPrintFormat ?? "thermal_80"} banks={banks} setting={setting ?? { storeName: activeOutlet.name, address: activeOutlet.address, footer: "Terima kasih atas kepercayaan Anda", logo: null }} transfers={transfers.map((item) => ({ id: item.id, code: item.kodeTransfer, sourceName: item.sourceFund?.name ?? "", destinationBank: item.destinationBank, accountName: item.accountName, accountNumber: item.accountNumber, amount: toNumber(item.amount), adminBank: toNumber(item.adminBankFee), adminLoket: toNumber(item.adminFee), createdAt: item.createdAt.toISOString() }))} /></>;
}