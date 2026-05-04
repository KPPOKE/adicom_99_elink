"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { ServiceStatusBadge } from "@/components/shared/status-badge";
import { deleteService, updateServiceStatus, upsertService } from "@/app/actions/operations";
import { formatCurrency, formatDate } from "@/lib/utils";

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
  finalCost: number;
  status: string;
  technicianNote: string | null;
  receivedDate: string | Date;
};

export function ServiceClient({ services, customers }: { services: ServiceRow[]; customers: { id: number; name: string; phone: string | null }[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<ServiceRow>[] = [
    { accessorKey: "kodeService", header: "Kode" },
    {
      header: "Customer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-slate-950">{row.original.customerName}</p>
          <p className="text-xs text-slate-500">{row.original.customerPhone || "-"}</p>
        </div>
      )
    },
    { header: "Perangkat", cell: ({ row }) => `${row.original.deviceType} ${row.original.deviceBrand ?? ""} ${row.original.deviceModel ?? ""}` },
    { header: "Status", cell: ({ row }) => <ServiceStatusBadge status={row.original.status} /> },
    { header: "Biaya", cell: ({ row }) => formatCurrency(row.original.finalCost || row.original.estimatedCost) },
    { header: "Masuk", cell: ({ row }) => formatDate(row.original.receivedDate) },
    {
      id: "quick",
      header: "Update Cepat",
      cell: ({ row }) => (
        <Select
          value={row.original.status}
          onChange={(event) =>
            startTransition(async () => {
              await updateServiceStatus(row.original.id, event.target.value);
              toast.success("Status service diperbarui");
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
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setEditing(row.original);
              setOpen(true);
            }}
          >
            <Edit className="h-4 w-4" />
          </Button>
          <ConfirmDialog
            onConfirm={() =>
              startTransition(async () => {
                await deleteService(row.original.id);
                toast.success("Service dihapus");
              })
            }
            trigger={
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            }
          />
        </div>
      )
    }
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(null)}>
              <Plus className="h-4 w-4" />
              Service Masuk
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Service" : "Input Service Masuk"}</DialogTitle>
            </DialogHeader>
            <form
              action={(formData) =>
                startTransition(async () => {
                  try {
                    await upsertService(formData);
                    toast.success("Service disimpan");
                    setOpen(false);
                    setEditing(null);
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyimpan service");
                  }
                })
              }
              className="grid gap-4 sm:grid-cols-2"
            >
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <div className="space-y-1.5">
                <Label>Customer Terdaftar</Label>
                <Select
                  name="customerId"
                  defaultValue={String(editing?.customerId ?? "")}
                  onChange={(event) => {
                    const customer = customers.find((item) => item.id === Number(event.target.value));
                    const form = event.currentTarget.form;
                    if (customer && form) {
                      (form.elements.namedItem("customerName") as HTMLInputElement).value = customer.name;
                      (form.elements.namedItem("customerPhone") as HTMLInputElement).value = customer.phone ?? "";
                    }
                  }}
                >
                  <option value="">Customer baru/manual</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Field name="customerName" label="Nama Customer" value={editing?.customerName} />
              <Field name="customerPhone" label="No. HP" value={editing?.customerPhone} />
              <Field name="deviceType" label="Jenis Perangkat" value={editing?.deviceType} />
              <Field name="deviceBrand" label="Brand" value={editing?.deviceBrand} />
              <Field name="deviceModel" label="Model" value={editing?.deviceModel} />
              <Field type="number" name="estimatedCost" label="Estimasi Biaya" value={editing?.estimatedCost ?? 0} />
              <Field type="number" name="finalCost" label="Biaya Final" value={editing?.finalCost ?? 0} />
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select name="status" defaultValue={editing?.status ?? "Masuk"}>
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.replace("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Keluhan</Label>
                <Textarea name="problemDescription" defaultValue={editing?.problemDescription ?? ""} required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Diagnosa</Label>
                <Textarea name="diagnosis" defaultValue={editing?.diagnosis ?? ""} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Catatan Teknisi</Label>
                <Textarea name="technicianNote" defaultValue={editing?.technicianNote ?? ""} />
              </div>
              <Button className="sm:col-span-2" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Service"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={services} searchPlaceholder="Cari kode service, customer, nomor HP..." />
    </>
  );
}

function Field({ label, name, value, type = "text" }: { label: string; name: string; value?: string | number | null; type?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type={type} name={name} defaultValue={value ?? ""} required={["customerName", "deviceType"].includes(name)} />
    </div>
  );
}
