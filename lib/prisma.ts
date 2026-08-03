import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function adapter() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl && process.env.NODE_ENV === "production") throw new Error("DATABASE_URL wajib diset pada production");
  const url = new URL(databaseUrl || "mysql://root:@localhost:3306/adicom99_management");
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
    acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT_MS || 10000),
    idleTimeout: Number(process.env.DB_IDLE_TIMEOUT_SECONDS || 60)
  });
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: adapter(),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
