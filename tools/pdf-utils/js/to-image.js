// === to-image.js — PDF → PNG/JPG ===

(function () {
  let file = null;
  let pageCount = 0;

  function refresh() {
    const list = document.getElementById('toImgList');
    const form = document.getElementById('toImgForm');
    if (!file) {
      list.innerHTML = '';
      form.hidden = true;
      document.getElementById('toImgRun').disabled = true;
      document.getElementById('toImgClear').hidden = true;
      setStatus(document.getElementById('toImgStatus'), '', '');
      return;
    }
    renderFileList(list, [file], {
      onChange: () => { file = null; pageCount = 0; refresh(); },
      showOrder: false,
      getMeta: f => `${pageCount || '?'} 페이지 · ${prettySize(f.size)}`,
    });
    form.hidden = false;
    document.getElementById('toImgRun').disabled = false;
    document.getElementById('toImgClear').hidden = false;
    setStatus(document.getElementById('toImgStatus'),
      pageCount ? `총 ${pageCount} 페이지` : '읽는 중…',
      pageCount ? '' : 'busy');
  }

  window.bindToImage = function bindToImage() {
    const drop = document.getElementById('toImgDrop');
    const input = document.getElementById('toImgInput');
    bindDropZone(drop, input, ['.pdf', 'application/pdf'], async (newFiles) => {
      const f = newFiles[0];
      if (!f) return;
      file = f; pageCount = 0; refresh();
      try {
        const buf = await f.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        pageCount = pdf.numPages;
        refresh();
      } catch (e) {
        setStatus(document.getElementById('toImgStatus'), 'PDF 열기 실패: ' + e.message, 'error');
      }
    });

    const formatSel = document.getElementById('toImgFormat');
    formatSel.addEventListener('change', () => {
      document.getElementById('toImgQualityRow').hidden = formatSel.value !== 'jpg';
    });
    const qual = document.getElementById('toImgQuality');
    qual.addEventListener('input', () => {
      document.getElementById('toImgQualityVal').textContent = qual.value;
    });

    document.getElementById('toImgClear').addEventListener('click', () => { file = null; pageCount = 0; refresh(); });
    document.getElementById('toImgRun').addEventListener('click', runConvert);
  };

  async function runConvert() {
    const status = document.getElementById('toImgStatus');
    const btn = document.getElementById('toImgRun');
    if (!file || !pageCount) return;
    btn.disabled = true;
    setStatus(status, '변환 중…', 'busy');

    const format = document.getElementById('toImgFormat').value;
    const dpi = parseInt(document.getElementById('toImgDpi').value, 10) || 150;
    const quality = parseFloat(document.getElementById('toImgQuality').value) || 0.85;
    const scale = dpi / 72;     // PDF 기준 72dpi → DPI scale

    try {
      const buf = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      const baseName = file.name.replace(/\.pdf$/i, '');

      const blobs = [];
      for (let p = 1; p <= pdf.numPages; p++) {
        setStatus(status, `렌더링 (${p}/${pdf.numPages})`, 'busy');
        const page = await pdf.getPage(p);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);
        const ctx = canvas.getContext('2d');
        // JPG는 흰 배경으로 (투명 픽셀 검게 변하는 것 방지)
        if (format === 'jpg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await new Promise(res =>
          canvas.toBlob(res,
            format === 'jpg' ? 'image/jpeg' : 'image/png',
            format === 'jpg' ? quality : undefined));
        blobs.push({ blob, name: `${baseName}_p${String(p).padStart(3,'0')}.${format}` });
      }

      if (blobs.length === 1) {
        downloadBlob(blobs[0].blob, blobs[0].name);
        setStatus(status, `완료 — 1장 · ${prettySize(blobs[0].blob.size)}`, 'success');
      } else {
        setStatus(status, 'ZIP 생성 중…', 'busy');
        const zip = new JSZip();
        for (const b of blobs) zip.file(b.name, b.blob);
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `${baseName}_${format}.zip`);
        setStatus(status, `완료 — ${blobs.length}장 · ${prettySize(zipBlob.size)}`, 'success');
      }
    } catch (err) {
      console.error(err);
      setStatus(status, '실패: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }
})();
