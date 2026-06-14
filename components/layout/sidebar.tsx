"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Contact,
  Home,
  Landmark,
  Layers3,
  LogOut,
  Settings,
  ShoppingCart,
  Stethoscope,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/app/actions/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/inventory", label: "Inventory", icon: Boxes },
  { href: "/categories", label: "Kategori", icon: Layers3 },
  { href: "/suppliers", label: "Supplier", icon: Truck },
  { href: "/customers", label: "Customer", icon: Contact },
  { href: "/transactions", label: "Transaksi", icon: ShoppingCart },
  { href: "/services", label: "Service", icon: Stethoscope },
  { href: "/finance", label: "Keuangan", icon: Landmark },
  { href: "/reports", label: "Laporan", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, adminOnly: true }
];

export function Sidebar({ userName, role }: { userName: string; role: "admin" | "staff" }) {
  const pathname = usePathname();
  const roleLabel = role === "admin" ? "Admin" : "Staff";

  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800/60 bg-slate-950/60 backdrop-blur-2xl shadow-[0_0_40px_rgba(0,0,0,0.5)] lg:flex">
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800/60 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-600/20 text-blue-300 shadow-[0_0_24px_rgba(37,99,235,0.22)]">
          <span className="text-lg font-bold">P</span>
        </div>
        <div>
          <p className="font-semibold text-slate-100">PosPintar</p>
          <p className="text-xs text-slate-400">Management System</p>
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {nav.filter((item) => !item.adminOnly || role === "admin").map((item, index) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-r-lg px-3 py-2.5 text-sm font-medium transition-all duration-300 animate-stagger-item",
                active
                  ? "bg-gradient-to-r from-cyan-500/15 to-transparent text-white border-l-[3px] border-cyan-400 shadow-[inset_20px_0_40px_-20px_rgba(34,211,238,0.3)]"
                  : "border-l-[3px] border-transparent text-slate-400 hover:bg-slate-800/40 hover:text-slate-100 hover:border-slate-700"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <SidebarFooter userName={userName} roleLabel={roleLabel} />
    </aside>
  );
}

export function SidebarFooter({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="shrink-0 border-t border-slate-800/60 p-4 animate-stagger-item" style={{ animationDelay: "500ms" }}>
      <div className="rounded-xl bg-slate-900/40 border border-slate-800/50 p-3 backdrop-blur-sm transition-all hover:bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">
            {initials || "AD"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-100">{userName}</p>
            <p className="text-xs text-slate-500">{roleLabel}</p>
          </div>
          <form action={logoutAction}>
            <Button variant="ghost" size="icon" title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

export { nav };
