"use client";

import { Select } from "@/components/ui/select";

export function ReportDownloadDropdown({ kind, label = "📄 Unduh Laporan...", className }: { kind: string; label?: string; className?: string }) {
  return (
    <Select
      className={className ?? "w-[210px] text-xs font-semibold bg-white shadow-2xs"}
      defaultValue=""
      onChange={(e) => {
        const val = e.target.value;
        if (val) {
          window.open(val, "_blank");
          e.target.value = "";
        }
      }}
    >
      <option value="" disabled>{label}</option>
      <optgroup label="Laporan Harian (Hari Ini)">
        <option value={`/reports/export?kind=${kind}&period=today&format=pdf`}>PDF Harian</option>
        <option value={`/reports/export?kind=${kind}&period=today&format=xlsx`}>Excel Harian</option>
      </optgroup>
      <optgroup label="Laporan Mingguan (Minggu Ini)">
        <option value={`/reports/export?kind=${kind}&period=week&format=pdf`}>PDF Mingguan</option>
        <option value={`/reports/export?kind=${kind}&period=week&format=xlsx`}>Excel Mingguan</option>
      </optgroup>
      <optgroup label="Laporan Bulanan (Bulan Ini)">
        <option value={`/reports/export?kind=${kind}&period=month&format=pdf`}>PDF Bulanan</option>
        <option value={`/reports/export?kind=${kind}&period=month&format=xlsx`}>Excel Bulanan</option>
      </optgroup>
      <optgroup label="Laporan Tahunan (Tahun Ini)">
        <option value={`/reports/export?kind=${kind}&period=year&format=pdf`}>PDF Tahunan</option>
        <option value={`/reports/export?kind=${kind}&period=year&format=xlsx`}>Excel Tahunan</option>
      </optgroup>
    </Select>
  );
}
