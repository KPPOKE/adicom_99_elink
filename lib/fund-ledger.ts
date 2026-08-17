import type { Prisma } from "@prisma/client";
import { toNumber } from "@/lib/utils";

export function transferLedger(amount: number, adminLoket: number, adminBank: number) {
  return {
    sourceDelta: -(amount + adminBank),
    targetDelta: amount + adminLoket,
    profit: adminLoket - adminBank
  };
}

export function cashWithdrawalLedger(amount: number, adminDalam: number, adminLuar: number) {
  return {
    sourceDelta: -(amount - adminLuar),
    targetDelta: amount + adminDalam,
    profit: adminDalam + adminLuar
  };
}

export function feeIncomeLedger(amount: number) {
  return {
    sourceDelta: 0,
    targetDelta: amount,
    profit: amount
  };
}

// Mode Pulsa / Pembayaran Digital: cost leaves the source account (e.g. a
// pulsa-deposit or bank balance), the sell price lands in the target
// account, and the difference is the margin. Source and target may be the
// same account (that just nets straight to profit on that one balance).
export function pulsaLedger(sellAmount: number, costAmount: number) {
  return {
    sourceDelta: -costAmount,
    targetDelta: sellAmount,
    profit: sellAmount - costAmount
  };
}

// Operasional: a withdrawal where only the admin fee is a real cost (mirrors
// the existing "Ambil Saldo" fund-mutation formula) - the withdrawn amount
// itself just leaves the tracked balance, it isn't a loss.
export function operationalLedger(amount: number, adminFee: number) {
  return {
    sourceDelta: -(amount + adminFee),
    targetDelta: 0,
    profit: -adminFee
  };
}

export function moveLedger(amount: number, admin: number, bearer: "Pengirim" | "Penerima" | "Tidak_Ada") {
  return {
    sourceDelta: -(amount + (bearer === "Pengirim" ? admin : 0)),
    targetDelta: amount - (bearer === "Penerima" ? admin : 0)
  };
}

export async function applyFundDelta(
  tx: Prisma.TransactionClient,
  input: {
    outletId: number;
    fundAccountId: number;
    type: Prisma.FundMutationUncheckedCreateInput["type"];
    delta: number;
    adminFee?: number;
    referenceType?: string;
    referenceId?: number;
    bankTransferId?: number;
    note?: string | null;
    userId: number;
  }
) {
  if (input.delta === 0) return;
  const account = await tx.fundAccount.findUnique({ where: { id: input.fundAccountId } });
  if (!account || account.outletId !== input.outletId || !account.isActive) throw new Error("Sumber dana tidak valid");
  const before = toNumber(account.balance);
  const after = before + input.delta;
  if (after < 0) throw new Error(`Saldo ${account.name} tidak cukup`);
  const updated = await tx.fundAccount.updateMany({ where: { id: account.id, balance: account.balance }, data: { balance: after } });
  if (updated.count !== 1) throw new Error("Saldo berubah, ulangi transaksi");
  return tx.fundMutation.create({
    data: {
      outletId: input.outletId,
      fundAccountId: account.id,
      type: input.type,
      amount: Math.abs(input.delta),
      adminFee: input.adminFee ?? 0,
      balanceBefore: before,
      balanceAfter: after,
      referenceType: input.referenceType,
      referenceId: input.referenceId,
      bankTransferId: input.bankTransferId,
      note: input.note || null,
      userId: input.userId
    }
  });
}
