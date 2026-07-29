import { readFile } from "node:fs/promises";
import { isBackupFresh } from "@/lib/health";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  const statusFile = process.env.BACKUP_STATUS_FILE;
  if (!statusFile) return Response.json({ status: "error" }, { status: 503, headers });

  try {
    const timestamp = Number((await readFile(statusFile, "utf8")).trim());
    if (!isBackupFresh(timestamp)) return Response.json({ status: "error" }, { status: 503, headers });
    return Response.json({ status: "ok", lastBackupAt: new Date(timestamp * 1000).toISOString() }, { headers });
  } catch {
    return Response.json({ status: "error" }, { status: 503, headers });
  }
}
