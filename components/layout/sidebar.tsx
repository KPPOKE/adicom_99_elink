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
  ReceiptText,
  Settings,
  ShoppingCart,
  Stethoscope,
  Truck
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export function Sidebar({ role }: { role: "admin" | "staff" }) {
  const pathname = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-white">
          <ReceiptText className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-950">Adicom99</p>
          <p className="text-xs text-slate-500">Management System</p>
        </div>
      </div>
      <nav className="space-y-1 p-4">
        {nav.filter((item) => !item.adminOnly || role === "admin").map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export { nav };
