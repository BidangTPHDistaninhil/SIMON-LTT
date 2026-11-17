/** Utilitas tampilan bersama */
(function () {
  function esc(s) { return String(s === null || s === undefined ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  /** Pengurai angka yang SAMA dengan backend: 959,50 dan 959.50 diterima. null = kosong, NaN = tidak valid. */
  function parseNum(v) {
    if (v === null || v === undefined) return null;
    if (typeof v === 'number') return isFinite(v) ? v : NaN;
    var s = String(v).trim().replace(/\s/g, '');
    if (s === '') return null;
    if (!/^[0-9.,]+$/.test(s)) return NaN;
    var d = s.lastIndexOf('.'), c = s.lastIndexOf(','), dec = null;
    if (d !== -1 && c !== -1) dec = d > c ? '.' : ',';
    else if (d !== -1) dec = (s.split('.').length - 1) === 1 ? '.' : null;
    else if (c !== -1) dec = (s.split(',').length - 1) === 1 ? ',' : null;
    var out;
    if (dec === null) out = s.replace(/[.,]/g, '');
    else { var i = s.lastIndexOf(dec); out = s.substring(0, i).replace(/[.,]/g, '') + '.' + s.substring(i + 1).replace(/[.,]/g, ''); }
    var n = Number(out); return out === '.' || out === '' || !isFinite(n) ? NaN : n;
  }
  function num(v) { var n = parseNum(v); return (n === null || isNaN(n)) ? 0 : n; }
  function fmt(n, suffix) { return (Number(n) || 0).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (suffix || ''); }

  function toast(msg, isErr) {
    var box = document.getElementById('toasts');
    if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.className = 'toasts'; document.body.appendChild(box); }
    var t = document.createElement('div'); t.className = 'toast' + (isErr ? ' err' : ''); t.textContent = msg; t.setAttribute('role', 'status');
    box.appendChild(t); setTimeout(function () { t.remove(); }, isErr ? 7000 : 3800);
  }
  function errMsg(e) {
    var m = e && e.message ? e.message : 'Terjadi kesalahan.';
    if (e && e.fields && e.fields.length > 1) m += ' (' + e.fields.length + ' isian bermasalah)';
    return m;
  }
  function confirmBox(title, text, okLabel, danger) {
    return new Promise(function (res) {
      var d = document.createElement('dialog');
      d.innerHTML = '<h3>' + esc(title) + '</h3><p>' + esc(text) + '</p><div class="acts"><button class="btn ghost" data-v="0">Batal</button><button class="btn ' + (danger ? 'danger' : '') + '" data-v="1">' + esc(okLabel || 'Ya') + '</button></div>';
      document.body.appendChild(d);
      d.addEventListener('click', function (ev) { var v = ev.target.getAttribute && ev.target.getAttribute('data-v'); if (v !== null) { d.close(); d.remove(); res(v === '1'); } });
      d.addEventListener('cancel', function () { d.remove(); res(false); });
      d.showModal();
    });
  }
  function busy(btn, on, label) {
    if (!btn) return;
    if (on) { btn.dataset.l = btn.innerHTML; btn.disabled = true; btn.textContent = label || 'Memproses…'; }
    else { btn.disabled = false; if (btn.dataset.l) btn.innerHTML = btn.dataset.l; }
  }

  /** Mengunduh Blob sebagai berkas. */
  function downloadBlob(blob, name) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var LOGO = 'https://upload.wikimedia.org/wikipedia/commons/a/a3/Logo_kabupaten_indragiri_hilir.jpg';
  function opt(v, l, sel) { return '<option value="' + esc(v) + '"' + (sel ? ' selected' : '') + '>' + esc(l) + '</option>'; }

  window.SimonUI = { downloadBlob: downloadBlob, BULAN: BULAN, esc: esc, parseNum: parseNum, num: num, fmt: fmt, toast: toast, errMsg: errMsg, confirm: confirmBox, busy: busy, LOGO: LOGO, opt: opt };
})();
