"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { nav } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { logoutAction } from "@/app/actions/auth";

export function Topbar({ userName, role }: { userName: string; role: string }) {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex items-center gap-3 lg:hidden">
          <Button variant="ghost" size="icon" type="button">
            <Menu className="h-5 w-5" />
          </Button>
          <span className="font-semibold">Adicom99</span>
        </div>
        <div className="relative hidden w-full max-w-md lg:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="bg-slate-50 pl-9" placeholder="Cari transaksi, service, barang..." />
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:hidden">
          {nav.slice(0, 8).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-3 py-2 text-xs font-medium ${pathname === item.href ? "bg-blue-50 text-blue-700" : "text-slate-600"}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-950">{userName}</p>
            <p className="text-xs capitalize text-slate-500">{role}</p>
          </div>
          <form action={logoutAction}>
            <Button variant="outline" size="icon" title="Logout">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
