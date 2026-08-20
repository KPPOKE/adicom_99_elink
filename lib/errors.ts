import { Prisma } from "@prisma/client";

export type ActionResult<T = undefined> = T extends undefined ? { success: true } | { success: false; error: string } : ({ success: true } & T) | { success: false; error: string };

/**
 * Next.js strips thrown-error messages from Server Actions in production builds
 * (React Flight only preserves the digest). Use this to turn an error into a
 * plain string that can be returned as a value instead of thrown, so the
 * message actually reaches the client in production.
 */
export function getActionErrorMessage(error: unknown): string {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      return "Data tidak dapat dihapus karena masih terhubung dengan data lain (misalnya transaksi atau laporan).";
    }
    if (error.code === "P2002") {
      return "Data dengan atribut unik tersebut sudah ada di sistem (duplikat).";
    }
    if (error.code === "P2025") {
      return "Data yang dicari tidak ditemukan di sistem.";
    }
    return `Terjadi kesalahan database (${error.code}).`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan sistem yang tidak diketahui.";
}
