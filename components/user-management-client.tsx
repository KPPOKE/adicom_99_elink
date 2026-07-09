"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteUser, upsertUser } from "@/app/actions/users";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type UserRow = {
  id: number;
  name: string;
  email: string;
  role: "admin" | "staff";
  outletId: number | null;
  outletName: string;
};

type OutletOption = { id: number; name: string };

export function UserManagementClient({ users, currentUserId, outlets }: { users: UserRow[]; currentUserId: number; outlets: OutletOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Role", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
    { accessorKey: "outletName", header: "Outlet" },
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
                try {
                  await deleteUser(row.original.id);
                  toast.success("User dihapus");
                  router.refresh();
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Gagal menghapus user");
                }
              })
            }
            trigger={
              <Button variant="outline" size="icon" disabled={row.original.id === currentUserId}>
                <Trash2 className="h-4 w-4 text-red-300" />
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
              Tambah User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit User" : "Tambah User"}</DialogTitle>
            </DialogHeader>
            <form
              action={(formData) =>
                startTransition(async () => {
                  try {
                    await upsertUser(formData);
                    toast.success("User disimpan");
                    setOpen(false);
                    setEditing(null);
                    router.refresh();
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Gagal menyimpan user");
                  }
                })
              }
              className="grid gap-4"
            >
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <div className="space-y-1.5">
                <Label>Nama</Label>
                <Input name="name" defaultValue={editing?.name ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" name="email" defaultValue={editing?.email ?? ""} required />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select name="role" defaultValue={editing?.role ?? "staff"}>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Outlet</Label>
                <Select name="outletId" defaultValue={editing?.outletId ? String(editing.outletId) : String(outlets[0]?.id ?? "")}>
                  {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{editing ? "Password Baru" : "Password"}</Label>
                <Input type="password" name="password" placeholder={editing ? "Kosongkan jika tidak diganti" : ""} required={!editing} />
              </div>
              <Button disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan User"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={users} searchPlaceholder="Cari user..." />
    </>
  );
}
