import { Save } from "lucide-react";
import { updateReceiptSetting } from "@/app/actions/elink-core";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requirePermission } from "@/lib/permissions";
import { outletContext } from "@/lib/outlet";
import { prisma } from "@/lib/prisma";

export default async function ReceiptSettingsPage() {
  const user = await requirePermission("receipts.manage");
  const { activeOutlet } = await outletContext(user);
  const setting = await prisma.receiptSetting.findUnique({ where: { outletId: activeOutlet.id } });
  return <><PageHeader title="Pengaturan Struk" description={`Identitas struk cabang ${activeOutlet.name}.`} /><Card className="max-w-2xl"><CardContent className="pt-6"><form action={updateReceiptSetting} className="grid gap-4"><Field label="Nama Toko"><Input name="storeName" defaultValue={setting?.storeName ?? activeOutlet.name} required /></Field><Field label="Alamat"><Textarea name="address" defaultValue={setting?.address ?? activeOutlet.address ?? ""} /></Field><Field label="Teks Footer"><Textarea name="footer" defaultValue={setting?.footer ?? "Terima kasih atas kepercayaan Anda"} /></Field><Field label="Logo"><Input type="file" name="logoFile" accept="image/*" />{setting?.logo ? <p className="text-xs text-slate-500">Logo aktif: {setting.logo}</p> : null}</Field><Button><Save className="h-4 w-4" />Simpan Pengaturan</Button></form></CardContent></Card></>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>; }