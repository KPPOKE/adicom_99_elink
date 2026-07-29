# Operasional Produksi

Dokumen ini adalah sumber utama deployment, backup, restore, dan monitoring PosPintar pada VPS aaPanel.

## Arsitektur

- Branch `main` menjalankan audit dependency, migration database CI, lint, unit test, build, dan Playwright.
- Commit yang lulus diterbitkan ke branch `deploy`, lalu GitHub Actions memanggil webhook aaPanel.
- Release dibangun di `/www/adicom99-deploy/releases/<sha>` saat versi lama tetap aktif.
- `.env` dan upload disimpan di `/www/adicom99-deploy/shared`.
- `/www/wwwroot/adicom99` menjadi symlink ke release aktif.
- PM2 menjalankan satu instance cluster bernama `adicom99` dan melakukan reload setelah release siap.

## 1. Persiapan GitHub

Biarkan deployment otomatis nonaktif selama bootstrap. Tambahkan:

- Repository secret `DEPLOY_WEBHOOK_URL`: URL webhook aaPanel.
- Repository variable `ENABLE_PRODUCTION_DEPLOY`: isi `false` dahulu.

Workflow tetap menjalankan quality check saat variable belum diaktifkan, tetapi tidak memanggil server.

## 2. Bootstrap Release di VPS

Pastikan commit terbaru sudah berada di `/www/wwwroot/adicom99` melalui webhook lama. Install kebutuhan sistem sesuai distro VPS. Contoh Ubuntu/Debian:

```bash
apt-get update
apt-get install -y rsync restic rclone
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 20M
pm2 set pm2-logrotate:retain 14
```

Jalankan bootstrap sekali:

```bash
cd /www/wwwroot/adicom99
bash ops/bootstrap-production.sh
```

Bootstrap membangun release sebelum menghentikan aplikasi. Restart singkat hanya terjadi saat direktori lama diganti menjadi symlink. Direktori lama disimpan sebagai `/www/adicom99-deploy/legacy-*` untuk rollback awal.

Ganti isi command webhook aaPanel menjadi:

```bash
#!/usr/bin/env bash
exec bash /www/adicom99-deploy/source/ops/webhook.sh
```

Nonaktifkan webhook GitHub lama yang langsung memanggil aaPanel setiap push `main`. Setelah backup dan monitoring selesai, ubah `ENABLE_PRODUCTION_DEPLOY` menjadi `true`, lalu jalankan workflow `Production` secara manual sekali.

## 3. Backup Google Drive

Buat remote Google Drive bernama `gdrive-adicom99`:

```bash
rclone config
rclone lsd gdrive-adicom99:
```

Buat password repository dan konfigurasi restic:

```bash
cd /www/adicom99-deploy/shared
mkdir -p backup
openssl rand -base64 48 > restic-password
chmod 600 restic-password
cat > restic.env <<'EOF'
RESTIC_REPOSITORY="rclone:gdrive-adicom99:adicom99-production/restic"
RESTIC_PASSWORD_FILE="/www/adicom99-deploy/shared/restic-password"
RCLONE_CONFIG="/root/.config/rclone/rclone.conf"
MYSQL_DATABASE="NAMA_DATABASE_PRODUCTION"
EOF
chmod 600 restic.env
```

Buat kredensial dump database. Gunakan user database yang memiliki akses baca penuh terhadap database aplikasi:

```bash
cat > mysql-backup.cnf <<'EOF'
[client]
host=127.0.0.1
port=3306
user=USER_DATABASE
password=PASSWORD_DATABASE
EOF
chmod 600 mysql-backup.cnf
```

Buat kredensial terpisah untuk restore drill. Akun ini harus boleh membuat dan menghapus database sementara:

```bash
cat > mysql-restore.cnf <<'EOF'
[client]
host=127.0.0.1
port=3306
user=USER_ADMIN_DATABASE
password=PASSWORD_ADMIN_DATABASE
EOF
chmod 600 mysql-restore.cnf
```

Inisialisasi repository dan lakukan backup pertama:

```bash
set -a
source /www/adicom99-deploy/shared/restic.env
set +a
restic init
bash /www/adicom99-deploy/source/ops/backup.sh
curl --fail http://127.0.0.1:3000/api/health/backup
```

Tambahkan cron dengan `crontab -e`:

```cron
0 2 * * * /bin/bash /www/adicom99-deploy/source/ops/backup.sh >> /var/log/adicom99-backup.log 2>&1
0 3 * * 0 /bin/bash /www/adicom99-deploy/source/ops/backup-check.sh >> /var/log/adicom99-backup-check.log 2>&1
```

Retensi adalah 7 backup harian, 4 mingguan, dan 6 bulanan. Backup berisi dump MySQL, upload, dan `.env`; repository terenkripsi oleh restic.

Simpan salinan password restic di password manager di luar VPS. Backup tidak dapat dipulihkan tanpa password tersebut.

## 4. Restore Drill

Jalankan setelah setup dan minimal sebulan sekali:

```bash
bash /www/adicom99-deploy/source/ops/restore-verify.sh
```

Script memulihkan snapshot terbaru ke direktori sementara dan database `adicom99_restore_check`, memastikan tabel tersedia, lalu menghapus database uji. Script tidak mengubah database production.

Untuk melihat snapshot:

```bash
set -a
source /www/adicom99-deploy/shared/restic.env
set +a
restic snapshots --tag adicom99
```

## 5. UptimeRobot

Buat dua HTTP monitor dengan interval lima menit:

- `https://DOMAIN/api/health` untuk proses aplikasi dan koneksi database.
- `https://DOMAIN/api/health/backup` untuk memastikan backup terakhir berumur kurang dari 26 jam.

Aktifkan alert email dan kanal notifikasi operasional yang digunakan. Kedua endpoint mengembalikan HTTP `503` ketika pemeriksaan gagal dan tidak menampilkan detail error atau kredensial.

## 6. Verifikasi Deployment

Setelah workflow selesai:

```bash
curl --fail https://DOMAIN/api/health
pm2 status adicom99
pm2 logs adicom99 --lines 100
readlink -f /www/wwwroot/adicom99
```

Webhook memakai lock agar dua deployment tidak berjalan bersamaan. Jika release baru gagal health check, symlink dan PM2 otomatis dikembalikan ke release sebelumnya. Migration tidak di-rollback, sehingga migration production harus tetap backward-compatible.

## Aturan Produksi

- Jangan menjalankan `prisma db seed` pada deployment production.
- Jangan mengubah file di release aktif; perubahan harus melalui Git.
- Jangan menyimpan `.env`, password restic, konfigurasi rclone, atau kredensial MySQL di repository.
- Review hasil backup dan UptimeRobot setiap hari kerja.
- Hapus direktori `legacy-*` hanya setelah deployment release dan restore drill dinyatakan berhasil.
