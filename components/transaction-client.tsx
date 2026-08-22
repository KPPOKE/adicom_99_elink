"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Edit, Eye, MoreHorizontal, Plus, Printer, Trash2, BriefcaseBusiness, Search, Minus, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useSyncExternalStore, useTransition, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PaymentFields } from "@/components/shared/payment-fields";
import { TransactionStatusBadge } from "@/components/shared/status-badge";
import { deleteTransaction, completePendingTransaction, createTransaction, updateTransaction } from "@/app/actions/operations";
import { formatCurrency, formatDateTime, cn } from "@/lib/utils";
import { filterFundAccountsByMethod } from "@/lib/payment-methods";

import { useCartStore } from "@/lib/store/useCartStore";
import { transactionSchema } from "@/lib/validators";

const emptySubscribe = () => () => {};

type ItemOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number; categoryName: string; gambar?: string | null };
type CustomerOption = { id: number; name: string; phone: string | null };
type TransactionRow = {
  id: number;
  kodeTransaksi: string;
  customerId?: number | null;
  customerName: string | null;
  diskon?: number;
  grandTotal: number;
  paymentMethod: string;
  paidAmount?: number;
  status: string;
  createdAt: string | Date;
  items: { itemId: number; qty: number; price: number; item: { namaBarang: string } }[];
  fundAccountId?: number | null;
  fundAccountName?: string | null;
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
  canEdit,
  pagination,
  todaySummary,
  fundAccounts = []
}: {
  items: ItemOption[];
  customers: CustomerOption[];
  transactions: TransactionRow[];
  role: "admin" | "staff";
  canDelete: boolean;
  canEdit: boolean;
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  todaySummary: TodaySummary;
  fundAccounts: { id: number; name: string; type: string }[];
}) {
  const router = useRouter();
  
  // Zustand State
  const cart = useCartStore();
  
  // Local state for UI only
  const [isPending, startTransition] = useTransition();
  const hydrated = useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Local state for the "Edit Transaksi" dialog (kept separate from the POS cart store
  // so editing an old sale never interferes with a sale currently being built)
  const [editingTx, setEditingTx] = useState<TransactionRow | null>(null);
  const [editLines, setEditLines] = useState<{ itemId: number; namaBarang: string; qty: number; price: number }[]>([]);
  const [editDiskon, setEditDiskon] = useState(0);
  const [editCustomerName, setEditCustomerName] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState<"Cash" | "Transfer" | "QRIS" | "Ewallet">("Cash");
  const [editPaidAmount, setEditPaidAmount] = useState(0);
  const [editFundAccountId, setEditFundAccountId] = useState<number | null>(null);
  const [editAddItemId, setEditAddItemId] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  // Local state for POS layout filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua Kategori");
  const [clickQty, setClickQty] = useState(1);
  const [txPeriod, setTxPeriod] = useState<"all" | "today" | "month" | "year" | "custom">("all");
  const [txCustomDate, setTxCustomDate] = useState("");

  const displayTransactions = useMemo(() => {
    if (txPeriod === "all") return transactions;
    const now = new Date();
    return transactions.filter((t) => {
      const d = new Date(t.createdAt);
      if (txPeriod === "today") return d.toDateString() === now.toDateString();
      if (txPeriod === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (txPeriod === "year") return d.getFullYear() === now.getFullYear();
      if (txPeriod === "custom" && txCustomDate) {
        const target = new Date(txCustomDate);
        return d.toDateString() === target.toDateString();
      }
      return true;
    });
  }, [transactions, txPeriod, txCustomDate]);

  // Clear cart on mount to start fresh
  useEffect(() => {
    cart.setLines([]);
    cart.setDiskon(0);
    cart.setPaidAmount(0);
    cart.setCustomer(null, "");
    cart.setCustomerName("");
    cart.setFundAccountId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter active accounts based on the selected payment method type
  const availableAccounts = useMemo(
    () => filterFundAccountsByMethod(fundAccounts ?? [], cart.paymentMethod),
    [fundAccounts, cart.paymentMethod]
  );

  // Auto-select first account when method changes
  useEffect(() => {
    if (availableAccounts.length > 0) {
      const currentIsValid = availableAccounts.some((acc) => acc.id === cart.fundAccountId);
      if (!currentIsValid) {
        cart.setFundAccountId(availableAccounts[0].id);
      }
    } else {
      cart.setFundAccountId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableAccounts, cart.fundAccountId]);

  const total = useMemo(() => cart.lines.reduce((sum, line) => sum + line.qty * line.price, 0), [cart.lines]);
  const grandTotal = Math.max(0, total - cart.diskon);
  const hasDigitalItem = cart.lines.some((line) => items.find((item) => item.id === line.itemId)?.categoryName === "Produk Digital");

  // Edit Transaksi dialog: totals and account options derived from local edit state
  const editTotal = useMemo(() => editLines.reduce((sum, line) => sum + line.qty * line.price, 0), [editLines]);
  const editGrandTotal = Math.max(0, editTotal - editDiskon);
  const editChange = editPaymentMethod === "Cash" ? Math.max(0, editPaidAmount - editGrandTotal) : 0;
  const editAvailableAccounts = useMemo(
    () => filterFundAccountsByMethod(fundAccounts, editPaymentMethod),
    [fundAccounts, editPaymentMethod]
  );
  // Falls back to the first account of the newly selected payment type once
  // editFundAccountId no longer matches it (e.g. user switches Cash -> Transfer),
  // without needing an effect to keep a separate piece of state in sync.
  const effectiveEditFundAccountId = editAvailableAccounts.some((acc) => acc.id === editFundAccountId)
    ? editFundAccountId
    : (editAvailableAccounts[0]?.id ?? null);
  // Items that can still be added: not already a line, and currently in stock
  const editPickableItems = useMemo(
    () => items.filter((item) => !editLines.some((line) => line.itemId === item.id)),
    [items, editLines]
  );

  function openEditTransaction(transaction: TransactionRow) {
    setEditingTx(transaction);
    setEditLines(transaction.items.map((line) => ({ itemId: line.itemId, namaBarang: line.item.namaBarang, qty: line.qty, price: line.price })));
    setEditDiskon(transaction.diskon ?? 0);
    setEditCustomerName(transaction.customerName ?? "");
    setEditPaymentMethod((transaction.paymentMethod as "Cash" | "Transfer" | "QRIS" | "Ewallet") ?? "Cash");
    setEditPaidAmount(transaction.paidAmount ?? transaction.grandTotal);
    setEditFundAccountId(transaction.fundAccountId ?? null);
    setEditAddItemId("");
  }

  function closeEditTransaction() {
    setEditingTx(null);
    setEditLines([]);
    setEditAddItemId("");
  }

  function updateEditLineQty(itemId: number, delta: number) {
    setEditLines((lines) => lines.map((line) => (line.itemId === itemId ? { ...line, qty: Math.max(1, line.qty + delta) } : line)));
  }

  function updateEditLinePrice(itemId: number, price: number) {
    setEditLines((lines) => lines.map((line) => (line.itemId === itemId ? { ...line, price } : line)));
  }

  function removeEditLine(itemId: number) {
    setEditLines((lines) => lines.filter((line) => line.itemId !== itemId));
  }

  function addEditLine(itemId: number) {
    const item = items.find((it) => it.id === itemId);
    if (!item) return;
    setEditLines((lines) => [...lines, { itemId: item.id, namaBarang: item.namaBarang, qty: 1, price: item.hargaJual }]);
    setEditAddItemId("");
  }

  function submitEditTransaction() {
    if (!editingTx) return;
    if (editLines.length === 0) {
      toast.error("Minimal satu item");
      return;
    }
    setEditSaving(true);
    startTransition(async () => {
      try {
        const payload = {
          customerId: editingTx.customerId ?? null,
          customerName: editCustomerName,
          diskon: editDiskon,
          paymentMethod: editPaymentMethod,
          paidAmount: editPaidAmount,
          fundAccountId: effectiveEditFundAccountId,
          items: editLines.map((line) => ({ itemId: line.itemId, qty: line.qty, price: line.price }))
        };
        const result = await updateTransaction(editingTx.id, payload);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
        toast.success("Transaksi berhasil diperbarui");
        closeEditTransaction();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal memperbarui transaksi");
      } finally {
        setEditSaving(false);
      }
    });
  }

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

  const columns: ColumnDef<TransactionRow>[] = [
    { accessorKey: "kodeTransaksi", header: "Kode" },
    { header: "Pelanggan", cell: ({ row }) => row.original.customerName || "Umum" },
    { header: "Item", cell: ({ row }) => row.original.items.map((item) => `${item.item.namaBarang} x${item.qty}`).join(", ") },
    { header: "Total", cell: ({ row }) => formatCurrency(row.original.grandTotal) },
    { header: "Pembayaran", cell: ({ row }) => `${row.original.paymentMethod === "Cash" ? "Tunai" : row.original.paymentMethod}${row.original.fundAccountName ? ` (${row.original.fundAccountName})` : ""}` },
    { header: "Status", cell: ({ row }) => <TransactionStatusBadge status={row.original.status} /> },
    { header: "Tanggal", cell: ({ row }) => formatDateTime(row.original.createdAt) },
    {
      id: "actions",
      header: () => <div className="text-center">Aksi</div>,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
      cell: ({ row }) => (
        <div className="flex w-full justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs" title="Menu Aksi">
                <MoreHorizontal className="h-4 w-4 text-slate-600" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5">
              <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-50">
                <Link href={`/transactions/${row.original.id}`}>
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span>Detail Transaksi</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-50">
                <Link href={`/transactions/${row.original.id}/invoice`}>
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Cetak Struk</span>
                </Link>
              </DropdownMenuItem>

              {canEdit && row.original.status !== "Batal" ? (
                <DropdownMenuItem onClick={() => openEditTransaction(row.original)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                  <Edit className="h-3.5 w-3.5 text-blue-600" />
                  <span>Edit Transaksi</span>
                </DropdownMenuItem>
              ) : null}

              {row.original.status === "Pending" ? (
                <ConfirmDialog
                  title="Selesaikan transaksi?"
                  description="Status transaksi menjadi berhasil dan pemasukan akan dibuat di keuangan."
                  confirmLabel="Selesaikan"
                  tone="success"
                  onConfirm={() =>
                    startTransition(async () => {
                      const result = await completePendingTransaction(row.original.id);
                      if (!result.success) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success("Transaksi diselesaikan");
                      router.refresh();
                    })
                  }
                  trigger={
                    <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Selesaikan Transaksi</span>
                    </DropdownMenuItem>
                  }
                />
              ) : null}

              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <ConfirmDialog
                    title="Hapus transaksi?"
                    description="Transaksi akan dihapus permanen. Stok barang akan otomatis dikembalikan."
                    confirmLabel="Hapus"
                    onConfirm={() =>
                      startTransition(async () => {
                        const result = await deleteTransaction(row.original.id);
                        if (!result.success) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("Transaksi dihapus");
                        router.refresh();
                      })
                    }
                    trigger={
                      <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        <span>Hapus Transaksi</span>
                      </DropdownMenuItem>
                    }
                  />
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
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
          fundAccountId: cart.fundAccountId,
          items: cart.lines.filter((line) => line.itemId)
        };

        const parsed = transactionSchema.safeParse(payload);
        if (!parsed.success) {
          throw new Error(parsed.error.issues[0].message);
        }

        const result = await createTransaction(parsed.data);
        if (!result.success) {
          toast.error(result.error);
          return;
        }
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

              <PaymentFields
                paymentMethod={cart.paymentMethod}
                onPaymentMethodChange={cart.setPaymentMethod}
                availableAccounts={availableAccounts}
                fundAccountId={cart.fundAccountId}
                onFundAccountIdChange={cart.setFundAccountId}
                paidAmount={cart.paidAmount}
                onPaidAmountChange={cart.setPaidAmount}
                grandTotal={grandTotal}
                totalsSlot={
                  <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.03] p-3.5 space-y-2">
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
                }
              />

              {/* Save button */}
              <Button 
                className="w-full h-11 text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/10" 
                onClick={submit} 
                disabled={isPending || !cart.lines.length}
              >
                {isPending ? "Menyimpan Transaksi..." : "Simpan Transaksi"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Transactions list card */}
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Riwayat Transaksi</CardTitle>
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {(
              [
                { id: "all", label: "Semua" },
                { id: "today", label: "Hari Ini (Harian)" },
                { id: "month", label: "Bulan Ini (Bulanan)" },
                { id: "year", label: "Tahun Ini (Tahunan)" }
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setTxPeriod(p.id);
                  setTxCustomDate("");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition duration-150",
                  txPeriod === p.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Per Tgl:</span>
              <Input
                type="date"
                value={txCustomDate}
                onChange={(e) => {
                  setTxCustomDate(e.target.value);
                  if (e.target.value) setTxPeriod("custom");
                  else setTxPeriod("all");
                }}
                className={cn(
                  "h-7 w-36 text-xs bg-white font-medium border-slate-300",
                  txPeriod === "custom" && "border-blue-600 ring-1 ring-blue-600 text-blue-700 font-bold"
                )}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={displayTransactions} searchPlaceholder="Cari transaksi..." serverPagination={pagination} />
        </CardContent>
      </Card>

      {/* Edit Transaksi dialog */}
      <Dialog open={editingTx !== null} onOpenChange={(open) => !open && closeEditTransaction()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Transaksi {editingTx?.kodeTransaksi}</DialogTitle>
            <p className="text-sm text-slate-500">Ubah item, harga, diskon, atau metode pembayaran. Stok dan catatan keuangan akan disesuaikan otomatis.</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Item Transaksi</Label>
              <div className="rounded-lg border border-slate-200 divide-y divide-slate-100">
                {editLines.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400">Belum ada item.</p>
                ) : (
                  editLines.map((line) => (
                    <div key={line.itemId} className="flex flex-wrap items-center gap-2 p-2.5">
                      <span className="flex-1 min-w-[120px] text-xs font-semibold text-slate-800">{line.namaBarang}</span>
                      <div className="flex items-center border border-slate-200 rounded-lg bg-white p-0.5">
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateEditLineQty(line.itemId, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-8 text-center text-xs font-bold">{line.qty}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateEditLineQty(line.itemId, 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <CurrencyInput
                        value={line.price}
                        onChange={(value) => updateEditLinePrice(line.itemId, value)}
                        className="h-8 w-32 text-xs"
                      />
                      <span className="w-24 text-right text-xs font-bold text-slate-900">{formatCurrency(line.qty * line.price)}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => removeEditLine(line.itemId)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
              {editPickableItems.length > 0 ? (
                <div className="flex gap-2">
                  <Select value={editAddItemId} onChange={(event) => setEditAddItemId(event.target.value)} className="h-9 text-xs">
                    <option value="">Tambah item...</option>
                    {editPickableItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.namaBarang} (stok {item.stok})
                      </option>
                    ))}
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!editAddItemId}
                    onClick={() => addEditLine(Number(editAddItemId))}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Tambah
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Nama Pelanggan</Label>
                <Input value={editCustomerName} onChange={(event) => setEditCustomerName(event.target.value)} placeholder="Opsional" className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Diskon</Label>
                <CurrencyInput value={editDiskon} onChange={setEditDiskon} className="h-9 text-xs" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Metode Pembayaran</Label>
                <Select
                  value={editPaymentMethod}
                  onChange={(event) => setEditPaymentMethod(event.target.value as "Cash" | "Transfer" | "QRIS" | "Ewallet")}
                  className="h-9 text-xs"
                >
                  <option value="Cash">Tunai</option>
                  <option value="Transfer">Transfer</option>
                  <option value="QRIS">QRIS</option>
                  <option value="Ewallet">Ewallet</option>
                </Select>
              </div>
              {editAvailableAccounts.length > 0 ? (
                <div className="space-y-1">
                  <Label className="text-xs font-bold text-slate-600">Akun / Sumber Dana</Label>
                  <Select
                    value={effectiveEditFundAccountId ?? ""}
                    onChange={(event) => setEditFundAccountId(Number(event.target.value) || null)}
                    className="h-9 text-xs"
                  >
                    {editAvailableAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="rounded-xl border border-blue-500/10 bg-blue-500/[0.03] p-3.5 space-y-2">
              <div className="flex justify-between text-xs text-slate-500 font-bold">
                <span>SUBTOTAL</span>
                <span className="text-slate-800 font-extrabold">{formatCurrency(editTotal)}</span>
              </div>
              <div className="border-t border-blue-500/10 pt-2 flex justify-between items-center">
                <span className="text-sm font-extrabold text-slate-700">TOTAL</span>
                <span className="text-xl font-black text-blue-600">{formatCurrency(editGrandTotal)}</span>
              </div>
            </div>

            {editPaymentMethod === "Cash" ? (
              <div className="space-y-1">
                <Label className="text-xs font-bold text-slate-600">Jumlah Uang Dibayar</Label>
                <CurrencyInput value={editPaidAmount} onChange={setEditPaidAmount} className="h-9 text-xs" />
                <p className="text-[10px] text-slate-500">Kembalian: {formatCurrency(editChange)}</p>
              </div>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={closeEditTransaction}>
                Batal
              </Button>
              <Button type="button" onClick={submitEditTransaction} disabled={isPending || editSaving}>
                {isPending || editSaving ? "Menyimpan..." : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
