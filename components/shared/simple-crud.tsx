"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Eye, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/shared/data-table";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { formatDate } from "@/lib/utils";

type Field = {
  name: string;
  label: string;
  type?: "text" | "email" | "textarea" | "color";
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
      header: () => <div className="text-center">Aksi</div>,
      meta: { headerClassName: "text-center", cellClassName: "text-center" },
      cell: ({ row }) => {
        if (!detailHrefPrefix && !canManage && !canDelete) return null;
        return (
          <div className="flex w-full justify-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 text-slate-700 bg-white hover:bg-slate-50 border-slate-300 shadow-xs" title="Menu Aksi">
                  <MoreHorizontal className="h-4 w-4 text-slate-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 p-1.5">
                {detailHrefPrefix ? (
                  <DropdownMenuItem asChild className="text-slate-700 focus:bg-slate-50">
                    <Link href={`${detailHrefPrefix}/${row.original.id}`}>
                      <Eye className="h-3.5 w-3.5 text-slate-500" />
                      <span>Detail</span>
                    </Link>
                  </DropdownMenuItem>
                ) : null}
                {canManage ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(row.original);
                      setOpen(true);
                    }}
                    className="text-blue-600 focus:text-blue-700 focus:bg-blue-50"
                  >
                    <Edit className="h-3.5 w-3.5 text-blue-600" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                ) : null}
                {canDelete ? (
                  <>
                    {detailHrefPrefix || canManage ? <DropdownMenuSeparator /> : null}
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
                        <DropdownMenuItem onSelect={(event) => event.preventDefault()} className="text-red-600 focus:text-red-700 focus:bg-red-50">
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                          <span>Hapus</span>
                        </DropdownMenuItem>
                      }
                    />
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
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
      <DataTable
        columns={columns}
        data={data}
        searchPlaceholder={`Cari ${title.toLowerCase()}...`}
        serverPagination={pagination}
        filters={
          canManage ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button
                  type="button"
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
                      ) : field.type === "color" ? (
                        <div className="flex items-center gap-3 rounded-md border border-slate-300 p-2">
                          <Input type="color" name={field.name} defaultValue={String(editing?.[field.name] ?? "#2563EB")} className="h-9 w-14 cursor-pointer p-1" aria-label={field.label} />
                          <span className="text-xs text-slate-500">Dipakai sebagai aksen kartu cabang.</span>
                        </div>
                      ) : (
                        <Input type={field.type ?? "text"} name={field.name} defaultValue={String(editing?.[field.name] ?? "")} />
                      )}
                    </div>
                  ))}
                  <Button disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan"}</Button>
                </form>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />
    </>
  );
}
