# Panduan Penggunaan PosPintar Management System

Dokumen ini untuk owner, admin, dan staff outlet. Gunakan sebagai SOP awal saat training kasir atau operasional harian.

## 1. Login dan Hak Akses

1. Buka alamat aplikasi.
2. Masukkan email dan password.
3. Setelah login, aplikasi masuk ke Dashboard.
4. Cek nama user dan cabang aktif di sidebar bawah.

Perbedaan role:

- Admin: bisa mengatur toko, cabang, user, master data, laporan, dan semua menu operasional.
- Staff: fokus input transaksi, service, customer, MiniATM, sumber dana, mutasi saldo, dan keuangan sesuai cabang yang diberikan.

Catatan: data operasional mengikuti cabang aktif. Staff hanya melihat data cabangnya.

## 2. Alur Harian Kasir

1. Masuk ke Dashboard untuk melihat ringkasan hari ini.
2. Cek Sumber Dana sebelum transaksi MiniATM atau tarik tunai.
3. Input transaksi penjualan dari menu Transaksi.
4. Input transfer/tarik tunai dari menu MiniATM.
5. Input service masuk dari menu Service.
6. Catat pengeluaran manual dari menu Keuangan jika ada biaya operasional.
7. Akhir hari, cek Laporan dan cocokkan saldo dengan kas/laci/bank.

## 3. Dashboard

Dashboard dipakai untuk melihat kondisi cabang hari ini:

- Pemasukan hari ini.
- Pengeluaran hari ini.
- Laba bersih hari ini.
- Total aset dari sumber dana.
- Jumlah transaksi.
- Service masuk, selesai, dan masih proses.
- Stok hampir habis.
- Grafik pemasukan dan transaksi per kategori.
- Transaksi dan service terbaru.

Jika angka terlihat tidak sesuai, cek filter cabang aktif dan pastikan transaksi/service sudah disimpan dengan status yang benar.

## 4. Inventory

Menu Inventory dipakai untuk mengelola barang dan stok per cabang.

Tambah barang:

1. Masuk ke Inventory.
2. Klik Tambah Barang.
3. Isi nama barang, kode barang, kategori, supplier, harga modal, harga jual, stok, stok minimum, satuan, dan deskripsi.
4. Upload gambar jika ada.
5. Klik Simpan Barang.

Status stok:

- Aman: stok masih di atas stok minimum.
- Hampir Habis: stok sudah mendekati stok minimum.
- Habis: stok 0.

Catatan: kode barang boleh sama di cabang berbeda, tetapi tidak boleh duplikat di cabang yang sama.

## 5. Kategori, Supplier, dan Customer

Kategori:

1. Masuk ke Kategori.
2. Tambahkan kategori barang, contoh RAM, SSD, Charger, Produk Digital.
3. Kategori dipakai saat membuat barang inventory.

Supplier:

1. Masuk ke Supplier.
2. Simpan nama, nomor HP, alamat, dan catatan supplier.
3. Supplier bisa dipilih saat input barang.

Customer:

1. Masuk ke Customer.
2. Simpan nama, nomor HP, email, dan alamat.
3. Customer bisa dipilih saat transaksi atau service.
4. Riwayat customer bisa dilihat dari detail customer.

## 6. Transaksi Penjualan

Gunakan menu Transaksi untuk penjualan barang, produk digital, atau aksesoris.

Buat transaksi:

1. Masuk ke Transaksi.
2. Pilih customer jika ada. Jika customer tidak terdaftar, isi nama manual bila diperlukan.
3. Pilih barang dari inventory.
4. Isi qty dan cek harga.
5. Atur diskon jika ada.
6. Pilih metode pembayaran.
7. Untuk cash, isi uang dibayar agar kembalian terhitung.
8. Klik Simpan Transaksi.

Setelah transaksi berhasil:

- Stok barang otomatis berkurang.
- Pemasukan otomatis masuk ke Keuangan.
- Invoice bisa dibuka/cetak dari tombol invoice.

Jika transaksi salah, admin bisa membatalkan transaksi. Pembatalan akan mengembalikan stok sesuai transaksi tersebut.

## 7. MiniATM

Menu MiniATM dipakai untuk transfer, tarik tunai, dan pencatatan profit admin loket.

Sebelum memakai MiniATM:

1. Pastikan Sumber Dana sudah dibuat, misalnya LACI, BRI, BCA, DANA, atau server pulsa.
2. Pastikan saldo sumber dana cukup.
3. Jika perlu tambah saldo awal/modal harian, gunakan menu Sumber Dana atau Mutasi Saldo.

Input MiniATM:

1. Masuk ke MiniATM.
2. Pilih jenis transaksi.
3. Pilih sumber dana.
4. Isi bank tujuan, nomor rekening, nama penerima, nominal, dan admin loket.
5. Simpan transaksi.
6. Jika transaksi benar-benar berhasil, klik tombol Berhasil.
7. Jika gagal, klik tombol Gagal.

Catatan penting:

- Profit yang masuk Keuangan adalah admin loket, bukan seluruh nominal transfer.
- Jika transaksi dibuka ulang oleh admin, mutasi saldo dan finance record akan dibalik.

## 8. Sumber Dana

Menu Sumber Dana dipakai untuk menyimpan saldo operasional cabang.

Contoh sumber dana:

- LACI untuk uang tunai.
- BRI/BCA untuk saldo bank.
- DANA/OVO untuk e-wallet.
- Server Pulsa untuk saldo produk digital.

Tambah sumber dana:

1. Masuk ke Sumber Dana.
2. Isi nama sumber dana.
3. Pilih tipe: Cash, Bank, E-wallet, Server Pulsa, atau Lainnya.
4. Isi saldo awal.
5. Tambahkan catatan jika perlu.
6. Klik Tambah.

Saldo sumber dana dipakai oleh MiniATM dan Mutasi Saldo.

## 9. Mutasi Saldo

Menu Mutasi Saldo dipakai untuk tambah, ambil, atau pindah saldo antar sumber dana.

Contoh pemakaian:

- Tambah modal awal ke LACI.
- Tambah deposit ke bank.
- Pindahkan saldo dari LACI ke bank.
- Ambil uang dari sumber dana untuk kebutuhan tertentu.

Langkah umum:

1. Masuk ke Mutasi Saldo.
2. Pilih mode mutasi.
3. Pilih sumber dana asal atau tujuan sesuai mode.
4. Isi nominal.
5. Isi admin fee jika ada.
6. Tambahkan catatan.
7. Klik Simpan Mutasi.

## 10. Service

Menu Service dipakai untuk mencatat perangkat masuk, diagnosa, sparepart, status, dan pembayaran service.

Input service masuk:

1. Masuk ke Service.
2. Klik Service Masuk.
3. Pilih customer terdaftar atau isi customer manual.
4. Isi nomor HP, jenis perangkat, brand, model, dan keluhan.
5. Isi estimasi biaya jika sudah ada.
6. Tambahkan sparepart dari inventory jika service memakai barang.
7. Isi biaya jasa/labor dan biaya final jika sudah diketahui.
8. Klik Simpan Service.

Status service:

- Masuk: perangkat baru diterima.
- Dicek: teknisi sedang cek perangkat.
- Menunggu Konfirmasi: menunggu persetujuan customer.
- Diproses: service sedang dikerjakan.
- Selesai: perangkat selesai dan siap diambil.
- Diambil: perangkat sudah diambil customer.
- Batal: service dibatalkan.

Sparepart service:

- Sparepart dipilih dari inventory cabang aktif.
- Saat service memakai sparepart, stok akan ikut dihitung oleh sistem.
- Pastikan stok sparepart cukup sebelum menyimpan service.

Pembayaran service:

1. Setelah service punya biaya final, klik tombol tandai dibayar.
2. Konfirmasi pembayaran.
3. Pemasukan service otomatis masuk ke Keuangan.

## 11. Keuangan

Menu Keuangan dipakai untuk melihat dan mencatat pemasukan/pengeluaran.

Otomatis masuk ke Keuangan:

- Transaksi penjualan berhasil.
- Service yang ditandai lunas.
- Profit MiniATM.

Catat manual:

1. Masuk ke Keuangan.
2. Klik Catat Manual.
3. Pilih pemasukan atau pengeluaran.
4. Isi kategori, nominal, tanggal, dan deskripsi.
5. Klik Simpan.

Contoh pengeluaran manual: listrik, bensin, operasional toko, pembelian kecil yang tidak lewat inventory.

## 12. Laporan

Menu Laporan dipakai untuk cek hasil operasional.

Jenis laporan:

- Penjualan.
- Service.
- Stok.
- Keuangan.
- Laba/Rugi.

Cara pakai:

1. Masuk ke Laporan.
2. Pilih periode: hari ini, minggu ini, bulan ini, atau custom tanggal.
3. Cek summary pemasukan, pengeluaran, dan laba/rugi.
4. Gunakan tombol export jika perlu file laporan.

Catatan: laporan mengikuti cabang aktif dan data yang sudah tersimpan di transaksi, service, dan keuangan.

## 13. Settings Admin

Menu Settings hanya untuk admin.

Yang bisa diatur:

- Profil toko.
- Logo toko.
- Alamat.
- WhatsApp dan email.
- Format invoice.
- Data user.
- Manajemen cabang.

Tambah cabang:

1. Masuk ke Settings.
2. Bagian Manajemen Cabang.
3. Klik Tambah.
4. Isi kode cabang, nama cabang, dan alamat.
5. Simpan.

Tambah user staff:

1. Masuk ke Settings.
2. Bagian Data User.
3. Klik Tambah User.
4. Isi nama, email, role staff, outlet/cabang, dan password.
5. Simpan User.

Pastikan setiap staff dipasang ke cabang yang benar.

## 14. Contoh Alur Lengkap

Jual barang:

1. Pastikan barang ada di Inventory.
2. Masuk ke Transaksi.
3. Pilih customer jika ada.
4. Pilih barang dan qty.
5. Isi pembayaran.
6. Simpan transaksi.
7. Cek stok berkurang dan pemasukan muncul di Keuangan.

Input service dengan sparepart:

1. Pastikan sparepart ada di Inventory.
2. Masuk ke Service.
3. Input data customer dan perangkat.
4. Tambah sparepart dari inventory.
5. Isi biaya jasa dan final cost.
6. Simpan service.
7. Update status sesuai proses teknisi.
8. Saat customer bayar, tandai service lunas.

Input MiniATM transfer:

1. Pastikan saldo Sumber Dana cukup.
2. Masuk ke MiniATM.
3. Isi data rekening tujuan, nominal, dan admin loket.
4. Simpan sebagai pending.
5. Setelah transfer sukses, klik Berhasil.
6. Cek profit masuk ke Keuangan.

Tutup hari:

1. Cek Dashboard.
2. Cek Keuangan hari ini.
3. Cek saldo Sumber Dana.
4. Buka Laporan harian.
5. Cocokkan kas fisik, saldo bank/e-wallet, dan laporan sistem.

## 15. Masalah Umum

Tidak bisa login:

- Pastikan email dan password benar.
- Hubungi admin untuk reset password.

Staff tidak melihat data:

- Pastikan staff sudah dipasang ke cabang yang benar di Settings.
- Pastikan data memang dibuat di cabang tersebut.

Barang tidak muncul di transaksi/service:

- Pastikan barang ada di Inventory cabang aktif.
- Pastikan stok masih tersedia.
- Untuk sparepart service, produk digital tidak ditampilkan sebagai sparepart.

Stok tidak sesuai:

- Cek transaksi berhasil/batal.
- Cek service yang memakai sparepart.
- Cek apakah barang dibuat di cabang yang benar.

Service tidak bisa ditandai lunas:

- Pastikan biaya final sudah diisi.

Saldo sumber dana tidak cukup:

- Tambahkan saldo lewat Sumber Dana atau Mutasi Saldo.
- Cek transaksi MiniATM pending/berhasil.

Laporan tidak sesuai:

- Pastikan periode tanggal benar.
- Pastikan cabang aktif benar.
- Pastikan transaksi/service sudah berstatus benar.

## 16. Kebiasaan Operasional yang Disarankan

- Input transaksi langsung saat terjadi, jangan ditunda.
- Jangan memakai satu akun staff untuk banyak cabang.
- Cek stok hampir habis setiap hari.
- Cek saldo sumber dana sebelum buka layanan MiniATM.
- Export laporan harian setelah tutup kas.
- Backup database dan upload gambar secara rutin dari server.
