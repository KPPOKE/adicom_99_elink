export const PAYMENT_METHODS = ["Cash", "Transfer", "QRIS", "Ewallet"] as const;
export type PaymentMethodValue = (typeof PAYMENT_METHODS)[number];

const METHOD_TO_FUND_TYPE: Record<PaymentMethodValue, string> = {
  Cash: "Cash",
  Transfer: "Bank",
  QRIS: "Ewallet",
  Ewallet: "Ewallet"
};

export function filterFundAccountsByMethod<T extends { type: string }>(accounts: T[], method: string): T[] {
  const fundType = METHOD_TO_FUND_TYPE[method as PaymentMethodValue];
  if (!fundType) return [];
  return accounts.filter((acc) => acc.type === fundType);
}

export function computeCashSuggestions(grandTotal: number): number[] {
  if (grandTotal <= 0) return [];
  const suggestions = new Set<number>();
  suggestions.add(grandTotal); // Pas

  const denominations = [5000, 10000, 20000, 50000, 100000];
  for (const note of denominations) {
    if (note > grandTotal) {
      suggestions.add(note);
    }
    const nextMultiple = Math.ceil(grandTotal / note) * note;
    if (nextMultiple > grandTotal && nextMultiple <= grandTotal + 100000) {
      suggestions.add(nextMultiple);
    }
  }
  return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
}
