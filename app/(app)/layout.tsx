import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/auth";
import { outletContext, outletCookie } from "@/lib/outlet";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { activeOutlet, outlets } = await outletContext(user);
  const selectedOutlet = user.role.name === "admin" ? await outletCookie() : activeOutlet.id;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_0%,rgba(37,99,235,0.20),transparent_34rem),linear-gradient(135deg,#070b14_0%,#0b1220_48%,#111827_100%)] text-slate-100">
      <Sidebar userName={user.name} role={user.role.name} outletName={activeOutlet.name} />
      <div className="lg:pl-64">
        <Topbar userName={user.name} role={user.role.name} outletName={activeOutlet.name} activeOutletId={activeOutlet.id} selectedOutlet={selectedOutlet} outlets={outlets} />
        <main className="min-w-0 p-4 lg:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
