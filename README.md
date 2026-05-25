# Adicom99 Management System

Web app internal untuk Adicom99.com: inventory, stok, transaksi penjualan, service hardware, produk digital, keuangan, laporan, dan settings toko.

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
CREATE DATABASE adicom99_management;
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

- Development default: `admin@adicom99.com` / `password123`
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

## Deploy ke VPS aaPanel

Rekomendasi production untuk VPS sendiri:

- Node.js `>=20.9.0`
- MySQL/MariaDB via aaPanel
- Nginx reverse proxy dengan SSL Let's Encrypt
- Process manager aaPanel atau PM2 untuk menjalankan Next.js

1. Buat database dan user khusus aplikasi:

```sql
CREATE DATABASE adicom99_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'adicom99_user'@'localhost' IDENTIFIED BY 'password-kuat';
GRANT ALL PRIVILEGES ON adicom99_management.* TO 'adicom99_user'@'localhost';
FLUSH PRIVILEGES;
```

2. Set environment production di aaPanel:

```env
NODE_ENV=production
DATABASE_URL="mysql://adicom99_user:password-kuat@localhost:3306/adicom99_management"
AUTH_SECRET="random-secret-minimal-32-karakter-panjang"
SEED_ADMIN_EMAIL="admin@adicom99.com"
SEED_ADMIN_PASSWORD="password-admin-kuat"
SEED_STAFF_EMAIL="staff@adicom99.com"
SEED_STAFF_PASSWORD="password-staff-kuat"
```

3. Install, migrate, build, dan seed jika database masih kosong:

```bash
npm ci
npx prisma migrate deploy
npx prisma db seed
npm run build
npm run start
```

4. Reverse proxy aaPanel/Nginx:

- Jalankan app Next.js di port internal, misalnya `3000`.
- Proxy domain ke `http://127.0.0.1:3000`.
- Aktifkan SSL Let's Encrypt.
- Jangan expose port Node langsung ke publik; publik cukup `80/443`.

5. Backup production:

- Backup MySQL harian.
- Backup folder `public/uploads` karena gambar barang/logo disimpan lokal.
- Simpan `.env` production di luar git.

## CI/CD GitHub Actions

Workflow `.github/workflows/deploy.yml` otomatis berjalan saat ada push ke branch `main`.

GitHub Actions akan:

- menjalankan `npm ci --include=dev`, `npm audit`, lint, unit test, dan build;
- deploy ke VPS via SSH hanya jika CI sukses;
- menjalankan `git reset --hard origin/main`, `npm ci --include=dev`, `npx prisma generate`, `npx prisma migrate deploy`, `npm run build`, lalu `pm2 restart adicom99`.

Tambahkan repository secrets berikut di GitHub:

```text
SERVER_HOST=IP_ATAU_DOMAIN_VPS
SERVER_USERNAME=root_atau_user_deploy
SERVER_PORT=22
SERVER_PASSWORD=PASSWORD_SSH_VPS
SERVER_PROJECT_PATH=/www/wwwroot/adicom99
```

Catatan:

- `.env` production tetap disimpan di VPS, bukan di GitHub.
- CI memakai MySQL service sementara di GitHub Actions, jadi tidak perlu secret database CI.
- Workflow tidak menjalankan `prisma db seed` otomatis agar data production tidak berubah.
- PM2 process name harus `adicom99`.
- Config Nginx `/uploads/` di aaPanel tetap dikelola manual di server.

## Catatan Produksi

- Ganti `AUTH_SECRET` sebelum deploy.
- Untuk VPS single-server, upload lokal `public/uploads` bisa dipakai selama ikut backup.
- Untuk multi-server/serverless, pindahkan storage ke object storage seperti S3/R2.
- Review hasil `npm audit` sebelum deploy production.
