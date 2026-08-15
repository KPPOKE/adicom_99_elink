"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintButton() {
  return (
    <Button
      onClick={() => window.print()}
      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-sm"
    >
      <Printer className="h-4 w-4 mr-2" />
      Cetak / Unduh Struk (PDF)
    </Button>
  );
}
