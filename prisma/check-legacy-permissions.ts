// One-time, read-only check for staff accounts affected by the removal of
// the legacy permission fallback in lib/permission-keys.ts (hasPermission
// used to silently grant inventory.edit/delete from inventory.manage, and
// fundMutations.deposit/withdraw/moveCreate/moveDelete/withdrawDelete from
// fundMutations.manage). This script does NOT change any data — it only
// reports which staff users relied on that fallback so an admin can review
// and re-grant the specific checkboxes in Hak Akses Karyawan if needed.
//
// Run with: npx tsx prisma/check-legacy-permissions.ts
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import "dotenv/config";

function adapter() {
  const url = new URL(process.env.DATABASE_URL || "mysql://root:@localhost:3306/pospintar_management");
  return new PrismaMariaDb({
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, "")
  });
}

const prisma = new PrismaClient({ adapter: adapter() });

const FUND_MUTATION_SUB_KEYS = ["fundMutations.deposit", "fundMutations.withdraw", "fundMutations.moveCreate", "fundMutations.moveDelete", "fundMutations.withdrawDelete"];

async function main() {
  const staff = await prisma.user.findMany({
    where: { role: { name: "staff" } },
    include: { permissions: true, outlet: true },
    orderBy: { name: "asc" }
  });

  let flagged = 0;

  for (const user of staff) {
    const keys = new Set(user.permissions.map((p) => p.key));
    const notes: string[] = [];

    if (keys.has("inventory.manage")) {
      const missing = ["inventory.edit", "inventory.delete"].filter((k) => !keys.has(k));
      if (missing.length > 0) {
        notes.push(`punya "Tambah Barang" tapi TIDAK punya: ${missing.map((k) => (k === "inventory.edit" ? "Edit Barang" : "Hapus Barang")).join(", ")}`);
      }
    }

    if (keys.has("fundMutations.manage")) {
      const missing = FUND_MUTATION_SUB_KEYS.filter((k) => !keys.has(k));
      if (missing.length > 0) {
        notes.push(`punya "Kelola mutasi saldo" tapi TIDAK punya sebagian sub-izin saldo: ${missing.join(", ")}`);
      }
    }

    if (notes.length > 0) {
      flagged += 1;
      console.log(`\n- ${user.name} <${user.email}> (cabang: ${user.outlet?.name ?? "-"}, aktif: ${user.isActive ? "ya" : "tidak"})`);
      notes.forEach((note) => console.log(`    ${note}`));
    }
  }

  console.log(`\n${flagged} dari ${staff.length} akun staff kemungkinan kehilangan akses yang sebelumnya "otomatis" didapat dari fallback lama.`);
  console.log(`Tidak ada data yang diubah oleh skrip ini. Kalau ada yang perlu dikembalikan, centang manual di Pengaturan > Hak Akses Karyawan.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
