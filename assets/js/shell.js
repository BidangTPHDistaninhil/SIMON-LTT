/**
 * Kerangka SIMON-LTT untuk SEMUA halaman terlindung: penjaga sesi, sidebar per peran, header, tombol kembali,
 * musik latar (satu pemutar bersama), dan layar pembuka setelah login.
 * <body data-mode="app|public" data-page="..." data-title="..." data-roles="ADMIN,PETUGAS_KABUPATEN,...">
 */
(function () {
  var A = 'ADMIN', D = 'KADIS', B = 'KABID', K = 'PETUGAS_KABUPATEN', C = 'PETUGAS_KECAMATAN';
  var ALL = [A, D, B, K, C], WRITE = [A, K, C], MGR = [A, K], LOG_ROLES = [A, K, C];
  var IC = {
    dashboard: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    input: '<path d="M12 5v14M5 12h14"/>',
    data: '<path d="M3 5h18M3 12h18M3 19h18"/>',
    big: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
    day: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/>',
    month: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    chart: '<path d="M3 17l5-6 4 4 8-9"/><path d="M15 6h5v5"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6M17 5a3 3 0 010 6M22 20c0-2.5-1.5-4.5-4-5.5"/>',
    log: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
    out: '<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11"/>'
  };
  var NAV = [
    { g: 'Utama', id: 'dashboard', href: 'dashboard.html', t: 'Dashboard', i: 'dashboard', r: ALL },
    { id: 'input', href: 'input.html', t: 'Input LTT', i: 'input', r: WRITE },
    { id: 'data', href: 'data.html', t: 'Data LTT', i: 'data', r: ALL },
    { g: 'Laporan', id: 'tampilltt', href: 'tampilltt.html', t: 'Dashboard Besar', i: 'big', r: ALL },
    { id: 'harian', href: 'harian.html', t: 'Laporan Harian', i: 'day', r: ALL },
    { id: 'bulanan', href: 'bulanan.html', t: 'Laporan Bulanan', i: 'month', r: ALL },
    { id: 'capaian', href: 'capaian.html', t: 'Capaian Target', i: 'target', r: ALL },
    { id: 'analisis', href: 'analisis.html', t: 'Analisis Tanam & Panen', i: 'chart', r: ALL },
    { g: 'Administrasi', id: 'pengguna', href: 'pengguna.html', t: 'Pengguna', i: 'users', r: MGR },
    { id: 'log', href: 'log.html', t: 'Log Aktivitas', i: 'log', r: LOG_ROLES },
    { id: 'pengaturan', href: 'pengaturan.html', t: 'Pengaturan', i: 'cog', r: ALL }
  ];
  var ROLE_LABEL = { ADMIN: 'Administrator', KADIS: 'Kepala Dinas', KABID: 'Kepala Bidang', PETUGAS_KABUPATEN: 'Petugas Kabupaten', PETUGAS_KECAMATAN: 'Petugas Kecamatan' };
  var me = null, waiters = [];

  function ready(fn) { if (me) fn(me); else waiters.push(fn); }
  function esc(s) { return window.SimonUI.esc(s); }
  function svg(n) { return '<svg viewBox="0 0 24 24" aria-hidden="true">' + IC[n] + '</svg>'; }
  function cfg() { return window.SIMON_CONFIG || {}; }

  // ---------- Musik latar: satu pemutar bersama, status dibawa antar halaman (sessionStorage) ----------
  
  // ---------- Musik background per halaman ----------
  var Music = (function () {
    var KEY = 'simon.music';
    var a = null, state = 'off', btns = [], bc = null;
    var armed = false, st = read(), src = '';

    var TRACKS = {
  dashboard: 'assets/musik/gonachange.mp3',
  tampilltt: 'assets/musik/Sentimental.mp3',
  harian: 'assets/musik/foreverinlove.mp3',
  bulanan: 'assets/musik/perfect.mp3',
  capaian: 'assets/musik/imalive.mp3',
  analisis: 'assets/musik/themoment.mp3'
};

    function read() {
      try { return JSON.parse(sessionStorage.getItem(KEY)) || {}; }
      catch (e) { return {}; }
    }

    function write() {
      try {
        sessionStorage.setItem(KEY, JSON.stringify({
          muted: !!st.muted
        }));
      } catch (e) {}
    }

    function label() {
      if (state === 'on') return 'Musik menyala (klik untuk mute)';
      if (state === 'blocked') return 'Browser menahan musik. Klik untuk memutar';
      if (state === 'missing') return 'Berkas musik tidak ditemukan: ' + src;
      if (st.muted) return 'Musik dimatikan (klik untuk mengaktifkan)';
      return 'Putar musik';
    }

    function ui() {
      btns.forEach(function (b) {
        b.dataset.state = state;
        b.setAttribute('aria-pressed', state === 'on' ? 'true' : 'false');
        b.title = label();
        b.setAttribute('aria-label', label());

        b.textContent = st.muted ? '🔇' :
          state === 'on' ? '🔊' : '🔈';

        b.classList.toggle('pulse', state === 'blocked');
      });
    }

    function ensure() {
      if (a) return a;

      a = new Audio();
      a.loop = true;
      a.preload = 'auto';
      a.src = src;

      a.addEventListener('error', function () {
        state = 'missing';
        ui();
      });

      return a;
    }

    function armResume() {
      if (armed) return;
      armed = true;

      var go = function () {
        armed = false;
        document.removeEventListener('pointerdown', go, true);
        document.removeEventListener('keydown', go, true);

        if (state === 'blocked' && !st.muted) play();
      };

      document.addEventListener('pointerdown', go, true);
      document.addEventListener('keydown', go, true);
    }

    async function play() {
      if (!src || st.muted) {
        state = 'off';
        ui();
        return;
      }

      ensure();

      try {
        await a.play();
        state = 'on';

        if (bc) bc.postMessage('playing');
      } catch (e) {
        if (a.error) state = 'missing';
        else {
          state = 'blocked';
          armResume();
        }
      }

      ui();
    }

    function pause() {
      if (a) a.pause();
      state = 'off';
      ui();
    }

    function toggle() {
  if (state === 'on') {
    st.muted = true;
    pause();
  } else {
    st.muted = false;
    write();

    if (a && a.error) a = null;
    play();
  }

  write();
  ui();
}

    function bind(b) {
      btns.push(b);
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        toggle();
      });
      ui();
    }

    function init(page, defer) {
      src = TRACKS[page] || '';

      try {
        bc = new BroadcastChannel('simon-music');

        bc.onmessage = function () {
          if (a && !a.paused) {
            a.pause();
            state = 'off';
            ui();
          }
        };
      } catch (e) {
        bc = null;
      }

      window.addEventListener('pagehide', function () {
        if (a) a.pause();
      });

      if (!src) {
        pause();
        return;
      }

      if (!st.muted && !defer) play();
      else ui();
    }

    return {
      bind: bind,
      init: init,
      toggle: toggle,
      play: play,
      pause: pause
    };
  })();


  // ---------- Layar pembuka (hanya sekali setelah login berhasil) ----------



function welcome(p) {
  if (sessionStorage.getItem('simon.welcome') !== '1') return;
  sessionStorage.removeItem('simon.welcome');

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var o = document.createElement('div');
  o.className = 'welcome' + (reduce ? ' reduce' : '');
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-label', 'Selamat datang di SIMON-LTT INHIL');

  o.innerHTML =
    '<div class="w-bg"></div><div class="w-card">' +
    '<div class="w-logo"><img src="' + window.SimonUI.LOGO + '" referrerpolicy="no-referrer" alt="Logo Kabupaten Indragiri Hilir"></div>' +
    '<div class="w-mark">SIMON-LTT</div>' +
    '<h2>SELAMAT DATANG DI SIMON-LTT INHIL</h2>' +
    '<div class="w-line"></div>' +
    '<p>Sistem Informasi Monitoring Luas Tambah Tanam Kabupaten Indragiri Hilir</p>' +
    '<div class="w-user">' + esc(p.nama || p.username) + ' · ' + esc(ROLE_LABEL[p.role] || p.role) + (p.kecamatan ? ' · ' + esc(p.kecamatan) : '') + '</div>' +
    '<div class="w-acts"><button class="btn gold" data-go="1" type="button">Dengarkan Sambutan</button></div>' +
    '<div class="w-bar"><i></i></div><small>Ketuk di mana saja untuk mendengarkan sambutan · Esc untuk melewati</small></div>';

  document.body.appendChild(o);
  
  var audio = new Audio('assets/music/Welcome.mp3');
  audio.loop = false;
  audio.preload = 'auto';

  var started = false;
  var closed = false;

  function close(stopAudio) {
    if (closed) return;
    closed = true;

    if (stopAudio !== false) {
      audio.pause();
      audio.currentTime = 0;
    }

    document.removeEventListener('keydown', key);
    o.classList.add('out');

    setTimeout(function () {
      o.remove();
    }, 450);
  }

  function startWelcome() {
  if (started || closed) return;

  started = true;

  audio.play().catch(function () {
    // Autoplay diblokir browser.
    // Biarkan layar Welcome tetap tampil.
    // Pengguna bisa klik tombol untuk mencoba lagi.
    started = false;
  });
}

  function key(e) {
    if (e.key === 'Escape') {
      close();
      Music.play();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      startWelcome();
    }
  }

  // Musik halaman hanya dimulai setelah suara Welcome selesai.
  audio.addEventListener('ended', function () {
    close(false);
    Music.play();
  });

  // Jika file Welcome gagal diputar, lanjutkan ke musik halaman.
  audio.addEventListener('error', function () {
    close();
    Music.play();
  });

  document.addEventListener('keydown', key);

  var go = o.querySelector('[data-go]');

  if (go) {
    go.focus({ preventScroll: true });

    go.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopImmediatePropagation();

      // Jangan tutup layar selama suara Welcome masih berjalan.
      startWelcome();
    });
  }

  o.addEventListener('click', function (e) {
    if (e.target.closest('[data-go]')) return;
    startWelcome();
  });
  startWelcome();
}

  // ---------- Kerangka ----------
  function mountApp(p, page, title) {
    var sb = document.getElementById('sidebar'), tb = document.getElementById('topbar');
    if (sb) {
      var h = '<div class="brand"><div class="logo"><img src="' + window.SimonUI.LOGO + '" referrerpolicy="no-referrer" alt="Logo Kabupaten Indragiri Hilir"></div><div><b>SIMON-LTT</b><small>Dinas Pertanian<br>Kab. Indragiri Hilir</small></div></div><nav class="nav" aria-label="Menu utama">';
      NAV.forEach(function (n) {
        if (n.r.indexOf(p.role) === -1) return;
        if (n.g) h += '<div class="navgroup">' + esc(n.g) + '</div>';
        h += '<a href="' + n.href + '"' + (n.id === page ? ' class="active" aria-current="page"' : '') + '>' + svg(n.i) + esc(n.t) + '</a>';
      });
      h += '<div class="navgroup">Akun</div><a href="#" id="btnKeluar">' + svg('out') + 'Keluar</a></nav>';
      h += '<div class="me"><b>' + esc(p.nama || p.username) + '</b><span>' + esc(ROLE_LABEL[p.role] || p.role) + (p.kecamatan ? ' · ' + esc(p.kecamatan) : '') + '</span></div>';
      sb.innerHTML = h;
    }
    if (tb) {
      tb.innerHTML = '<button class="menu-btn" id="btnMenu" aria-label="Buka menu">☰</button>' +
        (page !== 'dashboard' ? '<a class="back" href="' + (cfg().HOME_PAGE || 'dashboard.html') + '" title="Kembali ke Dashboard">← <span>Dashboard</span></a>' : '') +
        '<div class="tt"><h1>' + esc(title || '') + '</h1><div class="sub">Sistem Informasi Monitoring Luas Tambah Tanam</div></div><div class="sp"></div>' +
        '<button class="icon-btn" id="musicBtn" type="button"></button>' +
        '<span class="chip role-chip">' + esc(ROLE_LABEL[p.role] || p.role) + (p.kecamatan ? ' · ' + esc(p.kecamatan) : '') + '</span>';
    }
    var k = document.getElementById('btnKeluar'); if (k) k.onclick = function (e) { e.preventDefault(); SimonAPI.logout(); };
    
var m = document.getElementById('btnMenu');
if (m) m.onclick = function (e) {
  e.stopPropagation();
  document.body.classList.toggle('nav-open');
};

    var sc = document.querySelector('.content'); if (sc) sc.addEventListener('click', function () { document.body.classList.remove('nav-open'); });
    var mb = document.getElementById('musicBtn'); if (mb) Music.bind(mb);
  }

  function fatal(missing) {
    document.documentElement.style.visibility = '';
    var d = document.createElement('div');
    d.style.cssText = 'max-width:560px;margin:12vh auto;padding:24px;font:15px/1.5 system-ui,sans-serif;border:2px solid #c0392b;border-radius:14px;background:#fff;color:#12241a';
    d.innerHTML = '<h2 style="color:#c0392b;margin-bottom:8px">Berkas aplikasi tidak termuat</h2><p>Halaman ini membutuhkan berkas berikut, tetapi browser tidak berhasil memuatnya:</p><ul style="margin:8px 0 8px 20px">' +
      missing.map(function (m) { return '<li><code>' + m + '</code></li>'; }).join('') + '</ul><p>Penyebab umum: berkas belum diunggah ke GitHub Pages, salah folder, atau browser masih menyimpan salinan lama (coba muat ulang paksa, Ctrl+F5). Buka <a href="diagnostik.html">diagnostik.html</a> untuk memeriksa setiap berkas.</p>';
    document.body.innerHTML = ''; document.body.appendChild(d);
  }

  document.addEventListener('DOMContentLoaded', async function () {
    var b = document.body, mode = b.dataset.mode || 'app', page = b.dataset.page || '';
    if (mode === 'public') return;
    var missing = [];
    if (!window.SIMON_CONFIG) missing.push('assets/js/config.js');
    if (!window.SimonUI) missing.push('assets/js/simon-ui.js');
    if (!window.SimonAPI) missing.push('assets/js/simon-api.js');
    if (missing.length) { fatal(missing); return; }
    var roles = (b.dataset.roles || '').split(',').filter(Boolean);
    var p;
    try { p = await SimonAPI.guard(roles); } catch (e) { document.documentElement.style.visibility = ''; document.body.innerHTML = '<div style="max-width:520px;margin:14vh auto;font:15px system-ui;padding:20px;border:1px solid #e1e8e3;border-radius:12px">' + esc(e.message || 'Gagal memeriksa sesi.') + ' <a href="index.html">Ke halaman login</a></div>'; return; }
    if (p.mustChange && page !== 'pengaturan') { location.replace('pengaturan.html?ganti=1'); return; }
    me = p; window.SIMON_ME = p;
    mountApp(p, page, b.dataset.title);

var showWelcome = sessionStorage.getItem('simon.welcome') === '1';

Music.init(page, showWelcome);
welcome(p);
    waiters.splice(0).forEach(function (f) { f(p); });
  });

  window.SimonShell = { ready: ready, ROLE_LABEL: ROLE_LABEL, Music: Music };
})();
