import { NextRequest } from "next/server";
import { loadOutletReport, requireDashboardOutlet } from "@/lib/outlet-dashboard-data";
import { buildOutletAnnualReport, outletAnnualReportYear } from "@/lib/outlet-dashboard-report";
import { requirePermission } from "@/lib/permissions";
import { safeSpreadsheetValue } from "@/lib/spreadsheet";

export const runtime = "nodejs";

export async function GET(request: NextRequest, { params }: { params: Promise<{ outletId: string }> }) {
  await requirePermission("reports.export");
  const { outletId } = await params;
  const { outlet } = await requireDashboardOutlet(Number(outletId));
  const period = outletAnnualReportYear(request.nextUrl.searchParams.get("tahun") ?? undefined);
  const report = await loadOutletReport(outlet.id, period.start, period.end);
  const annual = buildOutletAnnualReport(report.days);
  const headers = ["Bulan", "Potongan Bank", "Operasional", "Profit", "Pengeluaran", "Profit Bersih"];
  const rows = annual.months.map((month) => [month.name, month.bankFee, month.operational, month.profit, month.expense, month.netProfit]);
  rows.push(["Total", annual.total.bankFee, annual.total.operational, annual.total.profit, annual.total.expense, annual.total.netProfit]);
  const worksheet = [
    [`Laporan Tahunan ${outlet.name}`],
    [`Tahun: ${period.year}`],
    [],
    headers,
    ...rows
  ];
  const body = worksheet.map((row) => `<tr>${row.map((cell) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`).join("");
  const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${body}</table></body></html>`;
  const code = outlet.code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  return new Response(`\uFEFF${workbook}`, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-tahunan-${code}-${period.year}.xls"`
    }
  });
}

function htmlCell(value: unknown) {
  return safeSpreadsheetValue(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}
