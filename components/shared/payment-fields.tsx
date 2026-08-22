"use client";

import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { PAYMENT_METHODS, computeCashSuggestions } from "@/lib/payment-methods";
import { cn, formatCurrency } from "@/lib/utils";

export function PaymentFields({
  paymentMethod,
  onPaymentMethodChange,
  availableAccounts,
  fundAccountId,
  onFundAccountIdChange,
  paidAmount,
  onPaidAmountChange,
  grandTotal,
  methods = PAYMENT_METHODS,
  totalsSlot
}: {
  paymentMethod: string;
  onPaymentMethodChange: (method: string) => void;
  availableAccounts: { id: number; name: string }[];
  fundAccountId: number | null;
  onFundAccountIdChange: (id: number | null) => void;
  paidAmount: number;
  onPaidAmountChange: (amount: number) => void;
  grandTotal: number;
  methods?: readonly string[];
  /** Optional totals/summary panel rendered between the account selector and the paid-amount input. */
  totalsSlot?: React.ReactNode;
}) {
  const change = paymentMethod === "Cash" ? Math.max(0, paidAmount - grandTotal) : 0;
  const cashSuggestions = paymentMethod === "Cash" ? computeCashSuggestions(grandTotal) : [];
  const accountLabel =
    paymentMethod === "Cash" ? "Pilih Akun Laci/Kas" : paymentMethod === "Transfer" ? "Pilih Bank Penerima" : "Pilih E-Wallet / QRIS";

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-xs font-bold text-slate-600">Metode Pembayaran</Label>
        <div className="grid grid-cols-4 gap-2">
          {methods.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => onPaymentMethodChange(method)}
              className={cn(
                "py-2 text-[10px] sm:text-xs font-bold rounded-lg border transition-all duration-150 active:scale-95",
                paymentMethod === method
                  ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
              )}
            >
              {method === "Cash" ? "Tunai" : method}
            </button>
          ))}
        </div>
      </div>

      {availableAccounts.length > 0 && (
        <div className="space-y-1">
          <Label className="text-xs font-bold text-slate-600">{accountLabel}</Label>
          <Select
            value={fundAccountId ?? ""}
            onChange={(event) => onFundAccountIdChange(Number(event.target.value) || null)}
            className="h-9 text-xs"
          >
            {availableAccounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {totalsSlot}

      <div className="space-y-1">
        <Label className="text-xs font-bold text-slate-600">Jumlah Uang Dibayar</Label>
        <CurrencyInput name="paidAmount" value={paidAmount} onChange={onPaidAmountChange} className="h-9 text-xs" />

        {paymentMethod === "Cash" && cashSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {cashSuggestions.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => onPaidAmountChange(amount)}
                className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 font-bold transition duration-150 active:scale-95"
              >
                {amount === grandTotal ? "Pas" : formatCurrency(amount)}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
        <div>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Uang Kembalian</p>
          <p className={cn("text-base font-extrabold mt-0.5", change > 0 ? "text-green-600" : "text-slate-800")}>
            {formatCurrency(change)}
          </p>
        </div>
        <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">Otomatis</span>
      </div>
    </div>
  );
}
