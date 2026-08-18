export type AdminFeeKind = "Tarik_Tunai" | "Transfer";
export type AdminFeeType = "Dalam" | "Luar";
export type AdminFeeRuleLite = { kind: AdminFeeKind; nominalFrom: number; nominalTo: number; adminAmount: number; adminType: AdminFeeType };

export function findAdminFeeAmount(rules: AdminFeeRuleLite[], kind: AdminFeeKind, type: AdminFeeType, amount: number) {
  const rule = rules.find((item) => item.kind === kind && item.adminType === type && amount >= item.nominalFrom && amount <= item.nominalTo);
  return rule?.adminAmount;
}
