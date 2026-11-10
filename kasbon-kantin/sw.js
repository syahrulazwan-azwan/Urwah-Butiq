/*
 * Service worker: menyimpan file aplikasi di tablet supaya tetap bisa dibuka
 * walau internet putus. Data kasbon TIDAK lewat sini (dikirim ke Apps Script).
 * Naikkan angka VERSI setiap kali file aplikasi diubah.
 */
var VERSI = 'kasbon-v1';
var FILE = [
  './',
  './index.html',
  './css/style.css',
  './js/config.js',
  './js/app.js',
  './js/vendor/jspdf.umd.min.js',
  './js/vendor/jspdf.plugin.autotable.min.js',
  './assets/logo.png',
  './manifest.json'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSI).then(function (c) { return c.addAll(FILE); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSI; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// Ambil dari internet dulu (supaya selalu versi terbaru); kalau gagal, pakai salinan di tablet.
self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req).then(function (res) {
      var salin = res.clone();
      caches.open(VERSI).then(function (c) { c.put(req, salin); });
      return res;
    }).catch(function () {
      return caches.match(req).then(function (r) { return r || caches.match('./index.html'); });
    })
  );
});
