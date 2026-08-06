"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, Plus, Printer, Trash2, BriefcaseBusiness, Check, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore, useTransition, useState, useRef } from "react";
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
import { deleteTransaction, completePendingTransaction, createTransaction } from "@/app/actions/operations";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";

import { useCartStore } from "@/lib/store/useCartStore";
import { transactionSchema } from "@/lib/validators";

const emptySubscribe = () => () => {};

type ItemOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number; categoryName: string; gambar?: string | null };
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

type TodaySummary = { totalSales: number; countSuccess: number; countPending: number; countCancelled: number };

function SummaryCard({
  label,
  value,
  helper,
  icon,
  className,
  isCount
}: {
  label: string;
  value: number;
  helper: string;
  icon: React.ReactNode;
  className?: string;
  isCount?: boolean;
}) {
  return (
    <div className={cn("rounded-lg border p-4 shadow-sm transition", className || "border-slate-200 bg-white text-slate-900")}>
      <div className="flex items-center justify-between gap-3">
        <p className={cn("text-xs font-semibold uppercase tracking-wider", className ? "text-white/80" : "text-slate-500")}>{label}</p>
        <div className={cn("flex h-8 w-10 items-center justify-center overflow-hidden rounded-md border", className ? "border-white/20 bg-white/10 text-white" : "border-cyan-500/20 bg-cyan-500/10 text-blue-600")}>
          {icon}
        </div>
      </div>
      <p className="mt-3 text-lg font-bold tracking-tight">
        {isCount ? value.toLocaleString("id-ID") : formatCurrency(value)}
      </p>
      <p className={cn("mt-1 text-xs", className ? "text-white/70" : "text-slate-500")}>{helper}</p>
    </div>
  );
}

function SearchableItemSelect({
  items,
  value,
  onChange
}: {
  items: ItemOption[];
  value: number;
  onChange: (id: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem = items.find((item) => item.id === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter((item) =>
    item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery("");
        }}
        className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedItem?.gambar ? (
            <img src={selectedItem.gambar} alt={selectedItem.namaBarang} className="h-6 w-6 rounded object-cover shrink-0 border border-slate-200" />
          ) : selectedItem ? (
            <div className="h-6 w-6 rounded bg-slate-100 shrink-0 flex items-center justify-center text-[10px] text-slate-400 font-bold border border-slate-200">{selectedItem.namaBarang[0]}</div>
          ) : null}
          <span className="truncate text-left">
            {selectedItem ? `${selectedItem.namaBarang} (Stok: ${selectedItem.stok})` : "Pilih Barang..."}
          </span>
        </div>
        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama atau kode barang..."
            className="h-9 w-full rounded-md border border-slate-200 px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 mb-1"
            autoFocus
          />
          <div className="space-y-0.5">
            {filteredItems.length === 0 ? (
              <p className="p-3 text-xs text-slate-500 text-center">Barang tidak ditemukan</p>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onChange(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-2 py-2 text-sm text-left hover:bg-slate-50 transition-colors",
                    item.id === value && "bg-blue-50 text-blue-900"
                  )}
                >
                  {item.gambar ? (
                    <img src={item.gambar} alt={item.namaBarang} className="h-9 w-9 rounded-md object-cover shrink-0 border border-slate-200" />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-slate-100 shrink-0 flex items-center justify-center text-xs text-slate-400 font-bold border border-slate-200">{item.namaBarang[0]}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-medium truncate", item.id === value && "text-blue-900")}>{item.namaBarang}</p>
                    <p className="text-xs text-slate-400 truncate">{item.kodeBarang} &bull; Stok: {item.stok}</p>
                  </div>
                  {item.id === value && <Check className="h-4 w-4 text-blue-600 shrink-0" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TransactionClient({
  items,
  customers,
  transactions,
  canDelete,
  pagination,
  todaySummary
}: {
  items: ItemOption[];
  customers: CustomerOption[];
  transactions: TransactionRow[];
  role: "admin" | "staff";
  canDelete: boolean;
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  todaySummary: TodaySummary;
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
    { header: "Pelanggan", cell: ({ row }) => row.original.customerName || "Umum" },
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
          {canDelete ? (
            <ConfirmDialog
              title="Hapus transaksi?"
              description="Transaksi akan dihapus permanen. Stok barang akan otomatis dikembalikan."
              confirmLabel="Hapus"
              onConfirm={() =>
                startTransition(async () => {
                  try {
                    await deleteTransaction(row.original.id);
                    toast.success("Transaksi dihapus");
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menghapus transaksi");
                  }
                })
              }
              trigger={
                <Button variant="outline" size="icon" title={`Hapus ${row.original.kodeTransaksi}`}>
                  <Trash2 className="h-4 w-4 text-red-400" />
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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Omset Sales" value={todaySummary.totalSales} helper="Penjualan Berhasil Hari Ini" icon={<BriefcaseBusiness className="h-4 w-4" />} className="bg-[#1d4ed8] text-white border-transparent" />
        <SummaryCard label="Sukses" value={todaySummary.countSuccess} helper="Transaksi Berhasil" icon={<CheckCircle2 className="h-4 w-4" />} className="bg-[#166534] text-white border-transparent" isCount />
      </div>

      <div className="flex flex-col gap-6">
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Transaksi Baru</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Pelanggan</Label>
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
              <div className="hidden md:flex items-center gap-3 px-1 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span className="flex-1">Barang</span>
                <span className="w-28">Jumlah (Qty)</span>
                <span className="w-48">Harga Satuan</span>
                <span className="w-10 text-center">Aksi</span>
              </div>
              
              {cart.lines.map((line, index) => (
                <div key={index} className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-4 md:flex-row md:items-center">
                  <div className="flex-1 min-w-0 space-y-1">
                    <Label className="md:hidden">Barang</Label>
                    <SearchableItemSelect
                      items={items}
                      value={line.itemId}
                      onChange={(id) => handleLineItemChange(index, id)}
                    />
                  </div>
                  <div className="w-full md:w-28 space-y-1">
                    <Label className="md:hidden">Qty</Label>
                    <CurrencyInput name="qty" prefix="" decimalScale={0} min={1} value={line.qty} onChange={(value) => cart.updateLine(index, { qty: value })} />
                  </div>
                  <div className="w-full md:w-48 space-y-1">
                    <Label className="md:hidden">Harga</Label>
                    <CurrencyInput name="price" min={0} value={line.price} onChange={(value) => cart.updateLine(index, { price: value })} />
                  </div>
                  <div className="flex items-end justify-end md:self-center">
                    <Button variant="outline" size="icon" className="text-red-500 hover:bg-red-50 hover:text-red-600 border-red-200/50" onClick={() => cart.setLines((current) => current.filter((_, i) => i !== index))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <Button variant="outline" className="w-full sm:w-auto" onClick={() => cart.setLines((current) => [...current, { itemId: items[0]?.id ?? 0, qty: 1, price: items[0]?.hargaJual ?? 0 }])}>
                <Plus className="h-4 w-4 mr-1" />
                Tambah Baris Item
              </Button>
            </div>

            {hasDigitalItem ? (
              <div className="grid gap-3 rounded-lg border border-cyan-100 bg-cyan-50/40 p-4 sm:grid-cols-2 md:grid-cols-3">
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
                <div className="space-y-1.5 sm:col-span-2 md:col-span-2">
                  <Label>Serial Number / Token</Label>
                  <Input value={cart.serialNumber} onChange={(event) => cart.setDigitalFields({ serialNumber: event.target.value })} />
                </div>
              </div>
            ) : null}

            <div className="grid gap-6 md:grid-cols-2 border-t border-slate-100 pt-6">
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Diskon</Label>
                    <CurrencyInput name="diskon" value={cart.diskon} onChange={cart.setDiskon} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Metode Pembayaran</Label>
                    <Select value={cart.paymentMethod} onChange={(event) => cart.setPaymentMethod(event.target.value)}>
                      <option value="Cash">Cash</option>
                      <option value="Transfer">Transfer</option>
                      <option value="QRIS">QRIS</option>
                      <option value="Ewallet">E-wallet</option>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Status Transaksi</Label>
                    <Select value={cart.status} onChange={(event) => cart.setStatus(event.target.value)}>
                      <option value="Berhasil">Berhasil</option>
                      <option value="Pending">Pending</option>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Jumlah Uang Dibayar</Label>
                    <CurrencyInput name="paidAmount" value={cart.paidAmount} onChange={cart.setPaidAmount} />
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Uang Kembalian</p>
                    <p className="text-lg font-bold text-slate-900 mt-0.5">{formatCurrency(change)}</p>
                  </div>
                  <span className="text-xs text-slate-400">Terhitung Otomatis</span>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-blue-500/10 bg-blue-500/[0.04] p-5">
                <div className="space-y-3">
                  <div className="flex justify-between text-sm text-slate-600">
                    <span>Subtotal</span>
                    <span className="font-medium">{formatCurrency(total)}</span>
                  </div>
                  <div className="border-t border-blue-500/10 pt-3 flex justify-between items-center">
                    <span className="text-base font-semibold text-slate-700">Grand Total</span>
                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
                <div className="mt-6">
                  <Button className="w-full h-11 text-base font-semibold bg-blue-600 hover:bg-blue-700" onClick={submit} disabled={isPending || !cart.lines.length}>
                    {isPending ? "Menyimpan Transaksi..." : "Simpan Transaksi"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>Riwayat Transaksi</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable columns={columns} data={transactions} searchPlaceholder="Cari transaksi..." serverPagination={pagination} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
