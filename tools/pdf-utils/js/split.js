// === split.js — PDF 수정 (페이지 단위 자유 편집) ===
// 여러 PDF를 업로드 → 각 페이지를 썸네일로 나열 → 삭제·정렬 → 새 PDF로 저장

(function () {
  let pages = [];           // [{ id, srcId, srcPageIndex, srcFileName, thumb }]
  const bufs = new Map();   // srcId → ArrayBuffer (원본 PDF 데이터)

  function refresh() {
    const grid = document.getElementById('splitGrid');
    const wrap = document.getElementById('splitGridWrap');
    const form = document.getElementById('splitForm');
    const run  = document.getElementById('splitRun');
    const info = document.getElementById('splitPageInfo');
    const status = document.getElementById('splitStatus');

    if (!pages.length) {
      grid.innerHTML = '';
      wrap.hidden = true;
      form.hidden = true;
      run.disabled = true;
      setStatus(status, '', '');
      return;
    }
    wrap.hidden = false;
    form.hidden = false;
    run.disabled = false;
    info.textContent = `${pages.length} 페이지`;

    grid.innerHTML = pages.map((p, i) => `
      <div class="page-card" data-id="${escapeHtml(p.id)}" draggable="true">
        <button class="page-del" data-id="${escapeHtml(p.id)}" title="이 페이지 삭제">✕</button>
        <div class="page-thumb"><img src="${p.thumb}" alt=""></div>
        <div class="page-meta">
          <span class="page-no">${i + 1}</span>
          <span class="page-src" title="${escapeHtml(p.srcFileName)} · p${p.srcPageIndex + 1}">${escapeHtml(p.srcFileName)} · p${p.srcPageIndex + 1}</span>
        </div>
      </div>
    `).join('');

    grid.querySelectorAll('.page-del').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        pages = pages.filter(p => p.id !== btn.dataset.id);
        cleanupUnusedBufs();
        refresh();
      });
    });
    bindGridDragSort(grid);
  }

  function cleanupUnusedBufs() {
    const used = new Set(pages.map(p => p.srcId));
    for (const k of [...bufs.keys()]) if (!used.has(k)) bufs.delete(k);
  }

  function bindGridDragSort(grid) {
    let dragId = null;
    grid.querySelectorAll('.page-card').forEach(el => {
      el.addEventListener('dragstart', (e) => {
        dragId = el.dataset.id;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        try { e.dataTransfer.setData('text/plain', dragId); } catch (_) {}
      });
      el.addEventListener('dragend', () => {
        el.classList.remove('dragging');
        grid.querySelectorAll('.drop-before, .drop-after').forEach(x =>
          x.classList.remove('drop-before', 'drop-after'));
        dragId = null;
      });
      el.addEventListener('dragover', (e) => {
        if (!dragId || dragId === el.dataset.id) return;
        e.preventDefault();
        const r = el.getBoundingClientRect();
        const before = (e.clientX - r.left) < r.width / 2;
        el.classList.toggle('drop-before', before);
        el.classList.toggle('drop-after', !before);
      });
      el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after'));
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragId || dragId === el.dataset.id) return;
        const r = el.getBoundingClientRect();
        const before = (e.clientX - r.left) < r.width / 2;
        const fromIdx = pages.findIndex(p => p.id === dragId);
        const toIdx   = pages.findIndex(p => p.id === el.dataset.id);
        if (fromIdx < 0 || toIdx < 0) return;
        const item = pages.splice(fromIdx, 1)[0];
        let insertAt = toIdx + (before ? 0 : 1);
        if (fromIdx < toIdx) insertAt -= 1;
        pages.splice(insertAt, 0, item);
        refresh();
      });
    });
  }

  async function renderThumb(pdf, pageNum, scale = 0.4) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    return canvas.toDataURL('image/png');
  }

  async function addFile(file) {
    const status = document.getElementById('splitStatus');
    const srcId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let buf;
    try { buf = await file.arrayBuffer(); }
    catch (e) { setStatus(status, '파일 읽기 실패: ' + e.message, 'error'); return; }
    bufs.set(srcId, buf);

    setStatus(status, `미리보기 생성 중 — ${file.name}`, 'busy');
    let pdf;
    try {
      // pdfjs는 ArrayBuffer를 transfer할 수 있어 슬라이스로 분리 (원본은 pdf-lib용)
      pdf = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise;
    } catch (e) {
      bufs.delete(srcId);
      setStatus(status, `"${file.name}" 열기 실패: ${e.message}`, 'error');
      return;
    }
    const total = pdf.numPages;
    for (let i = 1; i <= total; i++) {
      setStatus(status, `${file.name} — 페이지 미리보기 (${i}/${total})`, 'busy');
      let thumb = '';
      try { thumb = await renderThumb(pdf, i); } catch (_) {}
      pages.push({
        id: `${srcId}_${i - 1}`,
        srcId,
        srcPageIndex: i - 1,
        srcFileName: file.name,
        thumb,
      });
      // 점진적 렌더 — 매 페이지마다 그리드 갱신
      refresh();
    }
    setStatus(status, `${total}장 추가됨 — ${file.name}`, 'success');
  }

  async function runSave() {
    const status = document.getElementById('splitStatus');
    const btn = document.getElementById('splitRun');
    if (!pages.length) return;
    btn.disabled = true;
    setStatus(status, 'PDF 생성 중…', 'busy');

    try {
      const out = await PDFLib.PDFDocument.create();
      const docCache = new Map();      // srcId → PDFDocument
      for (let i = 0; i < pages.length; i++) {
        if (i % 5 === 0) setStatus(status, `복사 중 (${i + 1}/${pages.length})`, 'busy');
        const p = pages[i];
        let src = docCache.get(p.srcId);
        if (!src) {
          const buf = bufs.get(p.srcId);
          if (!buf) throw new Error(`원본 데이터를 찾을 수 없습니다: ${p.srcFileName}`);
          src = await PDFLib.PDFDocument.load(buf.slice(0), { ignoreEncryption: true });
          docCache.set(p.srcId, src);
        }
        const [copied] = await out.copyPages(src, [p.srcPageIndex]);
        out.addPage(copied);
      }
      const fileName = (document.getElementById('splitName').value.trim() || 'edited.pdf')
        .replace(/\.pdf$/i, '') + '.pdf';
      const bytes = await out.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      downloadBlob(blob, fileName);
      setStatus(status, `완료 — ${pages.length} 페이지 · ${prettySize(blob.size)}`, 'success');
    } catch (err) {
      console.error(err);
      setStatus(status, '실패: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  window.bindSplit = function bindSplit() {
    const drop = document.getElementById('splitDrop');
    const input = document.getElementById('splitInput');
    bindDropZone(drop, input, ['.pdf', 'application/pdf'], async (newFiles) => {
      const pdfs = newFiles.filter(f =>
        f.type === 'application/pdf' || /\.pdf$/i.test(f.name));
      // 순차로 추가 (PDF.js 동시 로드 안전)
      for (const f of pdfs) await addFile(f);
    });

    document.getElementById('splitClearAll').addEventListener('click', () => {
      pages = []; bufs.clear(); refresh();
    });
    document.getElementById('splitRun').addEventListener('click', runSave);
  };
})();
