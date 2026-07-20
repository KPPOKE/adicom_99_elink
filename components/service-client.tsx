"use client";

import { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Edit, Eye, Plus, Printer, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CurrencyInput } from "@/components/ui/currency-input";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { PaymentStatusBadge, ServiceStatusBadge } from "@/components/shared/status-badge";
import { deleteService, markServicePaid, updateServiceStatus, upsertService } from "@/app/actions/operations";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  parts: { id: number; itemId: number; qty: number; price: number; subtotal: number }[];
};

type SparePartOption = { id: number; namaBarang: string; kodeBarang: string; hargaJual: number; stok: number };

export function ServiceClient({
  services,
  customers,
  items,
  role,
  pagination,
  filterValues
}: {
  services: ServiceRow[];
  customers: { id: number; name: string; phone: string | null }[];
  items: SparePartOption[];
  role: "admin" | "staff";
  pagination: { page: number; pageSize: number; total: number; query: Record<string, string> };
  filterValues: { status: string; payment: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [isPending, startTransition] = useTransition();

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
  const costLocked = editing?.paymentStatus === "paid";

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
    { accessorKey: "kodeService", header: "Kode" },
    {
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-100">{row.original.customerName}</p>
          <p className="text-xs text-slate-500">{row.original.customerPhone || "-"}</p>
        </div>
      )
    },
    { header: "Perangkat", cell: ({ row }) => `${row.original.deviceType} ${row.original.deviceBrand ?? ""} ${row.original.deviceModel ?? ""}` },
    { id: "status", header: () => <div className="text-center">Status</div>, meta: { headerClassName: "text-center", cellClassName: "text-center" }, cell: ({ row }) => <div className="flex w-full justify-center"><ServiceStatusBadge status={row.original.status} /></div> },
    { id: "paymentStatus", header: () => <div className="text-center">Pembayaran</div>, meta: { headerClassName: "text-center", cellClassName: "text-center" }, cell: ({ row }) => <div className="flex w-full justify-center"><PaymentStatusBadge status={row.original.paymentStatus} /></div> },
    { header: "Biaya", cell: ({ row }) => formatCurrency(row.original.finalCost || row.original.estimatedCost) },
    { header: "Masuk", cell: ({ row }) => formatDate(row.original.receivedDate) },
    {
      id: "quick",
      header: "Update Cepat",
      cell: ({ row }) => (
        <Select
          className="w-28"
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
      header: "",
      cell: ({ row }) => (
        <div className="flex min-w-max justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => handleEdit(row.original)}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button asChild variant="outline" size="icon" title={`Cetak ${row.original.kodeService}`}>
            <Link href={`/services/${row.original.id}/invoice`}>
              <Printer className="h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="icon" title={`Detail ${row.original.kodeService}`}>
            <Link href={`/services/${row.original.id}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
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
                <Button variant="outline" size="icon" title="Tandai dibayar">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                </Button>
              }
            />
          ) : null}
          {role === "admin" ? (
            <ConfirmDialog
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
                <Button variant="outline" size="icon">
                  <Trash2 className="h-4 w-4 text-red-300" />
                </Button>
              }
            />
          ) : null}
        </div>
      )
    }
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
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
                      <FormLabel>Customer Terdaftar</FormLabel>
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
                      <FormControl>
                        <CurrencyInput name="laborCost" value={field.value} onChange={field.onChange} disabled={costLocked} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <section className="space-y-3 rounded-lg border border-slate-700/60 bg-slate-950/25 p-4 sm:col-span-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-100">Sparepart Inventory</h3>
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
                    <p className="rounded-md border border-dashed border-slate-700 p-4 text-center text-sm text-slate-500">Belum ada sparepart.</p>
                  ) : (
                    <div className="space-y-3">
                      {partFields.map((partField, index) => {
                        const value = watchedParts[index];
                        return (
                          <div key={partField.id} className="grid gap-2 rounded-md border border-slate-800 p-3 sm:grid-cols-[minmax(180px,1fr)_90px_160px_140px_36px] sm:items-end">
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
                              <p className="mt-1 text-sm font-medium text-slate-200">{formatCurrency((Number(value?.qty) || 0) * (Number(value?.price) || 0))}</p>
                            </div>
                            <Button type="button" variant="outline" size="icon" disabled={costLocked} onClick={() => removePart(index)} title="Hapus sparepart">
                              <Trash2 className="h-4 w-4 text-red-300" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <div className="flex flex-col gap-1 border-t border-slate-800 pt-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className="text-slate-500">Sparepart: {formatCurrency(partsTotal)} | Jasa: {formatCurrency(Number(laborCost))}</span>
                    <strong className="text-base text-cyan-300">Biaya Final: {formatCurrency(partsTotal + Number(laborCost))}</strong>
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
        tableClassName="min-w-[1120px]"
        columns={columns}
        data={services}
        serverPagination={pagination}
        searchPlaceholder="Cari kode service, customer, nomor HP..."
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
