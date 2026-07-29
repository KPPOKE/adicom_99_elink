import { describe, expect, it } from "vitest";
import { buildOutletReport, outletReportPeriod } from "@/lib/outlet-dashboard-report";

describe("outlet dashboard report", () => {
  it("matches the daily gross, deduction, profit, and expense flow", () => {
    const report = buildOutletReport({
      start: new Date(2026, 6, 1),
      visibleEnd: new Date(2026, 6, 3),
      transactions: [
        {
          date: new Date(2026, 6, 1, 10),
          discount: 1_000,
          items: [
            { qty: 1, price: 15_000, cost: 10_000, categoryName: "Produk Digital" },
            { qty: 2, price: 5_000, cost: 3_000, categoryName: "Aksesori" }
          ]
        },
        {
          date: new Date(2026, 6, 2, 10),
          discount: 0,
          items: [{ qty: 1, price: 20_000, cost: 12_000, categoryName: "Aksesori" }]
        }
      ],
      services: [{ date: new Date(2026, 6, 1, 11), laborCost: 10_000, parts: [{ qty: 1, price: 8_000, cost: 5_000 }] }],
      finance: [
        { date: new Date(2026, 6, 1, 13), type: "expense", amount: 500, referenceType: "bank_transfer" },
        { date: new Date(2026, 6, 1, 14), type: "expense", amount: 4_000, referenceType: null }
      ],
      miniAtm: [
        { date: new Date(2026, 6, 1, 12), grossProfit: 2_000, bankFee: 500 },
        { date: new Date(2026, 6, 2, 12), grossProfit: 3_000, bankFee: 0 }
      ],
      operations: [{ date: new Date(2026, 6, 1, 15), amount: 1_000 }]
    });

    expect(report.days[0]).toMatchObject({
      digitalTransactions: 2,
      physicalTransactions: 0,
      grossProfit: 23_000,
      bankFee: 500,
      operational: 1_000,
      profit: 21_500,
      expense: 4_000,
      netProfit: 17_500
    });
    expect(report.days[1]).toMatchObject({ digitalTransactions: 1, physicalTransactions: 1, grossProfit: 11_000, profit: 11_000, netProfit: 11_000 });
    expect(report.summary).toEqual({
      digitalTransactions: 3,
      physicalTransactions: 1,
      grossProfit: 34_000,
      bankFee: 500,
      operational: 1_000,
      profit: 32_500,
      expense: 4_000,
      netProfit: 28_500
    });
  });

  it("uses the current month for invalid or future periods", () => {
    const now = new Date(2026, 6, 29, 12);
    expect(outletReportPeriod("2026-08", now).value).toBe("2026-07");
    expect(outletReportPeriod("invalid", now).visibleEnd).toEqual(new Date(2026, 6, 30));
    expect(outletReportPeriod("2026-06", now).visibleEnd).toEqual(new Date(2026, 6, 1));
  });
});