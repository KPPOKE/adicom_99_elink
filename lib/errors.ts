import { Prisma } from "@prisma/client";

export function handleActionError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2003") {
      throw new Error("Data tidak dapat dihapus karena masih terhubung dengan data lain (misalnya transaksi atau laporan).");
    }
    if (error.code === "P2002") {
      throw new Error("Data dengan atribut unik tersebut sudah ada di sistem (duplikat).");
    }
    if (error.code === "P2025") {
      throw new Error("Data yang dicari tidak ditemukan di sistem.");
    }
    throw new Error(`Terjadi kesalahan database (${error.code}).`);
  }

  if (error instanceof Error) {
    throw error;
  }

  throw new Error("Terjadi kesalahan sistem yang tidak diketahui.");
}
