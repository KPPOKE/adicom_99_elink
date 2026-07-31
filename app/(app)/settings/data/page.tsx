import { Download } from "lucide-react";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

export default async function DataSettingsPage() {
  await requirePermission("settings.backup");
  return <><PageHeader title="Backup Data" description="Unduh salinan data sesuai cakupan cabang akun aktif." /><Card className="max-w-2xl"><CardHeader><CardTitle>Backup Manual</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">File JSON dapat disimpan sebagai arsip harian dan digunakan untuk pemeriksaan data.</p><form action="/settings/backup" method="post"><Button type="submit"><Download className="h-4 w-4" />Unduh Backup JSON</Button></form></CardContent></Card></>;
}