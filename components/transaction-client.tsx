"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Eye, Plus, Printer, Trash2, BriefcaseBusiness, Search, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore, useTransition, useState } from "react";
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

  // Local state for POS layout filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [clickQty, setClickQty] = useState(1);

  // Clear cart on mount to start fresh
  useEffect(() => {
    cart.setLines([]);
    cart.setDiskon(0);
    cart.setPaidAmount(0);
    cart.setCustomer(null, "");
    cart.setCustomerName("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = useMemo(() => cart.lines.reduce((sum, line) => sum + line.qty * line.price, 0), [cart.lines]);
  const grandTotal = Math.max(0, total - cart.diskon);
  const change = cart.paymentMethod === "Cash" ? Math.max(0, cart.paidAmount - grandTotal) : 0;
  const hasDigitalItem = cart.lines.some((line) => items.find((item) => item.id === line.itemId)?.categoryName === "Produk Digital");

  // Unique categories list
  const categories = useMemo(() => {
    const cats = new Set(items.map((item) => item.categoryName));
    return ["Semua Kategori", ...Array.from(cats)];
  }, [items]);

  // Filtered items based on search and category
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchSearch =
        item.namaBarang.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.kodeBarang.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory =
        selectedCategory === "Semua Kategori" ||
        item.categoryName === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Suggest paid amounts for cash suggestions
  const cashSuggestions = useMemo(() => {
    if (grandTotal <= 0) return [];
    const suggestions = new Set<number>();
    suggestions.add(grandTotal); // Pas

    const denominations = [5000, 10000, 20000, 50000, 100000];
    for (const note of denominations) {
      if (note > grandTotal) {
        suggestions.add(note);
      }
      const nextMultiple = Math.ceil(grandTotal / note) * note;
      if (nextMultiple > grandTotal && nextMultiple <= grandTotal + 100000) {
        suggestions.add(nextMultiple);
      }
    }
    return Array.from(suggestions).sort((a, b) => a - b).slice(0, 4);
  }, [grandTotal]);

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

  function addProductToCart(item: ItemOption) {
    const qtyToAdd = clickQty > 0 ? clickQty : 1;
    
    // Check if adding this exceeds available stock
    const existingLine = cart.lines.find((line) => line.itemId === item.id);
    const existingQty = existingLine ? existingLine.qty : 0;
    
    if (existingQty + qtyToAdd > item.stok) {
      toast.error(`Stok tidak mencukupi! Tersedia: ${item.stok}, sudah di keranjang: ${existingQty}`);
      return;
    }

    cart.setLines((current) => {
      const cleaned = current.filter((line) => line.itemId !== 0);
      const idx = cleaned.findIndex((line) => line.itemId === item.id);
      if (idx > -1) {
        return cleaned.map((line, i) =>
          i === idx ? { ...line, qty: line.qty + qtyToAdd } : line
        );
      } else {
        return [...cleaned, { itemId: item.id, qty: qtyToAdd, price: item.hargaJual }];
      }
    });
    toast.success(`${item.namaBarang} ditambahkan ke keranjang`);
  }

  function updateLineQty(index: number, change: number) {
    const line = cart.lines[index];
    if (!line) return;
    const item = items.find((it) => it.id === line.itemId);
    if (!item) return;

    const newQty = line.qty + change;
    if (newQty <= 0) {
      removeLine(index);
      return;
    }

    if (newQty > item.stok) {
      toast.error(`Stok tidak mencukupi! Tersedia: ${item.stok}`);
      return;
    }

    cart.updateLine(index, { qty: newQty });
  }

  function removeLine(index: number) {
    cart.setLines((current) => current.filter((_, i) => i !== index));
  }

  function clearCart() {
    cart.setLines([]);
    cart.setDiskon(0);
    cart.setPaidAmount(0);
    cart.setCustomer(null, "");
    cart.setCustomerName("");
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && filteredItems.length === 1) {
      addProductToCart(filteredItems[0]);
      setSearchQuery("");
      e.preventDefault();
    }
  };

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
        clearCart();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Transaksi gagal");
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Sales summary stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <SummaryCard label="Omset Sales" value={todaySummary.totalSales} helper="Penjualan Berhasil Hari Ini" icon={<BriefcaseBusiness className="h-4 w-4" />} className="bg-[#1d4ed8] text-white border-transparent" />
        <SummaryCard label="Sukses" value={todaySummary.countSuccess} helper="Transaksi Berhasil" icon={<CheckCircle2 className="h-4 w-4" />} className="bg-[#166534] text-white border-transparent" isCount />
      </div>

      {/* POS split layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Catalog Grid */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          <Card className="w-full shadow-sm border-slate-200">
            <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold">Katalog Produk</CardTitle>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCart} 
                className="text-red-500 hover:text-red-600 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                Bersihkan
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filter controls */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Cari nama/kode (tekan Enter jika 1 hasil untuk input cepat)..."
                    className="pl-9 h-10 border-slate-200 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Qty:</span>
                    <Input
                      type="number"
                      min={1}
                      value={clickQty}
                      onChange={(e) => setClickQty(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 h-10 text-center border-slate-200"
                    />
                  </div>
                  <Select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-40 sm:w-48 h-10 border-slate-200"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Grid Area */}
              <div className="overflow-y-auto max-h-[580px] pr-1 scrollbar-thin">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                    <Search className="h-12 w-12 mb-3 opacity-30" />
                    <p className="text-sm font-medium">Tidak ada barang yang cocok</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {filteredItems.map((item) => {
                      const inCartQty = cart.lines.find((line) => line.itemId === item.id)?.qty ?? 0;
                      const isLowStock = item.stok <= 3;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => addProductToCart(item)}
                          className={cn(
                            "group relative flex flex-col rounded-xl border bg-white text-left shadow-sm transition-all hover:shadow-md hover:border-blue-400 active:scale-95",
                            inCartQty > 0 ? "border-blue-500 ring-1 ring-blue-100" : "border-slate-200"
                          )}
                        >
                          {/* Image area */}
                          <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-slate-50 border-b border-slate-100">
                            {item.gambar ? (
                              <img
                                src={item.gambar}
                                alt={item.namaBarang}
                                className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-slate-100">
                                <span className="text-3xl font-extrabold text-slate-300">{item.namaBarang[0]}</span>
                              </div>
                            )}
                            {/* Stock badge */}
                            <span className={cn(
                              "absolute top-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm",
                              isLowStock
                                ? "bg-red-500 text-white"
                                : "bg-white/90 text-slate-700 border border-slate-200"
                            )}>
                              Stok: {item.stok}
                            </span>
                            {/* Quantity inside cart badge */}
                            {inCartQty > 0 && (
                              <span className="absolute top-2 left-2 bg-blue-600 text-white rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold shadow">
                                {inCartQty}
                              </span>
                            )}
                          </div>
                          {/* Details area */}
                          <div className="p-3 flex-1 flex flex-col justify-between">
                            <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                              {item.namaBarang}
                            </h4>
                            <div className="mt-2 flex items-center justify-between">
                              <span className="text-xs font-extrabold text-blue-600">
                                {formatCurrency(item.hargaJual)}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium truncate max-w-[60px]">
                                {item.categoryName}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Checkout cart details */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
          {/* Keranjang Card */}
          <Card className="w-full shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Keranjang</span>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">
                  {cart.lines.length} Items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-y-auto max-h-[300px] divide-y divide-slate-100">
                {cart.lines.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-slate-400">
                    <BriefcaseBusiness className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-xs font-medium text-center">Pilih produk untuk memulai.</p>
                  </div>
                ) : (
                  cart.lines.map((line, index) => {
                    const item = items.find((it) => it.id === line.itemId);
                    if (!item) return null;
                    return (
                      <div key={index} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50/50 transition">
                        <div className="min-w-0 flex-1">
                          <h5 className="text-xs font-bold text-slate-800 truncate">{item.namaBarang}</h5>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {formatCurrency(line.price)} x {line.qty}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Qty increment/decrement controls */}
                          <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-500 hover:bg-slate-100"
                              onClick={() => updateLineQty(index, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center text-xs font-bold text-slate-800">
                              {line.qty}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-slate-500 hover:bg-slate-100"
                              onClick={() => updateLineQty(index, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          {/* Line subtotal */}
                          <span className="text-xs font-bold text-slate-900 min-w-[70px] text-right">
                            {formatCurrency(line.qty * line.price)}
                          </span>
                          {/* Delete item button */}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => removeLine(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Kalkulator Kasir Card */}
          <Card className="w-full shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold">Kalkulator Kasir</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Customer selection */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Pelanggan</Label>
                  <Select
                    name="customerId"
                    disabled={!hydrated}
                    value={cart.customerId ?? ""}
                    onInput={(event) => {
                      const id = Number(event.currentTarget.value) || null;
                      const name = id ? event.currentTarget.selectedOptions[0]?.text ?? "" : "";
                      cart.setCustomer(id, name);
                    }}
                    className="h-9 text-xs"
                  >
                    <option value="">Umum</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Nama Manual</Label>
                  <Input 
                    name="customerName" 
                    value={cart.customerName} 
                    onChange={(event) => cart.setCustomerName(event.target.value)} 
                    placeholder="Opsional" 
                    className="h-9 text-xs"
                  />
                </div>
              </div>

              {/* Digital specific fields if any digital item present */}
              {hasDigitalItem && (
                <div className="rounded-xl border border-cyan-200 bg-cyan-50/50 p-3.5 space-y-3">
                  <p className="text-[10px] font-bold text-cyan-800 uppercase tracking-wider">Produk Digital Info</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-bold text-cyan-900">Nomor Tujuan</Label>
                      <Input value={cart.nomorTujuan} onChange={(e) => cart.setDigitalFields({ nomorTujuan: e.target.value })} placeholder="08xxxxxxxxxx" className="h-8 text-xs bg-white" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-bold text-cyan-900">Provider</Label>
                      <Input value={cart.provider} onChange={(e) => cart.setDigitalFields({ provider: e.target.value })} placeholder="Telkomsel, PLN, dll" className="h-8 text-xs bg-white" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-bold text-cyan-900">Jenis Produk</Label>
                      <Input value={cart.jenisProduk} onChange={(e) => cart.setDigitalFields({ jenisProduk: e.target.value })} placeholder="Pulsa, token, dll" className="h-8 text-xs bg-white" />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-bold text-cyan-900">Status Digital</Label>
                      <Select value={cart.digitalStatus} onChange={(e) => cart.setDigitalFields({ digitalStatus: e.target.value })} className="h-8 text-xs bg-white">
                        <option value="Berhasil">Berhasil</option>
                        <option value="Pending">Pending</option>
                        <option value="Gagal">Gagal</option>
                      </Select>
                    </div>
                    <div className="space-y-0.5 sm:col-span-2">
                      <Label className="text-[10px] font-bold text-cyan-900">Serial Number / Token</Label>
                      <Input value={cart.serialNumber} onChange={(e) => cart.setDigitalFields({ serialNumber: e.target.value })} className="h-8 text-xs bg-white" />
                    </div>
                  </div>
                </div>
              )}

              {/* Discount and Payment controls */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Diskon Tambahan (Manual)</Label>
                  <CurrencyInput name="diskon" value={cart.diskon} onChange={cart.setDiskon} className="h-9 text-xs" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Status Transaksi</Label>
                  <Select value={cart.status} onChange={(event) => cart.setStatus(event.target.value)} className="h-9 text-xs">
                    <option value="Berhasil">Berhasil</option>
                    <option value="Pending">Pending</option>
                  </Select>
                </div>
              </div>

              {/* Premium Payment Method tab style buttons */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-600">Metode Pembayaran</Label>
                <div className="grid grid-cols-4 gap-2">
                  {["Cash", "Transfer", "QRIS", "Ewallet"].map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => cart.setPaymentMethod(method)}
                      className={cn(
                        "py-2 text-[10px] sm:text-xs font-bold rounded-lg border transition-all duration-150 active:scale-95",
                        cart.paymentMethod === method
                          ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      )}
                    >
                      {method === "Cash" ? "Tunai" : method}
                    </button>
                  ))}
                </div>
              </div>

              {/* Paid amount & quick suggestions */}
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Jumlah Uang Dibayar</Label>
                <CurrencyInput name="paidAmount" value={cart.paidAmount} onChange={cart.setPaidAmount} className="h-9 text-xs" />
                
                {/* Cash suggestions */}
                {cart.paymentMethod === "Cash" && cashSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {cashSuggestions.map((amount) => (
                      <button
                        key={amount}
                        type="button"
                        onClick={() => cart.setPaidAmount(amount)}
                        className="px-2 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-slate-700 font-bold transition duration-150 active:scale-95"
                      >
                        {amount === grandTotal ? "Pas" : formatCurrency(amount)}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Automatic Change Display */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 flex justify-between items-center">
                <div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Uang Kembalian</p>
                  <p className={cn(
                    "text-base font-extrabold mt-0.5",
                    change > 0 ? "text-green-600" : "text-slate-800"
                  )}>
                    {formatCurrency(change)}
                  </p>
                </div>
                <span className="text-[9px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded font-bold uppercase">
                  Otomatis
                </span>
              </div>

              {/* Totals panel & Save button */}
              <div className="rounded-2xl border border-blue-500/10 bg-blue-500/[0.03] p-4 space-y-3.5">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500 font-bold">
                    <span>SUBTOTAL</span>
                    <span className="text-slate-800 font-extrabold">{formatCurrency(total)}</span>
                  </div>
                  {cart.diskon > 0 && (
                    <div className="flex justify-between text-xs text-red-500 font-bold">
                      <span>DISKON</span>
                      <span>-{formatCurrency(cart.diskon)}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-500/10 pt-2 flex justify-between items-center">
                    <span className="text-sm font-extrabold text-slate-700">TOTAL</span>
                    <span className="text-xl font-black text-blue-600">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/10" 
                  onClick={submit} 
                  disabled={isPending || !cart.lines.length}
                >
                  {isPending ? "Menyimpan Transaksi..." : "Simpan Transaksi"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions list card */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Riwayat Transaksi</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={transactions} searchPlaceholder="Cari transaksi..." serverPagination={pagination} />
        </CardContent>
      </Card>
    </div>
  );
}
