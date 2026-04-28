// === merge.js — PDF 병합 ===

(function () {
  let files = [];
  let sortKey = null;     // 'name' | 'size' | 'date' | null (수동)
  let sortAsc = true;

  function refresh() {
    const list = document.getElementById('mergeList');
    renderFileList(list, files, { onChange: () => { sortKey = null; refresh(); } });
    document.getElementById('mergeRun').disabled = files.length < 1;
    document.getElementById('mergeClear').hidden = files.length === 0;
    document.getElementById('mergeSort').hidden = files.length < 2;
    updateSortLabels();
    setStatus(document.getElementById('mergeStatus'),
      files.length ? `${files.length}개 PDF 대기 중` : '', '');
  }

  function updateSortLabels() {
    document.querySelectorAll('#mergeSort button[data-sort]').forEach(btn => {
      const k = btn.dataset.sort;
      const base = { name: '이름', size: '크기', date: '수정일' }[k] || k;
      const arrow = (sortKey === k) ? (sortAsc ? ' ↑' : ' ↓') : '';
      btn.textContent = base + arrow;
      btn.classList.toggle('active', sortKey === k);
    });
  }

  function applySort(key) {
    if (sortKey === key) sortAsc = !sortAsc;
    else { sortKey = key; sortAsc = true; }
    files.sort((a, b) => {
      let va, vb;
      if (key === 'name')      { va = a.name.toLowerCase(); vb = b.name.toLowerCase(); }
      else if (key === 'size') { va = a.size; vb = b.size; }
      else                     { va = a.lastModified || 0; vb = b.lastModified || 0; }
      if (va < vb) return sortAsc ? -1 : 1;
      if (va > vb) return sortAsc ? 1 : -1;
      return 0;
    });
    refresh();
  }

  window.bindMerge = function bindMerge() {
    const drop = document.getElementById('mergeDrop');
    const input = document.getElementById('mergeInput');
    bindDropZone(drop, input, ['.pdf', 'application/pdf'], (newFiles) => {
      files.push(...newFiles.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)));
      sortKey = null;
      refresh();
    });

    document.querySelectorAll('#mergeSort button[data-sort]').forEach(btn => {
      btn.addEventListener('click', () => applySort(btn.dataset.sort));
    });

    document.getElementById('mergeClear').addEventListener('click', () => {
      files = []; sortKey = null; refresh();
    });
    document.getElementById('mergeRun').addEventListener('click', runMerge);
  };

  async function runMerge() {
    const status = document.getElementById('mergeStatus');
    const btn = document.getElementById('mergeRun');
    if (!files.length) return;
    btn.disabled = true;
    setStatus(status, '병합 중…', 'busy');

    try {
      const merged = await PDFLib.PDFDocument.create();
      let totalPages = 0;
      for (let i = 0; i < files.length; i++) {
        setStatus(status, `처리 중 (${i+1}/${files.length}) — ${files[i].name}`, 'busy');
        const buf = await files[i].arrayBuffer();
        let src;
        try {
          src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        } catch (e) {
          throw new Error(`"${files[i].name}" 을 열 수 없습니다: ${e.message}`);
        }
        const pages = await merged.copyPages(src, src.getPageIndices());
        pages.forEach(p => merged.addPage(p));
        totalPages += pages.length;
      }
      const bytes = await merged.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, defaultMergeName());
      setStatus(status, `완료 — ${totalPages} 페이지 · ${prettySize(blob.size)}`, 'success');
    } catch (err) {
      console.error(err);
      setStatus(status, '실패: ' + err.message, 'error');
    } finally {
      btn.disabled = files.length < 1;
    }
  }

  function defaultMergeName() {
    const stamp = new Date().toISOString().slice(0,19).replace(/[:T]/g, '-');
    return `merged_${stamp}.pdf`;
  }
})();
