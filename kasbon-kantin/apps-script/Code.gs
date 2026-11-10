/**
 * KASBON KANTIN — Urwah Butiq · Twins Collection
 * Backend Google Apps Script (penghubung aplikasi tablet <-> Google Spreadsheet)
 *
 * Cara pakai singkat (lengkapnya di README.md):
 *   1. Buka Spreadsheet kosong > Ekstensi > Apps Script, tempel seluruh isi file ini.
 *   2. Jalankan fungsi `setup` sekali (izinkan akses saat diminta).
 *   3. Terapkan > Deployment baru > Aplikasi web
 *      - Jalankan sebagai: Saya
 *      - Yang memiliki akses: Siapa saja
 *   4. Salin URL /exec ke file js/config.js di aplikasi.
 *
 * Agar tetap cepat walau data sudah banyak:
 *   - Transaksi disimpan per bulan: sheet "Transaksi 2026-08", "Transaksi 2026-09", dst.
 *   - Menyimpan kiriman hanya menambah baris (tidak membaca seluruh data).
 *   - Foto barang disimpan terpisah (sheet "Foto") dan diunduh tablet sekali saja.
 *   - Daftar barang/nama di-cache beberapa menit (CacheService).
 */

var SHEET = {
  PENGATURAN: 'Pengaturan',
  KATEGORI: 'Kategori',
  BARANG: 'Barang',
  NAMA: 'Nama',
  PELUNASAN: 'Pelunasan',
  FOTO: 'Foto'
};
var PREFIX_TRX = 'Transaksi ';

var HEADERS = {
  Pengaturan: ['Kunci', 'Nilai', 'Keterangan'],
  Kategori: ['Nama Kategori', 'Urutan', 'Aktif'],
  Barang: ['ID', 'Nama Barang', 'Kategori', 'Harga', 'Aktif', 'Urutan', 'Diubah', 'Versi Foto'],
  Nama: ['Nama', 'Keterangan', 'No WA Wali', 'Aktif', 'Dibuat'],
  Pelunasan: ['Bulan', 'Nama', 'Total', 'Status', 'Tanggal Lunas', 'Dicatat'],
  Foto: ['ID Barang', 'Versi', 'Data Foto'],
  Transaksi: ['ID Kirim', 'Waktu Kirim', 'Tanggal', 'Bulan', 'Nama', 'ID Barang', 'Barang', 'Kategori', 'Jumlah', 'Harga Satuan', 'Subtotal', 'Status']
};

// Aksi yang wajib memakai PIN admin
var ADMIN_ACTIONS = ['cekPin', 'muatAdmin', 'rekap', 'setLunas', 'simpanBarang', 'simpanKategori', 'simpanNama', 'simpanPengaturan'];

var BATAS_FOTO = 49000; // batas karakter satu sel Spreadsheet adalah 50.000
var CACHE_MUAT = 'muat_v2';

/* =========================================================
 *  MENU & SETUP
 * ========================================================= */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Kasbon Kantin')
    .addItem('Siapkan / perbaiki sheet', 'setup')
    .addItem('Segarkan data di aplikasi', 'segarkan')
    .addToUi();
}

/** Pakai setelah mengubah barang/nama langsung di Spreadsheet, supaya tablet langsung melihat perubahannya. */
function segarkan() {
  hapusCache_();
  try { SpreadsheetApp.getActiveSpreadsheet().toast('Data aplikasi sudah disegarkan.'); } catch (err) { /* abaikan */ }
}

function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone('Asia/Makassar');

  [SHEET.PENGATURAN, SHEET.KATEGORI, SHEET.BARANG, SHEET.NAMA, SHEET.PELUNASAN, SHEET.FOTO].forEach(function (name) {
    buatSheet_(name, HEADERS[name]);
  });

  var maxR = 3000;
  sh_(SHEET.PELUNASAN).getRange(2, 1, maxR, 1).setNumberFormat('@');
  sh_(SHEET.PELUNASAN).getRange(2, 5, maxR, 1).setNumberFormat('@');
  sh_(SHEET.NAMA).getRange(2, 3, maxR, 1).setNumberFormat('@');        // No WA
  sh_(SHEET.BARANG).getRange(2, 1, maxR, 1).setNumberFormat('@');      // ID barang
  sh_(SHEET.BARANG).getRange(2, 4, maxR, 1).setNumberFormat('#,##0');
  sh_(SHEET.BARANG).getRange(2, 8, maxR, 1).setNumberFormat('@');
  sh_(SHEET.FOTO).getRange(2, 1, maxR, 2).setNumberFormat('@');
  sh_(SHEET.PENGATURAN).getRange(2, 2, 50, 1).setNumberFormat('@');

  // Isi awal (hanya jika masih kosong)
  if (sh_(SHEET.PENGATURAN).getLastRow() < 2) {
    sh_(SHEET.PENGATURAN).getRange(2, 1, 4, 3).setValues([
      ['NAMA_TOKO', 'Urwah Butiq', 'Tampil di aplikasi, PDF, dan pesan WA'],
      ['SUBJUDUL', 'Twins Collection', 'Tulisan kecil di bawah nama toko'],
      ['PIN_ADMIN', '1234', 'PIN untuk membuka Rekap & Admin. Segera ganti!'],
      ['PESAN_PENUTUP', 'Jazakumullahu khairan.', 'Kalimat penutup di pesan WA dan PDF']
    ]);
  }
  if (sh_(SHEET.KATEGORI).getLastRow() < 2) {
    sh_(SHEET.KATEGORI).getRange(2, 1, 5, 3).setValues([
      ['Makanan', 1, true], ['Minuman', 2, true], ['Pakaian', 3, true], ['Alat Olahraga', 4, true], ['Lainnya', 5, true]
    ]);
  }
  if (sh_(SHEET.BARANG).getLastRow() < 2) {
    var awal = [
      ['AIR.K', 'Minuman', 2000], ['AIR.B', 'Minuman', 3500], ['PAO', 'Makanan', 5000], ['KUE', 'Makanan', 2000],
      ['BOLU', 'Makanan', 2000], ['RONI', 'Makanan', 1000], ['DARCOK', 'Makanan', 3000], ['BANDANG', 'Makanan', 5000],
      ['JAGUNG', 'Makanan', 5000], ['ONDE', 'Makanan', 5000], ['PIMPONG', 'Makanan', 5000], ['PUDING', 'Makanan', 5000],
      ['PALBUT', 'Makanan', 10000], ['CP', 'Makanan', 10000], ['MIE TITI', 'Makanan', 15000], ['BAKSO TELUR', 'Makanan', 18000]
    ];
    var now = new Date();
    sh_(SHEET.BARANG).getRange(2, 1, awal.length, 8).setValues(awal.map(function (b, i) {
      return ['B' + (i + 1), b[0], b[1], b[2], true, i + 1, now, ''];
    }));
  }
  if (sh_(SHEET.NAMA).getLastRow() < 2) {
    sh_(SHEET.NAMA).getRange(2, 1, 1, 5).setValues([['Hudzaifah', '', '', true, new Date()]]);
  }
  sheetBulan_(Utilities.formatDate(new Date(), 'Asia/Makassar', 'yyyy-MM'), true);

  // Hapus sheet bawaan yang kosong
  ss.getSheets().forEach(function (sh) {
    var n = sh.getName();
    if ((n === 'Sheet1' || n === 'Lembar1' || n === 'Lembar 1') && sh.getLastRow() === 0 && ss.getSheets().length > 1) {
      ss.deleteSheet(sh);
    }
  });
  hapusCache_();
  return 'Selesai. Sheet sudah siap.';
}

function buatSheet_(name, h) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, h.length).setValues([h])
      .setFontWeight('bold').setBackground('#4B1A92').setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}

/** Sheet transaksi untuk satu bulan, mis. "Transaksi 2026-08". */
function sheetBulan_(bulan, buat) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = PREFIX_TRX + bulan;
  var sh = ss.getSheetByName(name);
  if (sh || !buat) return sh;
  sh = buatSheet_(name, HEADERS.Transaksi);
  var maxR = 6000;
  sh.getRange(2, 1, maxR, 1).setNumberFormat('@');                 // ID Kirim
  sh.getRange(2, 2, maxR, 1).setNumberFormat('dd/MM/yyyy HH:mm');  // Waktu
  sh.getRange(2, 3, maxR, 2).setNumberFormat('@');                 // Tanggal, Bulan
  sh.getRange(2, 6, maxR, 1).setNumberFormat('@');                 // ID Barang
  sh.getRange(2, 10, maxR, 2).setNumberFormat('#,##0');
  return sh;
}

function semuaSheetTransaksi_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheets().filter(function (s) {
    return s.getName().indexOf(PREFIX_TRX) === 0;
  });
}

/* =========================================================
 *  PINTU MASUK API
 * ========================================================= */

function doGet() {
  return json_({ ok: true, pesan: 'API Kasbon Kantin aktif.' });
}

function doPost(e) {
  var req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: 'Permintaan tidak valid.' });
  }
  try {
    var fn = ACTIONS[req.action];
    if (!fn) throw new Error('Aksi tidak dikenal: ' + req.action);
    if (ADMIN_ACTIONS.indexOf(req.action) >= 0) cekPin_(req.pin);
    var hasil = fn(req.data || {}) || {};
    hasil.ok = true;
    return json_(hasil);
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

var ACTIONS = {
  muat: aksiMuat_,
  foto: aksiFoto_,
  kirim: aksiKirim_,
  batal: aksiBatal_,
  hariIni: aksiHariIni_,
  cekPin: function () { return {}; },
  muatAdmin: aksiMuatAdmin_,
  rekap: aksiRekap_,
  setLunas: aksiSetLunas_,
  simpanBarang: aksiSimpanBarang_,
  simpanKategori: aksiSimpanKategori_,
  simpanNama: aksiSimpanNama_,
  simpanPengaturan: aksiSimpanPengaturan_
};

/* =========================================================
 *  AKSI KASIR
 * ========================================================= */

function aksiMuat_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get(CACHE_MUAT);
  if (c) return JSON.parse(c);

  var p = pengaturan_();
  var kategori = rows_(SHEET.KATEGORI).filter(function (r) { return str_(r[0]); }).map(function (r) {
    return { nama: str_(r[0]), urutan: num_(r[1]), aktif: bool_(r[2]) };
  }).sort(function (a, b) { return a.urutan - b.urutan; });

  // Beri ID pada barang yang ditambahkan manual lewat Spreadsheet
  var shB = sh_(SHEET.BARANG);
  var rb = rows_(SHEET.BARANG);
  rb.forEach(function (r, i) {
    if (str_(r[1]) && !str_(r[0])) {
      r[0] = 'B' + Date.now().toString(36) + i;
      shB.getRange(i + 2, 1).setValue(r[0]);
    }
  });
  var urutKat = {};
  kategori.forEach(function (k, i) { urutKat[k.nama] = i; });
  var barang = rb.filter(function (r) { return str_(r[1]); }).map(function (r) {
    return { id: str_(r[0]), nama: str_(r[1]), kategori: str_(r[2]), harga: num_(r[3]),
      aktif: bool_(r[4]), urutan: num_(r[5]), fotoV: str_(r[7]) };
  }).sort(function (a, b) {
    var ka = urutKat[a.kategori] === undefined ? 999 : urutKat[a.kategori];
    var kb = urutKat[b.kategori] === undefined ? 999 : urutKat[b.kategori];
    return ka - kb || a.urutan - b.urutan || (a.nama < b.nama ? -1 : 1);
  });

  var nama = rows_(SHEET.NAMA).filter(function (r) { return str_(r[0]); }).map(function (r) {
    return { nama: str_(r[0]), ket: str_(r[1]), aktif: bool_(r[3]) };
  });

  var hasil = { toko: p.NAMA_TOKO || '', subjudul: p.SUBJUDUL || '', pesanPenutup: p.PESAN_PENUTUP || '',
    kategori: kategori, barang: barang, nama: nama };
  try { cache.put(CACHE_MUAT, JSON.stringify(hasil), 600); } catch (err) { /* terlalu besar: lewati cache */ }
  return hasil;
}

function aksiFoto_(d) {
  var mau = {};
  (d.ids || []).forEach(function (id) { mau[String(id)] = true; });
  var out = {};
  rows_(SHEET.FOTO).forEach(function (r) {
    var id = str_(r[0]);
    if (mau[id] && str_(r[2])) out[id] = { v: str_(r[1]), data: str_(r[2]) };
  });
  return { foto: out };
}

function aksiKirim_(d) {
  var id = str_(d.id), nama = str_(d.nama), tanggal = str_(d.tanggal);
  if (!id || !nama || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Data kiriman tidak lengkap.');
  var items = (d.items || []).filter(function (i) { return num_(i.qty) > 0 && str_(i.nama); });
  if (!items.length) throw new Error('Belum ada barang yang dipilih.');

  var cache = CacheService.getScriptCache();
  if (cache.get('kirim_' + id)) return { duplikat: true };

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var bulan = tanggal.slice(0, 7);
    var sh = sheetBulan_(bulan, true);
    var last = sh.getLastRow();
    // Cek kiriman ganda hanya di 400 baris terakhir (kiriman ulang dari antrean tablet)
    if (last >= 2) {
      var mulai = Math.max(2, last - 399);
      var ids = sh.getRange(mulai, 1, last - mulai + 1, 1).getValues();
      for (var k = 0; k < ids.length; k++) if (String(ids[k][0]) === id) return { duplikat: true };
    }
    var now = new Date();
    var vals = items.map(function (i) {
      var q = num_(i.qty), h = num_(i.harga);
      return [id, now, tanggal, bulan, nama, str_(i.id), str_(i.nama), str_(i.kategori), q, h, q * h, 'OK'];
    });
    sh.getRange(last + 1, 1, vals.length, vals[0].length).setValues(vals);
    try { cache.put('kirim_' + id, '1', 21600); } catch (err) { /* abaikan */ }
  } finally {
    lock.releaseLock();
  }
  if (d.namaBaru) pastikanNama_(nama);
  return { duplikat: false };
}

function aksiBatal_(d) {
  var id = str_(d.id);
  if (!id) throw new Error('ID kiriman kosong.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var daftar = [];
    if (/^\d{4}-\d{2}/.test(str_(d.tanggal))) {
      var s = sheetBulan_(str_(d.tanggal).slice(0, 7), false);
      if (s) daftar.push(s);
    }
    if (!daftar.length) daftar = semuaSheetTransaksi_();
    var n = 0;
    daftar.forEach(function (sh) {
      var last = sh.getLastRow();
      if (last < 2) return;
      var data = sh.getRange(2, 1, last - 1, 12).getValues();
      data.forEach(function (r, i) {
        if (String(r[0]) === id && str_(r[11]) !== 'BATAL') {
          sh.getRange(i + 2, 12).setValue('BATAL');
          n++;
        }
      });
    });
    return { jumlah: n };
  } finally {
    lock.releaseLock();
  }
}

function aksiHariIni_(d) {
  var tanggal = str_(d.tanggal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) throw new Error('Tanggal tidak valid.');
  var tz = tz_();
  var grup = {}, urut = [];
  barisBulan_(tanggal.slice(0, 7)).forEach(function (r) {
    if (ymd_(r[2]) !== tanggal) return;
    var id = String(r[0]);
    if (!grup[id]) {
      grup[id] = { id: id, waktu: r[1] instanceof Date ? Utilities.formatDate(r[1], tz, 'HH:mm') : '',
        nama: str_(r[4]), total: 0, items: [], status: str_(r[11]) || 'OK' };
      urut.push(id);
    }
    grup[id].items.push({ nama: str_(r[6]), qty: num_(r[8]), subtotal: num_(r[10]) });
    grup[id].total += num_(r[10]);
  });
  return { kiriman: urut.map(function (id) { return grup[id]; }).reverse() };
}

/* =========================================================
 *  AKSI ADMIN
 * ========================================================= */

function aksiMuatAdmin_() {
  var p = pengaturan_();
  var nama = rows_(SHEET.NAMA).filter(function (r) { return str_(r[0]); }).map(function (r) {
    return { nama: str_(r[0]), ket: str_(r[1]), wa: str_(r[2]), aktif: bool_(r[3]) };
  });
  return { nama: nama, pengaturan: { toko: p.NAMA_TOKO || '', subjudul: p.SUBJUDUL || '', pesanPenutup: p.PESAN_PENUTUP || '' } };
}

function aksiRekap_(d) {
  var bulan = str_(d.bulan);
  if (!/^\d{4}-\d{2}$/.test(bulan)) throw new Error('Bulan tidak valid.');
  var baris = [];
  barisBulan_(bulan).forEach(function (r) {
    if (str_(r[11]) === 'BATAL' || !str_(r[4])) return;
    baris.push({ tanggal: ymd_(r[2]), nama: str_(r[4]), barang: str_(r[6]), kategori: str_(r[7]),
      qty: num_(r[8]), harga: num_(r[9]), subtotal: num_(r[10]) });
  });
  baris.sort(function (a, b) { return a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0; });
  var lunas = rows_(SHEET.PELUNASAN).filter(function (r) { return ym_(r[0]) === bulan; }).map(function (r) {
    return { nama: str_(r[1]), lunas: str_(r[3]).toUpperCase() === 'LUNAS', tanggalLunas: ymd_(r[4]) };
  });
  var wa = {};
  rows_(SHEET.NAMA).forEach(function (r) { if (str_(r[0]) && str_(r[2])) wa[str_(r[0])] = str_(r[2]); });
  return { bulan: bulan, baris: baris, pelunasan: lunas, wa: wa };
}

function aksiSetLunas_(d) {
  var bulan = str_(d.bulan), nama = str_(d.nama);
  if (!bulan || !nama) throw new Error('Data pelunasan tidak lengkap.');
  var sh = sh_(SHEET.PELUNASAN);
  var data = rows_(SHEET.PELUNASAN);
  var tgl = Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd');
  var nilai = [bulan, nama, num_(d.total), d.lunas ? 'LUNAS' : 'BELUM', d.lunas ? tgl : '', new Date()];
  for (var i = 0; i < data.length; i++) {
    if (ym_(data[i][0]) === bulan && str_(data[i][1]) === nama) {
      sh.getRange(i + 2, 1, 1, 6).setValues([nilai]);
      return { tanggalLunas: nilai[4] };
    }
  }
  sh.getRange(data.length + 2, 1, 1, 6).setValues([nilai]);
  return { tanggalLunas: nilai[4] };
}

function aksiSimpanBarang_(d) {
  var nama = str_(d.nama).toUpperCase(), kategori = str_(d.kategori), harga = num_(d.harga);
  if (!nama) throw new Error('Nama barang wajib diisi.');
  if (!kategori) throw new Error('Kategori wajib dipilih.');
  if (!(harga > 0)) throw new Error('Harga harus lebih dari 0.');
  if (d.foto && String(d.foto).length > BATAS_FOTO) throw new Error('Foto terlalu besar. Coba foto lain.');

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sh_(SHEET.BARANG);
    var data = rows_(SHEET.BARANG);
    var id = str_(d.id);
    for (var j = 0; j < data.length; j++) {
      if (str_(data[j][1]).toUpperCase() === nama && str_(data[j][0]) !== id) throw new Error('Barang "' + nama + '" sudah ada.');
    }
    var aktif = d.aktif === undefined ? true : !!d.aktif;
    var gantiFoto = d.foto !== undefined && d.foto !== null;
    if (id) {
      for (var i = 0; i < data.length; i++) {
        if (str_(data[i][0]) === id) {
          var versi = gantiFoto ? simpanFoto_(id, String(d.foto)) : str_(data[i][7]);
          sh.getRange(i + 2, 2, 1, 7).setValues([[nama, kategori, harga, aktif, data[i][5], new Date(), versi]]);
          hapusCache_();
          return { id: id, fotoV: versi };
        }
      }
      throw new Error('Barang tidak ditemukan.');
    }
    var urutan = data.reduce(function (m, r) { return Math.max(m, num_(r[5])); }, 0) + 1;
    var baru = 'B' + Date.now().toString(36);
    var v = gantiFoto && d.foto ? simpanFoto_(baru, String(d.foto)) : '';
    sh.getRange(data.length + 2, 1, 1, 8).setValues([[baru, nama, kategori, harga, aktif, urutan, new Date(), v]]);
    hapusCache_();
    return { id: baru, fotoV: v };
  } finally {
    lock.releaseLock();
  }
}

/** Simpan / hapus foto di sheet Foto. Mengembalikan versi foto ('' jika dihapus). */
function simpanFoto_(id, data) {
  var sh = sh_(SHEET.FOTO);
  var rows = rows_(SHEET.FOTO);
  var versi = data ? String(Date.now()) : '';
  for (var i = 0; i < rows.length; i++) {
    if (str_(rows[i][0]) === id) {
      sh.getRange(i + 2, 1, 1, 3).setValues([[id, versi, data]]);
      return versi;
    }
  }
  if (data) sh.getRange(rows.length + 2, 1, 1, 3).setValues([[id, versi, data]]);
  return versi;
}

function aksiSimpanKategori_(d) {
  var nama = str_(d.nama), lama = str_(d.namaLama);
  if (!nama) throw new Error('Nama kategori wajib diisi.');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = sh_(SHEET.KATEGORI);
    var data = rows_(SHEET.KATEGORI);
    for (var j = 0; j < data.length; j++) {
      if (str_(data[j][0]).toLowerCase() === nama.toLowerCase() && str_(data[j][0]) !== lama) throw new Error('Kategori "' + nama + '" sudah ada.');
    }
    var aktif = d.aktif === undefined ? true : !!d.aktif;
    if (lama) {
      for (var i = 0; i < data.length; i++) {
        if (str_(data[i][0]) === lama) {
          sh.getRange(i + 2, 1, 1, 3).setValues([[nama, data[i][1], aktif]]);
          if (lama !== nama) gantiNilaiKolom_(sh_(SHEET.BARANG), 3, lama, nama);
          hapusCache_();
          return {};
        }
      }
      throw new Error('Kategori tidak ditemukan.');
    }
    var urutan = data.reduce(function (m, r) { return Math.max(m, num_(r[1])); }, 0) + 1;
    sh.getRange(data.length + 2, 1, 1, 3).setValues([[nama, urutan, aktif]]);
    hapusCache_();
    return {};
  } finally {
    lock.releaseLock();
  }
}

function aksiSimpanNama_(d) {
  var nama = str_(d.nama).replace(/\s+/g, ' '), lama = str_(d.namaLama);
  if (!nama) throw new Error('Nama wajib diisi.');
  var wa = str_(d.wa).replace(/[^0-9+]/g, '');
  var lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    var sh = sh_(SHEET.NAMA);
    var data = rows_(SHEET.NAMA);
    for (var j = 0; j < data.length; j++) {
      if (str_(data[j][0]).toLowerCase() === nama.toLowerCase() && str_(data[j][0]) !== lama) throw new Error('Nama "' + nama + '" sudah ada.');
    }
    var aktif = d.aktif === undefined ? true : !!d.aktif;
    if (lama) {
      for (var i = 0; i < data.length; i++) {
        if (str_(data[i][0]) === lama) {
          sh.getRange(i + 2, 1, 1, 4).setValues([[nama, str_(d.ket), wa, aktif]]);
          if (lama !== nama) {
            semuaSheetTransaksi_().forEach(function (s) { gantiNilaiKolom_(s, 5, lama, nama); });
            gantiNilaiKolom_(sh_(SHEET.PELUNASAN), 2, lama, nama);
          }
          hapusCache_();
          return {};
        }
      }
      throw new Error('Nama tidak ditemukan.');
    }
    sh.getRange(data.length + 2, 1, 1, 5).setValues([[nama, str_(d.ket), wa, aktif, new Date()]]);
    hapusCache_();
    return {};
  } finally {
    lock.releaseLock();
  }
}

function aksiSimpanPengaturan_(d) {
  if (d.toko !== undefined) setPengaturan_('NAMA_TOKO', str_(d.toko));
  if (d.subjudul !== undefined) setPengaturan_('SUBJUDUL', str_(d.subjudul));
  if (d.pesanPenutup !== undefined) setPengaturan_('PESAN_PENUTUP', str_(d.pesanPenutup));
  if (d.pinBaru) {
    var pin = str_(d.pinBaru);
    if (!/^\d{4,6}$/.test(pin)) throw new Error('PIN harus 4 sampai 6 angka.');
    setPengaturan_('PIN_ADMIN', pin);
  }
  hapusCache_();
  return {};
}

/* =========================================================
 *  PEMBANTU
 * ========================================================= */

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function hapusCache_() {
  try { CacheService.getScriptCache().remove(CACHE_MUAT); } catch (err) { /* abaikan */ }
}

function sh_(name) {
  var s = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!s) throw new Error('Sheet "' + name + '" belum ada. Jalankan fungsi setup terlebih dahulu.');
  return s;
}

function rows_(name) {
  var s = sh_(name);
  var last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, 1, last - 1, HEADERS[name].length).getValues();
}

function barisBulan_(bulan) {
  var s = sheetBulan_(bulan, false);
  if (!s) return [];
  var last = s.getLastRow();
  if (last < 2) return [];
  return s.getRange(2, 1, last - 1, HEADERS.Transaksi.length).getValues();
}

function tz_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone() || 'Asia/Makassar';
}

function str_(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function num_(v) {
  if (typeof v === 'number') return v;
  var s = String(v === null || v === undefined ? '' : v).replace(/[^0-9-]/g, '');
  return s ? Number(s) : 0;
}

function bool_(v) {
  if (v === true) return true;
  var s = String(v).trim().toUpperCase();
  return s === 'TRUE' || s === 'YA' || s === 'Y' || s === '1' || s === 'AKTIF';
}

function ymd_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  return str_(v).slice(0, 10);
}

function ym_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM');
  return str_(v).slice(0, 7);
}

function pengaturan_() {
  var p = {};
  rows_(SHEET.PENGATURAN).forEach(function (r) { if (str_(r[0])) p[str_(r[0])] = str_(r[1]); });
  return p;
}

function setPengaturan_(kunci, nilai) {
  var sh = sh_(SHEET.PENGATURAN);
  var data = rows_(SHEET.PENGATURAN);
  for (var i = 0; i < data.length; i++) {
    if (str_(data[i][0]) === kunci) { sh.getRange(i + 2, 2).setValue(nilai); return; }
  }
  sh.getRange(data.length + 2, 1, 1, 3).setValues([[kunci, nilai, '']]);
}

function cekPin_(pin) {
  var benar = pengaturan_().PIN_ADMIN || '';
  if (!benar || String(pin || '') !== benar) throw new Error('PIN salah.');
}

function pastikanNama_(nama) {
  var ada = rows_(SHEET.NAMA).some(function (r) { return str_(r[0]).toLowerCase() === nama.toLowerCase(); });
  if (!ada) {
    var sh = sh_(SHEET.NAMA);
    sh.getRange(sh.getLastRow() + 1, 1, 1, 5).setValues([[nama, '', '', true, new Date()]]);
    hapusCache_();
  }
}

function gantiNilaiKolom_(sh, kolom, lama, baru) {
  var last = sh.getLastRow();
  if (last < 2) return;
  var vals = sh.getRange(2, kolom, last - 1, 1).getValues();
  var ubah = false;
  vals.forEach(function (r) { if (str_(r[0]) === lama) { r[0] = baru; ubah = true; } });
  if (ubah) sh.getRange(2, kolom, last - 1, 1).setValues(vals);
}
