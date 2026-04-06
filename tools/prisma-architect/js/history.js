// === LOG & HISTORY (UNDO/REDO) ===

function addLog(type, action, detail = '') {
  if (historyIndex < historyStack.length - 1) {
    historyStack = historyStack.slice(0, historyIndex + 1);
    changeLog = changeLog.slice(0, historyIndex);
  }

  changeLog.push({
    type, action, detail,
    time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isUndone: false
  });

  historyStack.push({
    schemaStr: gen(schema),
    positions: JSON.stringify(modelPositions),
    cardinalities: JSON.stringify(cardinalityMap)
  });
  historyIndex++;

  renderLog();
}

function renderLog() {
  const l = document.getElementById('logList');
  if (!changeLog.length) {
    l.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:12px">변경사항이 기록됩니다</div>';
    return;
  }
  let html = '';
  for (let i = changeLog.length - 1; i >= Math.max(0, changeLog.length - 200); i--) {
    const e = changeLog[i];
    let css = '';
    if (e.isUndone) css = 'opacity:0.5; color:var(--danger); background:var(--danger-dim); text-decoration:line-through; border-left-color:var(--danger);';

    const btnHtml = e.isUndone
      ? `<button class="btn" style="padding:4px 8px;font-size:12px;background:var(--bg-secondary)" title="이 작업 다시 적용" onclick="revertHistory(${i + 1})">↪️</button>`
      : `<button class="btn" style="padding:4px 8px;font-size:12px;background:var(--bg-secondary)" title="이 작업 취소" onclick="revertHistory(${i})">↩️</button>`;

    html += `<div id="log-entry-${i}" class="log-entry log-${e.type}" style="${css} display:flex; justify-content:space-between; align-items:center; gap:8px;">
      <div style="flex:1; min-width:0;">
        <div class="log-time">${e.time}</div>
        <div class="log-action" style="white-space:normal; word-break:break-all;">${e.action}</div>
        ${e.detail ? `<div class="log-detail" style="white-space:normal; word-break:break-all;">${esc(e.detail)}</div>` : ''}
      </div>
      <div style="flex-shrink:0;">
        ${btnHtml}
      </div>
    </div>`;
  }
  l.innerHTML = html;
}

// === 로그 대상 파싱 및 포커스 함수 ===
function getLogTarget(e) {
  if (!e) return null;
  const text = e.action + ' ' + (e.detail || '');
  if (e.type === 'field' && text.includes('.')) {
    const m = text.match(/([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/);
    if (m) return 'field:' + m[1] + '.' + m[2];
  }
  if (e.type === 'relation') {
    const m = text.match(/([a-zA-Z0-9_]+)\s*[↔→]\s*([a-zA-Z0-9_]+)/);
    if (m) return 'relation:' + [m[1], m[2]].sort().join('↔');
  }
  if (e.type === 'model' || e.type === 'schema') {
    if (text.includes('이름 변경') && text.includes('→')) {
      const m = text.match(/→\s*([a-zA-Z0-9_]+)/);
      if (m) return 'model:' + m[1];
    }
    const m = text.match(/:\s*([a-zA-Z0-9_]+)/);
    if (m) return 'model:' + m[1];
  }
  return null;
}

function scrollToLog(e, idx) {
  if (e) e.stopPropagation();
  const logEl = document.getElementById('log-entry-' + idx);
  if (logEl) {
    logEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const oldBg = logEl.style.background;
    logEl.style.transition = 'background 0.3s';
    logEl.style.background = 'var(--accent3-dim)';
    setTimeout(() => { logEl.style.background = oldBg; }, 1500);
  }
}

function revertHistory(targetIndex) {
  if (targetIndex < 0 || targetIndex >= historyStack.length) return;
  historyIndex = targetIndex;
  for (let i = 0; i < changeLog.length; i++) {
    changeLog[i].isUndone = (i >= historyIndex);
  }
  restoreState(historyStack[historyIndex]);
  renderLog();
  toast('상태가 변경되었습니다.', 'info');
}

function clearLog() {
  changeLog = [];
  if (historyIndex >= 0) {
    historyStack = [historyStack[historyIndex]];
    historyIndex = 0;
  }
  renderLog();
  toast('로그가 초기화되었습니다.', 'info');
}

function toggleEnumLines() {
  showEnumLines = !showEnumLines;
  const btn = document.getElementById('enumToggleBtn');
  if (showEnumLines) {
    btn.textContent = '🔗 Enum 연결 ON';
    btn.classList.remove('btn-danger');
  } else {
    btn.textContent = '⛔ Enum 연결 OFF';
    btn.classList.add('btn-danger');
  }
  document.querySelectorAll('.model-card').forEach(card => {
    const name = card.dataset.name;
    const isEnum = schema.enums.some(e => e.name === name);
    if (isEnum) card.style.display = showEnumLines ? '' : 'none';
  });
  drawRels();
}

function restoreState(state) {
  schema = parse(state.schemaStr);
  modelPositions = JSON.parse(state.positions);
  cardinalityMap = JSON.parse(state.cardinalities);
  renderDiagram();
  syncEditor();
  if (document.getElementById('excelPanel').classList.contains('active')) renderExcelTable();
}

function exportLog() {
  if (!changeLog.length) { toast('로그 없음', 'info'); return; }
  dl(changeLog.map(e => `[${e.time}] ${e.action}${e.detail ? ' — ' + e.detail : ''}${e.isUndone ? ' (취소됨)' : ''}`).join('\n'), 'prisma-changelog.txt', 'text/plain');
  toast('로그 다운로드', 'success');
}
