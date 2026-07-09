"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Ban, CheckCircle2, Eye, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { cancelTransaction, completePendingTransaction, createTransaction } from "@/app/actions/operations";
import { formatCurrency, formatDateTime } from "@/lib/utils";

import { useCartStore } from "@/lib/store/useCartStore";
import { transactionSchema } from "@/lib/validators";

const emptySubscribe = () => () => {};

type ItemOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number; categoryName: string };
type CustomerOption = { id: number; name: string; phone: string | null };
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
  role,
  pagination
}: {
  items: ItemOption[];
  customers: CustomerOption[];
  transactions: TransactionRow[];
  role: "admin" | "staff";
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
}) {
  const router = useRouter();
  
  // Zustand State
  const cart = useCartStore();
  
  // Local state for UI only
  const [isPending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (useCartStore.getState().lines.length === 0 && items[0]) {
      useCartStore.getState().setLines([{ itemId: items[0].id, qty: 1, price: items[0].hargaJual }]);
    }
  }, [items]);

  const total = useMemo(() => cart.lines.reduce((sum, line) => sum + line.qty * line.price, 0), [cart.lines]);
  const grandTotal = Math.max(0, total - cart.diskon);
  const change = cart.paymentMethod === "Cash" ? Math.max(0, cart.paidAmount - grandTotal) : 0;
  const hasDigitalItem = cart.lines.some((line) => items.find((item) => item.id === line.itemId)?.categoryName === "Produk Digital");

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

  function handleLineItemChange(index: number, itemId: number) {
    const item = items.find((option) => option.id === itemId);
    cart.updateLine(index, { itemId, price: item?.hargaJual ?? 0 });
  }

  function submit() {
    startTransition(async () => {
      try {
        const payload = {
          customerId: cart.customerId,
          customerName: cart.customerName,
          diskon: cart.diskon,
          paymentMethod: cart.paymentMethod,
          paidAmount: cart.paidAmount,
          status: cart.status,
          nomorTujuan: cart.nomorTujuan,
          provider: cart.provider,
          jenisProduk: cart.jenisProduk,
          serialNumber: cart.serialNumber,
          digitalStatus: cart.digitalStatus,
          items: cart.lines.filter((line) => line.itemId)
        };

        const parsed = transactionSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0].message);
        }

        await createTransaction(parsed.data);
        toast.success("Transaksi berhasil disimpan");
        cart.resetCart(items[0]?.id, items[0]?.hargaJual);
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
                name="customerId"
                disabled={!hydrated}
                value={cart.customerId ?? ""}
                onInput={(event) => {
                  const id = Number(event.currentTarget.value) || null;
                  const name = id ? event.currentTarget.selectedOptions[0]?.text ?? "" : "";
                  cart.setCustomer(id, name);
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
              <Input name="customerName" value={cart.customerName} onChange={(event) => cart.setCustomerName(event.target.value)} placeholder="Opsional" />
            </div>
          </div>
          <div className="space-y-3">
            {cart.lines.map((line, index) => (
              <div key={index} className="grid gap-2 rounded-lg border border-slate-700 bg-slate-950/30 p-3">
                <Select name="itemId" value={line.itemId} onChange={(event) => handleLineItemChange(index, Number(event.target.value))}>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.namaBarang} ({item.stok})
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <CurrencyInput name="qty" prefix="" decimalScale={0} min={1} value={line.qty} onChange={(value) => cart.updateLine(index, { qty: value })} />
                  <CurrencyInput name="price" min={0} value={line.price} onChange={(value) => cart.updateLine(index, { price: value })} />
                  <Button variant="outline" size="icon" onClick={() => cart.setLines((current) => current.filter((_, i) => i !== index))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" onClick={() => cart.setLines((current) => [...current, { itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }])}>
              <Plus className="h-4 w-4" />
              Tambah Item
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Diskon</Label>
              <CurrencyInput name="diskon" value={cart.diskon} onChange={cart.setDiskon} />
            </div>
            <div className="space-y-1.5">
              <Label>Metode</Label>
              <Select value={cart.paymentMethod} onChange={(event) => cart.setPaymentMethod(event.target.value)}>
                <option value="Cash">Cash</option>
                <option value="Transfer">Transfer</option>
                <option value="QRIS">QRIS</option>
                <option value="Ewallet">E-wallet</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={cart.status} onChange={(event) => cart.setStatus(event.target.value)}>
                <option value="Berhasil">Berhasil</option>
                <option value="Pending">Pending</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dibayar</Label>
              <CurrencyInput name="paidAmount" value={cart.paidAmount} onChange={cart.setPaidAmount} />
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
                <Input value={cart.nomorTujuan} onChange={(event) => cart.setDigitalFields({ nomorTujuan: event.target.value })} placeholder="08xxxxxxxxxx" />
              </div>
              <div className="space-y-1.5">
                <Label>Provider</Label>
                <Input value={cart.provider} onChange={(event) => cart.setDigitalFields({ provider: event.target.value })} placeholder="Telkomsel, PLN, DANA" />
              </div>
              <div className="space-y-1.5">
                <Label>Jenis Produk</Label>
                <Input value={cart.jenisProduk} onChange={(event) => cart.setDigitalFields({ jenisProduk: event.target.value })} placeholder="Pulsa, token, paket data" />
              </div>
              <div className="space-y-1.5">
                <Label>Status Digital</Label>
                <Select value={cart.digitalStatus} onChange={(event) => cart.setDigitalFields({ digitalStatus: event.target.value })}>
                  <option value="Berhasil">Berhasil</option>
                  <option value="Pending">Pending</option>
                  <option value="Gagal">Gagal</option>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Serial Number / Token</Label>
                <Input value={cart.serialNumber} onChange={(event) => cart.setDigitalFields({ serialNumber: event.target.value })} />
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
          <Button className="w-full" onClick={submit} disabled={isPending || !cart.lines.length}>
            {isPending ? "Menyimpan..." : "Simpan Transaksi"}
          </Button>
        </CardContent>
      </Card>
      <div className="min-w-0 xl:order-1">
        <DataTable columns={columns} data={transactions} searchPlaceholder="Cari transaksi..." serverPagination={pagination} />
      </div>
    </div>
  );
}
