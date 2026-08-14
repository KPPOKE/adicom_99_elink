import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { loadReportData, parseReportFilters, reportCsv, reportDataset, reportTitle } from "@/lib/reporting";
import { safeSpreadsheetValue } from "@/lib/spreadsheet";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await requirePermission("reports.export");
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  const filters = parseReportFilters(params);
  const kind = request.nextUrl.searchParams.get("kind") ?? "sales";
  if (kind === "profit-loss" && user.role.name !== "admin") return new Response("Akses ditolak", { status: 403 });
  const format = request.nextUrl.searchParams.get("format") ?? "xlsx";
  const data = await loadReportData(filters);
  const dataset = reportDataset(kind, data);
  const filenameBase = dataset.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  if (format === "pdf") {
    const pdf = await createPdf(dataset.title, reportTitle(filters), dataset.headers, dataset.rows);
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`
      }
    });
  }

  if (format === "csv") {
    const csv = reportCsv(kind, data);
    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`
      }
    });
  }

  const worksheetData = [
    [dataset.title],
    [`Periode: ${reportTitle(filters)}`],
    [],
    dataset.headers,
    ...dataset.rows
  ];
  const body = worksheetData.map((row: unknown[]) => `<tr>${row.map((cell: unknown) => `<td>${htmlCell(cell)}</td>`).join("")}</tr>`).join("");
  const workbook = `<!doctype html><html><head><meta charset="utf-8"></head><body><table>${body}</table></body></html>`;

  return new Response(`\uFEFF${workbook}`, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="${filenameBase}.xls"`
    }
  });
}

function htmlCell(value: unknown) {
  return safeSpreadsheetValue(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!);
}

async function createPdf(title: string, period: string, headers: string[], rows: unknown[][]) {
  const sanitize = (text: unknown) =>
    String(text ?? "")
      .replace(/[^\x20-\x7E]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const pageWidth = 595;
  const marginX = 36;
  const printableWidth = pageWidth - marginX * 2;
  const numCols = headers.length;

  const colWidths: number[] = [];
  if (title.includes("Service") || (headers[1] && headers[1].toLowerCase().includes("tanggal masuk"))) {
    colWidths.push(105, 75, 80, 105, 50, 50, 58);
  } else if (numCols === 7) {
    colWidths.push(75, 175, 85, 45, 55, 48, 40);
  } else {
    const defaultW = Math.floor(printableWidth / numCols);
    for (let c = 0; c < numCols; c++) colWidths.push(defaultW);
  }

  const pdfStream: string[] = [];

  pdfStream.push(`BT /F2 14 Tf 36 805 Td (${sanitize(title)}) Tj ET`);
  pdfStream.push(`BT /F1 9 Tf 36 790 Td (Periode: ${sanitize(period)}) Tj ET`);
  pdfStream.push(`0.2 0.4 0.8 RG 1.5 w 36 780 m ${pageWidth - marginX} 780 l S`);

  const tableTopY = 770;
  const headerHeight = 22;
  const headerFillY = tableTopY - headerHeight;

  pdfStream.push(`0.9 0.93 0.98 rg 36 ${headerFillY} ${printableWidth} ${headerHeight} re f`);
  pdfStream.push(`0.6 0.7 0.85 RG 0.75 w 36 ${headerFillY} ${printableWidth} ${headerHeight} re S`);

  let currX = marginX;
  headers.forEach((h, i) => {
    const colW = colWidths[i] || 60;
    const text = sanitize(h).slice(0, Math.floor(colW / 5.5));
    pdfStream.push(`BT /F2 8.5 Tf ${currX + 4} ${headerFillY + 6} Td (${text}) Tj ET`);
    if (i > 0) {
      pdfStream.push(`0.6 0.7 0.85 RG 0.5 w ${currX} ${headerFillY} m ${currX} ${tableTopY} l S`);
    }
    currX += colW;
  });

  const rowHeight = 18;
  const displayRows = rows.slice(0, 34);

  displayRows.forEach((row, rIdx) => {
    const rowY = headerFillY - (rIdx + 1) * rowHeight;

    if (rIdx % 2 === 1) {
      pdfStream.push(`0.98 0.98 0.99 rg 36 ${rowY} ${printableWidth} ${rowHeight} re f`);
    }

    pdfStream.push(`0.85 0.85 0.85 RG 0.5 w 36 ${rowY} ${printableWidth} ${rowHeight} re S`);

    let cellX = marginX;
    headers.forEach((_, cIdx) => {
      const colW = colWidths[cIdx] || 60;
      const val = sanitize(row[cIdx]);
      const maxChars = Math.floor(colW / 5.5);
      const text = val.length > maxChars ? val.slice(0, Math.max(1, maxChars - 1)) + ".." : val;

      pdfStream.push(`BT /F1 8 Tf ${cellX + 4} ${rowY + 5} Td (${text}) Tj ET`);

      if (cIdx > 0) {
        pdfStream.push(`0.85 0.85 0.85 RG 0.5 w ${cellX} ${rowY} m ${cellX} ${rowY + rowHeight} l S`);
      }
      cellX += colW;
    });
  });

  // Calculate numeric total sum for last column
  const totalSum = displayRows.reduce((sum, row) => {
    const rawVal = row[row.length - 1];
    const numVal = typeof rawVal === "number" ? rawVal : Number(String(rawVal ?? "").replace(/[^\d.-]/g, "")) || 0;
    return sum + numVal;
  }, 0);

  if (totalSum > 0) {
    const totalRowY = headerFillY - (displayRows.length + 1) * rowHeight;
    pdfStream.push(`0.92 0.95 0.98 rg 36 ${totalRowY} ${printableWidth} ${rowHeight} re f`);
    pdfStream.push(`0.6 0.7 0.85 RG 0.8 w 36 ${totalRowY} ${printableWidth} ${rowHeight} re S`);
    const totalTextY = totalRowY + 5;
    const labelColWidth = printableWidth - (colWidths[colWidths.length - 1] || 60);
    pdfStream.push(`BT /F2 8.5 Tf ${marginX + 6} ${totalTextY} Td (TOTAL BIAYA FINAL:) Tj ET`);
    const sumFormatted = `Rp ${totalSum.toLocaleString("id-ID")}`;
    pdfStream.push(`BT /F2 8.5 Tf ${marginX + labelColWidth + 4} ${totalTextY} Td (${sanitize(sumFormatted)}) Tj ET`);
  }

  if (rows.length > 34) {
    const footerY = headerFillY - (displayRows.length + 2) * rowHeight - 10;
    pdfStream.push(`BT /F1 8 Tf 36 ${footerY} Td (Menampilkan 34 dari ${rows.length} total baris data.) Tj ET`);
  }

  const streamContent = pdfStream.join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(streamContent)} >>\nstream\n${streamContent}\nendstream`
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

