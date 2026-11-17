/**
 * Pustaka bersama halaman laporan: pemuatan data (satu API: legacy.data / legacy.target), normalisasi baris,
 * pengelompokan jenis, aturan warna capaian, grafik, dan ekspor Excel / PDF / CSV.
 * Rumus mengikuti halaman laporan lama; satu-satunya koreksi disebut di komentar "KOREKSI".
 */
(function () {
  var U = window.SimonUI;
  var MONTH_NUM = { JANUARI: '01', FEBRUARI: '02', MARET: '03', APRIL: '04', MEI: '05', JUNI: '06', JULI: '07', AGUSTUS: '08', SEPTEMBER: '09', OKTOBER: '10', NOVEMBER: '11', DESEMBER: '12' };
  var GROUPS = [
    { k: 'reguler', l: 'Reguler' }, { k: 'oplah', l: 'OPLAH' }, { k: 'csr', l: 'CSR' }, { k: 'gogo', l: 'GOGO' },
    { k: 'jagung', l: 'Jagung' }, { k: 'jagungpolri', l: 'Jagung Polri' }, { k: 'lainnya', l: 'Lainnya (Pompa, DAS, Tusip, Kedelai)' }
  ];
  var jenisLabels = {};

  
function dateStr(v) {
  if (v === null || v === undefined || v === '') return '';

  var s = String(v).trim();
  var y, m, d;

  
// Format YYYY-MM-DD atau timestamp ISO
var isoMatch = s.match(
  /^(\d{4})-(\d{2})-(\d{2})(?:$|[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$)/
);

if (isoMatch) {
  y = Number(isoMatch[1]);
  m = Number(isoMatch[2]);
  d = Number(isoMatch[3]);
} else if (/^\d{4}-/.test(s)) {
  return '';
}

  // Format DD/MM/YYYY atau DD-MM-YYYY
  else {
    var p = s.split(s.indexOf('/') >= 0 ? '/' : '-');

    if (p.length !== 3 ||
        !/^\d{1,2}$/.test(p[0]) ||
        !/^\d{1,2}$/.test(p[1]) ||
        !/^\d{4}$/.test(p[2])) {
      return '';
    }

    d = Number(p[0]);
    m = Number(p[1]);
    y = Number(p[2]);
  }

  // Validasi tanggal kalender sebenarnya.
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1) {
    return '';
  }

  var maxDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  if (d > maxDay) return '';

  return String(y).padStart(4, '0') + '-' +
    String(m).padStart(2, '0') + '-' +
    String(d).padStart(2, '0');
}


  /**
   * Penggolongan jenis untuk kartu rekap. Logika lama (detectJenis) dipertahankan.
   * KOREKSI: kode tersimpan memakai garis bawah ("jagung_polri"); pencocokan lama mencari "jagung polri" (dengan spasi)
   * sehingga Jagung Polri salah terhitung sebagai Jagung. Garis bawah kini disamakan dengan spasi.
   * Pompa, DAS, Tusip, Kedelai yang dulu tidak tampil kini terkumpul di "Lainnya" (total tidak berubah).
   */
  function grp(code) {
    var j = String(code || '').toLowerCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (j.indexOf('jagung polri') !== -1) return 'jagungpolri';
    if (j.indexOf('jagung') !== -1) return 'jagung';
    if (j.indexOf('oplah') !== -1) return 'oplah';
    if (j.indexOf('reguler') !== -1) return 'reguler';
    if (j.indexOf('csr') !== -1) return 'csr';
    if (j.indexOf('gogo') !== -1) return 'gogo';
    return 'lainnya';
  }
  function jenisLabel(code) { var k = String(code || '').toLowerCase(); return jenisLabels[k] || String(code || '') || '-'; }

  /** Satu baris data -> bentuk seragam. Header olah lahan dibaca dengan alias (OLAH LAHAN / LUAS OLAH LAHAN). */
  function normRow(o) {
    var olahRaw = o['OLAH LAHAN'] !== undefined ? o['OLAH LAHAN'] : o['LUAS OLAH LAHAN'];
    var tgl = dateStr(o.TANGGAL);
    return {
      tgl: tgl, thn: tgl.slice(0, 4), bln: tgl.slice(5, 7), kec: String(o.KECAMATAN || ''), desa: String(o['DESA/KELURAHAN'] || ''),
      poktan: String(o['KELOMPOK TANI'] || ''), jenis: String(o['JENIS LTT'] || ''), g: grp(o['JENIS LTT']),
      komoditas: String(o.KOMODITAS || ''), metode: String(o['METODE TANAM'] || ''), pelapor: String(o['NAMA PELAPOR'] || ''),
      luas: U.num(o['LUAS TAMBAH TANAM']), olah: U.num(olahRaw), panen: U.num(o['LUAS PANEN']),
      hasOlah: olahRaw !== undefined, hasPanen: o['LUAS PANEN'] !== undefined
    };
  }

  /** Memuat data. Wilayah sudah dibatasi server sesuai peran. */
  async function load(opts) {
    opts = opts || {};
    var jobs = [SimonAPI.call('legacy.data'), SimonAPI.call('ref.get')];
    if (opts.target) jobs.push(SimonAPI.call('legacy.target'));
    var r = await Promise.all(jobs);
    if (!Array.isArray(r[0])) throw new Error('Format data tidak sesuai dari server.');
    jenisLabels = {}; (r[1].jenisLtt || []).forEach(function (j) { jenisLabels[j.v] = j.l; });
    var out = { rows: r[0].map(normRow), ref: r[1] };
    if (opts.target) { if (!Array.isArray(r[2])) throw new Error('Format data target tidak sesuai dari server.'); out.target = r[2]; }
    return out;
  }

  function weekOfMonth(tgl) {
    var day = parseInt(String(tgl || '').slice(8, 10), 10);
    if (!day || isNaN(day)) return null;
    return day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4;
  }
  /** Warna capaian (ambang sama dengan halaman Capaian lama). */
  
function statusColor(p) {
  p = Number(p);
  if (!Number.isFinite(p)) p = 0;

  if (p <= 30) {
    return { solid: '#ef4444', glow: 'rgba(239,68,68,.45)', label: 'Rendah' };
  }
  if (p <= 50) {
    return { solid: '#f97316', glow: 'rgba(249,115,22,.45)', label: 'Kurang' };
  }
  if (p <= 70) {
    return { solid: '#86efac', glow: 'rgba(134,239,172,.45)', label: 'Sedang' };
  }
  if (p <= 100) {
    return { solid: '#15803d', glow: 'rgba(21,128,61,.5)', label: 'Tercapai' };
  }

  return { solid: '#10b981', glow: 'rgba(16,185,129,.55)', label: 'Melampaui' };
}

  function sumBy(rows, keyFn, valFn) { var m = {}; rows.forEach(function (r) { var k = keyFn(r); m[k] = (m[k] || 0) + valFn(r); }); return m; }
  function topN(map, n) { return Object.keys(map).map(function (k) { return [k, map[k]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, n); }
  function bulanLabel(bln, thn) { var i = parseInt(bln, 10) - 1; return (U.BULAN[i] || '') + (thn ? ' ' + thn : ''); }

  // ---------- status memuat / galat ----------
  function state(html) { var el = document.getElementById('state'); if (el) el.innerHTML = html || ''; }
  function loading(msg) { state('<div class="card state"><div class="spinner" aria-hidden="true"></div><div><b>' + U.esc(msg || 'Memuat data…') + '</b><div class="sub">Mengambil data dari server.</div></div></div>'); }
  function failed(err, retry) {
    state('<div class="card state err"><div style="font-size:26px" aria-hidden="true">⚠️</div><div style="flex:1"><b>Gagal memuat data</b><div class="sub">' + U.esc(err && err.message ? err.message : String(err)) + '</div></div><button class="btn" id="btnRetry">Coba Lagi</button></div>');
    var b = document.getElementById('btnRetry'); if (b) b.onclick = retry;
  }
  /** Menjalankan pemuatan halaman dengan penanganan galat yang jelas. */
  async function boot(fn) {
    loading();
    try { await fn(); state(''); } catch (e) { console.error(e); failed(e, function () { boot(fn); }); }
  }

  // ---------- grafik ----------
  var charts = {};
  async function chart(id, cfg) {
    await SimonLibs.load(['chart']);
    var cv = document.getElementById(id); if (!cv) return null;
    if (charts[id]) charts[id].destroy();
    window.Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
    window.Chart.defaults.color = '#5b6f63';
    charts[id] = new window.Chart(cv.getContext('2d'), cfg);
    return charts[id];
  }
  function barCfg(labels, sets, extra) {
    return { type: 'bar', data: { labels: labels, datasets: sets.map(function (s) { return { label: s.label, data: s.data, backgroundColor: s.color, borderRadius: 6, maxBarThickness: s.thick || 28 }; }) },
      options: Object.assign({ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: sets.length > 1, position: 'top', align: 'end', labels: { usePointStyle: true, pointStyle: 'circle' } },
        tooltip: { callbacks: { label: function (c) { return ' ' + c.dataset.label + ': ' + U.fmt(c.parsed.y, ' Ha'); } } } },
        scales: { y: { beginAtZero: true, grid: { color: 'rgba(11,59,46,.07)' } }, x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 60, minRotation: 0 } } } }, extra || {}) };
  }

  // ---------- ekspor ----------
  
function csvCell(v) {
  var s = typeof v === 'number'
    ? String(v)
    : String(v === null || v === undefined ? '' : v);

  // Cegah CSV Formula Injection pada data teks.
  var formulaLike = typeof v !== 'number' &&
    /^[\s\u0000-\u001f]*[=+\-@]/.test(s);

  if (formulaLike) s = '\t' + s;

  // Formula-like selalu dibungkus tanda kutip.
  return formulaLike || /[",\r\n;]/.test(s)
    ? '"' + s.replace(/"/g, '""') + '"'
    : s;
}

  
function stamp() {
  var d = new Date();
  var parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(d);

  var p = {};
  parts.forEach(function (x) {
    if (x.type !== 'literal') p[x.type] = x.value;
  });

  return p.year + '-' + p.month + '-' + p.day;
}


  /**
   * o: { format:'xlsx'|'pdf'|'csv', title, subtitle, head:[], body:[[]], foot:[] (opsional), file, sheet, landscape, numCols:[indeks kolom angka], sourceNote }
   * Angka dikirim sebagai angka (bukan teks) agar Excel dapat menghitungnya; PDF memakai format Indonesia 2 desimal.
   */
  async function exportTable(o) {
    var fmt = o.format, prof = (SimonAPI.session() || {}).profile || {}, num = o.numCols || [];
    if (!o.body || !o.body.length) { U.toast('Tidak ada data untuk diunduh pada filter ini.', true); return false; }
    var file = (o.file || 'Laporan_SIMON-LTT') + (o.file && /\d{4}-\d{2}-\d{2}/.test(o.file) ? '' : '_' + stamp());
    var blob;
    if (fmt === 'csv') {
      var lines = [o.head.map(csvCell).join(',')];
      o.body.forEach(function (r) { lines.push(r.map(csvCell).join(',')); });
      if (o.foot) lines.push(o.foot.map(csvCell).join(','));
      blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
      U.downloadBlob(blob, file + '.csv');
    } else if (fmt === 'xlsx') {
      await SimonLibs.load(['xlsx']);
      var aoa = [[o.title], [o.subtitle || ''], [], o.head].concat(o.body); if (o.foot) aoa.push(o.foot);
      var ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = o.head.map(function (h, i) { var w = String(h).length; o.body.slice(0, 200).forEach(function (r) { w = Math.max(w, String(r[i] === null || r[i] === undefined ? '' : r[i]).length); }); return { wch: Math.min(Math.max(w + 2, 10), 45) }; });
      var wb = window.XLSX.utils.book_new(); window.XLSX.utils.book_append_sheet(wb, ws, String(o.sheet || 'Laporan').slice(0, 31));
      var out = window.XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      U.downloadBlob(blob, file + '.xlsx');
    } else if (fmt === 'pdf') {
      await SimonLibs.load(['jspdf', 'autotable']);
      var doc = new window.jspdf.jsPDF(o.landscape === false ? 'p' : 'l', 'mm', 'a4');
      var W = doc.internal.pageSize.getWidth();
      var f2 = function (v, i) { return num.indexOf(i) !== -1 && typeof v === 'number' ? U.fmt(v) : (v === null || v === undefined ? '' : String(v)); };
      doc.setFontSize(14); doc.setTextColor(11, 59, 46); doc.setFont(undefined, 'bold');
      doc.text(String(o.title), W / 2, 14, { align: 'center' });
      doc.setFontSize(9.5); doc.setFont(undefined, 'normal'); doc.setTextColor(90);
      doc.text(String(o.subtitle || 'Kabupaten Indragiri Hilir'), W / 2, 20, { align: 'center' });
      var cs = {}; num.forEach(function (i) { cs[i] = { halign: 'right' }; });
      doc.autoTable({ head: [o.head], body: o.body.map(function (r) { return r.map(f2); }), foot: o.foot ? [o.foot.map(f2)] : undefined, startY: 25,
        styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [11, 59, 46], textColor: 255, fontStyle: 'bold' },
        footStyles: { fillColor: [251, 243, 213], textColor: [60, 48, 0], fontStyle: 'bold' }, alternateRowStyles: { fillColor: [244, 248, 244] },
        columnStyles: cs, margin: { left: 10, right: 10, bottom: 14 }, showFoot: 'lastPage' });
      var n = doc.internal.getNumberOfPages(), H = doc.internal.pageSize.getHeight();
      for (var p = 1; p <= n; p++) {
        doc.setPage(p); doc.setFontSize(7.5); doc.setTextColor(120);
        doc.text('SIMON-LTT INHIL · Dicetak oleh ' + (prof.username || '-') + ' (' + (prof.role || '-') + ') · ' + stamp(), 10, H - 6);
        doc.text('Halaman ' + p + ' dari ' + n, W - 10, H - 6, { align: 'right' });
      }
      blob = doc.output('blob');
      U.downloadBlob(blob, file + '.pdf');
    } else { throw new Error('Format ekspor tidak dikenal.'); }
    // Pencatatan audit di server (data yang diekspor sudah dibatasi server sesuai peran)
    if (!o.noLog) SimonAPI.call('export.log', { laporan: o.title, format: fmt, jumlah: o.body.length, filter: o.subtitle || '' }).catch(function () { /* log gagal tidak menggagalkan unduhan */ });
    U.toast('Unduhan ' + fmt.toUpperCase() + ' dibuat: ' + o.body.length + ' baris.');
    return true;
  }
  /** Pembungkus tombol ekspor: menangani galat pemuatan pustaka dengan pesan jelas. */
  async function runExport(btn, o) {
    U.busy(btn, true, 'Menyiapkan…');
    try { await exportTable(o); } catch (e) { U.toast(U.errMsg(e), true); } finally { U.busy(btn, false); }
  }
  /** Menghubungkan tombol [data-export=xlsx|pdf|csv] ke fungsi yang membangun opsi ekspor. */
  function wireExport(getOpts) {
    document.querySelectorAll('[data-export]').forEach(function (b) {
      b.addEventListener('click', function () { var o = getOpts(b.getAttribute('data-export')); if (o) runExport(b, Object.assign({ format: b.getAttribute('data-export') }, o)); });
    });
  }

  window.SimonReport = { GROUPS: GROUPS, grp: grp, jenisLabel: jenisLabel, normRow: normRow, load: load, dateStr: dateStr, weekOfMonth: weekOfMonth, statusColor: statusColor,
    sumBy: sumBy, topN: topN, bulanLabel: bulanLabel, MONTH_NUM: MONTH_NUM, boot: boot, loading: loading, failed: failed, chart: chart, barCfg: barCfg,
    exportTable: exportTable, runExport: runExport, wireExport: wireExport, stamp: stamp };
})();
