"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Plus, Printer, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { createTransaction } from "@/app/actions/operations";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ItemOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number };
type CustomerOption = { id: number; name: string; phone: string | null };
type Line = { itemId: number; qty: number; price: number };
type TransactionRow = {
  id: number;
  kodeTransaksi: string;
  customerName: string | null;
  grandTotal: number;
  paymentMethod: string;
  createdAt: string | Date;
  items: { qty: number; item: { namaBarang: string } }[];
};

export function TransactionClient({
  items,
  customers,
  transactions
}: {
  items: ItemOption[];
  customers: CustomerOption[];
  transactions: TransactionRow[];
}) {
  const [lines, setLines] = useState<Line[]>([{ itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }]);
  const [diskon, setDiskon] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(() => lines.reduce((sum, line) => sum + line.qty * line.price, 0), [lines]);
  const grandTotal = Math.max(0, total - diskon);
  const change = paymentMethod === "Cash" ? Math.max(0, paidAmount - grandTotal) : 0;

  const columns: ColumnDef<TransactionRow>[] = [
    { accessorKey: "kodeTransaksi", header: "Kode" },
    { header: "Customer", cell: ({ row }) => row.original.customerName || "Umum" },
    { header: "Item", cell: ({ row }) => row.original.items.map((item) => `${item.item.namaBarang} x${item.qty}`).join(", ") },
    { header: "Total", cell: ({ row }) => formatCurrency(row.original.grandTotal) },
    { accessorKey: "paymentMethod", header: "Pembayaran" },
    { header: "Tanggal", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: "invoice",
      header: "",
      cell: ({ row }) => (
        <Button variant="outline" size="icon" onClick={() => window.print()} title={`Cetak ${row.original.kodeTransaksi}`}>
          <Printer className="h-4 w-4" />
        </Button>
      )
    }
  ];

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if (patch.itemId) {
          const item = items.find((option) => option.id === patch.itemId);
          if (item) next.price = item.hargaJual;
        }
        return next;
      })
    );
  }

  function submit() {
    startTransition(async () => {
      try {
        await createTransaction({
          customerId,
          customerName,
          diskon,
          paymentMethod,
          paidAmount,
          items: lines.filter((line) => line.itemId),
          digitalStatus: "Berhasil"
        });
        toast.success("Transaksi berhasil disimpan");
        setLines([{ itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }]);
        setDiskon(0);
        setPaidAmount(0);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Transaksi gagal");
      }
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="xl:order-2">
        <CardHeader>
          <CardTitle>Transaksi Baru</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer</Label>
              <Select
                value={customerId ?? ""}
                onChange={(event) => {
                  const id = Number(event.target.value) || null;
                  setCustomerId(id);
                  const customer = customers.find((item) => item.id === id);
                  setCustomerName(customer?.name ?? "");
                }}
              >
                <option value="">Umum</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nama Manual</Label>
              <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <div className="space-y-3">
            {lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-200 p-3">
                <Select value={line.itemId} onChange={(event) => updateLine(index, { itemId: Number(event.target.value) })}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.namaBarang} ({item.stok})
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <Input type="number" min={1} value={line.qty} onChange={(event) => updateLine(index, { qty: Number(event.target.value) })} />
                  <Input type="number" min={0} value={line.price} onChange={(event) => updateLine(index, { price: Number(event.target.value) })} />
                  <Button variant="outline" size="icon" onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => setLines((current) => [...current, { itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }])}>
              <Plus className="h-4 w-4" />
              Tambah Item
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Diskon</Label>
              <Input type="number" value={diskon} onChange={(event) => setDiskon(Number(event.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>Metode</Label>
              <Select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
                <option value="QRIS">QRIS</option>
                <option value="Ewallet">E-wallet</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dibayar</Label>
              <Input type="number" value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} />
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Kembalian</p>
              <p className="font-semibold">{formatCurrency(change)}</p>
            </div>
          </div>
          <div className="rounded-lg bg-blue-50 p-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-semibold text-blue-700">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <Button className="w-full" onClick={submit} disabled={isPending || !lines.length}>
            {isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </CardContent>
      </Card>
      <div className="xl:order-1">
        <DataTable columns={columns} data={transactions} searchPlaceholder="Cari transaksi..." />
      </div>
    </div>
  );
}
