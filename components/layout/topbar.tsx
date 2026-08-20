"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, CalendarDays, Loader2, Menu, UserRound, X } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { setActiveOutletAction } from "@/app/actions/outlets";
import { NavList, canAccessNav, nav, resolveActiveNavItem, SidebarFooter } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/ui/notification-bell";
import { cn } from "@/lib/utils";

type Role = "admin" | "staff";

export function Topbar({ userName, role, outletName, activeOutletId, outlets, permissions }: { userName: string; role: Role; outletName: string; activeOutletId: number; selectedOutlet: number | "all" | null; outlets: Array<{ id: number; name: string }>; permissions: string[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuItems = nav.filter((item) => canAccessNav(item, role, permissions));
  const activeItem = resolveActiveNavItem(menuItems, pathname, searchParams);
  const dashboardPage = pathname === "/" || pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const hideOutletControl = dashboardPage || pathname === "/settings/activity";
  useEffect(() => {
    if (searchParams.get("denied") !== "1") return;
    toast.error("Anda tidak memiliki akses ke halaman tersebut");
    const params = new URLSearchParams(searchParams);
    params.delete("denied");
    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const [selectedValue, setSelectedValue] = useState(String(activeOutletId));
  const displayOutletValue = pending ? selectedValue : String(activeOutletId);
  const changeOutlet = (value: string) => {
    const previousValue = displayOutletValue;
    setSelectedValue(value);
    const formData = new FormData(); formData.set("outletId", value);
    startTransition(async () => { try { await setActiveOutletAction(formData); router.refresh(); } catch (error) { setSelectedValue(previousValue); toast.error(error instanceof Error ? error.message : "Gagal mengganti cabang"); } });
  };
  const outletControl = role === "admin" && !dashboardPage ? <div className={cn("flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700", pending && "opacity-70")}><Building2 className="h-4 w-4 text-blue-600" /><select aria-label="Pilih cabang" value={displayOutletValue} disabled={pending} onChange={(event) => changeOutlet(event.currentTarget.value)} className="max-w-56 bg-transparent outline-none disabled:cursor-wait">{outlets.map((outlet) => <option key={outlet.id} value={outlet.id}>{outlet.name}</option>)}</select>{pending ? <Loader2 className="h-4 w-4 animate-spin text-blue-600" /> : null}</div> : <div className="flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700"><Building2 className="h-4 w-4 text-blue-600" /><span>{role === "admin" && dashboardPage ? "Semua Cabang" : outletName}</span></div>;

  return <><header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-sm"><div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-7"><div className="flex min-w-0 items-center gap-3"><Button variant="ghost" size="icon" type="button" aria-label="Buka menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation" className="lg:hidden" onClick={() => setMobileOpen(true)}><Menu className="h-5 w-5" /></Button><h1 className="truncate text-lg font-bold text-slate-900">{activeItem?.label ?? "PosPintar"}</h1></div><div className="ml-auto hidden shrink-0 items-center gap-3 md:flex">{hideOutletControl ? null : outletControl}<NotificationBell /><div className="hidden h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-600 xl:flex"><CalendarDays className="h-4 w-4 text-blue-600" />{new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</div><div className="flex items-center gap-2 border-l border-slate-200 pl-3"><div className="hidden text-right lg:block"><p className="max-w-36 truncate text-sm font-semibold text-slate-900">{userName}</p><p className="text-xs text-slate-500">{role === "admin" ? "Admin" : "Staff"}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600"><UserRound className="h-5 w-5" /></div></div></div></div></header>
    <div className={cn("fixed inset-0 z-50 lg:hidden", mobileOpen ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!mobileOpen}><button type="button" aria-label="Tutup menu" className={cn("absolute inset-0 bg-slate-950/40 transition-opacity", mobileOpen ? "opacity-100" : "opacity-0")} onClick={() => setMobileOpen(false)} /><aside id="mobile-navigation" className={cn("relative flex h-full w-[min(20rem,86vw)] flex-col border-r border-slate-200 bg-white text-slate-900 shadow-2xl transition-transform", mobileOpen ? "translate-x-0" : "-translate-x-full")}><div className="flex h-16 items-center justify-between border-b border-slate-200 px-4"><div><p className="font-bold text-blue-700">PosPintar</p><p className="text-xs text-slate-500">Sistem Manajemen</p></div><Button variant="ghost" size="icon" aria-label="Tutup navigasi" onClick={() => setMobileOpen(false)}><X className="h-5 w-5" /></Button></div><div className="min-h-0 flex-1 overflow-y-auto py-4"><NavList role={role} permissions={permissions} onNavigate={() => setMobileOpen(false)} /></div><SidebarFooter userName={userName} roleLabel={role === "admin" ? "Admin" : "Staff"} outletName={outletName} /></aside></div>
  </>;
}