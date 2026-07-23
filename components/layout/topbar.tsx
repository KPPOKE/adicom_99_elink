"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, CalendarDays, Loader2, Menu, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { canAccessNav, nav, SidebarFooter } from "@/components/layout/sidebar";
import { NotificationBell } from "@/components/ui/notification-bell";
import { Button } from "@/components/ui/button";
import { setActiveOutletAction } from "@/app/actions/outlets";
import { cn } from "@/lib/utils";

export function Topbar({ userName, role, outletName, activeOutletId, selectedOutlet, outlets }: { userName: string; role: "admin" | "staff"; outletName: string; activeOutletId: number; selectedOutlet: number | "all" | null; outlets: Array<{ id: number; name: string }> }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuItems = nav.filter((item) => canAccessNav(item, role));
  const activeItem = menuItems.find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  const dashboardPage = pathname === "/dashboard" || pathname === "/";
  const outletValue = dashboardPage && selectedOutlet === "all" ? "all" : String(activeOutletId);
  const [selectedValue, setSelectedValue] = useState(outletValue);
  const displayOutletValue = pending ? selectedValue : outletValue;

  const changeOutlet = (value: string) => {
    const previousValue = displayOutletValue;
    setSelectedValue(value);
    const formData = new FormData();
    formData.set("outletId", value);
    startTransition(async () => {
      try {
        await setActiveOutletAction(formData);
        router.refresh();
      } catch (error) {
        setSelectedValue(previousValue);
        toast.error(error instanceof Error ? error.message : "Gagal mengganti cabang");
      }
    });
  };

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-800/60 bg-slate-950/60 backdrop-blur-2xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
          <div className="flex min-w-0 items-center gap-3 lg:hidden">
            <Button
              variant="ghost"
              size="icon"
              type="button"
              aria-label="Buka menu"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="md:hidden">
              <span className="truncate font-semibold text-slate-100">PosPintar</span>
              <span className="block text-[10px] text-slate-400">Management</span>
            </div>
          </div>
          <div className="hidden min-w-0 lg:block">
            <h1 className="text-xl font-bold tracking-tight text-slate-100">{activeItem?.label ?? "PosPintar"}</h1>
          </div>
          <div className="hidden shrink-0 items-center gap-3 lg:flex ml-auto">
            {role === "admin" ? (
              <div className={cn("flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300", pending && "opacity-80")}>
                <Building2 className="h-4 w-4" />
                <select name="outletId" value={displayOutletValue} disabled={pending} onChange={(event) => changeOutlet(event.currentTarget.value)} className="bg-transparent text-sm outline-none disabled:cursor-wait">
                  {dashboardPage ? <option value="all">Semua Cabang</option> : null}
                  {outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}
                </select>
                {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" /> : null}
              </div>
            ) : (
              <div className="flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300">
                <Building2 className="h-4 w-4" />
                <span>{outletName}</span>
              </div>
            )}
            <NotificationBell />
            <div className="flex h-9 items-center gap-2 rounded-md border border-slate-700 bg-slate-900/60 px-3 text-sm text-slate-300">
              <CalendarDays className="h-4 w-4" />
              <span>
                {new Date().toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric"
                })}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "fixed inset-0 z-50 lg:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Tutup menu"
          className={cn(
            "absolute inset-0 bg-slate-950/70 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileOpen(false)}
        />
        <aside
          className={cn(
            "relative flex h-full w-[min(20rem,86vw)] flex-col border-r border-slate-800/60 bg-slate-950/80 backdrop-blur-2xl text-slate-100 shadow-2xl transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1)",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="flex h-16 items-center justify-between gap-3 border-b border-slate-800/60 px-4">
            <div className="flex min-w-0 items-center">
              <div className="flex flex-col space-y-0.5 leading-none">
                <p className="truncate font-semibold text-slate-100">PosPintar</p>
                <p className="truncate text-xs text-slate-400">Management System</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" type="button" aria-label="Tutup menu" onClick={() => setMobileOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto p-4">
            {menuItems.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-r-lg px-3 py-3 text-sm font-medium transition-all duration-300",
                    active
                      ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-white border-l-[3px] border-cyan-400 shadow-[inset_20px_0_40px_-20px_rgba(34,211,238,0.3)]"
                      : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 hover:border-slate-700"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <SidebarFooter userName={userName} roleLabel={role === "admin" ? "Admin" : "Staff"} outletName={outletName} />
        </aside>
      </div>
    </>
  );
}
