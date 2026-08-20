import { deleteOutlet, upsertOutlet } from "@/app/actions/outlets";
import { PageHeader } from "@/components/shared/page-header";
import { SimpleCrud } from "@/components/shared/simple-crud";
import { StoreSettingsForm } from "@/components/store-settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StoreSettingsPage() {
  await requireAdmin();
  const [setting, outlets] = await Promise.all([prisma.setting.findFirst(), prisma.outlet.findMany({ orderBy: { name: "asc" } })]);
  return <><PageHeader title="Kelola Toko" description="Profil usaha dan manajemen seluruh cabang." /><div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader><CardTitle>Profil Toko</CardTitle></CardHeader><CardContent><StoreSettingsForm setting={setting} /></CardContent></Card><Card><CardHeader><CardTitle>Manajemen Cabang</CardTitle></CardHeader><CardContent><SimpleCrud title="Cabang" data={outlets} fields={[{ name: "code", label: "Kode Cabang" }, { name: "name", label: "Nama Cabang" }, { name: "address", label: "Alamat", type: "textarea" }, { name: "color", label: "Warna Cabang", type: "color" }]} upsertAction={upsertOutlet} deleteAction={deleteOutlet} /></CardContent></Card></div></>;
}