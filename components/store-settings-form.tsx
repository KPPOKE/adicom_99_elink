"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateSettings } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

function Field({ label, name, value }: { label: string; name: string; value: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input name={name} defaultValue={value} />
    </div>
  );
}

export function StoreSettingsForm({ setting }: { setting: { id: number; storeName: string; whatsapp: string | null; email: string | null; invoicePrefix: string; defaultPrintFormat: string; logo: string | null; address: string | null; invoiceFooter: string | null } | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateSettings(formData);
      if (!result.success) {
        toast.error("Gagal menyimpan pengaturan", { description: result.error });
        return;
      }
      toast.success("Pengaturan disimpan");
      router.refresh();
    });
  };

  return (
    <form action={submit} className="grid gap-4 sm:grid-cols-2">
      {setting ? <input type="hidden" name="id" value={setting.id} /> : null}
      <input type="hidden" name="logo" value={setting?.logo ?? ""} />
      <Field name="storeName" label="Nama Toko" value={setting?.storeName ?? "PosPintar"} />
      <Field name="whatsapp" label="Nomor WhatsApp" value={setting?.whatsapp ?? ""} />
      <Field name="email" label="Email" value={setting?.email ?? ""} />
      <Field name="invoicePrefix" label="Prefix Invoice" value={setting?.invoicePrefix ?? "INV"} />
      <div className="space-y-1.5">
        <Label>Format Cetak Default</Label>
        <Select name="defaultPrintFormat" defaultValue={setting?.defaultPrintFormat ?? "thermal_80"}>
          <option value="thermal_58">Thermal 58mm</option>
          <option value="thermal_80">Thermal 80mm</option>
          <option value="a4">A4</option>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Logo Toko</Label>
        <Input type="file" name="logoFile" accept="image/*" />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Alamat</Label>
        <Textarea name="address" defaultValue={setting?.address ?? ""} />
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label>Catatan Kaki Invoice</Label>
        <Textarea name="invoiceFooter" defaultValue={setting?.invoiceFooter ?? ""} />
      </div>
      <Button className="sm:col-span-2" disabled={pending}>
        <Save className="h-4 w-4" />
        {pending ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}
