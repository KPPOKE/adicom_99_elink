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
  const colors = ["#2563eb", "#06b6d4", "#f97316", "#10b981", "#64748b"];
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
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Line type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
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
                <Tooltip formatter={(value) => Number(value)} />
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
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar dataKey="income" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#f97316" radius={[4, 4, 0, 0]} />
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
  return <div className="h-full w-full animate-pulse rounded-md bg-slate-100" />;
}
