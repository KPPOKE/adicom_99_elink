"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

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

  const notifications: AppNotification[] = [];

  try {
    // 1. Cek stok menipis (menggunakan Prisma findMany karena perbandingan antar kolom belum didukung penuh di count where sederhana)
    const items = await prisma.item.findMany({
      select: { stok: true, stokMinimum: true }
    });
    const lowStockCount = items.filter((item) => item.stok <= item.stokMinimum).length;

    if (lowStockCount > 0) {
      notifications.push({
        id: "low-stock",
        title: "Stok Menipis",
        description: `Ada ${lowStockCount} barang yang butuh restock.`,
        href: "/inventory",
        type: "warning"
      });
    }

    // 2. Cek servis menunggu konfirmasi
    const pendingServicesCount = await prisma.service.count({
      where: { status: "Menunggu_Konfirmasi" }
    });

    if (pendingServicesCount > 0) {
      notifications.push({
        id: "pending-services",
        title: "Menunggu Konfirmasi",
        description: `Ada ${pendingServicesCount} servis menunggu persetujuan pelanggan.`,
        href: "/services",
        type: "info"
      });
    }

    // 3. Cek servis selesai tapi belum diambil
    const finishedServicesCount = await prisma.service.count({
      where: { status: "Selesai" }
    });

    if (finishedServicesCount > 0) {
      notifications.push({
        id: "finished-services",
        title: "Servis Selesai",
        description: `Ada ${finishedServicesCount} perangkat siap diambil pelanggan.`,
        href: "/services",
        type: "success"
      });
    }

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}
