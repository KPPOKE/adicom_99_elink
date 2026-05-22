import { NextRequest } from "next/server";
import ExcelJS from "exceljs";
import { requireUser } from "@/lib/auth";
import { loadReportData, parseReportFilters, reportCsv, reportDataset, reportTitle } from "@/lib/reporting";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  await requireUser();
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseReportFilters(params);
  const kind = request.nextUrl.searchParams.get("kind") ?? "sales";
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  const data = await loadReportData(filters);
  const dataset = reportDataset(kind, data);
  const filenameBase = dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (format === "pdf") {
    const pdf = await createPdf(dataset.title, reportTitle(filters), dataset.headers, dataset.rows);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`
      }
    });
  }

  if (format === "csv") {
    const csv = reportCsv(kind, data);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`
      }
    });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Adicom99 Management System";
  const sheet = workbook.addWorksheet(dataset.title);
  sheet.addRow([dataset.title]);
  sheet.addRow([`Periode: ${reportTitle(filters)}`]);
  sheet.addRow([]);
  sheet.addRow(dataset.headers);
  dataset.rows.forEach((row) => sheet.addRow(row));
  sheet.getRow(1).font = { bold: true, size: 16 };
  sheet.getRow(4).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = 18;
  });
  const xlsx = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(xlsx as ArrayBuffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`
    }
  });
}

async function createPdf(title: string, period: string, headers: string[], rows: unknown[][]) {
  const lines = [
    title,
    `Periode: ${period}`,
    "",
    headers.join(" | "),
    ...rows.slice(0, 80).map((row) => row.map((cell) => String(cell ?? "")).join(" | ")),
    ...(rows.length > 80 ? [`Ditampilkan 80 dari ${rows.length} baris.`] : [])
  ];
  const escaped = lines.map((line, index) => {
    const text = line.replace(/[^\x20-\x7E]/g, "").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
    const y = 800 - index * 14;
    return `BT /F1 9 Tf 36 ${y} Td (${text.slice(0, 115)}) Tj ET`;
  }).join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${Buffer.byteLength(escaped)} >>\nstream\n${escaped}\nendstream`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "ascii");
}
