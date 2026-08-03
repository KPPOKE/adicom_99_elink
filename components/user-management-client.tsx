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
import { DEFAULT_STAFF_PERMISSIONS, PERMISSIONS } from "@/lib/permission-keys";

type UserRow = { id: number; name: string; email: string; role: "admin" | "staff"; outletId: number | null; outletName: string; permissions: string[]; isActive: boolean };
type OutletOption = { id: number; name: string };

const permissionGroups = Array.from(new Set(PERMISSIONS.map((item) => item.group))).map((group) => ({ group, items: PERMISSIONS.filter((item) => item.group === group) }));

export function UserManagementClient({ users, currentUserId, outlets }: { users: UserRow[]; currentUserId: number; outlets: OutletOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [role, setRole] = useState<"admin" | "staff">("staff");
  const [isPending, startTransition] = useTransition();

  const columns: ColumnDef<UserRow>[] = [
    { accessorKey: "name", header: "Nama" },
    { accessorKey: "email", header: "Email" },
    { accessorKey: "role", header: "Peran", cell: ({ row }) => <span className="capitalize">{row.original.role}</span> },
    { accessorKey: "outletName", header: "Cabang" },
    { accessorKey: "isActive", header: "Status", cell: ({ row }) => row.original.isActive ? "Aktif" : "Nonaktif" },
    { id: "actions", header: "", cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="icon" onClick={() => { setEditing(row.original); setRole(row.original.role); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
        <ConfirmDialog onConfirm={() => startTransition(async () => { try { await deleteUser(row.original.id); toast.success("User dihapus"); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menghapus user"); } })} trigger={<Button variant="outline" size="icon" disabled={row.original.id === currentUserId}><Trash2 className="h-4 w-4 text-red-300" /></Button>} />
      </div>
    ) }
  ];

  const openCreate = () => { setEditing(null); setRole("staff"); };
  const checkedPermissions = editing ? editing.permissions : DEFAULT_STAFF_PERMISSIONS;

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button onClick={openCreate}><Plus className="h-4 w-4" />Tambah User</Button></DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader><DialogTitle>{editing ? "Edit User" : "Tambah User"}</DialogTitle></DialogHeader>
            <form action={(formData) => startTransition(async () => { try { await upsertUser(formData); toast.success("User disimpan"); setOpen(false); setEditing(null); router.refresh(); } catch (error) { toast.error(error instanceof Error ? error.message : "Gagal menyimpan user"); } })} className="grid gap-4">
              {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5"><Label>Nama</Label><Input name="name" defaultValue={editing?.name ?? ""} required /></div>
                <div className="space-y-1.5"><Label>Email</Label><Input type="email" name="email" defaultValue={editing?.email ?? ""} required /></div>
                <div className="space-y-1.5"><Label>Peran</Label><Select name="role" value={role} onChange={(event) => setRole(event.target.value as "admin" | "staff")}><option value="admin">Admin</option><option value="staff">Staff</option></Select></div>
                <div className="space-y-1.5"><Label>Cabang Kerja</Label><Select name="outletId" defaultValue={editing?.outletId ? String(editing.outletId) : String(outlets[0]?.id ?? "")}>{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</Select></div>
              </div>
              <div className="space-y-1.5"><Label>{editing ? "Password Baru" : "Password"}</Label><Input type="password" name="password" placeholder={editing ? "Kosongkan jika tidak diganti" : ""} required={!editing} /></div>
              <label className="flex items-center gap-2 text-sm text-slate-700"><input type="hidden" name="isActive" value="false" /><input type="checkbox" name="isActive" value="true" defaultChecked={editing?.isActive ?? true} className="h-4 w-4 rounded border-slate-300" />Akun aktif</label>
              {role === "staff" ? <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4"><p className="text-sm font-medium text-slate-900">Hak Akses Staff</p><div className="grid gap-4 sm:grid-cols-2">{permissionGroups.map((group) => <div key={group.group} className="space-y-2"><p className="text-xs font-semibold uppercase text-slate-500">{group.group}</p>{group.items.map((item) => <label key={item.key} className="flex items-center gap-2 text-sm text-slate-700">{item.key === "dashboard.view" ? <input type="hidden" name="permissions" value={item.key} /> : null}<input type="checkbox" name="permissions" value={item.key} defaultChecked={item.key === "dashboard.view" || checkedPermissions.includes(item.key)} disabled={item.key === "dashboard.view"} className="h-4 w-4 rounded border-slate-300 bg-white" />{item.label}</label>)}</div>)}</div></div> : null}
              <Button disabled={isPending}>{isPending ? "Menyimpan..." : "Simpan User"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <DataTable columns={columns} data={users} searchPlaceholder="Cari user..." />
    </>
  );
}
