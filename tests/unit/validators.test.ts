import { describe, expect, it } from "vitest";
import { bankTransferDepositSchema, bankTransferSchema, financeSchema, serviceSchema, transactionSchema, userSchema } from "@/lib/validators";

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
    expect(financeSchema.safeParse({ type: "expense", category: "Operasional", amount: 0, date: "2026-07-08" }).success).toBe(false);
    expect(financeSchema.safeParse({ type: "income", category: "Manual", amount: 1000, date: "2026-07-08" }).success).toBe(true);
  });

  it("validates bank transfer recipient and money fields", () => {
    expect(bankTransferSchema.safeParse({
      destinationBank: "BCA",
      accountNumber: "1234567890",
      accountName: "Budi",
      amount: 100_000,
      adminFee: 5_000
    }).success).toBe(true);
    expect(bankTransferSchema.safeParse({
      destinationBank: "BCA",
      accountNumber: "abc",
      accountName: "Budi",
      amount: 0,
      adminFee: -1
    }).success).toBe(false);
  });

  it("validates positive transfer deposit", () => {
    expect(bankTransferDepositSchema.safeParse({ amount: 100000, note: "Modal pagi" }).success).toBe(true);
    expect(bankTransferDepositSchema.safeParse({ amount: 0 }).success).toBe(false);
  });

  it("accepts service spareparts with positive quantity", () => {
    const result = serviceSchema.safeParse({
      customerName: "Budi",
      deviceType: "Laptop",
      problemDescription: "Tidak menyala",
      estimatedCost: 100000,
      laborCost: 50000,
      status: "Masuk",
      parts: [{ itemId: 1, qty: 2, price: 25000 }]
    });
    expect(result.success).toBe(true);
  });

  it("rejects empty strings for required money fields (Fix: Uang Siluman)", () => {
    const resultFinance = financeSchema.safeParse({
      type: "income",
      category: "Test",
      amount: "",
      date: "2026-07-08"
    });
    expect(resultFinance.success).toBe(false);

    const resultService = serviceSchema.safeParse({
      customerName: "Budi",
      deviceType: "HP",
      problemDescription: "Mati Total",
      estimatedCost: 0,
      laborCost: "",
      status: "Dicek"
    });
    expect(resultService.success).toBe(false);
  });
});
