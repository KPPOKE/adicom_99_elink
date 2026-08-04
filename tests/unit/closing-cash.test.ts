import { describe, expect, it } from "vitest";
import { calculateCashClosing, normalizeWhatsAppNumber } from "@/lib/closing-cash";

describe("closing pecahan", () => {
  it("calculates totals and cash status", () => {
    expect(calculateCashClosing({ 1000: 2, 50000: 1 }, 52000)).toEqual({ totalSheets: 3, total: 52000, difference: 0, status: "SESUAI" });
    expect(calculateCashClosing({ 100000: 1 }, 120000).status).toBe("UANG KURANG");
    expect(calculateCashClosing({ 100000: 2 }, 120000).status).toBe("UANG LEBIH");
  });

  it("normalizes Indonesian WhatsApp numbers", () => {
    expect(normalizeWhatsAppNumber("0812-3456-7890")).toBe("6281234567890");
  });
});