"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Eye, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "textarea";
};

type Row = Record<string, unknown> & { id: number; createdAt?: string | Date };

export function SimpleCrud({
  title,
  data,
  fields,
  upsertAction,
  deleteAction,
  canManage = true,
  canDelete = canManage,
  detailHrefPrefix,
  pagination
}: {
  title: string;
  data: Row[];
  fields: Field[];
  upsertAction: (formData: FormData) => Promise<void>;
  deleteAction: (id: number) => Promise<void>;
  canManage?: boolean;
  canDelete?: boolean;
  detailHrefPrefix?: string;
  pagination?: { page: number; pageSize: number; total: number; query: Record<string, string> };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<Row>[] = [
    ...fields.slice(0, 3).map((field) => ({
      accessorKey: field.name,
      header: field.label,
      cell: ({ row }: { row: { original: Row } }) => String(row.original[field.name] ?? "-")
    })),
    {
      accessorKey: "createdAt",
      header: "Dibuat",
      cell: ({ row }) => (row.original.createdAt ? formatDate(row.original.createdAt) : "-")
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {detailHrefPrefix ? (
            <Button asChild variant="outline" size="icon">
              <Link href={`${detailHrefPrefix}/${row.original.id}`}>
                <Eye className="h-4 w-4" />
              </Link>
            </Button>
          ) : null}
          {canManage ? (
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
          ) : null}
          {canDelete ? (
            <ConfirmDialog
              onConfirm={() =>
                startTransition(async () => {
                  try {
                    await deleteAction(row.original.id);
                    toast.success(`${title} dihapus`);
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menghapus data");
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

  async function submit(formData: FormData) {
    startTransition(async () => {
      try {
        await upsertAction(formData);
        toast.success(`${title} disimpan`);
        setOpen(false);
        setEditing(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal menyimpan data");
      }
    });
  }

  return (
    <>
      {canManage ? (
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditing(null);
              }}
            >
              <Plus className="h-4 w-4" />
              Tambah
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? `Edit ${title}` : `Tambah ${title}`}</DialogTitle>
            </DialogHeader>
            <form action={submit} className="grid gap-4">
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              {fields.map((field) => (
                <div className="space-y-1.5" key={field.name}>
                  <Label>{field.label}</Label>
                  {field.type === "textarea" ? (
                    <Textarea name={field.name} defaultValue={String(editing?.[field.name] ?? "")} />
                  ) : (
                    <Input type={field.type ?? "text"} name={field.name} defaultValue={String(editing?.[field.name] ?? "")} />
                  )}
                </div>
              ))}
              <Button disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      ) : null}
      <DataTable columns={columns} data={data} searchPlaceholder={`Cari ${title.toLowerCase()}...`} serverPagination={pagination} />
    </>
  );
}
