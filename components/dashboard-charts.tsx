"use client";

import { useEffect, useRef, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, Tooltip, XAxis, YAxis } from "recharts";
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
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 8, color: "#e2e8f0" }}
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
                <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                  {categoryData.map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 8, color: "#e2e8f0" }}
                  formatter={(value) => Number(value)}
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
                contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.24)", borderRadius: 8, color: "#e2e8f0" }}
                formatter={(value) => formatCurrency(Number(value))}
              />
              <Bar dataKey="income" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" fill="#f43f5e" radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ChartFrame>
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
  return <div className="h-full w-full animate-pulse rounded-md bg-slate-800" />;
}
