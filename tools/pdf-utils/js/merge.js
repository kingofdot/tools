// === merge.js — PDF 병합 ===

(function () {
  let files = [];

  function refresh() {
    const list = document.getElementById('mergeList');
    renderFileList(list, files, { onChange: refresh });
    document.getElementById('mergeRun').disabled = files.length < 1;
    document.getElementById('mergeClear').hidden = files.length === 0;
    setStatus(document.getElementById('mergeStatus'),
      files.length ? `${files.length}개 PDF 대기 중` : '', '');
  }

  window.bindMerge = function bindMerge() {
    const drop = document.getElementById('mergeDrop');
    const input = document.getElementById('mergeInput');
    bindDropZone(drop, input, ['.pdf', 'application/pdf'], (newFiles) => {
      files.push(...newFiles.filter(f => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)));
      refresh();
    });

    document.getElementById('mergeClear').addEventListener('click', () => { files = []; refresh(); });
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
