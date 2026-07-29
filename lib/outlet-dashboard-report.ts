export type OutletReportDay = {
  date: Date;
  digitalTransactions: number;
  physicalTransactions: number;
  profit: number;
  expense: number;
  netProfit: number;
};

type ReportTransaction = {
  date: Date;
  discount: number;
  items: Array<{ qty: number; price: number; cost: number; categoryName: string }>;
};

type ReportService = {
  date: Date;
  laborCost: number;
  parts: Array<{ qty: number; price: number; cost: number }>;
};

type ReportFinance = {
  date: Date;
  type: "income" | "expense";
  amount: number;
  referenceType: string | null;
};

type ReportMiniAtm = { date: Date };

function monthValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function dayKey(date: Date) {
  return `${monthValue(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

export function outletReportPeriod(value: string | undefined, now = new Date()) {
  const current = monthValue(now);
  const selected = /^\d{4}-(0[1-9]|1[0-2])$/.test(value ?? "") && value! <= current ? value! : current;
  const [year, month] = selected.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const visibleEnd = selected === current ? new Date(year, month - 1, now.getDate() + 1) : end;
  return { value: selected, current, start, end, visibleEnd };
}

export function buildOutletReport(input: {
  start: Date;
  visibleEnd: Date;
  transactions: ReportTransaction[];
  services: ReportService[];
  finance: ReportFinance[];
  miniAtm: ReportMiniAtm[];
}) {
  const days: OutletReportDay[] = [];
  const byDate = new Map<string, OutletReportDay>();

  for (const date = new Date(input.start); date < input.visibleEnd; date.setDate(date.getDate() + 1)) {
    const day: OutletReportDay = {
      date: new Date(date),
      digitalTransactions: 0,
      physicalTransactions: 0,
      profit: 0,
      expense: 0,
      netProfit: 0
    };
    days.push(day);
    byDate.set(dayKey(date), day);
  }

  for (const transaction of input.transactions) {
    const day = byDate.get(dayKey(transaction.date));
    if (!day) continue;
    if (transaction.items.some((item) => item.categoryName === "Produk Digital")) day.digitalTransactions += 1;
    else day.physicalTransactions += 1;
    day.profit += transaction.items.reduce((sum, item) => sum + item.qty * (item.price - item.cost), 0) - transaction.discount;
  }

  for (const service of input.services) {
    const day = byDate.get(dayKey(service.date));
    if (!day) continue;
    day.profit += service.laborCost + service.parts.reduce((sum, part) => sum + part.qty * (part.price - part.cost), 0);
  }

  for (const record of input.finance) {
    const day = byDate.get(dayKey(record.date));
    if (!day) continue;
    if (record.referenceType === "bank_transfer") {
      day.profit += record.type === "income" ? record.amount : -record.amount;
    } else if (record.type === "expense") {
      day.expense += record.amount;
    }
  }

  for (const transaction of input.miniAtm) {
    const day = byDate.get(dayKey(transaction.date));
    if (day) day.digitalTransactions += 1;
  }

  for (const day of days) day.netProfit = day.profit - day.expense;

  return {
    days,
    summary: days.reduce(
      (sum, day) => ({
        digitalTransactions: sum.digitalTransactions + day.digitalTransactions,
        physicalTransactions: sum.physicalTransactions + day.physicalTransactions,
        profit: sum.profit + day.profit,
        expense: sum.expense + day.expense,
        netProfit: sum.netProfit + day.netProfit
      }),
      { digitalTransactions: 0, physicalTransactions: 0, profit: 0, expense: 0, netProfit: 0 }
    )
  };
}
