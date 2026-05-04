import { NextRequest } from "next/server";
import { requireUser } from "@/lib/auth";
import { loadReportData, parseReportFilters, reportCsv } from "@/lib/reporting";

export async function GET(request: NextRequest) {
  await requireUser();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseReportFilters(params);
  const kind = request.nextUrl.searchParams.get("kind") ?? "sales";
  const data = await loadReportData(filters);
  const csv = reportCsv(kind, data);
  const filename = kind === "finance" ? "laporan-keuangan.csv" : "laporan-penjualan.csv";

  return new Response(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`
    }
  });
}
