import { Save } from "lucide-react";
import { updateSettings } from "@/app/actions/settings";
import { deleteOutlet, upsertOutlet } from "@/app/actions/outlets";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StoreSettingsPage() {
  await requireAdmin();
  const [setting, outlets] = await Promise.all([prisma.setting.findFirst(), prisma.outlet.findMany({ orderBy: { name: "asc" } })]);
  return <><PageHeader title="Kelola Toko" description="Profil usaha dan manajemen seluruh cabang." /><div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Profil Toko</CardTitle></CardHeader><CardContent><form action={updateSettings} className="grid gap-4 sm:grid-cols-2">{setting ? <input type="hidden" name="id" value={setting.id} /> : null}<input type="hidden" name="logo" value={setting?.logo ?? ""} /><Field name="storeName" label="Nama Toko" value={setting?.storeName ?? "PosPintar"} /><Field name="whatsapp" label="Nomor WhatsApp" value={setting?.whatsapp ?? ""} /><Field name="email" label="Email" value={setting?.email ?? ""} /><Field name="invoicePrefix" label="Prefix Invoice" value={setting?.invoicePrefix ?? "INV"} /><div className="space-y-1.5"><Label>Format Cetak Default</Label><Select name="defaultPrintFormat" defaultValue={setting?.defaultPrintFormat ?? "thermal_80"}><option value="thermal_58">Thermal 58mm</option><option value="thermal_80">Thermal 80mm</option><option value="a4">A4</option></Select></div><div className="space-y-1.5 sm:col-span-2"><Label>Logo Toko</Label><Input type="file" name="logoFile" accept="image/*" /></div><div className="space-y-1.5 sm:col-span-2"><Label>Alamat</Label><Textarea name="address" defaultValue={setting?.address ?? ""} /></div><div className="space-y-1.5 sm:col-span-2"><Label>Catatan Kaki Invoice</Label><Textarea name="invoiceFooter" defaultValue={setting?.invoiceFooter ?? ""} /></div><Button className="sm:col-span-2"><Save className="h-4 w-4" />Simpan Pengaturan</Button></form></CardContent></Card><Card><CardHeader><CardTitle>Manajemen Cabang</CardTitle></CardHeader><CardContent><SimpleCrud title="Cabang" data={outlets} fields={[{ name: "code", label: "Kode Cabang" }, { name: "name", label: "Nama Cabang" }, { name: "address", label: "Alamat", type: "textarea" }, { name: "color", label: "Warna Cabang", type: "color" }]} upsertAction={upsertOutlet} deleteAction={deleteOutlet} /></CardContent></Card></div></>;
}
function Field({ label, name, value }: { label: string; name: string; value: string }) { return <div className="space-y-1.5"><Label>{label}</Label><Input name={name} defaultValue={value} /></div>; }