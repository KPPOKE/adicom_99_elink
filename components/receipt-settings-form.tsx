"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import { updateReceiptSetting } from "@/app/actions/elink-core";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function ReceiptSettingsForm({ setting, defaultStoreName, defaultAddress }: { setting: { storeName: string; address: string | null; footer: string | null; logo: string | null } | null; defaultStoreName: string; defaultAddress: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const submit = (formData: FormData) => {
    startTransition(async () => {
      const result = await updateReceiptSetting(formData);
      if (!result.success) {
        toast.error("Gagal menyimpan pengaturan", { description: result.error });
        return;
      }
      toast.success("Pengaturan struk disimpan");
      router.refresh();
    });
  };

  return (
    <form action={submit} className="grid gap-4">
      <Field label="Nama Toko">
        <Input name="storeName" defaultValue={setting?.storeName ?? defaultStoreName} required />
      </Field>
      <Field label="Alamat">
        <Textarea name="address" defaultValue={setting?.address ?? defaultAddress} />
      </Field>
      <Field label="Teks Footer">
        <Textarea name="footer" defaultValue={setting?.footer ?? "Terima kasih atas kepercayaan Anda"} />
      </Field>
      <Field label="Logo">
        <Input type="file" name="logoFile" accept="image/*" />
        {setting?.logo ? <p className="text-xs text-slate-500">Logo aktif: {setting.logo}</p> : null}
      </Field>
      <Button disabled={pending}>
        <Save className="h-4 w-4" />
        {pending ? "Menyimpan..." : "Simpan Pengaturan"}
      </Button>
    </form>
  );
}
