/**
 * Klien API + penjaga sesi SIMON-LTT. Dipakai semua halaman.
 * Token disimpan di sessionStorage (hilang saat tab ditutup). Hak akses SEBENARNYA ada di backend;
 * pemeriksaan di sini hanya untuk tampilan dan pengalihan halaman.
 */
(function () {
  var CFG = window.SIMON_CONFIG, KEY = 'simon.session';

  function getSession() { try { return JSON.parse(sessionStorage.getItem(KEY)) || null; } catch (e) { return null; } }
  function setSession(s) { sessionStorage.setItem(KEY, JSON.stringify(s)); }
  function clearSession() { sessionStorage.removeItem(KEY); sessionStorage.removeItem('simon.music'); sessionStorage.removeItem('simon.welcome'); }

  function newId() {
    var a = new Uint8Array(12); crypto.getRandomValues(a);
    return 'PKG-' + Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('').toUpperCase();
  }

  /** POST JSON bertipe text/plain agar tidak memicu preflight CORS. Mengembalikan data atau melempar Error{code,fields}. */
  async function call(action, payload, opts) {
    opts = opts || {};
    var s = getSession();
    var res;
    try {
      res = await fetch(CFG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: action, token: s ? s.token : undefined, payload: payload || {} })
      });
    } catch (e) { var n = new Error('Koneksi ke server gagal. Periksa internet Anda.'); n.code = 'NETWORK'; throw n; }
    var j;
    try { j = await res.json(); } catch (e) { var p = new Error('Respons server tidak dapat dibaca.'); p.code = 'SERVER'; throw p; }
    if (!j.ok) {
      var er = new Error(j.error && j.error.message || 'Terjadi kesalahan.');
      er.code = j.error && j.error.code; er.fields = j.error && j.error.fields;
      if (er.code === 'SESSION_EXPIRED' && !opts.noRedirect) { clearSession(); location.href = CFG.LOGIN_PAGE + '?expired=1'; }
      if (er.code === 'MUST_CHANGE_PASSWORD' && !opts.noRedirect) { location.href = 'pengaturan.html?ganti=1'; }
      throw er;
    }
    return j.data;
  }

  async function login(username, password) {
    var d = await call('auth.login', { username: username, password: password }, { noRedirect: true });
    setSession({ token: d.token, expiresAt: d.expiresAt, profile: d.profile });
    sessionStorage.setItem('simon.welcome', '1'); // layar pembuka tampil sekali setelah login berhasil
    return d.profile;
  }
  async function logout() {
    try { await call('auth.logout', {}, { noRedirect: true }); } catch (e) { /* tetap keluar */ }
    clearSession(); location.href = CFG.LOGIN_PAGE;
  }

  /**
   * Panggil di awal setiap halaman terlindung. Memvalidasi sesi ke server sebelum isi ditampilkan.
   * roles: daftar peran yang boleh membuka halaman (kosong = semua peran).
   */
  async function guard(roles) {
    document.documentElement.style.visibility = 'hidden';
    if (!getSession()) { location.replace(CFG.LOGIN_PAGE); return new Promise(function () {}); }
    var me = await call('auth.me', {});
    var s = getSession(); s.profile = me; setSession(s);
    if (roles && roles.length && roles.indexOf(me.role) === -1) { location.replace(CFG.HOME_PAGE); return new Promise(function () {}); }
    document.documentElement.style.visibility = '';
    return me;
  }

  /** Jam server (untuk hitung mundur batas 16.00); jangan dipakai sebagai penentu, backend yang memutuskan. */
  function serverClock(profile) {
    var off = new Date(profile.serverNow).getTime() - Date.now();
    return function () { return new Date(Date.now() + off); };
  }

  window.SimonAPI = { call: call, login: login, logout: logout, guard: guard, session: getSession, newId: newId, serverClock: serverClock };
})();
