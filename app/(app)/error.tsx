"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service like Sentry here in the future
    console.error("App boundary caught an error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 shadow-[0_0_40px_rgba(239,68,68,0.15)]">
        <AlertTriangle className="h-10 w-10 text-red-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Terjadi Kesalahan Sistem</h2>
      <p className="max-w-md text-sm text-slate-400 mb-8 leading-relaxed">
        Maaf, sistem tidak dapat memproses permintaan atau merender antarmuka halaman ini. Silakan coba muat ulang halaman.
      </p>
      <div className="flex gap-4">
        <Button onClick={() => reset()} className="bg-slate-100 text-slate-950 hover:bg-slate-300">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Coba Muat Ulang
        </Button>
        <Button variant="outline" onClick={() => window.location.href = "/dashboard"}>
          Kembali ke Beranda
        </Button>
      </div>
    </div>
  );
}
