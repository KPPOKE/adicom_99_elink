import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { BACKUP_FORMAT, BACKUP_ROW_LIMIT, BACKUP_VERSION, buildBackupPayload, type BackupPayload } from "@/lib/backup-data";
import { prisma } from "@/lib/prisma";
import { assertTrustedOrigin } from "@/lib/security";

const MAX_RESTORE_SIZE = 10 * 1024 * 1024;
const TABLES = ["outlets", "users", "categories", "suppliers", "customers", "customerOutlets", "items", "transactions", "services", "bankTransfers", "bankTransferDeposits", "fundAccounts", "fundMutations", "financeRecords", "receivables", "payrolls", "receiptBanks", "receiptSettings", "settings"] as const;

function parseBackup(text: string) {
  const payload = JSON.parse(text) as Partial<BackupPayload>;
  if (payload.format !== BACKUP_FORMAT || payload.version !== BACKUP_VERSION) throw new Error("Format backup tidak didukung");
  if (payload.scope !== "all") throw new Error("Restore membutuhkan backup semua cabang");
  if (!payload.complete) throw new Error("Backup terpotong dan tidak aman untuk dipulihkan");
  if (!payload.data || typeof payload.data !== "object") throw new Error("Isi backup tidak lengkap");
  for (const table of TABLES) {
    const rows = payload.data[table];
    if (!Array.isArray(rows) || rows.length >= BACKUP_ROW_LIMIT) throw new Error(`Data ${table} tidak valid atau terpotong`);
  }
  return payload as BackupPayload;
}

function plainRows(rows: unknown[], relation: string) {
  return rows.map((value) => { const row = { ...(value as Record<string, unknown>) }; delete row[relation]; return row; });
}

export async function POST(request: Request) {
  await assertTrustedOrigin();
  const user = await requireAdmin();
  const form = await request.formData();
  if (form.get("confirmation") !== "PULIHKAN") return NextResponse.json({ error: "Konfirmasi restore tidak valid" }, { status: 400 });
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > MAX_RESTORE_SIZE) return NextResponse.json({ error: "File backup wajib diisi dan maksimal 10 MB" }, { status: 400 });

  try {
    const payload = parseBackup(await file.text());
    const outletIds = payload.data.outlets.map((row) => row.id).sort((a, b) => a - b);
    const userIds = payload.data.users.map((row) => row.id).sort((a, b) => a - b);
    const [currentOutlets, currentUsers] = await Promise.all([
      prisma.outlet.findMany({ select: { id: true }, orderBy: { id: "asc" } }),
      prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true } })
    ]);
    if (JSON.stringify(currentOutlets.map((row) => row.id)) !== JSON.stringify(outletIds)) throw new Error("Daftar cabang saat ini berbeda dari backup");
    if (currentUsers.length !== userIds.length) throw new Error("Ada akun referensi backup yang tidak tersedia");

    const activeOutlet = currentOutlets[0];
    const safety = await buildBackupPayload({ isAdmin: true, outletId: activeOutlet.id, outletName: "Semua Cabang" });
    if (!safety.complete) throw new Error("Snapshot sebelum restore terpotong; gunakan backup database server");
    const backupDir = path.join(process.cwd(), "storage", "backups");
    await mkdir(backupDir, { recursive: true });
    await writeFile(path.join(backupDir, `pre-restore-${Date.now()}.json`), JSON.stringify(safety), { flag: "wx" });

    const data = payload.data;
    await prisma.$transaction(async (tx) => {
      await tx.financeRecord.deleteMany(); await tx.fundMutation.deleteMany(); await tx.transactionItem.deleteMany(); await tx.servicePart.deleteMany();
      await tx.receivable.deleteMany(); await tx.payroll.deleteMany(); await tx.receiptBankAccount.deleteMany(); await tx.receiptSetting.deleteMany();
      await tx.bankTransferDeposit.deleteMany(); await tx.bankTransfer.deleteMany(); await tx.transaction.deleteMany(); await tx.service.deleteMany();
      await tx.item.deleteMany(); await tx.customerOutlet.deleteMany(); await tx.fundAccount.deleteMany(); await tx.customer.deleteMany();
      await tx.supplier.deleteMany(); await tx.category.deleteMany(); await tx.setting.deleteMany();
      for (const outlet of data.outlets) await tx.outlet.update({ where: { id: outlet.id }, data: { code: outlet.code, name: outlet.name, address: outlet.address, color: outlet.color } });
      await tx.category.createMany({ data: data.categories as never }); await tx.supplier.createMany({ data: data.suppliers as never }); await tx.customer.createMany({ data: data.customers as never });
      await tx.customerOutlet.createMany({ data: data.customerOutlets as never }); await tx.item.createMany({ data: data.items as never }); await tx.fundAccount.createMany({ data: data.fundAccounts as never });
      await tx.transaction.createMany({ data: plainRows(data.transactions, "items") as never });
      await tx.transactionItem.createMany({ data: data.transactions.flatMap((row) => row.items) as never });
      await tx.service.createMany({ data: plainRows(data.services, "parts") as never });
      await tx.servicePart.createMany({ data: data.services.flatMap((row) => row.parts) as never });
      await tx.bankTransfer.createMany({ data: data.bankTransfers as never }); await tx.bankTransferDeposit.createMany({ data: data.bankTransferDeposits as never });
      await tx.fundMutation.createMany({ data: data.fundMutations as never }); await tx.financeRecord.createMany({ data: data.financeRecords as never });
      await tx.receivable.createMany({ data: data.receivables as never }); await tx.payroll.createMany({ data: data.payrolls as never });
      await tx.receiptBankAccount.createMany({ data: data.receiptBanks as never }); await tx.receiptSetting.createMany({ data: data.receiptSettings as never }); await tx.setting.createMany({ data: data.settings as never });
      await tx.auditLog.create({ data: { userId: user.id, userEmail: user.email, action: "restore", entity: "backup", metadata: { generatedAt: payload.generatedAt, counts: payload.counts, version: payload.version } } });
    }, { maxWait: 10_000, timeout: 120_000 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Restore gagal" }, { status: 400 });
  }
}