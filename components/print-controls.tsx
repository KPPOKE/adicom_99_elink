"use client";

import { Download, Printer } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export function PrintControls({ defaultFormat = "thermal_80" }: { defaultFormat?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const format = params.get("format") ?? defaultFormat;
  const [isExporting, setIsExporting] = useState(false);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const element = document.getElementById("invoice-content");
      if (!element) throw new Error("Konten invoice tidak ditemukan");

      // Menambahkan padding untuk hasil render
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        // Menyesuaikan ukuran jika format thermal atau A4
        format: format === "a4" ? "a4" : [80, (canvas.height * 80) / canvas.width]
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Invoice_${new Date().getTime()}.pdf`);
      toast.success("PDF berhasil diekspor");
    } catch (error) {
      console.error(error);
      toast.error("Gagal mengekspor PDF");
    } finally {
      setIsExporting(false);
    }
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
      <Button variant="outline" onClick={handleExportPdf} disabled={isExporting}>
        <Download className="h-4 w-4 mr-2" />
        {isExporting ? "Memproses..." : "PDF"}
      </Button>
      <Button onClick={() => window.print()}>
        <Printer className="h-4 w-4 mr-2" />
        Cetak
      </Button>
    </div>
  );
}
