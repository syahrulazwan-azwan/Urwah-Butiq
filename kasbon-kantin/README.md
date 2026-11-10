# Kasbon Kantin — Urwah Butiq · Twins Collection

Aplikasi tablet untuk mencatat kasbon kantin. Penjaga kantin cukup **ketuk nama → ketuk barang → KIRIM**. Rekap per orang per bulan dibuat otomatis, lalu bisa dikirim ke wali lewat WhatsApp (teks atau PDF).

- **Tampilan:** halaman web (HTML/CSS/JS) yang di-hosting gratis di **GitHub Pages**
- **Penyimpanan:** **Google Spreadsheet**, lewat **Google Apps Script** sebagai penghubung
- **Perangkat:** tablet dalam posisi mendatar (landscape)

---

## Isi folder

| File / folder | Fungsi |
|---|---|
| `index.html` | Halaman aplikasi |
| `css/style.css` | Tampilan |
| `js/app.js` | Logika aplikasi (Kasir, Rekap, Admin) |
| `js/config.js` | **Tempat menaruh alamat Apps Script** (wajib diisi) |
| `js/vendor/` | Pustaka pembuat PDF (jsPDF, lisensi MIT) |
| `assets/logo.png` | Logo toko |
| `sw.js`, `manifest.json` | Supaya aplikasi bisa dipasang di layar tablet dan tetap terbuka walau internet putus |
| `apps-script/Code.gs` | Kode untuk Google Apps Script (ditempel di Spreadsheet) |

---

## Langkah 1 — Siapkan Spreadsheet & Apps Script

1. Buat **Google Spreadsheet baru**, misalnya beri nama "Kasbon Kantin".
   > **Penting:** gunakan akun Gmail yang boleh membagikan aplikasi ke **"Siapa saja"**. Akun sekolah/kantor (Google Workspace) kadang dibatasi admin. Kalau di langkah 5 pilihan "Siapa saja" tidak muncul, pakai akun Gmail pribadi atau akun khusus toko.
2. Di Spreadsheet, klik menu **Ekstensi → Apps Script**.
3. Hapus semua isi `Code.gs` di editor, lalu **tempel seluruh isi file `apps-script/Code.gs`**. Klik ikon **Simpan**.
4. Di bagian atas editor, pilih fungsi **`setup`** lalu klik **Jalankan**. Saat diminta izin, pilih akun Anda, klik **Lanjutan → Buka (tidak aman)**, lalu **Izinkan**. Ini normal karena skripnya buatan sendiri.
   Sheet berikut akan dibuat otomatis: *Pengaturan, Kategori, Barang, Nama, Pelunasan, Foto,* dan *Transaksi (bulan ini)*.
5. Klik **Terapkan → Deployment baru**, lalu klik ikon roda gigi dan pilih **Aplikasi web**:
   - Deskripsi: `Kasbon Kantin`
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**

   Klik **Terapkan**, lalu **salin URL Aplikasi web** (berakhiran `/exec`).
6. Untuk mengecek, buka URL itu di browser. Kalau muncul `{"ok":true,"pesan":"API Kasbon Kantin aktif."}`, berarti berhasil.

## Langkah 2 — Sambungkan aplikasi

Buka file `js/config.js` dan tempel URL tadi:

```js
window.KASBON_CONFIG = {
  API_URL: 'https://script.google.com/macros/s/AKfycb..../exec'
};
```

## Langkah 3 — Unggah ke GitHub & aktifkan GitHub Pages

1. Buka **GitHub Desktop → File → Add local repository**, lalu pilih folder ini.
   Kalau muncul tulisan "This directory does not appear to be a Git repository", klik **create a repository**, lalu **Create repository**.
2. Klik **Publish repository**. Hapus centang **Keep this code private**, karena GitHub Pages gratis hanya untuk repositori publik.
3. Buka repositorinya di **github.com → Settings → Pages**:
   - Source: **Deploy from a branch**
   - Branch: **main**, folder **/ (root)** → **Save**
4. Tunggu 1–2 menit. Alamat aplikasinya akan berbentuk:
   `https://NAMA-AKUN-GITHUB.github.io/NAMA-REPOSITORI/`

## Langkah 4 — Pasang di tablet

1. Buka alamat aplikasi di **Chrome** pada tablet.
2. Ketuk menu **⋮ → Tambahkan ke layar utama** (atau **Instal aplikasi**).
3. Buka aplikasi dari ikon di layar utama. Aplikasi akan tampil penuh tanpa bilah browser.
4. Pastikan tablet dalam posisi **mendatar**.
5. Masuk ke **Admin**. PIN awalnya **1234**, jadi **segera ganti** di menu *Pengaturan*.

---

## Cara pakai

### Kasir (untuk penjaga kantin, tanpa PIN)
1. **Pilih nama.** Ketuk nama di kolom kiri, atau ketik di kotak cari. Kalau orangnya belum ada di daftar, ketuk **Nama baru**.
2. **Ketuk barang.** Setiap ketukan menambah 1. Tab di atas memisahkan kategori (Makanan, Minuman, Pakaian, dll.).
3. **Periksa, lalu tekan KIRIM.** Jumlah bisa diubah dengan tombol − / +.
4. Muncul layar hijau **"Sudah tercatat"**. Layar ini tertutup sendiri setelah 6 detik, siap untuk orang berikutnya.
   - Salah catat? Tekan **Salah? Batalkan**. Barang kembali ke keranjang untuk diperbaiki.
   - Mau membatalkan catatan yang lebih lama hari ini? Buka tombol **Riwayat**.
5. Orang yang sama boleh mengambil lagi di hari yang sama, berapa kali pun. Di rekap, semuanya otomatis digabung per tanggal.
6. Untuk menyalin catatan yang terlewat dari buku, ketuk **tanggal** di bagian atas lalu pilih tanggal yang dimaksud. Layar akan memberi tanda oranye selama tanggalnya bukan hari ini.

**Kalau internet putus:** catatan tetap **aman tersimpan di tablet**. Penanda di atas akan bertuliskan "*n menunggu terkirim*", dan catatan otomatis terkirim begitu internet tersambung. Tidak perlu ditulis di buku.

### Rekap (pakai PIN admin)
- Pilih bulan dengan tombol ‹ ›, lalu ketuk nama di kiri untuk melihat rinciannya. Tampilan bisa **per tanggal** (seperti buku) atau **per barang**.
- **Kirim rekap ke WA:** membuka WhatsApp dengan teks rekap, langsung ke nomor wali kalau nomornya sudah diisi.
- **Kirim PDF:** membuat PDF lalu membuka menu bagikan di tablet. Pilih WhatsApp, lalu pilih walinya.
- **Cetak**, **Salin teks**, dan **PDF ringkasan bulan** (semua nama beserta totalnya).
- **Tandai lunas** setelah kasbon dibayar.

### Admin (pakai PIN admin)
- **Barang & harga:** tambah atau ubah barang, harga, kategori, dan **foto** (ambil dari kamera atau galeri; foto diperkecil otomatis). Barang yang tidak dijual lagi cukup **dimatikan**, jangan dihapus, supaya rekap lama tetap utuh.
- **Kategori:** tambah kategori baru, misalnya Pakaian, Alat Olahraga, atau Alat Tulis.
- **Daftar nama:** tambah nama, keterangan (kelas/kamar), dan **No WhatsApp wali**. Santri yang pindah atau lulus cukup disembunyikan.
- **Pengaturan:** nama toko, tulisan kecil di bawahnya, kalimat penutup pesan WA, dan **ganti PIN**.
- Tekan **Kunci (keluar admin)** sebelum tablet dipakai lagi oleh penjaga kantin.

---

## Supaya tetap cepat walau data sudah banyak

- **KIRIM terasa instan.** Catatan langsung disimpan di tablet, lalu dikirim ke Spreadsheet di belakang layar.
- **Transaksi dipisah per bulan** (sheet `Transaksi 2026-08`, `Transaksi 2026-09`, dst.), jadi rekap hanya membaca bulan yang dibuka.
- **Menyimpan hanya menambah baris**, tidak membaca seluruh data.
- **Daftar barang, nama, dan foto disimpan di tablet**, jadi pindah halaman tidak menunggu internet.
- **Rekap yang pernah dibuka langsung tampil**, lalu diperbarui di belakang layar.

## Kalau mengubah data langsung di Spreadsheet

Barang, nama, dan kategori boleh ditambah langsung di sheetnya. Setelah itu, pilih menu **Kasbon Kantin → Segarkan data di aplikasi** di Spreadsheet supaya tablet langsung melihat perubahannya. Tanpa langkah ini, perubahan muncul paling lambat ±10 menit.

Jangan mengubah **nama sheet** atau **urutan kolom**, karena aplikasi membacanya berdasarkan posisi.

## Kalau kode diperbarui

- **Tampilan aplikasi** (`index.html`, `css`, `js`):
  1. Ubah angka `VERSI` di `sw.js` (misalnya `kasbon-v2`).
  2. Di GitHub Desktop, isi ringkasan perubahan, klik **Commit to main**, lalu **Push origin**.
  3. Tablet akan memakai versi baru setelah aplikasinya dibuka ulang.
- **Apps Script** (`Code.gs`):
  1. Tempel kode baru di editor Apps Script, lalu simpan.
  2. Klik **Terapkan → Kelola deployment**, lalu ikon pensil.
  3. Pada **Versi**, pilih **Versi baru**, lalu klik **Terapkan**. URL-nya tetap sama, jadi `config.js` tidak perlu diubah.

## Keamanan & batasan

- **Ganti PIN admin** dari 1234 secepatnya. PIN diperiksa di Apps Script, bukan di tablet.
- Layar Kasir sengaja dibuat tanpa PIN supaya cepat. Alamat API ada di `config.js`, jadi jangan bagikan alamat aplikasi ke sembarang orang.
- Repositori GitHub ini publik, tetapi **datanya tidak ikut ke GitHub**. Semua data tetap di Spreadsheet milik Anda.
- Foto disimpan di sheet `Foto`, satu foto ±25 KB.
- Disarankan memakai satu tablet kasir. Beberapa tablet sekaligus juga bisa, karena penyimpanan di Apps Script memakai kunci antrean.

## Rencana ke depan: pindah ke Firebase / Supabase

Semua akses data aplikasi ada di satu fungsi, `api(action, data, pin)` di `js/app.js`. Aksinya: `muat, foto, kirim, batal, hariIni, cekPin, muatAdmin, rekap, setLunas, simpanBarang, simpanKategori, simpanNama, simpanPengaturan`. Untuk pindah ke Firebase atau Supabase, cukup buat backend baru dengan aksi dan bentuk balasan yang sama, lalu ganti isi fungsi `api()`. Tampilan dan alur kasir tidak perlu diubah, dan data lama bisa diimpor dari Spreadsheet.
