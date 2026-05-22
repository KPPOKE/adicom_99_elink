"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Eye, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { cancelTransaction, completePendingTransaction, createTransaction } from "@/app/actions/operations";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type ItemOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number; categoryName: string };
type CustomerOption = { id: number; name: string; phone: string | null };
type Line = { itemId: number; qty: number; price: number };
type TransactionRow = {
  id: number;
  kodeTransaksi: string;
  customerName: string | null;
  grandTotal: number;
  paymentMethod: string;
  status: string;
  createdAt: string | Date;
  items: { qty: number; item: { namaBarang: string } }[];
};

export function TransactionClient({
  items,
  customers,
  transactions,
  role
}: {
  items: ItemOption[];
  customers: CustomerOption[];
  transactions: TransactionRow[];
  role: "admin" | "staff";
}) {
  const router = useRouter();
  const [lines, setLines] = useState<Line[]>([{ itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }]);
  const [diskon, setDiskon] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [status, setStatus] = useState("Berhasil");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [nomorTujuan, setNomorTujuan] = useState("");
  const [provider, setProvider] = useState("");
  const [jenisProduk, setJenisProduk] = useState("");
  const [serialNumber, setSerialNumber] = useState("");
  const [digitalStatus, setDigitalStatus] = useState("Berhasil");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(() => lines.reduce((sum, line) => sum + line.qty * line.price, 0), [lines]);
  const grandTotal = Math.max(0, total - diskon);
  const change = paymentMethod === "Cash" ? Math.max(0, paidAmount - grandTotal) : 0;
  const hasDigitalItem = lines.some((line) => items.find((item) => item.id === line.itemId)?.categoryName === "Produk Digital");

  const columns: ColumnDef<TransactionRow>[] = [
    { accessorKey: "kodeTransaksi", header: "Kode" },
    { header: "Customer", cell: ({ row }) => row.original.customerName || "Umum" },
    { header: "Item", cell: ({ row }) => row.original.items.map((item) => `${item.item.namaBarang} x${item.qty}`).join(", ") },
    { header: "Total", cell: ({ row }) => formatCurrency(row.original.grandTotal) },
    { accessorKey: "paymentMethod", header: "Pembayaran" },
    { header: "Status", cell: ({ row }) => <TransactionStatusBadge status={row.original.status} /> },
    { header: "Tanggal", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: "actions",
      header: "Aksi",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" size="icon" title={`Cetak ${row.original.kodeTransaksi}`}>
            <Link href={`/transactions/${row.original.id}/invoice`}>
              <Printer className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" title={`Detail ${row.original.kodeTransaksi}`}>
            <Link href={`/transactions/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {row.original.status === "Pending" ? (
            <ConfirmDialog
              title="Selesaikan transaksi?"
              description="Status transaksi menjadi berhasil dan pemasukan akan dibuat di keuangan."
              confirmLabel="Selesaikan"
              onConfirm={() =>
                startTransition(async () => {
                  try {
                    await completePendingTransaction(row.original.id);
                    toast.success("Transaksi diselesaikan");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyelesaikan transaksi");
                  }
                })
              }
              trigger={
                <Button variant="outline" size="icon" title="Selesaikan transaksi">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </Button>
              }
            />
          ) : null}
          {role === "admin" && row.original.status !== "Batal" ? (
            <ConfirmDialog
              title="Batalkan transaksi?"
              description="Stok item akan dikembalikan dan pemasukan transaksi ini akan dikoreksi."
              confirmLabel="Batalkan"
              onConfirm={() =>
                startTransition(async () => {
                  try {
                    await cancelTransaction(row.original.id);
                    toast.success("Transaksi dibatalkan");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal membatalkan transaksi");
                  }
                })
              }
              trigger={
                <Button variant="outline" size="icon" title={`Batalkan ${row.original.kodeTransaksi}`}>
                  <Ban className="h-4 w-4 text-red-300" />
                </Button>
              }
            />
          ) : null}
        </div>
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
          status,
          nomorTujuan,
          provider,
          jenisProduk,
          serialNumber,
          items: lines.filter((line) => line.itemId),
          digitalStatus: hasDigitalItem ? digitalStatus : undefined
        });
        toast.success("Transaksi berhasil disimpan");
        setLines([{ itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }]);
        setDiskon(0);
        setPaidAmount(0);
        setStatus("Berhasil");
        setNomorTujuan("");
        setProvider("");
        setJenisProduk("");
        setSerialNumber("");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Transaksi gagal");
      }
    });
  }

  return (
    <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
      <Card className="min-w-0 xl:order-2">
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
              <div key={index} className="grid gap-2 rounded-lg border border-slate-700 bg-slate-950/30 p-3">
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
              <Label>Status</Label>
              <Select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="Berhasil">Berhasil</option>
                <option value="Pending">Pending</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dibayar</Label>
              <Input type="number" value={paidAmount} onChange={(event) => setPaidAmount(Number(event.target.value))} />
            </div>
            <div className="rounded-lg border border-slate-800 bg-slate-950/35 p-3">
              <p className="text-xs text-slate-500">Kembalian</p>
              <p className="font-semibold">{formatCurrency(change)}</p>
            </div>
          </div>
          {hasDigitalItem ? (
            <div className="grid gap-3 rounded-lg border border-cyan-100 bg-cyan-50/60 p-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Nomor Tujuan</Label>
                <Input value={nomorTujuan} onChange={(event) => setNomorTujuan(event.target.value)} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Input value={provider} onChange={(event) => setProvider(event.target.value)} placeholder="Telkomsel, PLN, DANA" />
              </div>
              <div className="space-y-1.5">
                <Label>Jenis Produk</Label>
                <Input value={jenisProduk} onChange={(event) => setJenisProduk(event.target.value)} placeholder="Pulsa, token, paket data" />
              </div>
              <div className="space-y-1.5">
                <Label>Status Digital</Label>
                <Select value={digitalStatus} onChange={(event) => setDigitalStatus(event.target.value)}>
                  <option value="Berhasil">Berhasil</option>
                  <option value="Pending">Pending</option>
                  <option value="Gagal">Gagal</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Serial Number / Token</Label>
                <Input value={serialNumber} onChange={(event) => setSerialNumber(event.target.value)} />
              </div>
            </div>
          ) : null}
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="flex justify-between text-sm text-slate-400">
              <span>Subtotal</span>
              <span>{formatCurrency(total)}</span>
            </div>
            <div className="mt-2 flex justify-between text-lg font-semibold text-blue-300">
              <span>Grand Total</span>
              <span>{formatCurrency(grandTotal)}</span>
            </div>
          </div>
          <Button className="w-full" onClick={submit} disabled={isPending || !lines.length}>
            {isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </CardContent>
      </Card>
      <div className="min-w-0 xl:order-1">
        <DataTable columns={columns} data={transactions} searchPlaceholder="Cari transaksi..." />
      </div>
    </div>
  );
}
