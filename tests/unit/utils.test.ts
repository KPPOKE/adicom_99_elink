import { describe, expect, it } from "vitest";
import { safeSpreadsheetValue } from "@/lib/spreadsheet";
import { dateCode, formatCurrency, toNumber } from "@/lib/utils";

describe("utils", () => {
  it("formats currency as Rupiah", () => {
    expect(formatCurrency(125000)).toContain("Rp");
    expect(formatCurrency(125000)).toContain("125.000");
  });

  it("creates date code in yyyymmdd format", () => {
    expect(dateCode(new Date(2026, 4, 22))).toBe("20260522");
  });

  it("normalizes decimal-like values", () => {
    expect(toNumber("Rp 12.500")).toBe(12500);
    expect(toNumber("12.5")).toBe(12.5);
    expect(toNumber({ toNumber: () => 42 })).toBe(42);
  });

  it("escapes spreadsheet formula values", () => {
    expect(safeSpreadsheetValue("=HYPERLINK(\"http://bad\")")).toBe("'=HYPERLINK(\"http://bad\")");
    expect(safeSpreadsheetValue("+SUM(1,2)")).toBe("'+SUM(1,2)");
    expect(safeSpreadsheetValue("normal text")).toBe("normal text");
  });
});
