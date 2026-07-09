import { Save } from "lucide-react";
import { updateSettings } from "@/app/actions/settings";
import { PageHeader } from "@/components/shared/page-header";
import { UserManagementClient } from "@/components/user-management-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage() {
  const currentUser = await requireAdmin();
  const [setting, users, outlets] = await Promise.all([
    prisma.setting.findFirst(),
    prisma.user.findMany({ include: { role: true, outlet: true }, orderBy: { name: "asc" } }),
    prisma.outlet.findMany({ orderBy: { name: "asc" } })
  ]);
  return (
    <>
      <PageHeader title="Settings" description="Pengaturan toko, invoice, logo, dan user." />
      <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader>
            <CardTitle>Profil Toko</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={updateSettings} className="grid gap-4 sm:grid-cols-2">
              {setting ? <input type="hidden" name="id" value={setting.id} /> : null}
              <input type="hidden" name="logo" value={setting?.logo ?? ""} />
              <Field name="storeName" label="Nama Toko" value={setting?.storeName ?? "PosPintar"} />
              <Field name="whatsapp" label="Nomor WhatsApp" value={setting?.whatsapp ?? ""} />
              <Field name="email" label="Email" value={setting?.email ?? ""} />
              <Field name="invoicePrefix" label="Prefix Invoice" value={setting?.invoicePrefix ?? "INV"} />
              <div className="space-y-1.5">
                <Label>Default Format Cetak</Label>
                <Select name="defaultPrintFormat" defaultValue={setting?.defaultPrintFormat ?? "thermal_80"}>
                  <option value="thermal_58">Thermal 58mm</option>
                  <option value="thermal_80">Thermal 80mm</option>
                  <option value="a4">A4</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Logo Toko</Label>
                <Input type="file" name="logoFile" accept="image/*" />
                {setting?.logo ? <p className="text-xs text-slate-500">Logo aktif: {setting.logo}</p> : null}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Alamat</Label>
                <Textarea name="address" defaultValue={setting?.address ?? ""} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Footer Invoice</Label>
                <Textarea name="invoiceFooter" defaultValue={setting?.invoiceFooter ?? ""} />
              </div>
              <Button className="sm:col-span-2">
                <Save className="h-4 w-4" />
                Simpan Pengaturan
              </Button>
            </form>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Data User</CardTitle>
          </CardHeader>
          <CardContent>
            <UserManagementClient
              currentUserId={currentUser.id}
              outlets={outlets}
              users={users.map((user) => ({
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role.name,
                outletId: user.outletId,
                outletName: user.outlet?.name ?? "-"
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Field({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input name={name} defaultValue={value} />
    </div>
  );
}
