# PosPintar Management System

Web app internal untuk PosPintar.com: inventory, stok, transaksi penjualan, service hardware, produk digital, keuangan, laporan, dan settings toko.

## Stack

- Next.js App Router, React, TypeScript
- Tailwind CSS dan komponen shadcn/ui-style
- Prisma ORM dengan MySQL
- React Hook Form/Zod-ready validation, TanStack Table, Recharts, Lucide React
- Custom cookie authentication sederhana
- Upload gambar lokal ke `public/uploads`

## Setup

1. Install dependency:

```bash
npm ci
```

2. Buat database MySQL:

```sql
CREATE DATABASE pospintar_management;
```

3. Salin env:

```bash
cp .env.example .env
```

Sesuaikan `DATABASE_URL` dan `AUTH_SECRET`.

4. Jalankan migration dan seed:

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

5. Jalankan dev server:

```bash
npm run dev
```

Login seed:

- Development default: `admin@pospintar.com` / `password123`
- Production: set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_STAFF_EMAIL`, dan `SEED_STAFF_PASSWORD` sebelum seed.

## Fitur MVP

- Login admin/staff dan protected dashboard
- Dashboard analytics harian, grafik pemasukan 7 hari, grafik kategori transaksi
- CRUD inventory, kategori, supplier, customer
- Upload gambar barang
- Transaksi multi-item dengan diskon, metode pembayaran, kembalian cash, update stok otomatis
- Pemasukan otomatis dari transaksi berhasil; transaksi pending bisa diselesaikan atau dibatalkan
- Manajemen service dengan update status cepat
- Pemasukan service dibuat saat service ditandai lunas
- Keuangan manual income/expense, filter, edit manual, dan summary laba bersih
- Laporan penjualan, service, stok, keuangan, dan laba/rugi dengan export XLS/PDF
- Settings toko, invoice, logo, dan manajemen user admin/staff
- Role admin/staff: admin mengelola settings, user, delete/cancel; staff fokus transaksi, service, customer, finance input

## Quality Check

```bash
npm run lint
npm run test
npm run test:e2e
npm run build
```

`npm run test:e2e` memakai Playwright dan dev server lokal `http://localhost:3000`.
Jika port tersebut sedang dipakai, gunakan port lain:

```bash
PLAYWRIGHT_PORT=3004 npm run test:e2e
```

## Production

Deployment production memakai GitHub Actions, release directories, PM2, health check, backup terenkripsi ke Google Drive, dan UptimeRobot. Setup lengkap dan prosedur recovery tersedia di [docs/OPERASIONAL-PRODUKSI.md](docs/OPERASIONAL-PRODUKSI.md).

Ringkasan pemeriksaan lokal:

```bash
npm audit --omit=dev --audit-level=high
npm run lint
npm run test
npm run build
npm run test:e2e
```

Production migration dijalankan dengan `npx prisma migrate deploy`. Seed tidak dijalankan otomatis.
