export const CASH_DENOMINATIONS = [500, 1000, 2000, 5000, 10000, 20000, 50000, 100000] as const;

export function calculateCashClosing(counts: Record<number, number>, balance: number) {
  const totalSheets = CASH_DENOMINATIONS.reduce((sum, denomination) => sum + Math.max(0, Math.floor(counts[denomination] || 0)), 0);
  const total = CASH_DENOMINATIONS.reduce((sum, denomination) => sum + denomination * Math.max(0, Math.floor(counts[denomination] || 0)), 0);
  const difference = total - balance;
  return { totalSheets, total, difference, status: difference === 0 ? "SESUAI" : difference < 0 ? "UANG KURANG" : "UANG LEBIH" } as const;
}

export function normalizeWhatsAppNumber(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}