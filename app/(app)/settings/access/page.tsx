import { PageHeader } from "@/components/shared/page-header";
import { UserManagementClient } from "@/components/user-management-client";
import { Card, CardContent } from "@/components/ui/card";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AccessSettingsPage() {
  const currentUser = await requireAdmin();
  const [users, outlets] = await Promise.all([prisma.user.findMany({ include: { role: true, outlet: true, permissions: true }, orderBy: { name: "asc" } }), prisma.outlet.findMany({ orderBy: { name: "asc" } })]);
  return <><PageHeader title="Hak Akses Karyawan" description="Atur cabang dan checklist fitur yang dapat digunakan setiap staff." /><Card><CardContent className="pt-6"><UserManagementClient currentUserId={currentUser.id} outlets={outlets} users={users.map((user) => ({ id: user.id, name: user.name, email: user.email, role: user.role.name, outletId: user.outletId, outletName: user.outlet?.name ?? "-", permissions: user.permissions.map((item) => item.key) }))} /></CardContent></Card></>;
}