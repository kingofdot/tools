// === core.js — 공통 헬퍼 ===

function prettySize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function escapeHtml(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 100);
}

// "1-3, 5, 7-9" → [[1,2,3],[5],[7,8,9]]
function parseRanges(text, maxPage) {
  const groups = [];
  const parts = text.split(',').map(s => s.trim()).filter(Boolean);
  for (const part of parts) {
    const m = part.match(/^(\d+)\s*-\s*(\d+)$/);
    if (m) {
      let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
      if (a > b) [a, b] = [b, a];
      if (a < 1 || b > maxPage) throw new Error(`범위 ${a}-${b} 가 페이지 범위(1-${maxPage})를 벗어납니다.`);
      const arr = []; for (let i = a; i <= b; i++) arr.push(i);
      groups.push(arr);
    } else if (/^\d+$/.test(part)) {
      const n = parseInt(part, 10);
      if (n < 1 || n > maxPage) throw new Error(`페이지 ${n} 가 범위(1-${maxPage})를 벗어납니다.`);
      groups.push([n]);
    } else {
      throw new Error(`이해할 수 없는 표기: "${part}"`);
    }
  }
  if (!groups.length) throw new Error('빈 입력');
  return groups;
}

// 드롭존 이벤트 wiring
function bindDropZone(zone, input, accept, onFiles) {
  zone.addEventListener('click', () => input.click());
  input.addEventListener('change', () => {
    if (input.files?.length) onFiles([...input.files]);
    input.value = '';
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const files = [...(e.dataTransfer?.files || [])].filter(f => {
      if (!accept) return true;
      return accept.some(a => f.type === a || f.name.toLowerCase().endsWith(a));
    });
    if (files.length) onFiles(files);
  });
}

// 리스트 렌더 + 드래그 정렬 + 위/아래 이동 + 삭제
function renderFileList(ulEl, files, opts = {}) {
  const { onChange, showOrder = true, getMeta = null } = opts;
  ulEl.innerHTML = files.map((f, i) => {
    const meta = getMeta ? getMeta(f, i) : prettySize(f.size);
    return `<li class="file-item" data-i="${i}" draggable="${showOrder ? 'true' : 'false'}">
      <span class="file-num">${String(i+1).padStart(2,'0')}</span>
      <span class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
      <span class="file-meta">${escapeHtml(meta)}</span>
      <span style="display:flex;gap:2px">
        ${showOrder ? `
          <button class="icon-btn up"   title="위로"   data-act="up"   data-i="${i}">▲</button>
          <button class="icon-btn down" title="아래로" data-act="down" data-i="${i}">▼</button>` : ''}
        <button class="icon-btn" title="삭제" data-act="del" data-i="${i}">✕</button>
      </span>
    </li>`;
  }).join('');

  ulEl.querySelectorAll('button[data-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(btn.dataset.i, 10);
      const act = btn.dataset.act;
      if (act === 'del') files.splice(i, 1);
      else if (act === 'up'   && i > 0)              [files[i-1], files[i]] = [files[i], files[i-1]];
      else if (act === 'down' && i < files.length-1) [files[i+1], files[i]] = [files[i], files[i+1]];
      onChange?.();
    });
  });

  if (!showOrder) return;
  let dragI = null;
  ulEl.querySelectorAll('.file-item').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragI = parseInt(el.dataset.i, 10);
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      ulEl.querySelectorAll('.drop-before, .drop-after').forEach(x =>
        x.classList.remove('drop-before', 'drop-after'));
      dragI = null;
    });
    el.addEventListener('dragover', (e) => {
      const i = parseInt(el.dataset.i, 10);
      if (dragI === null || dragI === i) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const before = (e.clientY - r.top) < r.height / 2;
      el.classList.toggle('drop-before', before);
      el.classList.toggle('drop-after', !before);
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      const i = parseInt(el.dataset.i, 10);
      if (dragI === null || dragI === i) return;
      const r = el.getBoundingClientRect();
      const before = (e.clientY - r.top) < r.height / 2;
      const item = files.splice(dragI, 1)[0];
      let insertAt = i + (before ? 0 : 1);
      if (dragI < i) insertAt -= 1;
      files.splice(insertAt, 0, item);
      onChange?.();
    });
  });
}

function setStatus(el, text, type = '') {
  if (!el) return;
  el.textContent = text || '';
  el.className = 'status' + (type ? ' ' + type : '');
}
