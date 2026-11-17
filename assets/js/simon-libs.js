/**
 * Pemuat pustaka pihak ketiga (Chart.js, SheetJS, jsPDF + AutoTable) dengan versi dipatok.
 * Dimuat hanya saat dibutuhkan; mencoba cdnjs lalu jsDelivr. Gagal = galat yang jelas (bukan diam).
 */
(function () {
  var LIBS = {
    chart: { test: function () { return window.Chart; }, urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
      'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'] },
    xlsx: { test: function () { return window.XLSX; }, urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
      'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'] },
    jspdf: { test: function () { return window.jspdf && window.jspdf.jsPDF; }, urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'] },
    autotable: { needs: 'jspdf', test: function () { return window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API && window.jspdf.jsPDF.API.autoTable; }, urls: [
      'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js',
      'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js'] }
  };
  var pending = {};
  function inject(url) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script'); s.src = url; s.async = true;
      s.onload = function () { res(); }; s.onerror = function () { s.remove(); rej(new Error('gagal memuat ' + url)); };
      document.head.appendChild(s);
    });
  }
  async function one(name) {
    var L = LIBS[name];
    if (!L) throw new Error('Pustaka tidak dikenal: ' + name);
    if (L.test()) return;
    if (L.needs) await one(L.needs);
    if (pending[name]) return pending[name];
    pending[name] = (async function () {
      var last;
      for (var i = 0; i < L.urls.length; i++) {
        try { await inject(L.urls[i]); if (L.test()) return; } catch (e) { last = e; }
      }
      pending[name] = null;
      var er = new Error('Pustaka "' + name + '" tidak dapat dimuat dari internet (' + (last ? last.message : 'tidak diketahui') + '). Periksa koneksi atau pemblokir konten, lalu muat ulang.');
      er.code = 'LIB'; throw er;
    })();
    return pending[name];
  }
  window.SimonLibs = { load: async function (names) { for (var i = 0; i < names.length; i++) await one(names[i]); } };
})();
