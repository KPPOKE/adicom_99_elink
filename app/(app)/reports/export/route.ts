import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { loadReportData, parseReportFilters, reportCsv, reportDataset, reportTitle } from "@/lib/reporting";
import { safeSpreadsheetValue } from "@/lib/spreadsheet";

import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await requireAdmin();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseReportFilters(params);
  const kind = request.nextUrl.searchParams.get("kind") ?? "sales";
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  const data = await loadReportData(filters);
  const dataset = reportDataset(kind, data);
  const filenameBase = dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (format === "csv") {
    const csv = reportCsv(kind, data);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`
      }
    });
  }

  // Use SheetJS for excel export
  const worksheetData = [
    [dataset.title],
    [`Periode: ${reportTitle(filters)}`],
    [],
    dataset.headers,
    ...dataset.rows
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");
  
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`
    }
  });
}
