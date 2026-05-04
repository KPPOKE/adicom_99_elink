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
npm install
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

- `admin@adicom99.com`
- `password123`

## Fitur MVP

- Login admin/staff dan protected dashboard
- Dashboard analytics harian, grafik pemasukan 7 hari, grafik kategori transaksi
- CRUD inventory, kategori, supplier, customer
- Upload gambar barang
- Transaksi multi-item dengan diskon, metode pembayaran, kembalian cash, update stok otomatis
- Pemasukan otomatis dari transaksi
- Manajemen service dengan update status cepat
- Pemasukan otomatis dari service selesai/diambil jika ada biaya final
- Keuangan manual income/expense dan summary laba bersih
- Laporan sederhana dengan tombol export siap dikembangkan
- Settings toko, invoice, logo, dan daftar user

## Catatan Produksi

- Ganti `AUTH_SECRET` sebelum deploy.
- Untuk upload produksi, pindahkan storage ke object storage seperti S3/R2.
- Tambahkan role permission yang lebih granular bila workflow staff/admin mulai kompleks.
