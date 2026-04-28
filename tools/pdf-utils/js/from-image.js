// === from-image.js — 이미지 → PDF ===

(function () {
  let files = [];

  function refresh() {
    const list = document.getElementById('fromImgList');
    const form = document.getElementById('fromImgForm');
    renderFileList(list, files, { onChange: refresh });
    form.hidden = files.length === 0;
    document.getElementById('fromImgRun').disabled = files.length === 0;
    document.getElementById('fromImgClear').hidden = files.length === 0;
    setStatus(document.getElementById('fromImgStatus'),
      files.length ? `${files.length}장 이미지 대기 중` : '', '');
  }

  window.bindFromImage = function bindFromImage() {
    const drop = document.getElementById('fromImgDrop');
    const input = document.getElementById('fromImgInput');
    bindDropZone(drop, input, ['.png', '.jpg', '.jpeg', 'image/png', 'image/jpeg'], (newFiles) => {
      files.push(...newFiles.filter(f =>
        f.type === 'image/png' || f.type === 'image/jpeg' ||
        /\.(png|jpe?g)$/i.test(f.name)));
      refresh();
    });

    const sizeSel = document.getElementById('fromImgPageSize');
    sizeSel.addEventListener('change', () => {
      document.getElementById('fromImgFitRow').hidden = sizeSel.value === 'image';
    });

    document.getElementById('fromImgClear').addEventListener('click', () => { files = []; refresh(); });
    document.getElementById('fromImgRun').addEventListener('click', runBuild);
  };

  async function runBuild() {
    const status = document.getElementById('fromImgStatus');
    const btn = document.getElementById('fromImgRun');
    if (!files.length) return;
    btn.disabled = true;
    setStatus(status, '생성 중…', 'busy');

    const pageSize = document.getElementById('fromImgPageSize').value;
    const fit = document.getElementById('fromImgFit').value;
    const fileName = (document.getElementById('fromImgName').value.trim() || 'merged.pdf')
      .replace(/\.pdf$/i, '') + '.pdf';

    try {
      const doc = await PDFLib.PDFDocument.create();

      for (let i = 0; i < files.length; i++) {
        setStatus(status, `처리 중 (${i+1}/${files.length}) — ${files[i].name}`, 'busy');
        const f = files[i];
        const buf = await f.arrayBuffer();
        const isJpg = f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name);
        let img;
        try {
          img = isJpg ? await doc.embedJpg(buf) : await doc.embedPng(buf);
        } catch (e) {
          // PNG로 시도 실패하면 반대로 시도 (확장자/시그니처 불일치 대비)
          try {
            img = isJpg ? await doc.embedPng(buf) : await doc.embedJpg(buf);
          } catch (e2) {
            throw new Error(`"${f.name}" 임베드 실패: ${e.message}`);
          }
        }

        let pageW, pageH;
        if (pageSize === 'image') {
          pageW = img.width; pageH = img.height;
        } else if (pageSize === 'a4-portrait') {
          pageW = 595.28; pageH = 841.89;   // pt
        } else {
          pageW = 841.89; pageH = 595.28;
        }
        const page = doc.addPage([pageW, pageH]);

        if (pageSize === 'image') {
          page.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });
        } else {
          // contain / cover 비율 계산
          const sx = pageW / img.width, sy = pageH / img.height;
          const s = fit === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);
          const drawW = img.width * s;
          const drawH = img.height * s;
          const x = (pageW - drawW) / 2;
          const y = (pageH - drawH) / 2;
          page.drawImage(img, { x, y, width: drawW, height: drawH });
        }
      }

      const bytes = await doc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, fileName);
      setStatus(status, `완료 — ${files.length} 페이지 · ${prettySize(blob.size)}`, 'success');
    } catch (err) {
      console.error(err);
      setStatus(status, '실패: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }
})();
