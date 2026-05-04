import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-100">
      <Sidebar />
      <div className="lg:pl-64">
        <Topbar userName={user.name} role={user.role.name} />
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
