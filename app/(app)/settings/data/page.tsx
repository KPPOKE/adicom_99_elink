import { Download } from "lucide-react";
import { RestoreDataClient } from "@/components/restore-data-client";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePermission } from "@/lib/permissions";

export default async function DataSettingsPage() {
  const user = await requirePermission("settings.backup");
  return <><PageHeader title="Backup Data" description="Unduh salinan data sesuai cakupan cabang akun aktif." /><div className="grid max-w-4xl gap-6"><Card><CardHeader><CardTitle>Backup Manual</CardTitle></CardHeader><CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-sm text-slate-600">File JSON dapat disimpan sebagai arsip harian dan pemeriksaan data.</p><form action="/settings/backup" method="post"><Button type="submit"><Download className="h-4 w-4" />Unduh Backup JSON</Button></form></CardContent></Card>{user.role.name === "admin" ? <Card><CardHeader><CardTitle>Load Data</CardTitle></CardHeader><CardContent><RestoreDataClient /></CardContent></Card> : null}</div></>;
}