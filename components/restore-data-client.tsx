"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Preview = { generatedAt: string; complete: boolean; scope: string; counts: Record<string, number> };

export function RestoreDataClient() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [pending, setPending] = useState(false);

  async function choose(next: File | null) {
    setFile(next); setPreview(null); setConfirmation("");
    if (!next) return;
    if (next.size > 10 * 1024 * 1024) return void toast.error("Ukuran file maksimal 10 MB");
    try {
      const parsed = JSON.parse(await next.text()) as Record<string, unknown>;
      if (parsed.format !== "pospintar-backup" || parsed.version !== 2 || parsed.scope !== "all") throw new Error("Pilih backup v2 semua cabang");
      if (!parsed.complete) throw new Error("Backup terpotong tidak dapat dipulihkan");
      setPreview({ generatedAt: String(parsed.generatedAt), complete: true, scope: String(parsed.scope), counts: parsed.counts as Record<string, number> });
    } catch (error) { setFile(null); toast.error(error instanceof Error ? error.message : "File backup tidak valid"); }
  }

  async function restore() {
    if (!file || confirmation !== "PULIHKAN") return;
    setPending(true);
    try {
      const body = new FormData(); body.set("file", file); body.set("confirmation", confirmation);
      const response = await fetch("/settings/restore", { method: "POST", body });
      const result = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok) throw new Error(result.error || "Restore gagal");
      toast.success("Data operasional berhasil dipulihkan");
      window.location.assign("/dashboard");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Restore gagal"); }
    finally { setPending(false); }
  }

  return <div className="space-y-4">
    <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900"><strong>Perhatian:</strong> restore mengganti seluruh data operasional. Akun, kata sandi, izin, dan riwayat audit tetap dipertahankan.</div>
    <div className="space-y-1.5"><Label htmlFor="restore-file">File backup v2 semua cabang</Label><Input id="restore-file" type="file" accept="application/json,.json" onChange={(event) => void choose(event.target.files?.[0] ?? null)} /></div>
    {preview ? <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm"><p className="font-medium text-slate-900">Backup {new Date(preview.generatedAt).toLocaleString("id-ID")}</p><p className="mt-1 text-slate-600">{Object.values(preview.counts).reduce((sum, count) => sum + count, 0)} baris operasional terdeteksi.</p></div> : null}
    {preview ? <div className="space-y-1.5"><Label htmlFor="restore-confirmation">Ketik PULIHKAN untuk melanjutkan</Label><Input id="restore-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" /></div> : null}
    <Button type="button" variant="destructive" disabled={!preview || confirmation !== "PULIHKAN" || pending} onClick={restore}><RotateCcw className="h-4 w-4" />{pending ? "Memulihkan..." : "Load Data"}</Button>
  </div>;
}