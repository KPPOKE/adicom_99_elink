import { describe, expect, it } from "vitest";
import { cashWithdrawalLedger, moveLedger, transferLedger } from "@/lib/fund-ledger";

describe("fund ledger formulas", () => {
  it("calculates transfer source, laci, and profit like MiniATM", () => {
    expect(transferLedger(10000, 2500, 1000)).toEqual({ sourceDelta: -11000, targetDelta: 12500, profit: 1500 });
  });

  it("calculates cash withdrawal source, bank, and profit", () => {
    expect(cashWithdrawalLedger(5000, 1000, 500)).toEqual({ sourceDelta: -4500, targetDelta: 6000, profit: 1500 });
  });

  it("moves balance with optional operational bearer", () => {
    expect(moveLedger(1000, 50, "Pengirim")).toEqual({ sourceDelta: -1050, targetDelta: 1000 });
    expect(moveLedger(1000, 50, "Penerima")).toEqual({ sourceDelta: -1000, targetDelta: 950 });
    expect(moveLedger(1000, 50, "Tidak_Ada")).toEqual({ sourceDelta: -1000, targetDelta: 1000 });
  });
});
