import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/permissions";
import { writeAuditLog } from "@/lib/audit";
import { outletContext } from "@/lib/outlet";
import { assertTrustedOrigin } from "@/lib/security";
import { buildBackupPayload } from "@/lib/backup-data";

export async function GET() {
  return NextResponse.json({ error: "Gunakan tombol backup dari halaman Pengaturan." }, { status: 405 });
}

export async function POST() {
  await assertTrustedOrigin();
  const user = await requirePermission("settings.backup");
  const { activeOutlet } = await outletContext(user);
  const payload = await buildBackupPayload({ isAdmin: user.role.name === "admin", outletId: activeOutlet.id, outletName: activeOutlet.name });
  await writeAuditLog({ userId: user.id, userEmail: user.email, outletId: user.role.name === "admin" ? null : activeOutlet.id, action: "download", entity: "backup", metadata: { scope: payload.scope, complete: payload.complete, version: payload.version } });
  const filename = `backup-pospintar-${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}.json`;
  return new NextResponse(JSON.stringify(payload), { headers: { "cache-control": "private, no-store", "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${filename}"` } });
}