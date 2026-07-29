import { describe, expect, it } from "vitest";
import { buildOutletReport, outletReportPeriod } from "@/lib/outlet-dashboard-report";

describe("outlet dashboard report", () => {
  it("classifies mixed sales as digital and calculates daily profit once", () => {
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
        { date: new Date(2026, 6, 1, 12), type: "income", amount: 2_000, referenceType: "bank_transfer" },
        { date: new Date(2026, 6, 1, 13), type: "expense", amount: 500, referenceType: "bank_transfer" },
        { date: new Date(2026, 6, 1, 14), type: "expense", amount: 4_000, referenceType: null }
      ],
      miniAtm: [{ date: new Date(2026, 6, 1, 12) }]
    });

    expect(report.days[0]).toMatchObject({
      digitalTransactions: 2,
      physicalTransactions: 0,
      profit: 22_500,
      expense: 4_000,
      netProfit: 18_500
    });
    expect(report.days[1]).toMatchObject({ digitalTransactions: 0, physicalTransactions: 1, profit: 8_000, netProfit: 8_000 });
    expect(report.summary).toEqual({
      digitalTransactions: 2,
      physicalTransactions: 1,
      profit: 30_500,
      expense: 4_000,
      netProfit: 26_500
    });
  });

  it("uses the current month for invalid or future periods", () => {
    const now = new Date(2026, 6, 29, 12);
    expect(outletReportPeriod("2026-08", now).value).toBe("2026-07");
    expect(outletReportPeriod("invalid", now).visibleEnd).toEqual(new Date(2026, 6, 30));
    expect(outletReportPeriod("2026-06", now).visibleEnd).toEqual(new Date(2026, 6, 1));
  });
});
