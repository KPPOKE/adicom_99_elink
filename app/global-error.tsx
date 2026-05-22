"use client";

import { useEffect } from "react";
import { AlertOctagon, RotateCcw } from "lucide-react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global boundary caught a critical error:", error);
  }, [error]);

  return (
    <html lang="id">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen flex-col items-center justify-center p-6 text-center antialiased">
        <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-red-600/10 border border-red-500/20 shadow-[0_0_50px_rgba(220,38,38,0.2)]">
          <AlertOctagon className="h-12 w-12 text-red-500" />
        </div>
        <h1 className="text-3xl font-bold mb-3 tracking-tight">Aplikasi Gagal Dimuat</h1>
        <p className="max-w-md text-slate-400 mb-8 leading-relaxed">
          Terjadi kegagalan kritis yang mencegah aplikasi dimuat dengan benar. Kami meminta maaf atas ketidaknyamanan ini.
        </p>
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-lg bg-red-600 hover:bg-red-500 px-6 py-3 text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(220,38,38,0.3)]"
        >
          <RotateCcw className="h-4 w-4" />
          Mulai Ulang Aplikasi
        </button>
      </body>
    </html>
  );
}
