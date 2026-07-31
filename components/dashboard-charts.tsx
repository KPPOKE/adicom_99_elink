"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export function DashboardCharts({
  incomeData,
  categoryData
}: {
  incomeData: { date: string; income: number }[];
  categoryData: { name: string; value: number }[];
}) {
  const colors = ["#0ea5e9", "#6366f1", "#a855f7", "#ec4899", "#f43f5e", "#f59e0b"];
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Pemasukan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="h-80 min-h-80 min-w-0">
          <ChartFrame>
            {(width) => (
              <LineChart data={incomeData} width={width} height={300}>
                <defs>
                  <linearGradient id="incomeLine" x1="0" x2="1" y1="0" y2="0">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a" }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Line type="monotone" dataKey="income" stroke="url(#incomeLine)" strokeWidth={4} dot={{ r: 4, fill: "#0ea5e9", stroke: "#6366f1", strokeWidth: 2 }} activeDot={{ r: 6, fill: "#fff", stroke: "#6366f1" }} />
              </LineChart>
            )}
          </ChartFrame>
        </CardContent>
      </Card>
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Transaksi per Kategori</CardTitle>
        </CardHeader>
        <CardContent className="h-80 min-h-80 min-w-0">
          <ChartFrame>
            {(width) => (
              <PieChart width={width} height={300}>
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={4}>
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a" }}
                  formatter={(value) => Number(value)}
                  itemStyle={{ color: "#0f172a" }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  wrapperStyle={{ fontSize: "12px", color: "#475569" }}
                />
              </PieChart>
            )}
          </ChartFrame>
        </CardContent>
      </Card>
    </div>
  );
}

export function ReportChart({ data }: { data: { name: string; income: number; expense: number }[] }) {
  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Ringkasan Laba Rugi</CardTitle>
      </CardHeader>
      <CardContent className="h-80 min-h-80 min-w-0">
        <ChartFrame>
          {(width) => (
            <BarChart data={data} width={width} height={300}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <Tooltip
                contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a" }}
                formatter={(value) => formatCurrency(Number(value))}
                cursor={{ fill: "transparent" }}
              />
              <Bar dataKey="income" stackId="report" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" stackId="report" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ChartFrame>
      </CardContent>
    </Card>
  );
}

export function OutletProfitChart({ data }: { data: { date: string; profit: number; expense: number; netProfit: number }[] }) {
  const [visible, setVisible] = useState({ profit: true, expense: true, netProfit: true });
  const series = [
    { key: "profit", label: "Profit", color: "#38bdf8" },
    { key: "expense", label: "Pengeluaran", color: "#fb7185" },
    { key: "netProfit", label: "Profit Bersih", color: "#34d399" }
  ] as const;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Grafik Laporan Bulanan</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 pb-4">
        <div className="h-[280px] min-h-[280px] min-w-0">
          <ChartFrame>
            {(width) => (
              <LineChart data={data} width={width} height={280}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a" }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                <Line hide={!visible.profit} type="monotone" dataKey="profit" name="Profit" stroke="#38bdf8" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                <Line hide={!visible.expense} type="monotone" dataKey="expense" name="Pengeluaran" stroke="#fb7185" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
                <Line hide={!visible.netProfit} type="monotone" dataKey="netProfit" name="Profit Bersih" stroke="#34d399" strokeWidth={3} dot={false} activeDot={{ r: 5 }} />
              </LineChart>
            )}
          </ChartFrame>
        </div>
        <div className="relative z-10 mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Pilih data grafik">
          {series.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={visible[item.key]}
              onClick={() => setVisible((current) => ({ ...current, [item.key]: !current[item.key] }))}
              className={`flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition ${visible[item.key] ? "border-slate-300 bg-white text-slate-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}
            >
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function OutletAnnualChart({
  data
}: {
  data: { name: string; bankFee: number; operational: number; profit: number; expense: number; netProfit: number }[];
}) {
  const [visible, setVisible] = useState({ bankFee: true, operational: true, profit: true, expense: true, netProfit: true });
  const series = [
    { key: "bankFee", label: "Potongan Bank", color: "#fbbf24" },
    { key: "operational", label: "Operasional", color: "#fb923c" },
    { key: "profit", label: "Profit", color: "#38bdf8" },
    { key: "expense", label: "Pengeluaran", color: "#fb7185" },
    { key: "netProfit", label: "Profit Bersih", color: "#34d399" }
  ] as const;

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Grafik Laporan Tahunan</CardTitle>
      </CardHeader>
      <CardContent className="min-w-0 pb-4">
        <div className="h-[320px] min-h-[320px] min-w-0">
          <ChartFrame>
            {(width) => (
              <LineChart data={data} width={width} height={320} margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip
                  contentStyle={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: 8, color: "#0f172a" }}
                  formatter={(value) => formatCurrency(Number(value))}
                />
                {series.map((item) => (
                  <Line
                    key={item.key}
                    hide={!visible[item.key]}
                    type="monotone"
                    dataKey={item.key}
                    name={item.label}
                    stroke={item.color}
                    strokeWidth={3}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                ))}
              </LineChart>
            )}
          </ChartFrame>
        </div>
        <div className="relative z-10 mt-3 flex flex-wrap justify-center gap-2" role="group" aria-label="Pilih data grafik tahunan">
          {series.map((item) => (
            <button
              key={item.key}
              type="button"
              aria-pressed={visible[item.key]}
              onClick={() => setVisible((current) => ({ ...current, [item.key]: !current[item.key] }))}
              className={`flex h-8 items-center gap-2 rounded-md border px-3 text-xs font-medium transition ${visible[item.key] ? "border-slate-300 bg-white text-slate-800" : "border-slate-200 bg-slate-50 text-slate-500"}`}
            >
              <span className="h-0.5 w-3 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
function ChartFrame({ children }: { children: (width: number) => React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => setWidth(Math.max(280, Math.floor(element.getBoundingClientRect().width)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="h-full w-full min-w-0">
      {width > 0 ? children(width) : <ChartSkeleton />}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-full w-full animate-pulse rounded-md bg-slate-100" />;
}
