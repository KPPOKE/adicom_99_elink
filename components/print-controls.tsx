"use client";

import { Download, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";

export function PrintControls({ defaultFormat = "thermal_80" }: { defaultFormat?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const format = params.get("format") ?? defaultFormat;
  const [isPrinting, setIsPrinting] = useState(false);

  const print = () => {
    setIsPrinting(true);
    window.print();
    setTimeout(() => setIsPrinting(false), 500);
  };

  return (
    <div className="no-print mb-4 flex flex-wrap items-center justify-end gap-2">
      <Select
        className="w-[180px]"
        value={format}
        onChange={(event) => {
          const next = new URLSearchParams(params.toString());
          next.set("format", event.target.value);
          router.replace(`?${next.toString()}`);
        }}
      >
        <option value="thermal_58">Thermal 58mm</option>
        <option value="thermal_80">Thermal 80mm</option>
        <option value="a4">A4</option>
      </Select>
      <Button variant="outline" onClick={print} disabled={isPrinting}>
        <Download className="h-4 w-4 mr-2" />
        {isPrinting ? "Memproses..." : "PDF"}
      </Button>
      <Button onClick={print}>
        <Printer className="h-4 w-4 mr-2" />
        Cetak
      </Button>
    </div>
  );
}
