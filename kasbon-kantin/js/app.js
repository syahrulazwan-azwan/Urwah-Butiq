/* =========================================================
   Kasbon Kantin — Urwah Butiq · Twins Collection
   Aplikasi tablet: Kasir, Rekap, Admin.
   Data disimpan di Google Spreadsheet lewat Google Apps Script.
   ========================================================= */
(function () {
  'use strict';

  var CFG = window.KASBON_CONFIG || {};
  var API_URL = String(CFG.API_URL || '').trim();

  /* ---------------- Pembantu ---------------- */
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function angka(n) {
    n = Math.round(Number(n) || 0);
    return (n < 0 ? '-' : '') + String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function rp(n) { return 'Rp ' + angka(n); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function ymdOf(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function hariIni() { return ymdOf(new Date()); }
  function keDate(ymd) { var p = ymd.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function tglPanjang(ymd) { var d = keDate(ymd); return HARI[d.getDay()] + ', ' + d.getDate() + ' ' + BULAN[d.getMonth()] + ' ' + d.getFullYear(); }
  function tglSedang(ymd) { var d = keDate(ymd); return d.getDate() + ' ' + BULAN[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); }
  function tglPendek(ymd) { var p = ymd.split('-'); return p[2] + '/' + p[1]; }
  function bulanLabel(ym) { var p = ym.split('-'); return BULAN[+p[1] - 1] + ' ' + p[0]; }
  function geserBulan(ym, n) { var p = ym.split('-'); var d = new Date(+p[0], +p[1] - 1 + n, 1); return d.getFullYear() + '-' + pad(d.getMonth() + 1); }
  function uid() { return 'K' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function inisial(s) {
    var w = String(s).replace(/[^A-Za-z0-9 ]/g, ' ').trim().split(/\s+/);
    return ((w[0] || '?').charAt(0) + (w[1] ? w[1].charAt(0) : (w[0] || '').charAt(1) || '')).toUpperCase();
  }
  function fotoAman(f) { return /^data:image\/(png|jpe?g|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(f || '') || /^https:\/\//.test(f || ''); }
  function urutNama(a, b) { return a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0; }

  var store = {
    get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  };
  var sesi = {
    get: function (k) { try { return sessionStorage.getItem(k) || ''; } catch (e) { return ''; } },
    set: function (k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* abaikan */ } },
    del: function (k) { try { sessionStorage.removeItem(k); } catch (e) { /* abaikan */ } }
  };

  var IKON = {
    cek: '<svg aria-hidden="true" width="66" height="66" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>',
    jam: '<svg aria-hidden="true" width="62" height="62" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path></svg>',
    silang: '<svg aria-hidden="true" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"></path></svg>',
    kirim: '<svg aria-hidden="true" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 3L10 14"></path><path d="M21 3l-7 18-4-7-7-4 18-7z"></path></svg>',
    kiri: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 6l-6 6 6 6"></path></svg>',
    kanan: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"></path></svg>',
    wa: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 20.5l1.3-4.2A8.5 8.5 0 1 1 8 19.3l-4.5 1.2z"></path><path d="M9 9.5c.3 2 2.2 4.1 4.5 4.8l1.2-1.2 2 .9c-.2 1-1.1 1.8-2.2 1.8-3.4 0-6.5-3.1-6.5-6.5 0-1.1.8-2 1.8-2.2l.9 2-1.2 1.2"></path></svg>',
    pdf: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6z"></path><path d="M14 3v6h6"></path><path d="M8 15h8M8 18h5"></path></svg>',
    cetak: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 9V3h10v6"></path><rect x="4" y="9" width="16" height="8" rx="2"></rect><path d="M7 14h10v7H7z"></path></svg>',
    salin: '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15V5a2 2 0 0 1 2-2h10"></path></svg>',
    hapus: '<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5h11v14H9l-6-7 6-7z"></path><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"></path></svg>'
  };

  /* ---------------- API ---------------- */
  function NetError(msg) { this.message = msg; this.net = true; }
  NetError.prototype = Object.create(Error.prototype);

  function api(action, data, pin) {
    if (!API_URL) return Promise.reject(new Error('Alamat API belum diisi di file js/config.js'));
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, 45000) : null;
    return fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: action, data: data || {}, pin: pin || '' }),
      redirect: 'follow',
      signal: ctrl ? ctrl.signal : undefined
    }).then(function (r) {
      if (!r.ok) throw new NetError('Server tidak merespons (' + r.status + ')');
      return r.json().catch(function () { throw new NetError('Balasan server tidak terbaca'); });
    }, function () {
      throw new NetError('Tidak ada koneksi internet');
    }).then(function (j) {
      if (timer) clearTimeout(timer);
      setOnline(true);
      if (!j.ok) throw new Error(j.error || 'Terjadi kesalahan');
      return j;
    }, function (e) {
      if (timer) clearTimeout(timer);
      if (e && e.net) setOnline(false);
      throw e;
    });
  }

  /* ---------------- State ---------------- */
  var MASTER_KOSONG = { toko: 'Urwah Butiq', subjudul: 'Twins Collection', pesanPenutup: 'Jazakumullahu khairan.', kategori: [], barang: [], nama: [] };
  var S = {
    view: 'kasir',
    master: store.get('kb_master', null) || MASTER_KOSONG,
    tanggal: hariIni(),
    tanggalManual: false,
    nama: '',
    cart: {},
    tab: 'Semua',
    cari: '',
    outbox: store.get('kb_outbox', []),
    online: navigator.onLine !== false,
    last: null,
    pin: sesi.get('kb_pin'),
    rekap: { bulan: hariIni().slice(0, 7), data: null, sel: '', filter: 'Semua', mode: 'tanggal', loading: false, error: '' },
    admin: { section: 'barang', data: null, form: null, kat: 'Semua', cari: '', loading: false }
  };
  var logoDataUrl = null;

  /* ----- Foto barang: diunduh sekali, disimpan di tablet (IndexedDB) ----- */
  var fotoMem = {};   // id -> { v, data }
  var fotoDb = null;
  function bukaFotoDb() {
    return new Promise(function (resolve) {
      try {
        var req = indexedDB.open('kasbon-kantin', 1);
        req.onupgradeneeded = function () { req.result.createObjectStore('foto'); };
        req.onsuccess = function () { fotoDb = req.result; resolve(); };
        req.onerror = function () { resolve(); };
      } catch (e) { resolve(); }
    });
  }
  function muatFotoLokal() {
    return bukaFotoDb().then(function () {
      if (!fotoDb) return;
      return new Promise(function (resolve) {
        try {
          var st = fotoDb.transaction('foto', 'readonly').objectStore('foto');
          var cur = st.openCursor();
          cur.onsuccess = function () {
            var c = cur.result;
            if (c) { fotoMem[c.key] = c.value; c.continue(); } else resolve();
          };
          cur.onerror = function () { resolve(); };
        } catch (e) { resolve(); }
      });
    });
  }
  function simpanFotoLokal(id, nilai) {
    if (nilai) fotoMem[id] = nilai; else delete fotoMem[id];
    if (!fotoDb) return;
    try {
      var st = fotoDb.transaction('foto', 'readwrite').objectStore('foto');
      if (nilai) st.put(nilai, id); else st.delete(id);
    } catch (e) { /* abaikan */ }
  }
  function fotoBarang(b) {
    var c = fotoMem[b.id];
    return b.fotoV && c && c.v === b.fotoV ? c.data : '';
  }
  var sedangMuatFoto = false;
  function muatFotoServer() {
    if (sedangMuatFoto) return;
    var perlu = S.master.barang.filter(function (b) {
      return b.fotoV && (!fotoMem[b.id] || fotoMem[b.id].v !== b.fotoV);
    }).map(function (b) { return b.id; });
    Object.keys(fotoMem).forEach(function (id) {
      var b = barangById(id);
      if (b && !b.fotoV) simpanFotoLokal(id, null);
    });
    if (!perlu.length) return;
    sedangMuatFoto = true;
    var batch = [];
    for (var i = 0; i < perlu.length; i += 12) batch.push(perlu.slice(i, i + 12));
    batch.reduce(function (pr, ids) {
      return pr.then(function () {
        return api('foto', { ids: ids }).then(function (r) {
          Object.keys(r.foto || {}).forEach(function (id) { simpanFotoLokal(id, r.foto[id]); });
          if (S.view === 'kasir') renderGrid();
        });
      });
    }, Promise.resolve()).catch(function () { /* coba lagi nanti */ }).then(function () { sedangMuatFoto = false; });
  }

  function simpanMaster() { store.set('kb_master', S.master); }
  function simpanOutbox() { store.set('kb_outbox', S.outbox); }
  function barangById(id) { for (var i = 0; i < S.master.barang.length; i++) if (S.master.barang[i].id === id) return S.master.barang[i]; return null; }
  function kategoriAktif() {
    var aktif = {};
    S.master.kategori.forEach(function (k) { if (k.aktif) aktif[k.nama] = true; });
    return aktif;
  }
  function barangKasir() {
    var aktif = kategoriAktif();
    var adaKat = S.master.kategori.length > 0;
    return S.master.barang.filter(function (b) { return b.aktif && (!adaKat || aktif[b.kategori] || !kategoriAdaDiDaftar(b.kategori)); });
  }
  function kategoriAdaDiDaftar(nama) { return S.master.kategori.some(function (k) { return k.nama === nama; }); }

  /* ---------------- Toast & Modal ---------------- */
  var toastTimer = null;
  function toast(msg, err) {
    var t = $('toast');
    t.textContent = msg;
    t.className = 'toast' + (err ? ' err' : '');
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, err ? 4500 : 3000);
  }

  var modalClose = null;
  function bukaModal(html, cls) {
    tutupModal();
    var root = $('modal-root');
    root.innerHTML = '<div class="backdrop"><div class="modal ' + (cls || '') + '" role="dialog" aria-modal="true">' + html + '</div></div>';
    return root.querySelector('.modal');
  }
  function tutupModal() {
    $('modal-root').innerHTML = '';
    if (modalClose) { var f = modalClose; modalClose = null; f(); }
  }
  function modalAktif() { return !!$('modal-root').firstChild; }

  function konfirmasi(judul, pesan, ya, bahaya) {
    return new Promise(function (resolve) {
      var m = bukaModal(
        '<h2>' + esc(judul) + '</h2><p>' + esc(pesan) + '</p>' +
        '<div class="row" style="margin-top:8px"><button type="button" class="btn big" data-k="0">Tidak</button>' +
        '<button type="button" class="btn big grow ' + (bahaya ? 'danger' : 'primary') + '" data-k="1">' + esc(ya) + '</button></div>', 'sm');
      m.addEventListener('click', function (e) {
        var b = e.target.closest('[data-k]');
        if (!b) return;
        modalClose = null;
        tutupModal();
        resolve(b.getAttribute('data-k') === '1');
      });
    });
  }

  /* ---------------- Header ---------------- */
  function setOnline(v) { S.online = v; renderStatus(); }
  function renderHeader() {
    $('toko').textContent = S.master.toko || 'Urwah Butiq';
    $('subjudul').textContent = S.master.subjudul || '';
    $('subjudul').hidden = !S.master.subjudul;
    document.title = 'Kasbon Kantin – ' + (S.master.toko || 'Urwah Butiq');
    $('tanggalLabel').textContent = tglPanjang(S.tanggal);
    $('btnTanggal').classList.toggle('lain', S.tanggal !== hariIni());
    $('btnTanggal').hidden = S.view !== 'kasir';
    Array.prototype.forEach.call(document.querySelectorAll('.navbtn'), function (b) {
      b.classList.toggle('active', b.getAttribute('data-view') === S.view);
      if (b.getAttribute('data-view') === S.view) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    renderStatus();
  }
  function renderStatus() {
    var el = $('status');
    var n = S.outbox.filter(function (o) { return !o.gagal; }).length;
    el.classList.remove('pending', 'offline');
    if (n > 0) { el.classList.add('pending'); $('statusText').textContent = n + ' menunggu terkirim'; }
    else if (!S.online) { el.classList.add('offline'); $('statusText').textContent = 'Tidak ada internet'; }
    else { $('statusText').textContent = 'Tersambung'; }
  }

  /* ---------------- KASIR ---------------- */
  function renderKasir() {
    renderNama();
    renderTabs();
    renderGrid();
    renderKeranjang();
  }

  function daftarNamaKasir() {
    return S.master.nama.filter(function (n) { return n.aktif; }).map(function (n) { return n; })
      .sort(function (a, b) { return urutNama(a.nama, b.nama); });
  }

  function renderNama() {
    var q = S.cari.trim().toLowerCase();
    var list = daftarNamaKasir().filter(function (n) { return !q || n.nama.toLowerCase().indexOf(q) >= 0; });
    var html = list.map(function (n) {
      var on = n.nama === S.nama;
      return '<button type="button" class="nama-btn' + (on ? ' on' : '') + '" data-act="pilihNama" data-nama="' + esc(n.nama) + '"' + (on ? ' aria-pressed="true"' : '') + '>' +
        '<span><span class="n">' + esc(n.nama) + '</span>' + (n.ket ? '<span class="k">' + esc(n.ket) + '</span>' : '') + '</span>' +
        (on ? '<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>' : '') +
        '</button>';
    }).join('');
    if (!list.length) html = '<p class="empty">' + (q ? 'Nama tidak ditemukan.<br>Tekan "Nama baru" di bawah.' : 'Belum ada nama.') + '</p>';
    $('listNama').innerHTML = html;
  }

  function renderTabs() {
    var ada = {};
    barangKasir().forEach(function (b) { ada[b.kategori] = true; });
    var tabs = ['Semua'].concat(S.master.kategori.filter(function (k) { return k.aktif && ada[k.nama]; }).map(function (k) { return k.nama; }));
    if (tabs.indexOf(S.tab) < 0) S.tab = 'Semua';
    $('tabs').innerHTML = tabs.map(function (t) {
      return '<button type="button" class="chip' + (t === S.tab ? ' on' : '') + '" data-act="tab" data-tab="' + esc(t) + '">' + esc(t) + '</button>';
    }).join('');
  }

  function renderGrid() {
    var list = barangKasir().filter(function (b) { return S.tab === 'Semua' || b.kategori === S.tab; });
    var html = list.map(function (b) {
      var q = S.cart[b.id] || 0;
      var fb = fotoBarang(b);
      var foto = fotoAman(fb) ? '<img class="foto" src="' + esc(fb) + '" alt="">' : '<span class="foto ph">' + esc(inisial(b.nama)) + '</span>';
      return '<button type="button" class="tile' + (q ? ' on' : '') + '" data-act="tambah" data-id="' + esc(b.id) + '" aria-label="Tambah ' + esc(b.nama) + '">' +
        foto + '<span class="info"><span class="n">' + esc(b.nama) + '</span><span class="h">' + rp(b.harga) + '</span></span>' +
        (q ? '<span class="badge">' + q + '</span>' : '') + '</button>';
    }).join('');
    if (!list.length) html = '<p class="empty" style="grid-column:1/-1">' + (S.master.barang.length ? 'Tidak ada barang di kategori ini.' : 'Memuat daftar barang…') + '</p>';
    $('gridBarang').innerHTML = html;
  }

  function itemsKeranjang() {
    var out = [];
    Object.keys(S.cart).forEach(function (id) {
      var b = barangById(id);
      if (b && S.cart[id] > 0) out.push({ id: b.id, nama: b.nama, kategori: b.kategori, harga: b.harga, qty: S.cart[id] });
    });
    return out;
  }

  function renderKeranjang() {
    var items = itemsKeranjang();
    var total = 0;
    var html = items.map(function (i) {
      total += i.qty * i.harga;
      return '<div class="k-row"><div class="nm"><b>' + esc(i.nama) + '</b><small>@ ' + angka(i.harga) + '</small></div>' +
        '<button type="button" class="qbtn min" data-act="kurang" data-id="' + esc(i.id) + '" aria-label="Kurangi ' + esc(i.nama) + '"><span>−</span></button>' +
        '<span class="q">' + i.qty + '</span>' +
        '<button type="button" class="qbtn plus" data-act="tambah" data-id="' + esc(i.id) + '" aria-label="Tambah ' + esc(i.nama) + '"><span>+</span></button>' +
        '<span class="sub">' + angka(i.qty * i.harga) + '</span></div>';
    }).join('');
    if (!items.length) html = '<p class="empty">Belum ada barang.<br>Ketuk barang di tengah.</p>';
    $('keranjang').innerHTML = html;
    $('totalLabel').textContent = rp(total);
    var nd = $('namaDipilih');
    nd.textContent = S.nama || 'Belum dipilih';
    nd.classList.toggle('kosong', !S.nama);
    var btn = $('btnKirim');
    var siap = !!S.nama && items.length > 0;
    btn.disabled = !siap;
    btn.innerHTML = siap ? IKON.kirim + '<span>KIRIM</span>' : (!S.nama ? 'Pilih nama dulu' : 'Pilih barang dulu');
    var w = $('tglPeringatan');
    if (S.tanggal !== hariIni()) {
      w.hidden = false;
      w.innerHTML = '<span>Mencatat untuk ' + esc(tglSedang(S.tanggal)) + '</span><button type="button" data-act="tanggalHariIni">Hari ini</button>';
    } else { w.hidden = true; }
  }

  function aturQty(id, q) {
    if (q <= 0) delete S.cart[id]; else S.cart[id] = q;
    renderGrid();
    renderKeranjang();
  }

  /* ----- Kirim & antrean (aman walau internet putus) -----
     KIRIM langsung disimpan di tablet (instan), lalu dikirim ke Spreadsheet di belakang layar. */
  var sedangFlush = false;
  var sedangKirim = {};
  function hapusDariOutbox(id) {
    S.outbox = S.outbox.filter(function (o) { return o.id !== id; });
    simpanOutbox();
    renderStatus();
  }
  function kirimSatu(p) {
    if (sedangKirim[p.id]) return sedangKirim[p.id];
    var pr = api('kirim', p).then(function (r) {
      delete sedangKirim[p.id];
      hapusDariOutbox(p.id);
      return r;
    }, function (e) {
      delete sedangKirim[p.id];
      throw e;
    });
    sedangKirim[p.id] = pr;
    return pr;
  }
  function flushOutbox(manual) {
    if (sedangFlush) return Promise.resolve();
    var antre = S.outbox.filter(function (o) { return !o.gagal; });
    if (!antre.length) {
      if (manual) api('muat').then(terimaMaster).then(function () { toast('Tersambung. Tidak ada yang menunggu.'); }, function (e) { toast(e.message, true); });
      return Promise.resolve();
    }
    sedangFlush = true;
    var terkirim = 0;
    var jalan = antre.reduce(function (pr, p) {
      return pr.then(function () {
        if (!S.outbox.some(function (o) { return o.id === p.id; })) return;
        return kirimSatu(p).then(function () { terkirim++; }, function (e) {
          if (e.net) throw e;
          p.gagal = e.message; simpanOutbox();
        });
      });
    }, Promise.resolve());
    return jalan.then(function () {
      if (terkirim) toast(terkirim + ' catatan yang tertunda sudah terkirim.');
    }, function () {
      if (manual) toast('Masih belum ada internet. Catatan tetap aman di tablet.', true);
    }).then(function () { sedangFlush = false; renderStatus(); });
  }

  var hitungMundur = null;
  function hentikanHitungMundur() { if (hitungMundur) { clearInterval(hitungMundur); hitungMundur = null; } }

  function kirim() {
    var items = itemsKeranjang();
    if (!S.nama || !items.length) return;
    var namaObj = S.master.nama.filter(function (n) { return n.nama === S.nama; })[0];
    var payload = {
      id: uid(), tanggal: S.tanggal, nama: S.nama, dibuat: Date.now(), namaBaru: !!(namaObj && namaObj.baru),
      items: items.map(function (i) { return { id: i.id, nama: i.nama, kategori: i.kategori, qty: i.qty, harga: i.harga }; })
    };
    S.outbox.push(payload);
    var snap = { payload: payload, cart: S.cart, nama: S.nama, lokal: simpanOutbox() !== false, sync: 'kirim', error: '' };
    S.last = snap;
    S.cart = {};
    renderGrid(); renderKeranjang(); renderStatus();
    if (snap.lokal) mulaiHitungMundur(snap);
    tampilTerkirim();
    kirimSatu(payload).then(function () {
      snap.sync = 'ok';
      perbaruiSync(snap);
    }, function (e) {
      if (e.net) {
        snap.sync = 'tertunda';
      } else {
        hapusDariOutbox(payload.id);
        snap.sync = 'gagal';
        snap.error = e.message;
      }
      perbaruiSync(snap);
    });
  }

  function mulaiHitungMundur(snap) {
    hentikanHitungMundur();
    var sisa = 6;
    hitungMundur = setInterval(function () {
      if (S.last !== snap || !$('btnBerikutnya')) return hentikanHitungMundur();
      sisa--;
      if (sisa <= 0) { hentikanHitungMundur(); berikutnya(); return; }
      $('btnBerikutnya').textContent = 'Catat orang berikutnya (' + sisa + ')';
    }, 1000);
  }

  function teksSync(snap) {
    if (snap.sync === 'ok') return '<span style="color:var(--ok)">✓ Sudah masuk Spreadsheet</span>';
    if (snap.sync === 'tertunda') return '<span style="color:var(--warn)">Internet putus. Data aman di tablet dan akan terkirim otomatis.</span>';
    return '<span class="muted">Sedang dikirim ke Spreadsheet…</span>';
  }

  function perbaruiSync(snap) {
    if (S.last !== snap) {
      if (snap.sync === 'gagal') toast('Catatan ' + snap.payload.nama + ' ditolak: ' + snap.error, true);
      return;
    }
    if (snap.sync === 'gagal' || !snap.lokal) { hentikanHitungMundur(); return tampilTerkirim(); }
    var el = $('syncLine');
    if (el) el.innerHTML = teksSync(snap);
  }

  function ringkasHtml(p, foot) {
    var total = 0;
    var its = p.items.map(function (i) {
      total += i.qty * i.harga;
      return '<div class="it"><span>' + esc(i.nama) + ' × ' + i.qty + '</span><span>' + angka(i.qty * i.harga) + '</span></div>';
    }).join('');
    return '<div class="ringkas-box"><div class="head"><span>' + esc(p.nama) + '</span><span>' + rp(total) + '</span></div>' + its +
      (foot ? '<div class="foot">' + foot + '</div>' : '') + '</div>';
  }

  function tampilTerkirim() {
    var s = S.last;
    if (!s) return;
    var p = s.payload;
    var html;
    var tglInfo = p.tanggal !== hariIni() ? '<p class="center">Untuk tanggal ' + esc(tglSedang(p.tanggal)) + '</p>' : '';
    var tombol = '<div class="row" style="margin-top:8px"><button type="button" class="btn big" data-act="batalTerakhir">Salah? Batalkan</button>' +
      '<button type="button" class="btn big primary grow" id="btnBerikutnya" data-act="berikutnya">Catat orang berikutnya' + (hitungMundur ? ' (6)' : '') + '</button></div>';
    if (s.sync === 'gagal') {
      html = '<div class="icon-circle err">' + IKON.silang + '</div><h2 class="judul-besar" style="color:var(--danger)">Belum tercatat</h2>' +
        '<p class="center">' + esc(s.error || 'Terjadi kesalahan.') + '</p>' + ringkasHtml(p) +
        '<button type="button" class="btn big primary" data-act="ulangiKirim">Kembali &amp; perbaiki</button>';
    } else if (!s.lokal && s.sync === 'kirim') {
      // Penyimpanan tablet tidak tersedia: tunggu jawaban server
      html = '<div class="spinner" aria-hidden="true"></div><h2 class="judul-besar" style="color:var(--p)">Mengirim…</h2><p class="center">Tunggu sebentar.</p>' + ringkasHtml(p);
    } else if (!s.lokal && s.sync === 'tertunda') {
      html = '<div class="icon-circle err">' + IKON.silang + '</div><h2 class="judul-besar" style="color:var(--danger)">Belum terkirim</h2>' +
        '<p class="center">Internet putus dan tablet tidak bisa menyimpan catatan. Mohon tulis dulu di buku, lalu coba lagi.</p>' + ringkasHtml(p) +
        '<button type="button" class="btn big primary" data-act="ulangiKirim">Kembali &amp; coba lagi</button>';
    } else {
      html = '<div class="icon-circle ok">' + IKON.cek + '</div><h2 class="judul-besar ok" role="status">Sudah tercatat</h2>' +
        '<p class="center">Tidak perlu ditulis lagi di buku.</p>' + tglInfo +
        ringkasHtml(p, '<span id="syncLine" style="font-size:16px">' + teksSync(s) + '</span>') + tombol;
    }
    bukaModal(html);
  }

  function berikutnya() {
    hentikanHitungMundur();
    S.last = null;
    S.nama = '';
    S.cart = {};
    S.cari = '';
    $('cariNama').value = '';
    tutupModal();
    renderKasir();
  }

  function ulangiKirim() {
    hentikanHitungMundur();
    var s = S.last;
    if (!s) return tutupModal();
    hapusDariOutbox(s.payload.id);
    S.cart = s.cart;
    S.nama = s.nama;
    S.tanggal = s.payload.tanggal;
    S.last = null;
    tutupModal();
    renderHeader(); renderKasir();
  }

  function kembalikanKeranjang(s) {
    S.cart = s.cart;
    S.nama = s.nama;
    S.tanggal = s.payload.tanggal;
    S.tanggalManual = S.tanggal !== hariIni();
    S.last = null;
    tutupModal();
    renderHeader(); renderKasir();
  }

  /** Batalkan satu kiriman: kalau masih di antrean tablet cukup dihapus, kalau sudah di Spreadsheet ditandai BATAL. */
  function batalkanKiriman(id, tanggal) {
    var tunggu = sedangKirim[id] ? sedangKirim[id].then(function () { return true; }, function () { return false; }) : Promise.resolve(null);
    return tunggu.then(function () {
      if (S.outbox.some(function (o) { return o.id === id; })) {
        hapusDariOutbox(id);
        return 'lokal';
      }
      return api('batal', { id: id, tanggal: tanggal }).then(function () { return 'server'; });
    });
  }

  function batalTerakhir() {
    var s = S.last;
    if (!s) return;
    hentikanHitungMundur();
    konfirmasi('Batalkan kiriman ini?', 'Catatan ' + s.payload.nama + ' akan dibatalkan. Barangnya dikembalikan ke keranjang supaya bisa diperbaiki.', 'Ya, batalkan', true).then(function (ya) {
      if (!ya) return tampilTerkirim();
      bukaModal('<div class="spinner"></div><h2 class="center">Membatalkan…</h2>', 'sm');
      batalkanKiriman(s.payload.id, s.payload.tanggal).then(function () {
        kembalikanKeranjang(s);
        toast('Kiriman dibatalkan. Silakan perbaiki lalu kirim lagi.');
      }, function (e) {
        tampilTerkirim();
        toast(e.net ? 'Tidak ada internet. Coba batalkan lagi nanti lewat tombol Riwayat.' : e.message, true);
      });
    });
  }

  /* ----- Riwayat hari ini ----- */
  function bukaRiwayat() {
    var tgl = S.tanggal;
    bukaModal('<h2>Riwayat ' + esc(tgl === hariIni() ? 'hari ini' : tglSedang(tgl)) + '</h2><div class="spinner"></div>');
    var antre = S.outbox.filter(function (o) { return o.tanggal === tgl; }).map(function (o) {
      var t = 0;
      o.items.forEach(function (i) { t += i.qty * i.harga; });
      var d = new Date(o.dibuat || Date.now());
      return { id: o.id, waktu: pad(d.getHours()) + ':' + pad(d.getMinutes()), nama: o.nama, total: t,
        items: o.items.map(function (i) { return { nama: i.nama, qty: i.qty }; }), status: o.gagal ? 'GAGAL' : 'ANTRE', ket: o.gagal || '' };
    });
    api('hariIni', { tanggal: tgl }).then(function (r) {
      tampilRiwayat(tgl, antre.concat(r.kiriman.filter(function (k) { return !antre.some(function (a) { return a.id === k.id; }); })), '');
    }, function (e) {
      tampilRiwayat(tgl, antre, e.net ? 'Tidak ada internet, jadi riwayat dari Spreadsheet belum bisa dimuat. Di bawah ini catatan yang masih menunggu di tablet.' : e.message);
    });
  }

  function tampilRiwayat(tgl, list, catatan) {
    var aktif = list.filter(function (k) { return k.status !== 'BATAL'; });
    var total = aktif.reduce(function (s, k) { return s + k.total; }, 0);
    var html = '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px"><h2>Riwayat ' + esc(tgl === hariIni() ? 'hari ini' : tglSedang(tgl)) + '</h2>' +
      '<span class="muted" style="font-size:16px">' + aktif.length + ' kiriman · ' + rp(total) + '</span></div>';
    if (catatan) html += '<p style="font-size:15px">' + esc(catatan) + '</p>';
    html += '<div>' + (list.length ? list.map(function (k) {
      var st = k.status === 'BATAL' ? '<span class="pill mati">Dibatalkan</span>'
        : k.status === 'ANTRE' ? '<span class="pill belum">Menunggu internet</span>'
        : k.status === 'GAGAL' ? '<span class="pill belum" title="' + esc(k.ket) + '">Gagal: ' + esc(k.ket) + '</span>'
        : '<span class="pill lunas">Terkirim</span>';
      var bisaBatal = k.status !== 'BATAL';
      return '<div class="riwayat-item' + (k.status === 'BATAL' ? ' batal' : '') + '"><span class="t">' + esc(k.waktu) + '</span>' +
        '<div class="d"><b>' + esc(k.nama) + '</b><div>' + k.items.map(function (i) { return esc(i.nama) + ' ×' + i.qty; }).join(', ') + '</div></div>' +
        '<div class="r"><b>' + rp(k.total) + '</b>' + st +
        (bisaBatal ? '<button type="button" class="btn sm danger" data-act="batalRiwayat" data-id="' + esc(k.id) + '" data-status="' + esc(k.status) + '" data-nama="' + esc(k.nama) + '">Batalkan</button>' : '') +
        '</div></div>';
    }).join('') : '<p class="empty">Belum ada kiriman.</p>') + '</div>';
    html += '<button type="button" class="btn big primary" data-act="tutup" style="margin-top:6px">Tutup</button>';
    bukaModal(html);
  }

  function batalRiwayat(el) {
    var id = el.getAttribute('data-id'), status = el.getAttribute('data-status'), nama = el.getAttribute('data-nama');
    konfirmasi('Batalkan kiriman ' + nama + '?', 'Catatan ini tidak akan dihitung di rekap.', 'Ya, batalkan', true).then(function (ya) {
      if (!ya) return bukaRiwayat();
      bukaModal('<div class="spinner"></div><h2 class="center">Membatalkan…</h2>', 'sm');
      batalkanKiriman(id, S.tanggal).then(function () { toast('Kiriman dibatalkan.'); bukaRiwayat(); }, function (e) {
        toast(e.net ? 'Tidak ada internet. Coba lagi nanti.' : e.message, true);
        bukaRiwayat();
      });
    });
  }

  /* ----- Nama baru & tanggal ----- */
  function namaBaru() {
    var m = bukaModal('<h2>Nama baru</h2><div class="field"><label for="fNamaBaru">Tulis nama orang yang mengambil</label>' +
      '<input id="fNamaBaru" class="input" autocomplete="off" placeholder="Nama" value="' + esc(S.cari) + '"></div>' +
      '<p id="namaBaruErr" class="pin-err" style="text-align:left"></p>' +
      '<div class="row"><button type="button" class="btn big" data-act="tutup">Batal</button><button type="button" class="btn big primary grow" data-act="simpanNamaBaru">Simpan nama</button></div>', 'sm');
    var inp = m.querySelector('#fNamaBaru');
    setTimeout(function () { inp.focus(); }, 50);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') simpanNamaBaru(); });
  }
  function simpanNamaBaru() {
    var inp = $('fNamaBaru');
    if (!inp) return;
    var n = inp.value.replace(/\s+/g, ' ').trim();
    if (!n) { $('namaBaruErr').textContent = 'Nama belum diisi.'; return; }
    var ada = S.master.nama.filter(function (x) { return x.nama.toLowerCase() === n.toLowerCase(); })[0];
    if (ada) {
      ada.aktif = true;
      n = ada.nama;
    } else {
      S.master.nama.push({ nama: n, ket: '', aktif: true, baru: true });
      simpanMaster();
    }
    S.nama = n;
    S.cari = '';
    $('cariNama').value = '';
    tutupModal();
    renderNama(); renderKeranjang();
    var el = document.querySelector('.nama-btn.on');
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function pilihTanggal() {
    var inp = $('inputTanggal');
    inp.value = S.tanggal;
    inp.max = hariIni();
    try { if (inp.showPicker) { inp.showPicker(); return; } } catch (e) { /* lanjut */ }
    inp.focus(); inp.click();
  }

  /* ---------------- PIN ---------------- */
  function mintaPin(lanjut) {
    var pin = '';
    var m = bukaModal('<h2 class="center">Masukkan PIN admin</h2><p class="center" style="font-size:16px">Untuk membuka Rekap dan Admin.</p>' +
      '<div class="pin-dots" id="pinDots"></div><p class="pin-err" id="pinErr"></p>' +
      '<div class="pin-pad">' + [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (d) { return '<button type="button" data-d="' + d + '">' + d + '</button>'; }).join('') +
      '<button type="button" data-x="batal" style="font-size:17px">Batal</button><button type="button" data-d="0">0</button>' +
      '<button type="button" data-x="hapus" aria-label="Hapus angka">' + IKON.hapus + '</button></div>' +
      '<button type="button" class="btn big primary" id="pinMasuk" disabled>Masuk</button>', 'sm');
    function gambar() {
      var n = Math.max(4, pin.length);
      $('pinDots').innerHTML = Array.apply(null, Array(n)).map(function (_, i) { return '<span class="' + (i < pin.length ? 'on' : '') + '"></span>'; }).join('');
      $('pinMasuk').disabled = pin.length < 4;
    }
    gambar();
    function masuk() {
      if (pin.length < 4) return;
      $('pinMasuk').disabled = true;
      $('pinMasuk').textContent = 'Memeriksa…';
      api('cekPin', {}, pin).then(function () {
        S.pin = pin;
        sesi.set('kb_pin', pin);
        tutupModal();
        lanjut();
      }, function (e) {
        $('pinMasuk').textContent = 'Masuk';
        $('pinErr').textContent = e.net ? 'Tidak ada internet.' : e.message;
        m.classList.remove('shake'); void m.offsetWidth; m.classList.add('shake');
        pin = ''; gambar();
      });
    }
    m.addEventListener('click', function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.id === 'pinMasuk') return masuk();
      var x = b.getAttribute('data-x');
      if (x === 'batal') return tutupModal();
      if (x === 'hapus') { pin = pin.slice(0, -1); return gambar(); }
      var d = b.getAttribute('data-d');
      if (d !== null && pin.length < 6) { pin += d; $('pinErr').textContent = ''; gambar(); }
    });
  }

  function pinDitolak(e) {
    if (e && !e.net && /PIN/i.test(e.message)) {
      S.pin = ''; sesi.del('kb_pin');
      toast('PIN sudah berubah. Silakan masuk lagi.', true);
      gantiView('kasir');
      return true;
    }
    return false;
  }

  /* ---------------- Navigasi ---------------- */
  function gantiView(v) {
    if (v !== 'kasir' && !S.pin) return mintaPin(function () { gantiView(v); });
    S.view = v;
    ['kasir', 'rekap', 'admin'].forEach(function (x) { $('view-' + x).hidden = x !== v; });
    renderHeader();
    if (v === 'kasir') { renderKasir(); muatMaster(); }
    if (v === 'rekap') { renderRekap(); muatRekap(); }
    if (v === 'admin') { renderAdmin(); muatAdmin(); }
  }

  /* ---------------- Master data ---------------- */
  function terimaMaster(r) {
    var lokalBaru = S.master.nama.filter(function (n) { return n.baru; });
    S.master = { toko: r.toko, subjudul: r.subjudul, pesanPenutup: r.pesanPenutup, kategori: r.kategori || [], barang: r.barang || [], nama: r.nama || [] };
    lokalBaru.forEach(function (n) {
      if (!S.master.nama.some(function (x) { return x.nama.toLowerCase() === n.nama.toLowerCase(); })) S.master.nama.push(n);
    });
    simpanMaster();
    renderHeader();
    if (S.view === 'kasir') renderKasir();
    muatFotoServer();
  }
  function muatMaster() {
    return api('muat').then(terimaMaster, function (e) {
      if (!e.net) toast(e.message, true);
    });
  }

  /* ---------------- REKAP ---------------- */
  function hitungRekap() {
    var d = S.rekap.data;
    if (!d) return null;
    var per = {};
    d.baris.forEach(function (b) {
      var p = per[b.nama] || (per[b.nama] = { nama: b.nama, total: 0, baris: [], hari: {}, item: 0 });
      p.total += b.subtotal; p.baris.push(b); p.hari[b.tanggal] = 1; p.item += b.qty;
    });
    var lunas = {};
    d.pelunasan.forEach(function (x) { lunas[x.nama] = x; });
    var orang = Object.keys(per).map(function (k) {
      var p = per[k];
      p.lunas = !!(lunas[k] && lunas[k].lunas);
      p.tanggalLunas = lunas[k] ? lunas[k].tanggalLunas : '';
      p.wa = d.wa[k] || '';
      return p;
    }).sort(function (a, b) { return urutNama(a.nama, b.nama); });
    var sum = 0, sumL = 0;
    orang.forEach(function (p) { sum += p.total; if (p.lunas) sumL += p.total; });
    return { orang: orang, sum: sum, sumLunas: sumL };
  }

  function orangTerpilih(h) {
    if (!h) return null;
    for (var i = 0; i < h.orang.length; i++) if (h.orang[i].nama === S.rekap.sel) return h.orang[i];
    return null;
  }

  function renderRekap() {
    var R = S.rekap;
    var h = hitungRekap();
    var kiri = '<section class="panel">' +
      '<div class="bulan-nav"><button type="button" class="icon-btn" data-act="bulan" data-n="-1" aria-label="Bulan sebelumnya">' + IKON.kiri + '</button>' +
      '<h1>' + esc(bulanLabel(R.bulan)) + '</h1>' +
      '<button type="button" class="icon-btn" data-act="bulan" data-n="1" aria-label="Bulan berikutnya">' + IKON.kanan + '</button></div>';
    if (R.loading && !h) {
      kiri += '<div class="spinner" style="margin:40px auto"></div></section><section class="panel"></section>';
      $('view-rekap').innerHTML = kiri;
      return;
    }
    if (R.error && !h) {
      kiri += '<p class="empty">' + esc(R.error) + '</p><button type="button" class="btn primary" data-act="muatRekap">Coba lagi</button></section><section class="panel"></section>';
      $('view-rekap').innerHTML = kiri;
      return;
    }
    h = h || { orang: [], sum: 0, sumLunas: 0 };
    kiri += '<div class="tiles"><div class="tile-sum"><span>Total kasbon</span><b>' + rp(h.sum) + '</b></div>' +
      '<div class="tile-sum ok"><span>Sudah lunas</span><b>' + rp(h.sumLunas) + '</b></div>' +
      '<div class="tile-sum warn"><span>Belum lunas</span><b>' + rp(h.sum - h.sumLunas) + '</b></div></div>';
    kiri += '<div class="chips">' + [['Semua', 'Semua'], ['Belum', 'Belum lunas'], ['Lunas', 'Lunas']].map(function (c) {
      return '<button type="button" class="chip' + (R.filter === c[0] ? ' on' : '') + '" data-act="filterRekap" data-f="' + c[0] + '">' + c[1] + '</button>';
    }).join('') + '</div>';
    var list = h.orang.filter(function (p) { return R.filter === 'Semua' || (R.filter === 'Lunas') === p.lunas; });
    kiri += '<div class="scroll" style="display:flex;flex-direction:column;gap:8px">' + (list.length ? list.map(function (p) {
      return '<button type="button" class="orang-btn' + (p.nama === R.sel ? ' on' : '') + '" data-act="pilihOrang" data-nama="' + esc(p.nama) + '">' +
        '<span><span class="n">' + esc(p.nama) + '</span><span class="pill ' + (p.lunas ? 'lunas">Lunas' : 'belum">Belum lunas') + '</span></span>' +
        '<span class="tot">' + rp(p.total) + '</span></button>';
    }).join('') : '<p class="empty">' + (h.orang.length ? 'Tidak ada di filter ini.' : 'Belum ada kasbon di bulan ini.') + '</p>') + '</div>';
    kiri += '<div class="actions"><button type="button" class="btn sm" data-act="pdfBulan"' + (h.orang.length ? '' : ' disabled') + '>' + IKON.pdf + 'PDF ringkasan bulan</button>' +
      '<button type="button" class="btn sm" data-act="muatRekap">Muat ulang</button></div></section>';

    var p = orangTerpilih(h);
    var kanan = '<section class="panel">';
    if (!p) {
      kanan += '<p class="empty">' + (h.orang.length ? 'Pilih nama di sebelah kiri untuk melihat rinciannya.' : 'Belum ada catatan di ' + esc(bulanLabel(R.bulan)) + '.') + '</p>';
    } else {
      kanan += '<div class="detail-head"><div><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><h2>' + esc(p.nama) + '</h2>' +
        '<span class="pill ' + (p.lunas ? 'lunas">Lunas' + (p.tanggalLunas ? ' · ' + esc(tglPendek(p.tanggalLunas)) : '') : 'belum">Belum lunas') + '</span></div>' +
        '<span class="muted" style="font-size:15px">' + Object.keys(p.hari).length + ' hari mengambil · ' + p.baris.length + ' catatan · ' + p.item + ' barang</span></div>' +
        '<div class="detail-total"><span>Total kasbon ' + esc(bulanLabel(R.bulan)) + '</span><b>' + rp(p.total) + '</b></div></div>';
      kanan += '<div class="actions">' +
        '<button type="button" class="btn sm wa" data-act="waTeks">' + IKON.wa + 'Kirim rekap ke WA</button>' +
        '<button type="button" class="btn sm" data-act="pdfOrang">' + IKON.pdf + 'Kirim PDF</button>' +
        '<button type="button" class="btn sm" data-act="cetakOrang">' + IKON.cetak + 'Cetak</button>' +
        '<button type="button" class="btn sm" data-act="salinTeks">' + IKON.salin + 'Salin teks</button>' +
        '<span style="flex:1"></span>' +
        '<button type="button" class="btn sm ' + (p.lunas ? '' : 'ok') + '" data-act="toggleLunas">' + (p.lunas ? 'Batalkan lunas' : 'Tandai lunas') + '</button></div>';
      kanan += '<div style="display:flex;align-items:center;gap:8px;justify-content:space-between;flex-wrap:wrap"><div class="chips">' +
        [['tanggal', 'Per tanggal'], ['barang', 'Per barang']].map(function (m) {
          return '<button type="button" class="chip' + (R.mode === m[0] ? ' on' : '') + '" data-act="modeRekap" data-m="' + m[0] + '">' + m[1] + '</button>';
        }).join('') + '</div><span class="hint">' + (p.wa ? 'WA wali: ' + esc(p.wa) : 'No WA wali belum diisi (atur di Admin › Daftar nama)') + '</span></div>';
      kanan += '<div class="tbl-wrap"><div class="tbl-scroll">' + (R.mode === 'barang' ? tabelBarang(p) : tabelTanggal(p)) + '</div>' +
        '<div class="tbl-total"><span>TOTAL</span><span>' + rp(p.total) + '</span></div></div>';
    }
    kanan += '</section>';
    $('view-rekap').innerHTML = kiri + kanan;
  }

  function tabelTanggal(p) {
    var prev = '';
    return '<table class="tbl"><thead><tr><th>Tanggal</th><th>Menu</th><th class="r">Jumlah</th><th class="r">Harga satuan</th><th class="r">Harga</th></tr></thead><tbody>' +
      p.baris.map(function (b) {
        var awal = b.tanggal !== prev;
        var cls = awal && prev ? ' class="grp"' : '';
        prev = b.tanggal;
        return '<tr' + cls + '><td class="tgl">' + (awal ? esc(tglPendek(b.tanggal)) : '') + '</td><td class="b">' + esc(b.barang) + '</td><td class="r">' + b.qty +
          '</td><td class="r muted">' + angka(b.harga) + '</td><td class="r b">' + angka(b.subtotal) + '</td></tr>';
      }).join('') + '</tbody></table>';
  }

  function perBarang(p) {
    var agg = {};
    p.baris.forEach(function (b) {
      var k = b.barang + '|' + b.harga;
      var a = agg[k] || (agg[k] = { barang: b.barang, harga: b.harga, qty: 0, total: 0 });
      a.qty += b.qty; a.total += b.subtotal;
    });
    return Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, b) { return b.total - a.total; });
  }

  function tabelBarang(p) {
    var list = perBarang(p);
    var max = list.length ? list[0].total : 1;
    return '<table class="tbl"><thead><tr><th>Barang</th><th class="r">Jumlah</th><th class="r">Harga satuan</th><th class="r">Total</th><th></th></tr></thead><tbody>' +
      list.map(function (a) {
        return '<tr><td class="b">' + esc(a.barang) + '</td><td class="r">' + a.qty + '</td><td class="r muted">' + angka(a.harga) + '</td><td class="r b">' + angka(a.total) +
          '</td><td style="width:200px"><div class="bar"><i style="width:' + Math.max(3, Math.round(a.total / max * 100)) + '%"></i></div></td></tr>';
      }).join('') + '</tbody></table>';
  }

  var cacheRekap = {};   // bulan -> data terakhir (tampil instan, lalu diperbarui di belakang layar)
  function muatRekap() {
    var bulan = S.rekap.bulan;
    S.rekap.loading = true;
    S.rekap.error = '';
    if (cacheRekap[bulan]) {
      S.rekap.data = cacheRekap[bulan];
      var h0 = hitungRekap();
      if (!orangTerpilih(h0)) S.rekap.sel = h0.orang.length ? h0.orang[0].nama : '';
      renderRekap();
    } else if (!S.rekap.data || S.rekap.data.bulan !== bulan) { S.rekap.data = null; renderRekap(); }
    return api('rekap', { bulan: bulan }, S.pin).then(function (r) {
      cacheRekap[bulan] = r;
      if (S.rekap.bulan !== bulan) return;
      S.rekap.data = r;
      S.rekap.loading = false;
      var h = hitungRekap();
      if (!orangTerpilih(h)) S.rekap.sel = h.orang.length ? h.orang[0].nama : '';
      if (S.view === 'rekap') renderRekap();
    }, function (e) {
      if (pinDitolak(e)) return;
      S.rekap.loading = false;
      S.rekap.error = e.net ? 'Tidak ada internet. Rekap butuh internet untuk mengambil data dari Spreadsheet.' : e.message;
      if (S.view === 'rekap') renderRekap();
    });
  }

  /* ----- Kirim ke wali: teks WA, PDF, cetak ----- */
  function noWA(raw) {
    var d = String(raw || '').replace(/[^0-9]/g, '');
    if (!d) return '';
    if (d.charAt(0) === '0') d = '62' + d.slice(1);
    else if (d.charAt(0) === '8') d = '62' + d;
    return d;
  }

  function teksRekap(p) {
    var bulan = S.rekap.bulan;
    var per = {}, urut = [];
    p.baris.forEach(function (b) {
      if (!per[b.tanggal]) { per[b.tanggal] = []; urut.push(b.tanggal); }
      per[b.tanggal].push(b.barang + ' ' + b.qty + ' (' + angka(b.subtotal) + ')');
    });
    var t = '*Rekap Kasbon Kantin*\n*' + (S.master.toko || '') + (S.master.subjudul ? ' – ' + S.master.subjudul : '') + '*\n\n' +
      'Nama  : ' + p.nama + '\nBulan : ' + bulanLabel(bulan) + '\n\n';
    t += urut.map(function (d) { return '• ' + tglPendek(d) + ': ' + per[d].join(', '); }).join('\n');
    t += '\n\n*TOTAL: ' + rp(p.total) + '*\nStatus: ' + (p.lunas ? 'Lunas' + (p.tanggalLunas ? ' (' + tglPendek(p.tanggalLunas) + ')' : '') : 'Belum lunas');
    if (S.master.pesanPenutup) t += '\n\n' + S.master.pesanPenutup;
    return t;
  }

  function waTeks() {
    var p = orangTerpilih(hitungRekap());
    if (!p) return;
    var no = noWA(p.wa);
    var url = (no ? 'https://wa.me/' + no : 'https://wa.me/') + '?text=' + encodeURIComponent(teksRekap(p));
    window.open(url, '_blank');
    if (!no) toast('No WA wali belum diisi. Pilih kontaknya di WhatsApp.');
  }

  function salinTeks() {
    var p = orangTerpilih(hitungRekap());
    if (!p) return;
    var t = teksRekap(p);
    var berhasil = function () { toast('Teks rekap sudah disalin. Tempel di WhatsApp.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(berhasil, function () { salinManual(t) ? berhasil() : toast('Gagal menyalin.', true); });
    } else if (salinManual(t)) berhasil(); else toast('Gagal menyalin.', true);
  }
  function salinManual(t) {
    var ta = document.createElement('textarea');
    ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function siapkanLogo() {
    var img = new Image();
    img.onload = function () {
      try {
        var c = document.createElement('canvas');
        c.width = 200; c.height = 200;
        var g = c.getContext('2d');
        g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, 200, 200);
        g.drawImage(img, 0, 0, 200, 200);
        logoDataUrl = c.toDataURL('image/jpeg', 0.85);
      } catch (e) { logoDataUrl = null; }
    };
    img.src = 'assets/logo.png';
  }

  function pdfBaru() {
    if (!window.jspdf || !window.jspdf.jsPDF) { toast('Modul PDF belum termuat. Coba lagi sebentar.', true); return null; }
    var doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    var y = 16;
    if (logoDataUrl) { try { doc.addImage(logoDataUrl, 'JPEG', 14, 10, 20, 20); } catch (e) { /* abaikan */ } }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(75, 26, 146);
    doc.text(S.master.toko || 'Urwah Butiq', logoDataUrl ? 38 : 14, y + 2);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(94, 88, 104);
    doc.text((S.master.subjudul || '') + (S.master.subjudul ? '  ·  ' : '') + 'Rekap Kasbon Kantin', logoDataUrl ? 38 : 14, y + 8);
    doc.setDrawColor(220, 214, 228); doc.line(14, 33, 196, 33);
    doc.setTextColor(31, 26, 38);
    return doc;
  }

  function bagikanPdf(doc, namaFile, judul) {
    var blob = doc.output('blob');
    var file = null;
    try { file = new File([blob], namaFile, { type: 'application/pdf' }); } catch (e) { file = null; }
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: judul }).catch(function (e) {
        if (e && e.name === 'AbortError') return;
        unduh(blob, namaFile);
      });
      return;
    }
    unduh(blob, namaFile);
  }
  function unduh(blob, namaFile) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = namaFile;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    toast('PDF tersimpan di folder Download. Kirim lewat WhatsApp sebagai dokumen.');
  }
  function namaAman(s) { return String(s).replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, ''); }

  function pdfOrang() {
    var p = orangTerpilih(hitungRekap());
    if (!p) return;
    var doc = pdfBaru();
    if (!doc) return;
    doc.setFontSize(11);
    doc.text('Nama', 14, 42); doc.text(': ' + p.nama, 40, 42);
    doc.text('Bulan', 14, 48); doc.text(': ' + bulanLabel(S.rekap.bulan), 40, 48);
    doc.text('Status', 14, 54); doc.text(': ' + (p.lunas ? 'Lunas' + (p.tanggalLunas ? ' (' + tglPendek(p.tanggalLunas) + ')' : '') : 'Belum lunas'), 40, 54);
    var prev = '';
    var body = p.baris.map(function (b) {
      var awal = b.tanggal !== prev; prev = b.tanggal;
      return [awal ? tglPendek(b.tanggal) : '', b.barang, String(b.qty), angka(b.harga), angka(b.subtotal)];
    });
    doc.autoTable({
      startY: 60,
      head: [['Tanggal', 'Menu', 'Jumlah', 'Harga satuan', 'Harga']],
      body: body,
      foot: [[{ content: 'TOTAL', colSpan: 4, styles: { halign: 'right' } }, { content: rp(p.total), styles: { halign: 'right' } }]],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2.2, textColor: [31, 26, 38] },
      headStyles: { fillColor: [75, 26, 146], textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [241, 234, 251], textColor: [31, 26, 38], fontStyle: 'bold', fontSize: 11 },
      columnStyles: { 0: { cellWidth: 22, fontStyle: 'bold' }, 2: { halign: 'right', cellWidth: 20 }, 3: { halign: 'right', cellWidth: 30 }, 4: { halign: 'right', cellWidth: 30 } }
    });
    var y = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setTextColor(94, 88, 104);
    if (S.master.pesanPenutup) { doc.text(S.master.pesanPenutup, 14, y); y += 6; }
    doc.text('Dibuat ' + tglPanjang(hariIni()), 14, y);
    bagikanPdf(doc, 'Rekap_' + namaAman(p.nama) + '_' + S.rekap.bulan + '.pdf', 'Rekap kasbon ' + p.nama);
  }

  function pdfBulan() {
    var h = hitungRekap();
    if (!h || !h.orang.length) return;
    var doc = pdfBaru();
    if (!doc) return;
    doc.setFontSize(12); doc.setFont('helvetica', 'bold');
    doc.text('Ringkasan ' + bulanLabel(S.rekap.bulan), 14, 42);
    doc.setFont('helvetica', 'normal');
    doc.autoTable({
      startY: 47,
      head: [['No', 'Nama', 'Total', 'Status']],
      body: h.orang.map(function (p, i) { return [String(i + 1), p.nama, angka(p.total), p.lunas ? 'Lunas' : 'Belum lunas']; }),
      foot: [[{ content: 'TOTAL', colSpan: 2, styles: { halign: 'right' } }, { content: rp(h.sum), styles: { halign: 'right' } }, ''],
        [{ content: 'Sudah lunas', colSpan: 2, styles: { halign: 'right' } }, { content: rp(h.sumLunas), styles: { halign: 'right' } }, ''],
        [{ content: 'Belum lunas', colSpan: 2, styles: { halign: 'right' } }, { content: rp(h.sum - h.sumLunas), styles: { halign: 'right' } }, '']],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 2.2, textColor: [31, 26, 38] },
      headStyles: { fillColor: [75, 26, 146], textColor: 255 },
      footStyles: { fillColor: [241, 234, 251], textColor: [31, 26, 38], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 12 }, 2: { halign: 'right', cellWidth: 36 }, 3: { cellWidth: 30 } }
    });
    bagikanPdf(doc, 'Ringkasan_Kasbon_' + S.rekap.bulan + '.pdf', 'Ringkasan kasbon ' + bulanLabel(S.rekap.bulan));
  }

  function cetakOrang() {
    var p = orangTerpilih(hitungRekap());
    if (!p) return;
    var prev = '';
    var rows = p.baris.map(function (b) {
      var awal = b.tanggal !== prev; prev = b.tanggal;
      return '<tr><td>' + (awal ? esc(tglPendek(b.tanggal)) : '') + '</td><td>' + esc(b.barang) + '</td><td class="r">' + b.qty + '</td><td class="r">' + angka(b.harga) + '</td><td class="r">' + angka(b.subtotal) + '</td></tr>';
    }).join('');
    $('print-area').innerHTML = '<div class="halaman"><h1>' + esc(S.master.toko) + '</h1><h3>' + esc(S.master.subjudul || '') + ' · Rekap Kasbon Kantin</h3>' +
      '<div class="meta">Nama: <b>' + esc(p.nama) + '</b> &nbsp; · &nbsp; Bulan: <b>' + esc(bulanLabel(S.rekap.bulan)) + '</b> &nbsp; · &nbsp; Status: <b>' + (p.lunas ? 'Lunas' : 'Belum lunas') + '</b></div>' +
      '<table><thead><tr><th>Tanggal</th><th>Menu</th><th>Jumlah</th><th>Harga satuan</th><th>Harga</th></tr></thead><tbody>' + rows +
      '</tbody><tfoot><tr><th colspan="4" class="r">TOTAL</th><th class="r">' + rp(p.total) + '</th></tr></tfoot></table></div>';
    window.print();
  }

  function toggleLunas() {
    var p = orangTerpilih(hitungRekap());
    if (!p) return;
    var jadi = !p.lunas;
    var lanjut = function () {
      api('setLunas', { bulan: S.rekap.bulan, nama: p.nama, lunas: jadi, total: p.total }, S.pin).then(function (r) {
        var d = S.rekap.data;
        d.pelunasan = d.pelunasan.filter(function (x) { return x.nama !== p.nama; });
        d.pelunasan.push({ nama: p.nama, lunas: jadi, tanggalLunas: r.tanggalLunas || '' });
        renderRekap();
        toast(jadi ? p.nama + ' ditandai lunas.' : 'Status lunas ' + p.nama + ' dibatalkan.');
      }, function (e) { if (!pinDitolak(e)) toast(e.net ? 'Tidak ada internet.' : e.message, true); });
    };
    if (jadi) {
      konfirmasi('Tandai lunas?', p.nama + ' sudah membayar ' + rp(p.total) + ' untuk ' + bulanLabel(S.rekap.bulan) + '?', 'Ya, sudah lunas').then(function (ya) { if (ya) lanjut(); });
    } else lanjut();
  }

  /* ---------------- ADMIN ---------------- */
  function muatAdmin() {
    S.admin.loading = true;
    return Promise.all([api('muat'), api('muatAdmin', {}, S.pin)]).then(function (r) {
      terimaMaster(r[0]);
      S.admin.data = r[1];
      S.admin.loading = false;
      if (S.view === 'admin') renderAdmin();
    }, function (e) {
      if (pinDitolak(e)) return;
      S.admin.loading = false;
      if (S.view === 'admin') {
        $('view-admin').innerHTML = '<nav class="admin-nav"></nav><section class="panel"><p class="empty">' +
          esc(e.net ? 'Tidak ada internet. Menu Admin butuh internet.' : e.message) +
          '</p><button type="button" class="btn primary" data-act="muatAdmin">Coba lagi</button></section><section class="panel"></section>';
      }
    });
  }

  function adminNav() {
    var s = S.admin.section;
    return '<nav class="admin-nav" aria-label="Menu admin">' + [['barang', 'Barang & harga'], ['kategori', 'Kategori'], ['nama', 'Daftar nama'], ['pengaturan', 'Pengaturan']].map(function (x) {
      return '<button type="button" class="' + (s === x[0] ? 'on' : '') + '" data-act="admSection" data-s="' + x[0] + '">' + x[1] + '</button>';
    }).join('') + '<button type="button" class="keluar" data-act="keluarAdmin">Kunci (keluar admin)</button></nav>';
  }

  function renderAdmin() {
    var v = $('view-admin');
    if (!S.admin.data) {
      v.innerHTML = adminNav() + '<section class="panel"><div class="spinner" style="margin:60px auto"></div></section><section class="panel"></section>';
      return;
    }
    var s = S.admin.section;
    if (!S.admin.form || S.admin.form._s !== s) S.admin.form = formKosong(s);
    if (s === 'pengaturan') {
      v.innerHTML = adminNav() + panelPengaturan();
      v.style.gridTemplateColumns = '190px minmax(0, 1fr)';
      return;
    }
    v.style.gridTemplateColumns = '';
    var judul = { barang: 'Barang & harga', kategori: 'Kategori', nama: 'Daftar nama' }[s];
    var filterHtml = '';
    if (s === 'barang') {
      filterHtml = '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><label class="search" style="flex:1;min-width:200px">' +
        '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>' +
        '<input id="admCari" type="search" placeholder="Cari barang…" aria-label="Cari barang" value="' + esc(S.admin.cari) + '"></label>' +
        '<div class="chips">' + ['Semua'].concat(S.master.kategori.map(function (k) { return k.nama; })).map(function (k) {
          return '<button type="button" class="chip' + (S.admin.kat === k ? ' on' : '') + '" data-act="admKat" data-k="' + esc(k) + '" style="height:42px;font-size:15px">' + esc(k) + '</button>';
        }).join('') + '</div></div>';
    } else if (s === 'nama') {
      filterHtml = '<label class="search"><svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"></circle><path d="M20 20l-3.5-3.5"></path></svg>' +
        '<input id="admCari" type="search" placeholder="Cari nama…" aria-label="Cari nama" value="' + esc(S.admin.cari) + '"></label>';
    }
    v.innerHTML = adminNav() +
      '<section class="panel"><div class="step-row"><h2>' + judul + '</h2><span class="muted" id="admCount"></span></div>' + filterHtml +
      '<div class="list-box" id="admList"></div></section>' +
      '<section class="panel" id="admForm"></section>';
    renderAdmList();
    renderAdmForm();
  }

  function formKosong(s) {
    if (s === 'barang') return { _s: s, id: '', nama: '', kategori: (S.master.kategori.filter(function (k) { return k.aktif; })[0] || {}).nama || '', harga: '', aktif: true, foto: '', fotoBerubah: false };
    if (s === 'kategori') return { _s: s, namaLama: '', nama: '', aktif: true };
    if (s === 'nama') return { _s: s, namaLama: '', nama: '', ket: '', wa: '', aktif: true };
    return { _s: s };
  }

  function renderAdmList() {
    var s = S.admin.section, f = S.admin.form, html = '', n = 0, q = S.admin.cari.trim().toLowerCase();
    if (s === 'barang') {
      var list = S.master.barang.filter(function (b) {
        return (S.admin.kat === 'Semua' || b.kategori === S.admin.kat) && (!q || b.nama.toLowerCase().indexOf(q) >= 0);
      });
      n = list.length;
      html = '<div class="adm-row head"><span></span><span>NAMA</span><span>KATEGORI</span><span style="text-align:right">HARGA</span><span style="text-align:center">DIJUAL</span><span></span></div>' +
        list.map(function (b) {
          var fb = fotoBarang(b);
          var th = fotoAman(fb) ? '<img class="th" src="' + esc(fb) + '" alt="">' : '<span class="th">' + esc(inisial(b.nama)) + '</span>';
          return '<div class="adm-row' + (b.aktif ? '' : ' off') + (f.id === b.id ? ' sel' : '') + '">' + th + '<span class="nm">' + esc(b.nama) + '</span>' +
            '<span class="muted">' + esc(b.kategori) + '</span><span class="hg">' + angka(b.harga) + '</span>' +
            '<button type="button" class="toggle' + (b.aktif ? ' on' : '') + '" data-act="admToggleBarang" data-id="' + esc(b.id) + '" aria-pressed="' + b.aktif + '" aria-label="' + (b.aktif ? 'Berhenti jual ' : 'Jual lagi ') + esc(b.nama) + '"><span><i></i></span></button>' +
            '<button type="button" class="btn sm" data-act="admEditBarang" data-id="' + esc(b.id) + '" style="color:var(--p)">Ubah</button></div>';
        }).join('');
      $('admCount').textContent = S.master.barang.length + ' barang · ' + S.master.barang.filter(function (b) { return b.aktif; }).length + ' dijual';
    } else if (s === 'kategori') {
      var hit = {};
      S.master.barang.forEach(function (b) { hit[b.kategori] = (hit[b.kategori] || 0) + 1; });
      n = S.master.kategori.length;
      html = '<div class="adm-row2 head"><span>KATEGORI</span><span>JUMLAH BARANG</span><span style="text-align:center">TAMPIL</span><span></span></div>' +
        S.master.kategori.map(function (k) {
          return '<div class="adm-row2' + (k.aktif ? '' : ' off') + (f.namaLama === k.nama ? ' sel' : '') + '"><span class="nm">' + esc(k.nama) + '</span><span class="muted">' + (hit[k.nama] || 0) + ' barang</span>' +
            '<button type="button" class="toggle' + (k.aktif ? ' on' : '') + '" data-act="admToggleKategori" data-k="' + esc(k.nama) + '" aria-pressed="' + k.aktif + '" aria-label="Tampilkan ' + esc(k.nama) + '"><span><i></i></span></button>' +
            '<button type="button" class="btn sm" data-act="admEditKategori" data-k="' + esc(k.nama) + '" style="color:var(--p)">Ubah</button></div>';
        }).join('');
      $('admCount').textContent = n + ' kategori';
    } else if (s === 'nama') {
      var names = S.admin.data.nama.filter(function (x) { return !q || x.nama.toLowerCase().indexOf(q) >= 0; })
        .sort(function (a, b) { return urutNama(a.nama, b.nama); });
      n = names.length;
      html = '<div class="adm-row2 head"><span>NAMA</span><span>NO WA WALI</span><span style="text-align:center">TAMPIL</span><span></span></div>' +
        names.map(function (x) {
          return '<div class="adm-row2' + (x.aktif ? '' : ' off') + (f.namaLama === x.nama ? ' sel' : '') + '"><span class="nm">' + esc(x.nama) + (x.ket ? '<small>' + esc(x.ket) + '</small>' : '') + '</span>' +
            '<span class="' + (x.wa ? '' : 'muted') + '">' + esc(x.wa || '—') + '</span>' +
            '<button type="button" class="toggle' + (x.aktif ? ' on' : '') + '" data-act="admToggleNama" data-n="' + esc(x.nama) + '" aria-pressed="' + x.aktif + '" aria-label="Tampilkan ' + esc(x.nama) + ' di kasir"><span><i></i></span></button>' +
            '<button type="button" class="btn sm" data-act="admEditNama" data-n="' + esc(x.nama) + '" style="color:var(--p)">Ubah</button></div>';
        }).join('');
      $('admCount').textContent = S.admin.data.nama.length + ' nama · ' + S.admin.data.nama.filter(function (x) { return x.aktif; }).length + ' tampil di kasir';
    }
    if (!n) html += '<p class="empty">Tidak ada data.</p>';
    $('admList').innerHTML = html;
  }

  function renderAdmForm() {
    var s = S.admin.section, f = S.admin.form, html = '';
    if (s === 'barang') {
      var katPilihan = S.master.kategori.filter(function (k) { return k.aktif || k.nama === f.kategori; });
      html = '<h2>' + (f.id ? 'Ubah barang' : 'Tambah barang baru') + '</h2>' +
        '<div class="field"><span class="lbl">Foto (boleh kosong)</span><div class="foto-box">' +
        (fotoAman(f.foto) ? '<img class="foto-prev" src="' + esc(f.foto) + '" alt="Foto barang">' : '<span class="foto-prev">Belum ada foto</span>') +
        '<div class="btns"><button type="button" class="btn sm" data-act="pilihFoto">Ambil / pilih foto</button>' +
        (f.foto ? '<button type="button" class="btn sm danger" data-act="hapusFoto">Hapus foto</button>' : '') + '</div></div></div>' +
        '<div class="field"><label for="fbNama">Nama barang</label><input id="fbNama" class="input" data-f="nama" value="' + esc(f.nama) + '" placeholder="mis. KAOS OLAHRAGA" autocomplete="off" style="text-transform:uppercase"></div>' +
        '<div class="field"><span class="lbl">Kategori</span><div class="chips">' + katPilihan.map(function (k) {
          return '<button type="button" class="chip' + (f.kategori === k.nama ? ' on' : '') + '" data-act="fbKat" data-k="' + esc(k.nama) + '" style="height:44px;font-size:15px">' + esc(k.nama) + '</button>';
        }).join('') + '</div><small>Kategori baru bisa ditambah di menu Kategori.</small></div>' +
        '<div class="field"><label for="fbHarga">Harga satuan</label><div class="input-rp"><span>Rp</span><input id="fbHarga" class="input" data-f="harga" inputmode="numeric" value="' + esc(f.harga ? angka(f.harga) : '') + '" placeholder="0"></div></div>' +
        '<div class="toggle-line"><span>Dijual (tampil di kasir)</span><button type="button" class="toggle' + (f.aktif ? ' on' : '') + '" data-act="fToggleAktif" aria-pressed="' + f.aktif + '" aria-label="Dijual"><span><i></i></span></button></div>' +
        (f.id ? '<p class="note">Harga baru hanya berlaku untuk catatan berikutnya. Rekap yang sudah ada tidak berubah.</p>' : '') +
        '<div class="form-actions"><button type="button" class="btn" data-act="admBatalForm">' + (f.id ? 'Batal' : 'Kosongkan') + '</button>' +
        '<button type="button" class="btn primary grow" data-act="admSimpan">' + (f.id ? 'Simpan perubahan' : 'Tambah barang') + '</button></div>';
    } else if (s === 'kategori') {
      html = '<h2>' + (f.namaLama ? 'Ubah kategori' : 'Tambah kategori') + '</h2>' +
        '<div class="field"><label for="fkNama">Nama kategori</label><input id="fkNama" class="input" data-f="nama" value="' + esc(f.nama) + '" placeholder="mis. Alat Tulis" autocomplete="off"></div>' +
        '<div class="toggle-line"><span>Tampil di kasir</span><button type="button" class="toggle' + (f.aktif ? ' on' : '') + '" data-act="fToggleAktif" aria-pressed="' + f.aktif + '" aria-label="Tampil di kasir"><span><i></i></span></button></div>' +
        '<p class="note">Contoh kategori: Makanan, Minuman, Pakaian, Alat Olahraga, Alat Tulis. Kategori yang disembunyikan tidak muncul di kasir.</p>' +
        '<div class="form-actions"><button type="button" class="btn" data-act="admBatalForm">' + (f.namaLama ? 'Batal' : 'Kosongkan') + '</button>' +
        '<button type="button" class="btn primary grow" data-act="admSimpan">' + (f.namaLama ? 'Simpan perubahan' : 'Tambah kategori') + '</button></div>';
    } else if (s === 'nama') {
      html = '<h2>' + (f.namaLama ? 'Ubah data nama' : 'Tambah nama') + '</h2>' +
        '<div class="field"><label for="fnNama">Nama</label><input id="fnNama" class="input" data-f="nama" value="' + esc(f.nama) + '" placeholder="Nama santri / pengambil" autocomplete="off"></div>' +
        '<div class="field"><label for="fnKet">Keterangan (boleh kosong)</label><input id="fnKet" class="input" data-f="ket" value="' + esc(f.ket) + '" placeholder="mis. kelas / kamar / guru" autocomplete="off"></div>' +
        '<div class="field"><label for="fnWa">No WhatsApp wali</label><input id="fnWa" class="input" data-f="wa" type="tel" inputmode="tel" value="' + esc(f.wa) + '" placeholder="08xxxxxxxxxx" autocomplete="off"><small>Dipakai untuk tombol "Kirim rekap ke WA".</small></div>' +
        '<div class="toggle-line"><span>Tampil di kasir</span><button type="button" class="toggle' + (f.aktif ? ' on' : '') + '" data-act="fToggleAktif" aria-pressed="' + f.aktif + '" aria-label="Tampil di kasir"><span><i></i></span></button></div>' +
        (f.namaLama ? '<p class="note">Kalau nama diubah, semua catatan lama atas nama ini ikut diganti.</p>' : '<p class="note">Santri yang pindah atau lulus cukup disembunyikan, supaya catatan lamanya tetap ada.</p>') +
        '<div class="form-actions"><button type="button" class="btn" data-act="admBatalForm">' + (f.namaLama ? 'Batal' : 'Kosongkan') + '</button>' +
        '<button type="button" class="btn primary grow" data-act="admSimpan">' + (f.namaLama ? 'Simpan perubahan' : 'Tambah nama') + '</button></div>';
    }
    $('admForm').innerHTML = html;
  }

  function panelPengaturan() {
    var p = S.admin.data.pengaturan;
    return '<section class="panel" style="max-width:760px"><h2>Pengaturan</h2>' +
      '<div class="field"><label for="psToko">Nama toko</label><input id="psToko" class="input" value="' + esc(p.toko) + '"></div>' +
      '<div class="field"><label for="psSub">Tulisan di bawah nama toko</label><input id="psSub" class="input" value="' + esc(p.subjudul) + '"></div>' +
      '<div class="field"><label for="psPesan">Kalimat penutup pesan WA &amp; PDF</label><textarea id="psPesan" class="input">' + esc(p.pesanPenutup) + '</textarea></div>' +
      '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px">' +
      '<div class="field"><label for="psPin">PIN admin baru (kosongkan jika tidak diganti)</label><input id="psPin" class="input" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div>' +
      '<div class="field"><label for="psPin2">Ulangi PIN baru</label><input id="psPin2" class="input" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password"></div></div>' +
      '<div class="form-actions" style="margin-top:8px"><span></span><button type="button" class="btn primary grow" data-act="simpanPengaturan">Simpan pengaturan</button></div></section>';
  }

  function kompresFoto(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () {
        var maks = 320;
        var w = img.naturalWidth, h = img.naturalHeight;
        var c = document.createElement('canvas');
        var hasil = '';
        for (var coba = 0; coba < 10; coba++) {
          var sk = Math.min(1, maks / Math.max(w, h));
          c.width = Math.max(1, Math.round(w * sk));
          c.height = Math.max(1, Math.round(h * sk));
          var ctx = c.getContext('2d');
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, c.width, c.height);
          ctx.drawImage(img, 0, 0, c.width, c.height);
          hasil = c.toDataURL('image/jpeg', 0.72);
          if (hasil.length < 32000) break;
          maks = Math.round(maks * 0.82);
        }
        URL.revokeObjectURL(url);
        if (hasil.length < 32000) resolve(hasil); else reject(new Error('Foto terlalu besar.'));
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('File bukan foto yang bisa dibaca.')); };
      img.src = url;
    });
  }

  function admSimpan() {
    var s = S.admin.section, f = S.admin.form, aksi, data;
    if (s === 'barang') {
      var harga = Number(String(f.harga).replace(/[^0-9]/g, '')) || 0;
      if (!f.nama.trim()) return toast('Nama barang belum diisi.', true);
      if (!f.kategori) return toast('Pilih kategori dulu.', true);
      if (!harga) return toast('Harga belum diisi.', true);
      aksi = 'simpanBarang';
      data = { id: f.id, nama: f.nama.trim().toUpperCase(), kategori: f.kategori, harga: harga, aktif: f.aktif };
      if (f.fotoBerubah || !f.id) data.foto = f.foto || '';
    } else if (s === 'kategori') {
      if (!f.nama.trim()) return toast('Nama kategori belum diisi.', true);
      aksi = 'simpanKategori';
      data = { namaLama: f.namaLama, nama: f.nama.trim(), aktif: f.aktif };
    } else if (s === 'nama') {
      if (!f.nama.trim()) return toast('Nama belum diisi.', true);
      aksi = 'simpanNama';
      data = { namaLama: f.namaLama, nama: f.nama.trim(), ket: f.ket.trim(), wa: f.wa.trim(), aktif: f.aktif };
    }
    var btn = document.querySelector('[data-act="admSimpan"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Menyimpan…'; }
    api(aksi, data, S.pin).then(function (r) {
      cacheRekap = {};
      if (s === 'barang' && data.foto !== undefined && r.id) simpanFotoLokal(r.id, data.foto ? { v: r.fotoV, data: data.foto } : null);
      toast(s === 'barang' ? data.nama + ' tersimpan. Langsung muncul di kasir.' : 'Tersimpan.');
      if (s === 'nama' && data.namaLama && data.namaLama !== data.nama && S.nama === data.namaLama) S.nama = data.nama;
      S.admin.form = formKosong(s);
      return muatAdmin();
    }, function (e) {
      if (pinDitolak(e)) return;
      toast(e.net ? 'Tidak ada internet. Belum tersimpan.' : e.message, true);
      if (btn) { btn.disabled = false; btn.textContent = 'Coba simpan lagi'; }
    });
  }

  function admToggle(aksi, data, label) {
    api(aksi, data, S.pin).then(function () { toast(label); return muatAdmin(); }, function (e) {
      if (!pinDitolak(e)) toast(e.net ? 'Tidak ada internet.' : e.message, true);
    });
  }

  function simpanPengaturan() {
    var pin = $('psPin').value.trim(), pin2 = $('psPin2').value.trim();
    if (pin && !/^\d{4,6}$/.test(pin)) return toast('PIN harus 4 sampai 6 angka.', true);
    if (pin && pin !== pin2) return toast('Ulangi PIN belum sama.', true);
    var data = { toko: $('psToko').value.trim(), subjudul: $('psSub').value.trim(), pesanPenutup: $('psPesan').value.trim() };
    if (pin) data.pinBaru = pin;
    api('simpanPengaturan', data, S.pin).then(function () {
      if (pin) { S.pin = pin; sesi.set('kb_pin', pin); }
      toast('Pengaturan tersimpan.' + (pin ? ' PIN baru sudah aktif.' : ''));
      return muatAdmin();
    }, function (e) { if (!pinDitolak(e)) toast(e.net ? 'Tidak ada internet.' : e.message, true); });
  }

  /* ---------------- Aksi (klik) ---------------- */
  var AKSI = {
    nav: function (el) { gantiView(el.getAttribute('data-view')); },
    pilihNama: function (el) { S.nama = el.getAttribute('data-nama'); renderNama(); renderKeranjang(); },
    tab: function (el) { S.tab = el.getAttribute('data-tab'); renderTabs(); renderGrid(); $('gridBarang').scrollTop = 0; },
    tambah: function (el) { var id = el.getAttribute('data-id'); aturQty(id, (S.cart[id] || 0) + 1); },
    kurang: function (el) { var id = el.getAttribute('data-id'); aturQty(id, (S.cart[id] || 0) - 1); },
    kirim: kirim,
    berikutnya: berikutnya,
    batalTerakhir: batalTerakhir,
    ulangiKirim: ulangiKirim,
    riwayat: bukaRiwayat,
    batalRiwayat: batalRiwayat,
    tutup: tutupModal,
    namaBaru: namaBaru,
    simpanNamaBaru: simpanNamaBaru,
    pilihTanggal: pilihTanggal,
    tanggalHariIni: function () { S.tanggal = hariIni(); S.tanggalManual = false; renderHeader(); renderKeranjang(); },
    kirimUlang: function () { flushOutbox(true); },
    bulan: function (el) { S.rekap.bulan = geserBulan(S.rekap.bulan, +el.getAttribute('data-n')); S.rekap.sel = ''; muatRekap(); },
    muatRekap: muatRekap,
    filterRekap: function (el) { S.rekap.filter = el.getAttribute('data-f'); renderRekap(); },
    pilihOrang: function (el) { S.rekap.sel = el.getAttribute('data-nama'); renderRekap(); },
    modeRekap: function (el) { S.rekap.mode = el.getAttribute('data-m'); renderRekap(); },
    waTeks: waTeks,
    salinTeks: salinTeks,
    pdfOrang: pdfOrang,
    pdfBulan: pdfBulan,
    cetakOrang: cetakOrang,
    toggleLunas: toggleLunas,
    muatAdmin: muatAdmin,
    admSection: function (el) { S.admin.section = el.getAttribute('data-s'); S.admin.cari = ''; S.admin.form = null; renderAdmin(); },
    keluarAdmin: function () { S.pin = ''; sesi.del('kb_pin'); gantiView('kasir'); toast('Menu admin sudah dikunci.'); },
    admKat: function (el) { S.admin.kat = el.getAttribute('data-k'); renderAdmin(); },
    admEditBarang: function (el) {
      var b = barangById(el.getAttribute('data-id'));
      if (!b) return;
      S.admin.form = { _s: 'barang', id: b.id, nama: b.nama, kategori: b.kategori, harga: b.harga, aktif: b.aktif, foto: fotoBarang(b), fotoBerubah: false };
      renderAdmList(); renderAdmForm();
    },
    admEditKategori: function (el) {
      var k = S.master.kategori.filter(function (x) { return x.nama === el.getAttribute('data-k'); })[0];
      if (!k) return;
      S.admin.form = { _s: 'kategori', namaLama: k.nama, nama: k.nama, aktif: k.aktif };
      renderAdmList(); renderAdmForm();
    },
    admEditNama: function (el) {
      var x = S.admin.data.nama.filter(function (n) { return n.nama === el.getAttribute('data-n'); })[0];
      if (!x) return;
      S.admin.form = { _s: 'nama', namaLama: x.nama, nama: x.nama, ket: x.ket, wa: x.wa, aktif: x.aktif };
      renderAdmList(); renderAdmForm();
    },
    admBatalForm: function () { S.admin.form = formKosong(S.admin.section); renderAdmList(); renderAdmForm(); },
    admSimpan: admSimpan,
    fbKat: function (el) { S.admin.form.kategori = el.getAttribute('data-k'); renderAdmForm(); },
    fToggleAktif: function (el) { S.admin.form.aktif = !S.admin.form.aktif; el.classList.toggle('on', S.admin.form.aktif); el.setAttribute('aria-pressed', S.admin.form.aktif); },
    pilihFoto: function () { $('inputFoto').value = ''; $('inputFoto').click(); },
    hapusFoto: function () { S.admin.form.foto = ''; S.admin.form.fotoBerubah = true; renderAdmForm(); },
    admToggleBarang: function (el) {
      var b = barangById(el.getAttribute('data-id'));
      if (!b) return;
      admToggle('simpanBarang', { id: b.id, nama: b.nama, kategori: b.kategori, harga: b.harga, aktif: !b.aktif }, b.aktif ? b.nama + ' tidak dijual lagi (disembunyikan dari kasir).' : b.nama + ' dijual lagi.');
    },
    admToggleKategori: function (el) {
      var k = el.getAttribute('data-k');
      var x = S.master.kategori.filter(function (c) { return c.nama === k; })[0];
      if (!x) return;
      admToggle('simpanKategori', { namaLama: k, nama: k, aktif: !x.aktif }, x.aktif ? 'Kategori ' + k + ' disembunyikan dari kasir.' : 'Kategori ' + k + ' tampil lagi.');
    },
    admToggleNama: function (el) {
      var n = el.getAttribute('data-n');
      var x = S.admin.data.nama.filter(function (c) { return c.nama === n; })[0];
      if (!x) return;
      admToggle('simpanNama', { namaLama: n, nama: n, ket: x.ket, wa: x.wa, aktif: !x.aktif }, x.aktif ? n + ' disembunyikan dari kasir.' : n + ' tampil lagi di kasir.');
    },
    simpanPengaturan: simpanPengaturan
  };

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    var f = AKSI[el.getAttribute('data-act')];
    if (f) f(el, e);
  });

  document.addEventListener('input', function (e) {
    var t = e.target;
    if (t.id === 'cariNama') { S.cari = t.value; renderNama(); return; }
    if (t.id === 'admCari') { S.admin.cari = t.value; renderAdmList(); return; }
    var key = t.getAttribute && t.getAttribute('data-f');
    if (key && S.admin.form) {
      if (key === 'harga') {
        var digit = t.value.replace(/[^0-9]/g, '');
        S.admin.form.harga = digit ? Number(digit) : '';
        t.value = digit ? angka(digit) : '';
      } else {
        S.admin.form[key] = t.value;
      }
    }
  });

  $('inputTanggal').addEventListener('change', function (e) {
    var v = e.target.value;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return;
    if (v > hariIni()) { toast('Tidak bisa memilih tanggal yang belum terjadi.', true); return; }
    S.tanggal = v;
    S.tanggalManual = v !== hariIni();
    renderHeader(); renderKeranjang();
    if (S.tanggalManual) toast('Mencatat untuk ' + tglPanjang(v) + '.');
  });

  $('inputFoto').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    if (!file || !S.admin.form) return;
    kompresFoto(file).then(function (data) {
      S.admin.form.foto = data;
      S.admin.form.fotoBerubah = true;
      renderAdmForm();
    }, function (err) { toast(err.message, true); });
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && modalAktif() && !S.last) tutupModal();
  });

  window.addEventListener('online', function () { setOnline(true); flushOutbox(); });
  window.addEventListener('offline', function () { setOnline(false); });

  /* ---------------- Mulai ---------------- */
  function mulai() {
    renderHeader();
    renderKasir();
    siapkanLogo();
    if (!API_URL) {
      bukaModal('<h2>Aplikasi belum tersambung</h2><p>Isi alamat Web App Google Apps Script di file <b>js/config.js</b> (lihat README.md), lalu muat ulang halaman ini.</p>', 'sm');
      return;
    }
    flushOutbox();
    muatFotoLokal().then(function () {
      if (S.view === 'kasir') renderGrid();
      return muatMaster();
    });
    setInterval(function () { flushOutbox(); }, 30000);
    setInterval(function () { if (S.view === 'kasir' && !modalAktif()) muatMaster(); }, 5 * 60000);
    setInterval(function () {
      if (!S.tanggalManual && S.tanggal !== hariIni()) { S.tanggal = hariIni(); renderHeader(); renderKeranjang(); }
    }, 60000);
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* abaikan */ });
    }
  }

  window.KasbonApp = { state: S };
  mulai();
})();
