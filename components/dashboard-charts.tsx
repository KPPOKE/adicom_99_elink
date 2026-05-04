"use client";

import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
      <Card>
        <CardHeader>
          <CardTitle>Pemasukan 7 Hari Terakhir</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={incomeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
              <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line type="monotone" dataKey="income" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Transaksi per Kategori</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={58} outerRadius={92} paddingAngle={4}>
                {categoryData.map((_, index) => (
                  <Cell key={index} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => Number(value)} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

export function ReportChart({ data }: { data: { name: string; income: number; expense: number }[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Laba Rugi</CardTitle>
      </CardHeader>
      <CardContent className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
            <YAxis stroke="#64748b" fontSize={12} tickFormatter={(value) => `${Number(value) / 1000}k`} />
            <Tooltip formatter={(value) => formatCurrency(Number(value))} />
            <Bar dataKey="income" fill="#2563eb" radius={[4, 4, 0, 0]} />
            <Bar dataKey="expense" fill="#f97316" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
