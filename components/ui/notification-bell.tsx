"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, CheckCircle, Hammer, PackageWarning } from "lucide-react";
import { AppNotification, getNotifications } from "@/app/actions/notifications";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    // Poll setiap 5 menit
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "warning":
        return <PackageWarning className="h-5 w-5 text-amber-500" />;
      case "info":
        return <Hammer className="h-5 w-5 text-blue-400" />;
      case "success":
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      default:
        return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="icon"
        title="Notifikasi"
        className="relative"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Bell className="h-4 w-4" />
        {notifications.length > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
          </span>
        )}
      </Button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 origin-top-right rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
          <div className="mb-2 px-2 pb-2 pt-1 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-semibold text-slate-100">Notifikasi</h3>
            <span className="text-xs text-slate-400">{notifications.length} peringatan</span>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-1">
            {notifications.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400">
                Tidak ada notifikasi baru saat ini.
              </div>
            ) : (
              notifications.map((notif) => (
                <Link
                  key={notif.id}
                  href={notif.href}
                  onClick={() => setIsOpen(false)}
                  className="flex items-start gap-3 rounded-md px-3 py-2.5 hover:bg-slate-800/50 transition-colors"
                >
                  <div className="mt-0.5 shrink-0 bg-slate-900 rounded-full p-1 border border-slate-800">
                    {getIcon(notif.type)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-200 truncate">{notif.title}</p>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">{notif.description}</p>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
