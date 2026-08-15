"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ChevronDown, CreditCard, Edit, Eye, MessageSquare, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/shared/status-badge";
import { deleteService, markServicePaid, updateServiceStatus, upsertService } from "@/app/actions/operations";
import { cn, formatCurrency, formatDate, formatWhatsAppPhone, formatWhatsAppServiceReceipt } from "@/lib/utils";

import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { serviceSchema, type ServiceFormValues } from "@/lib/validators";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const statuses = ["Masuk", "Dicek", "Menunggu_Konfirmasi", "Diproses", "Selesai", "Diambil", "Batal"];

type ServiceRow = {
  id: number;
  kodeService: string;
  customerId: number | null;
  customerName: string;
  customerPhone: string | null;
  deviceType: string;
  deviceBrand: string | null;
  deviceModel: string | null;
  problemDescription: string;
  diagnosis: string | null;
  estimatedCost: number;
  laborCost: number;
  finalCost: number;
  status: ServiceFormValues["status"];
  paymentStatus: string;
  paidAt: string | Date | null;
  technicianNote: string | null;
  receivedDate: string | Date;
  createdAt?: string | Date;
  parts: { id: number; itemId: number; qty: number; price: number; subtotal: number }[];
};

type SparePartOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number; categoryName?: string; satuan?: string };

export function ServiceClient({
  services,
  customers,
  items,
  pagination,
  filterValues
}: {
  services: ServiceRow[];
  customers: { id: number; name: string; phone: string | null }[];
  items: SparePartOption[];
  role?: "admin" | "staff";
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { status: string; payment: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const [servicePeriod, setServicePeriod] = useState<"all" | "today" | "month" | "year" | "custom">("all");
  const [serviceCustomDate, setServiceCustomDate] = useState("");

  const displayServices = useMemo(() => {
    if (servicePeriod === "all") return services;
    const now = new Date();
    return services.filter((s) => {
      const d = new Date(s.receivedDate);
      if (servicePeriod === "today") return d.toDateString() === now.toDateString();
      if (servicePeriod === "month") return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (servicePeriod === "year") return d.getFullYear() === now.getFullYear();
      if (servicePeriod === "custom" && serviceCustomDate) {
        const target = new Date(serviceCustomDate);
        return d.toDateString() === target.toDateString();
      }
      return true;
    });
  }, [services, servicePeriod, serviceCustomDate]);

  const form = useForm({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      customerId: 0,
      customerName: "",
      customerPhone: "",
      deviceType: "",
      deviceBrand: "",
      deviceModel: "",
      problemDescription: "",
      diagnosis: "",
      estimatedCost: 0,
      laborCost: 0,
      status: "Masuk",
      technicianNote: "",
      parts: []
    }
  });
  const { fields: partFields, append: appendPart, remove: removePart } = useFieldArray({ control: form.control, name: "parts" });
  const watchedParts = form.watch("parts") ?? [];
  const laborCost = form.watch("laborCost") || 0;
  const partsTotal = watchedParts.reduce((sum, part) => sum + (Number(part.qty) || 0) * (Number(part.price) || 0), 0);
  const costLocked = false;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setEditing(null);
      form.reset({
        customerId: 0,
        customerName: "",
        customerPhone: "",
        deviceType: "",
        deviceBrand: "",
        deviceModel: "",
        problemDescription: "",
        diagnosis: "",
        estimatedCost: 0,
        laborCost: 0,
        status: "Masuk",
        technicianNote: "",
        parts: []
      });
    }
    setOpen(newOpen);
  };

  const handleEdit = (service: ServiceRow) => {
    setEditing(service);
    form.reset({
      id: service.id,
      customerId: service.customerId ?? 0,
      customerName: service.customerName,
      customerPhone: service.customerPhone ?? "",
      deviceType: service.deviceType,
      deviceBrand: service.deviceBrand ?? "",
      deviceModel: service.deviceModel ?? "",
      problemDescription: service.problemDescription,
      diagnosis: service.diagnosis ?? "",
      estimatedCost: service.estimatedCost,
      laborCost: service.laborCost,
      status: service.status,
      technicianNote: service.technicianNote ?? "",
      parts: service.parts.map((part) => ({ itemId: part.itemId, qty: part.qty, price: part.price }))
    });
    setOpen(true);
  };

  const onSubmit = (values: ServiceFormValues) => {
    startTransition(async () => {
      try {
        const formData = new FormData();
        if (values.id) formData.append("id", String(values.id));
        if (values.customerId) formData.append("customerId", String(values.customerId));
        formData.append("customerName", values.customerName);
        formData.append("customerPhone", values.customerPhone ?? "");
        formData.append("deviceType", values.deviceType);
        formData.append("deviceBrand", values.deviceBrand ?? "");
        formData.append("deviceModel", values.deviceModel ?? "");
        formData.append("problemDescription", values.problemDescription);
        formData.append("diagnosis", values.diagnosis ?? "");
        formData.append("estimatedCost", String(values.estimatedCost));
        formData.append("laborCost", String(values.laborCost));
        formData.append("status", values.status);
        formData.append("technicianNote", values.technicianNote ?? "");
        formData.append("parts", JSON.stringify(values.parts));
        
        await upsertService(formData);
        toast.success("Service disimpan");
        handleOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan service");
      }
    });
  };

  const columns: ColumnDef<ServiceRow>[] = [
    { accessorKey: "kodeService", header: "Kode", cell: ({ row }) => <span className="font-semibold text-slate-800 whitespace-nowrap text-xs">{row.original.kodeService}</span> },
    {
      header: "Customer",
      cell: ({ row }) => (
        <div className="max-w-[130px] truncate">
          <p className="font-medium text-slate-900 truncate text-xs">{row.original.customerName}</p>
          <p className="text-[11px] text-slate-500 truncate">{row.original.customerPhone || "-"}</p>
        </div>
      )
    },
    {
      header: "Perangkat",
      cell: ({ row }) => (
        <div className="max-w-[130px] truncate text-xs" title={`${row.original.deviceType} ${row.original.deviceBrand ?? ""} ${row.original.deviceModel ?? ""}`}>
          {`${row.original.deviceType} ${row.original.deviceBrand ?? ""} ${row.original.deviceModel ?? ""}`}
        </div>
      )
    },
    { id: "status", header: () => <div className="text-center">Status</div>, meta: { headerClassName: "text-center", cellClassName: "text-center" }, cell: ({ row }) => <div className="flex w-full justify-center"><ServiceStatusBadge status={row.original.status} /></div> },
    { id: "paymentStatus", header: () => <div className="text-center">Pembayaran</div>, meta: { headerClassName: "text-center", cellClassName: "text-center" }, cell: ({ row }) => <div className="flex w-full justify-center"><PaymentStatusBadge status={row.original.paymentStatus} /></div> },
    { header: "Biaya", cell: ({ row }) => <span className="whitespace-nowrap font-medium text-xs">{formatCurrency(row.original.finalCost || row.original.estimatedCost)}</span> },
    { header: "Masuk", cell: ({ row }) => <span className="whitespace-nowrap text-xs">{formatDate(row.original.receivedDate)}</span> },
    {
      id: "quick",
      header: "Update Cepat",
      cell: ({ row }) => (
        <Select
          className="w-[130px] h-8 text-xs py-1 px-2 font-medium bg-white border-slate-300 shadow-xs"
          value={row.original.status}
          onChange={(event) =>
            startTransition(async () => {
              try {
                await updateServiceStatus(row.original.id, event.target.value);
                toast.success("Status service diperbarui");
                router.refresh();
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Gagal memperbarui status");
              }
            })
          }
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {status.replace("_", " ")}
            </option>
          ))}
        </Select>
      )
    },
    {
      id: "actions",
      header: () => <div className="text-right">Aksi</div>,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs">
                Aksi
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5">
              <DropdownMenuItem onClick={() => handleEdit(row.original)} className="text-blue-600 focus:text-blue-700 focus:bg-blue-50">
                <Edit className="h-3.5 w-3.5 text-blue-600" />
                <span>Edit Service</span>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-50">
                <Link href={`/services/${row.original.id}`}>
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  <span>Detail Service</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-50">
                <Link href={`/services/${row.original.id}/invoice`}>
                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                  <span>Cetak Invoice</span>
                </Link>
              </DropdownMenuItem>

              {row.original.customerPhone ? (
                <DropdownMenuItem asChild className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                  <a
                    href={`https://api.whatsapp.com/send?phone=${formatWhatsAppPhone(row.original.customerPhone)}&text=${encodeURIComponent(
                      formatWhatsAppServiceReceipt({
                        kodeService: row.original.kodeService,
                        receivedDate: row.original.receivedDate,
                        customerName: row.original.customerName,
                        customerPhone: row.original.customerPhone,
                        deviceType: row.original.deviceType,
                        deviceBrand: row.original.deviceBrand,
                        deviceModel: row.original.deviceModel,
                        problemDescription: row.original.problemDescription,
                        diagnosis: row.original.diagnosis,
                        technicianNote: row.original.technicianNote,
                        status: row.original.status,
                        paymentStatus: row.original.paymentStatus,
                        estimatedCost: row.original.estimatedCost,
                        laborCost: row.original.laborCost,
                        finalCost: row.original.finalCost
                      })
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Bagikan via WA</span>
                  </a>
                </DropdownMenuItem>
              ) : null}

              {row.original.paymentStatus !== "paid" ? (
                <ConfirmDialog
                  title="Tandai service lunas?"
                  description="Pemasukan service akan dibuat di catatan keuangan."
                  confirmLabel="Tandai Lunas"
                  onConfirm={() =>
                    startTransition(async () => {
                      try {
                        await markServicePaid(row.original.id);
                        toast.success("Service ditandai lunas");
                        router.refresh();
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Gagal memproses pembayaran");
                      }
                    })
                  }
                  trigger={
                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-emerald-600 focus:text-emerald-700 focus:bg-emerald-50">
                      <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Tandai Lunas</span>
                    </DropdownMenuItem>
                  }
                />
              ) : null}

              <DropdownMenuSeparator />

              <ConfirmDialog
                title="Hapus service ini?"
                description={`Service ${row.original.kodeService} milik ${row.original.customerName} akan dihapus secara permanen.`}
                confirmLabel="Hapus Service"
                onConfirm={() =>
                  startTransition(async () => {
                    try {
                      await deleteService(row.original.id);
                      toast.success("Service dihapus");
                      router.refresh();
                    } catch (error) {
                      toast.error(error instanceof Error ? error.message : "Gagal menghapus service");
                    }
                  })
                }
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                    <span>Hapus Service</span>
                  </DropdownMenuItem>
                }
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-[240px] text-xs font-bold"
            defaultValue=""
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                window.open(val, "_blank");
                e.target.value = "";
              }
            }}
          >
            <option value="" disabled>📄 Unduh Laporan Service...</option>
            <optgroup label="Laporan Harian (Hari Ini)">
              <option value="/reports/export?kind=service&period=today&format=pdf">PDF Harian</option>
              <option value="/reports/export?kind=service&period=today&format=xlsx">Excel Harian</option>
            </optgroup>
            <optgroup label="Laporan Mingguan (Minggu Ini)">
              <option value="/reports/export?kind=service&period=week&format=pdf">PDF Mingguan</option>
              <option value="/reports/export?kind=service&period=week&format=xlsx">Excel Mingguan</option>
            </optgroup>
            <optgroup label="Laporan Bulanan (Bulan Ini)">
              <option value="/reports/export?kind=service&period=month&format=pdf">PDF Bulanan</option>
              <option value="/reports/export?kind=service&period=month&format=xlsx">Excel Bulanan</option>
            </optgroup>
            <optgroup label="Laporan Tahunan (Tahun Ini)">
              <option value="/reports/export?kind=service&period=year&format=pdf">PDF Tahunan</option>
              <option value="/reports/export?kind=service&period=year&format=xlsx">Excel Tahunan</option>
            </optgroup>
          </Select>

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
                  setServicePeriod(p.id);
                  setServiceCustomDate("");
                }}
                className={cn(
                  "px-3 py-1 text-xs font-bold rounded-md transition duration-150",
                  servicePeriod === p.id ? "bg-white text-blue-600 shadow-sm" : "text-slate-600 hover:text-slate-900"
                )}
              >
                {p.label}
              </button>
            ))}
            <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase">Per Tgl:</span>
              <Input
                type="date"
                value={serviceCustomDate}
                onChange={(e) => {
                  setServiceCustomDate(e.target.value);
                  if (e.target.value) setServicePeriod("custom");
                  else setServicePeriod("all");
                }}
                className={cn(
                  "h-7 w-36 text-xs bg-white font-medium border-slate-300",
                  servicePeriod === "custom" && "border-blue-600 ring-1 ring-blue-600 text-blue-700 font-bold"
                )}
              />
            </div>
          </div>
        </div>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenChange(true)}>
              <Plus className="h-4 w-4" />
              Service Masuk
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Service" : "Input Service Masuk"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pelanggan Terdaftar</FormLabel>
                      <Select name="customerId"
                        onChange={(event) => {
                          field.onChange(Number(event.target.value) || undefined);
                          const customer = customers.find((item) => item.id === Number(event.target.value));
                          if (customer) {
                            form.setValue("customerName", customer.name);
                            form.setValue("customerPhone", customer.phone ?? "");
                          }
                        }}
                        value={String(field.value || "")}
                      >
                        <option value="">Customer baru/manual</option>
                        {customers.map((customer) => (
                          <option key={customer.id} value={customer.id}>
                            {customer.name}
                          </option>
                        ))}
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama Customer</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Budi" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="customerPhone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No. HP</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: 08123456789" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jenis Perangkat</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Laptop, HP, Printer" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceBrand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: Asus" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="deviceModel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Model</FormLabel>
                      <FormControl>
                        <Input placeholder="cth: ROG Strix" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimasi Biaya</FormLabel>
                      <FormControl>
                        <CurrencyInput name="estimatedCost" value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="laborCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Biaya Jasa</FormLabel>
                      <div className="space-y-1.5">
                        <Select
                          onChange={(e) => {
                            const selectedId = Number(e.target.value);
                            const found = items.find((item) => item.id === selectedId);
                            if (found) {
                              field.onChange(found.hargaJual);
                            }
                          }}
                          defaultValue=""
                        >
                          <option value="">-- Pilih Jenis Jasa (Master Data) --</option>
                          {(() => {
                            const jasaOptions = items.filter(
                              (item) =>
                                item.categoryName?.trim().toLowerCase() === "jasa" ||
                                item.kodeBarang?.toUpperCase().startsWith("JSA-") ||
                                item.satuan?.toLowerCase() === "jasa"
                            );
                            const listToRender = jasaOptions.length > 0 ? jasaOptions : items;
                            return listToRender.map((jasa) => (
                              <option key={jasa.id} value={jasa.id}>
                                {jasa.namaBarang} - {formatCurrency(jasa.hargaJual)}
                              </option>
                            ));
                          })()}
                        </Select>
                        <FormControl>
                          <CurrencyInput name="laborCost" value={field.value} onChange={field.onChange} disabled={costLocked} />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <section className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">Inventori Sparepart</h3>
                      <p className="text-xs text-slate-500">Barang dicadangkan sampai service mulai diproses.</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={costLocked || !items.some((item) => item.stok > 0)}
                      onClick={() => {
                        const item = items.find((option) => option.stok > 0);
                        if (item) appendPart({ itemId: item.id, qty: 1, price: item.hargaJual });
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Tambah
                    </Button>
                  </div>
                  {partFields.length === 0 ? (
                    <p className="rounded-md border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">Belum ada sparepart.</p>
                  ) : (
                    <div className="space-y-3">
                      {partFields.map((partField, index) => {
                        const value = watchedParts[index];
                        return (
                          <div key={partField.id} className="grid gap-2 rounded-md border border-slate-200 p-3 sm:grid-cols-[minmax(180px,1fr)_90px_160px_140px_36px] sm:items-end">
                            <FormField
                              control={form.control}
                              name={`parts.${index}.itemId`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Barang</FormLabel>
                                  <Select
                                    name="partItemId"
                                    value={String(field.value || "")}
                                    disabled={costLocked}
                                    onChange={(event) => {
                                      const itemId = Number(event.target.value);
                                      const item = items.find((option) => option.id === itemId);
                                      field.onChange(itemId);
                                      form.setValue(`parts.${index}.price`, item?.hargaJual ?? 0);
                                    }}
                                  >
                                    {items.map((item) => (
                                      <option key={item.id} value={item.id} disabled={item.stok <= 0 && item.id !== field.value}>
                                        {item.namaBarang} ({item.stok} tersedia)
                                      </option>
                                    ))}
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`parts.${index}.qty`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Qty</FormLabel>
                                  <FormControl><CurrencyInput name="partQty" prefix="" decimalScale={0} value={field.value} onChange={field.onChange} disabled={costLocked} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name={`parts.${index}.price`}
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Harga</FormLabel>
                                  <FormControl><CurrencyInput name="partPrice" value={field.value} onChange={field.onChange} disabled={costLocked} /></FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <div className="pb-2">
                              <p className="text-xs text-slate-500">Subtotal</p>
                              <p className="mt-1 text-sm font-medium text-slate-800">{formatCurrency((Number(value?.qty) || 0) * (Number(value?.price) || 0))}</p>
                            </div>
                            <Button type="button" variant="outline" size="icon" disabled={costLocked} onClick={() => removePart(index)} title="Hapus sparepart">
                              <Trash2 className="h-4 w-4 text-red-300" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-slate-500">Sparepart: {formatCurrency(partsTotal)} | Jasa: {formatCurrency(Number(laborCost))}</span>
                    <strong className="text-base text-blue-600">Biaya Final: {formatCurrency(partsTotal + Number(laborCost))}</strong>
                  </div>
                </section>

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select name="status" onChange={(e) => field.onChange(e.target.value)} value={field.value}>
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="problemDescription"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Keluhan</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Keluhan..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Diagnosa</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Hasil diagnosa teknisi..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="technicianNote"
                  render={({ field }) => (
                    <FormItem className="sm:col-span-2">
                      <FormLabel>Catatan Teknisi</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Catatan internal teknisi..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="sm:col-span-2" disabled={isPending}>
                  {isPending ? "Menyimpan..." : "Simpan Service"}
                </Button>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable
        tableClassName="w-full text-xs"
        columns={columns}
        data={displayServices}
        serverPagination={pagination}
        searchPlaceholder="Cari kode service, pelanggan, nomor HP..."
        filters={
          <>
            <Select name="status" defaultValue={filterValues.status} className="w-[180px]">
              <option value="">Semua status</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </Select>
            <Select name="payment" defaultValue={filterValues.payment} className="w-[170px]">
              <option value="">Semua pembayaran</option>
              <option value="unpaid">Belum dibayar</option>
              <option value="paid">Lunas</option>
            </Select>
          </>
        }
      />
    </>
  );
}


