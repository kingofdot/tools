// === split.js — PDF 분리 ===

(function () {
  let file = null;
  let pageCount = 0;

  function refresh() {
    const list = document.getElementById('splitList');
    const form = document.getElementById('splitForm');
    if (!file) {
      list.innerHTML = '';
      form.hidden = true;
      document.getElementById('splitRun').disabled = true;
      document.getElementById('splitClear').hidden = true;
      setStatus(document.getElementById('splitStatus'), '', '');
      return;
    }
    renderFileList(list, [file], {
      onChange: () => { file = null; pageCount = 0; refresh(); },
      showOrder: false,
      getMeta: f => `${pageCount || '?'} 페이지 · ${prettySize(f.size)}`,
    });
    form.hidden = false;
    document.getElementById('splitRun').disabled = false;
    document.getElementById('splitClear').hidden = false;
    setStatus(document.getElementById('splitStatus'),
      pageCount ? `총 ${pageCount} 페이지` : '읽는 중…',
      pageCount ? '' : 'busy');
  }

  window.bindSplit = function bindSplit() {
    const drop = document.getElementById('splitDrop');
    const input = document.getElementById('splitInput');
    bindDropZone(drop, input, ['.pdf', 'application/pdf'], async (newFiles) => {
      const f = newFiles[0];
      if (!f) return;
      file = f; pageCount = 0; refresh();
      try {
        const buf = await f.arrayBuffer();
        const doc = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });
        pageCount = doc.getPageCount();
        refresh();
      } catch (e) {
        setStatus(document.getElementById('splitStatus'), 'PDF 열기 실패: ' + e.message, 'error');
      }
    });

    document.getElementById('splitMode').addEventListener('change', (e) => {
      document.getElementById('splitRangeRow').hidden = e.target.value !== 'ranges';
    });
    document.getElementById('splitClear').addEventListener('click', () => { file = null; pageCount = 0; refresh(); });
    document.getElementById('splitRun').addEventListener('click', runSplit);
  };

  async function runSplit() {
    const status = document.getElementById('splitStatus');
    const btn = document.getElementById('splitRun');
    if (!file || !pageCount) return;
    const mode = document.getElementById('splitMode').value;
    btn.disabled = true;
    setStatus(status, '분리 중…', 'busy');

    try {
      const buf = await file.arrayBuffer();
      const src = await PDFLib.PDFDocument.load(buf, { ignoreEncryption: true });

      let groups;  // [[1,2,3], [5], [7,8,9]]
      if (mode === 'each') {
        groups = Array.from({ length: pageCount }, (_, i) => [i + 1]);
      } else {
        const text = document.getElementById('splitRanges').value.trim();
        if (!text) throw new Error('페이지 범위를 입력하세요 (예: 1-3, 5, 7-9)');
        groups = parseRanges(text, pageCount);
      }

      const baseName = file.name.replace(/\.pdf$/i, '');
      // 단일 결과 → 그냥 PDF, 여러 개 → ZIP
      if (groups.length === 1) {
        const out = await PDFLib.PDFDocument.create();
        const pages = await out.copyPages(src, groups[0].map(p => p - 1));
        pages.forEach(p => out.addPage(p));
        const bytes = await out.save();
        downloadBlob(new Blob([bytes], { type: 'application/pdf' }),
          `${baseName}_${groupLabel(groups[0])}.pdf`);
        setStatus(status, `완료 — ${groups[0].length} 페이지`, 'success');
      } else {
        const zip = new JSZip();
        for (let gi = 0; gi < groups.length; gi++) {
          setStatus(status, `처리 중 (${gi+1}/${groups.length})`, 'busy');
          const out = await PDFLib.PDFDocument.create();
          const pages = await out.copyPages(src, groups[gi].map(p => p - 1));
          pages.forEach(p => out.addPage(p));
          const bytes = await out.save();
          zip.file(`${baseName}_${groupLabel(groups[gi])}.pdf`, bytes);
        }
        setStatus(status, 'ZIP 생성 중…', 'busy');
        const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        downloadBlob(zipBlob, `${baseName}_split.zip`);
        setStatus(status, `완료 — ${groups.length}개 PDF · ${prettySize(zipBlob.size)}`, 'success');
      }
    } catch (err) {
      console.error(err);
      setStatus(status, '실패: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  function groupLabel(group) {
    if (group.length === 1) return `p${group[0]}`;
    const first = group[0], last = group[group.length - 1];
    if (last - first + 1 === group.length) return `p${first}-${last}`;
    return `p${first}_${last}`;
  }
})();
