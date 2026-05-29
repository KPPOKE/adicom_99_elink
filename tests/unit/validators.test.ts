import { describe, expect, it } from "vitest";
import { financeSchema, serviceSchema, transactionSchema, userSchema } from "@/lib/validators";

describe("validators", () => {
  it("rejects cash transaction when paid amount is lower than grand total", () => {
    const result = transactionSchema.safeParse({
      customerId: null,
      customerName: "Umum",
      diskon: 0,
      paymentMethod: "Cash",
      paidAmount: 10_000,
      status: "Berhasil",
      items: [{ itemId: 1, qty: 1, price: 20_000 }]
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toContain("paidAmount");
  });

  it("accepts non-cash transaction with valid item lines", () => {
    const result = transactionSchema.safeParse({
      customerId: null,
      customerName: "Umum",
      diskon: 5_000,
      paymentMethod: "QRIS",
      paidAmount: 0,
      status: "Pending",
      items: [{ itemId: 1, qty: 2, price: 20_000 }]
    });

    expect(result.success).toBe(true);
  });

  it("requires password for new users but allows empty password on edit", () => {
    expect(userSchema.safeParse({ name: "Staff", email: "staff@example.com", role: "staff", password: "" }).success).toBe(false);
    expect(userSchema.safeParse({ id: 2, name: "Staff", email: "staff@example.com", role: "staff", password: "" }).success).toBe(true);
  });

  it("requires positive amount for finance records", () => {
    expect(financeSchema.safeParse({ type: "expense", category: "Operasional", amount: 0, date: new Date() }).success).toBe(false);
    expect(financeSchema.safeParse({ type: "income", category: "Manual", amount: 1000, date: new Date() }).success).toBe(true);
  });

  it("rejects empty strings for required money fields (Fix: Uang Siluman)", () => {
    const resultFinance = financeSchema.safeParse({
      type: "income",
      category: "Test",
      amount: "",
      date: new Date()
    });
    expect(resultFinance.success).toBe(false);

    const resultService = serviceSchema.safeParse({
      customerName: "Budi",
      deviceType: "HP",
      problemDescription: "Mati Total",
      estimatedCost: 0,
      finalCost: "",
      status: "Dicek"
    });
    expect(resultService.success).toBe(false);
  });
});
