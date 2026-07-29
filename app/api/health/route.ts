import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const version = process.env.APP_VERSION || "unknown";
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", version }, { headers });
  } catch {
    return Response.json({ status: "error", version }, { status: 503, headers });
  }
}
