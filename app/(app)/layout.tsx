import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/auth";
import { outletContext, outletCookie } from "@/lib/outlet";
import { getUserPermissionKeys } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { activeOutlet, outlets } = await outletContext(user);
  const selectedOutlet = user.role.name === "admin" ? await outletCookie() : activeOutlet.id;
  const permissions = await getUserPermissionKeys(user);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Sidebar userName={user.name} role={user.role.name} outletName={activeOutlet.name} permissions={permissions} />
      <div className="lg:pl-[230px]">
        <Topbar userName={user.name} role={user.role.name} outletName={activeOutlet.name} activeOutletId={activeOutlet.id} selectedOutlet={selectedOutlet} outlets={outlets} permissions={permissions} />
        <main className="min-w-0 p-4 lg:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}

