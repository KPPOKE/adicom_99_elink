"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { outletContext } from "@/lib/outlet";

export type AppNotification = {
  id: string;
  title: string;
  description: string;
  href: string;
  type: "warning" | "info" | "success";
};

export async function getNotifications(): Promise<AppNotification[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const { activeOutlet } = await outletContext(user);
  const outletWhere = { outletId: activeOutlet.id };
  const notifications: AppNotification[] = [];

  try {
    const [lowStockCount, pendingServicesCount, finishedServicesCount] = await Promise.all([
      prisma.item.count({ where: { ...outletWhere, stok: { lte: prisma.item.fields.stokMinimum } } }),
      prisma.service.count({ where: { ...outletWhere, status: "Menunggu_Konfirmasi" } }),
      prisma.service.count({ where: { ...outletWhere, status: "Selesai" } })
    ]);

    if (lowStockCount > 0) {
      notifications.push({ id: "low-stock", title: "Stok Menipis", description: `Ada ${lowStockCount} barang yang butuh restock.`, href: "/inventory", type: "warning" });
    }

    if (pendingServicesCount > 0) {
      notifications.push({ id: "pending-services", title: "Menunggu Konfirmasi", description: `Ada ${pendingServicesCount} servis menunggu persetujuan pelanggan.`, href: "/services", type: "info" });
    }

    if (finishedServicesCount > 0) {
      notifications.push({ id: "finished-services", title: "Servis Selesai", description: `Ada ${finishedServicesCount} perangkat siap diambil pelanggan.`, href: "/services", type: "success" });
    }

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}
