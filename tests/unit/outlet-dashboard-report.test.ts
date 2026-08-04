import { describe, expect, it } from "vitest";
import { buildOutletAnnualReport, buildOutletReport, outletAnnualReportYear, outletReportDate, outletReportPeriod } from "@/lib/outlet-dashboard-report";

describe("outlet dashboard report", () => {
  it("matches the daily gross, deduction, profit, and expense flow", () => {
    const report = buildOutletReport({
      start: new Date(2026, 6, 1),
      visibleEnd: new Date(2026, 6, 3),
      transactions: [
        {
          date: new Date(2026, 6, 1, 10),
          total: 24_000,
          discount: 1_000,
          items: [
            { qty: 1, price: 15_000, cost: 10_000, categoryName: "Produk Digital" },
            { qty: 2, price: 5_000, cost: 3_000, categoryName: "Aksesori" }
          ]
        },
        {
          date: new Date(2026, 6, 2, 10),
          total: 20_000,
          discount: 0,
          items: [{ qty: 1, price: 20_000, cost: 12_000, categoryName: "Aksesori" }]
        }
      ],
      services: [{ date: new Date(2026, 6, 1, 11), total: 18_000, laborCost: 10_000, parts: [{ qty: 1, price: 8_000, cost: 5_000 }] }],
      finance: [
        { date: new Date(2026, 6, 1, 13), type: "expense", amount: 500, referenceType: "bank_transfer" },
        { date: new Date(2026, 6, 1, 14), type: "expense", amount: 4_000, referenceType: null }
      ],
      miniAtm: [
        { date: new Date(2026, 6, 1, 12), amount: 100_000, grossProfit: 2_000, bankFee: 500 },
        { date: new Date(2026, 6, 2, 12), amount: 50_000, grossProfit: 3_000, bankFee: 0 }
      ],
      operations: [{ date: new Date(2026, 6, 1, 15), amount: 1_000 }]
    });

    expect(report.days[0]).toMatchObject({
      digitalTransactions: 2,
      physicalTransactions: 0,
      turnover: 142_000,
      grossProfit: 23_000,
      bankFee: 500,
      operational: 1_000,
      profit: 21_500,
      expense: 4_000,
      netProfit: 17_500
    });
    expect(report.days[1]).toMatchObject({ digitalTransactions: 1, physicalTransactions: 1, turnover: 70_000, grossProfit: 11_000, profit: 11_000, netProfit: 11_000 });
    expect(report.summary).toEqual({
      digitalTransactions: 3,
      physicalTransactions: 1,
      serviceTransactions: 1,
      turnover: 212_000,
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

  it("accepts valid previous dates and clamps invalid or future dates", () => {
    const now = new Date(2026, 6, 29, 12);
    expect(outletReportDate("2025", "2", "31", now)).toMatchObject({ year: 2025, month: 2, day: 28 });
    expect(outletReportDate("2027", "8", "10", now)).toMatchObject({ year: 2026, month: 7, day: 29 });
    expect(outletReportDate(undefined, undefined, undefined, now).years.slice(0, 3)).toEqual([2026, 2025, 2024]);
  });
  it("aggregates every month and the annual total", () => {
    const annual = buildOutletAnnualReport([
      {
        date: new Date(2026, 0, 10), digitalTransactions: 0, physicalTransactions: 0, serviceTransactions: 0, turnover: 0, grossProfit: 15_000,
        bankFee: 1_000, operational: 2_000, profit: 12_000, expense: 3_000, netProfit: 9_000
      },
      {
        date: new Date(2026, 6, 10), digitalTransactions: 0, physicalTransactions: 0, serviceTransactions: 0, turnover: 0, grossProfit: 30_000,
        bankFee: 2_000, operational: 3_000, profit: 25_000, expense: 5_000, netProfit: 20_000
      }
    ]);

    expect(annual.months).toHaveLength(12);
    expect(annual.months[1]).toMatchObject({ bankFee: 0, operational: 0, profit: 0, expense: 0, netProfit: 0 });
    expect(annual.months[6]).toMatchObject({ bankFee: 2_000, operational: 3_000, profit: 25_000, expense: 5_000, netProfit: 20_000 });
    expect(annual.total).toEqual({ bankFee: 3_000, operational: 5_000, profit: 37_000, expense: 8_000, netProfit: 29_000 });
  });

  it("uses the current year for invalid or future annual periods", () => {
    const now = new Date(2026, 6, 29, 12);
    expect(outletAnnualReportYear("2025", now).year).toBe(2025);
    expect(outletAnnualReportYear("2027", now).year).toBe(2026);
    expect(outletAnnualReportYear("invalid", now)).toMatchObject({ value: "2026", current: "2026", year: 2026 });
  });
});