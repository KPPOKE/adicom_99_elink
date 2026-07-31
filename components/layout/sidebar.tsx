"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Banknote, BarChart3, Boxes, Building2, Contact, ChevronRight, FileText, History, Home, Landmark, Layers3, LogOut, PackagePlus, ReceiptText, Send, Settings, ShieldCheck, ShoppingCart, Stethoscope, Truck, UserRoundCog, UsersRound, WalletCards } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { hasPermission, type PermissionKey } from "@/lib/permission-keys";
import { cn } from "@/lib/utils";

type Role = "admin" | "staff";
export type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission: PermissionKey; adminOnly?: boolean };
export type NavGroup = { label?: string; icon?: React.ComponentType<{ className?: string }>; items: NavItem[] };

export function canAccessNav(item: NavItem, role: Role, permissions: string[]) { return (!item.adminOnly || role === "admin") && hasPermission(role, permissions, item.permission); }
export function navItemActive(item: NavItem, pathname: string, searchParams: URLSearchParams) {
  const [path, query] = item.href.split("?");
  if (!(pathname === path || (!query && pathname.startsWith(`${path}/`)))) return false;
  if (!query) return true;
  const expected = new URLSearchParams(query);
  return [...expected].every(([key, value]) => searchParams.get(key) === value);
}

export const navGroups: NavGroup[] = [
  { items: [
    { href: "/dashboard", label: "Dasbor", icon: Home, permission: "dashboard.view" },
    { href: "/bank-transfers", label: "MiniATM", icon: Send, permission: "bankTransfers.view" },
    { href: "/services", label: "Service", icon: Stethoscope, permission: "services.view" }
  ] },
  { label: "Kelola Data", icon: Boxes, items: [
    { href: "/inventory", label: "Inventori", icon: Boxes, permission: "inventory.view" },
    { href: "/categories", label: "Kategori", icon: Layers3, permission: "categories.view" },
    { href: "/suppliers", label: "Supplier", icon: Truck, permission: "suppliers.view" },
    { href: "/transactions", label: "Transaksi Fisik", icon: ShoppingCart, permission: "transactions.view" },
    { href: "/fund-mutations?mode=pindah", label: "Pindah Saldo", icon: ArrowLeftRight, permission: "fundMutations.view" },
    { href: "/fund-mutations?mode=saldo", label: "Ambil & Tambah Saldo", icon: PackagePlus, permission: "fundMutations.view" },
    { href: "/funds", label: "Saldo Awal", icon: WalletCards, permission: "funds.view" }
  ] },
  { label: "Utang Piutang", icon: Contact, items: [
    { href: "/receivables", label: "Catat Hutang", icon: Banknote, permission: "receivables.view" },
    { href: "/customers", label: "Pelanggan", icon: Contact, permission: "customers.view" }
  ] },
  { label: "Cetak Struk", icon: ReceiptText, items: [
    { href: "/receipts", label: "Cetak Struk", icon: ReceiptText, permission: "receipts.view" },
    { href: "/receipts/banks", label: "Master Bank", icon: Landmark, permission: "receipts.view" },
    { href: "/receipts/settings", label: "Pengaturan Struk", icon: Settings, permission: "receipts.manage" }
  ] },
  { label: "Pengeluaran", icon: Banknote, items: [
    { href: "/finance", label: "Pengeluaran", icon: Banknote, permission: "finance.view" },
    { href: "/payroll", label: "Penggajian Pegawai", icon: UsersRound, permission: "payroll.view" }
  ] },
  { label: "Pengaturan", icon: Settings, items: [
    { href: "/settings/store", label: "Kelola Toko", icon: Building2, permission: "settings.view", adminOnly: true },
    { href: "/settings/access", label: "Hak Akses Karyawan", icon: UserRoundCog, permission: "settings.view", adminOnly: true },
    { href: "/settings/activity", label: "Riwayat Aktivitas", icon: History, permission: "settings.view", adminOnly: true },
    { href: "/settings/data", label: "Backup Data", icon: ShieldCheck, permission: "settings.backup" }
  ] },
  { label: "Laporan Digital", icon: BarChart3, items: [
    { href: "/reports", label: "Laporan Transaksi", icon: FileText, permission: "reports.view" }
  ] }
];
export const nav = navGroups.flatMap((group) => group.items);

export function NavList({ role, permissions, onNavigate }: { role: Role; permissions: string[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <nav className="space-y-2">
    {navGroups.map((group, groupIndex) => {
      const items = group.items.filter((item) => canAccessNav(item, role, permissions));
      if (!items.length) return null;
      const links = items.map((item) => { const active = navItemActive(item, pathname, searchParams); return <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("flex min-h-10 items-center gap-3 border-l-[3px] px-4 py-2 text-sm transition", active ? "border-blue-600 bg-blue-50 font-semibold text-blue-700" : "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-950")}><item.icon className="h-4 w-4 shrink-0" /><span>{item.label}</span></Link>; });
      if (!group.label) return <div key={groupIndex}>{links}</div>;
      const activeGroup = items.some((item) => navItemActive(item, pathname, searchParams));
      const GroupIcon = group.icon;
      return <details key={group.label} open={activeGroup || undefined} className="group"><summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-2.5 text-xs font-semibold uppercase text-slate-500 hover:text-slate-900">{GroupIcon ? <GroupIcon className="h-4 w-4" /> : null}<span className="flex-1">{group.label}</span><ChevronRight className="h-3.5 w-3.5 transition group-open:rotate-90" /></summary><div className="ml-4 border-l border-slate-200">{links}</div></details>;
    })}
  </nav>;
}

export function Sidebar({ userName, role, outletName, permissions }: { userName: string; role: Role; outletName?: string; permissions: string[] }) {
  return <aside className="fixed inset-y-0 left-0 z-40 hidden w-[230px] flex-col border-r border-slate-200 bg-white shadow-sm lg:flex"><div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-5"><div><p className="font-bold text-blue-700">PosPintar</p><p className="text-xs text-slate-500">Sistem Manajemen</p></div></div><div className="min-h-0 flex-1 overflow-y-auto py-4"><NavList role={role} permissions={permissions} /></div><SidebarFooter userName={userName} roleLabel={role === "admin" ? "Admin" : "Staff"} outletName={outletName} /></aside>;
}

export function SidebarFooter({ userName, roleLabel, outletName }: { userName: string; roleLabel: string; outletName?: string }) {
  const initials = userName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  return <div className="shrink-0 border-t border-slate-200 p-3"><div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white">{initials || "AD"}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-900">{userName}</p><p className="truncate text-xs text-slate-500">{roleLabel}{outletName ? ` | ${outletName}` : ""}</p></div><form action={logoutAction}><Button variant="ghost" size="icon" title="Keluar"><LogOut className="h-4 w-4" /></Button></form></div></div>;
}