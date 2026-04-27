// === EDITOR ===
// 단일 화면 — 위쪽: 정리된 미리보기, 아래쪽: textarea 입력
// 모드 토글 없음. textarea 입력 → 즉시 미리보기 갱신.

function bindEditor() {
  const $body = document.getElementById('bodyInput');
  const $topic = document.getElementById('topicInput');
  const $mnemonic = document.getElementById('mnemonicInput');
  const $subTopic = document.getElementById('subTopicInput');
  const $dueDate = document.getElementById('dueDateInput');

  $body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTab($body, e.shiftKey);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter($body);
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '/') {
      e.preventDefault();
      toggleBackticks($body);
    }
  });

  $body.addEventListener('input', () => {
    markDirty();
    renderPreview();
    scheduleSave();
  });

  // 메타 입력 5종 — Enter 누르면 다음으로 포커스 체인
  // topic → mnemonic → subject → subTopic → dueDate → 본문 textarea
  const $subject = document.getElementById('subjectInput');
  const metaChain = [$topic, $mnemonic, $subject, $subTopic, $dueDate];
  metaChain.forEach((el, i) => {
    el.addEventListener('input', () => {
      markDirty();
      scheduleSave();
      refreshList();
      renderPreview();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = metaChain[i + 1];
      if (next) { next.focus(); next.select?.(); }
      else { setTimeout(() => $body.focus(), 0); }
    });
  });

  // 일정 변경 즉시 카드 갱신
  $dueDate.addEventListener('change', () => { markDirty(); scheduleSave(); refreshList(); });

  // 과목 입력: 현재 노트의 과목 변경 + 해당 과목 탭으로 전환
  $subject.addEventListener('change', () => {
    const newSub = $subject.value.trim();
    if (!currentId) return;
    const n = findNote(currentId);
    if (!n) return;
    n.subject = newSub;
    n.updatedAt = new Date().toISOString();
    activeSubject = newSub || '_미분류';
    markDirty();
    saveNotes();
    refreshTabs();
    refreshList();
    scheduleSave();
  });

  // 본문 토글 버튼 (현재 줄에 백틱 prefix)
  document.getElementById('bodyTextBtn')?.addEventListener('click', () => {
    $body.focus();
    toggleBackticks($body);
  });

  // 분할 핸들 (위/아래) 드래그
  bindSplitHandle();

  // Ctrl+/ — 본문 토글 (textarea 외부 포커스에서도)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '/') {
      if (document.activeElement?.id !== 'bodyInput') {
        e.preventDefault();
        $body.focus();
        toggleBackticks($body);
      }
    }
  });
}

// 좌측 textarea의 커서/스크롤 위치를 우측 미리보기에도 비례 적용
// (단일 미리보기 사용으로 사실상 미리보기는 위쪽 한 곳만 — 호환용으로 남겨둠)
function syncPreviewScroll() { /* no-op — 단일 미리보기 */ }

function handleTab(ta, isShift) {
  const v = ta.value;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const lineStart = v.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = v.indexOf('\n', end);
  const segEnd = lineEnd === -1 ? v.length : lineEnd;

  if (start !== end && v.slice(start, end).includes('\n')) {
    const before = v.slice(0, lineStart);
    const seg = v.slice(lineStart, segEnd);
    const after = v.slice(segEnd);
    let modified;
    if (isShift) {
      modified = seg.replace(/^(\t| {1,4})/gm, '');
    } else {
      modified = seg.replace(/^/gm, '\t');
    }
    ta.value = before + modified + after;
    ta.selectionStart = lineStart;
    ta.selectionEnd = lineStart + modified.length;
  } else {
    if (isShift) {
      const lineHead = v.slice(lineStart, lineStart + 1);
      if (lineHead === '\t') {
        ta.value = v.slice(0, lineStart) + v.slice(lineStart + 1);
        const off = start > lineStart ? -1 : 0;
        ta.selectionStart = ta.selectionEnd = start + off;
      } else if (v.slice(lineStart, lineStart + 4) === '    ') {
        ta.value = v.slice(0, lineStart) + v.slice(lineStart + 4);
        ta.selectionStart = ta.selectionEnd = Math.max(lineStart, start - 4);
      }
    } else {
      ta.value = v.slice(0, start) + '\t' + v.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 1;
    }
  }
  ta.dispatchEvent(new Event('input'));
}

function handleEnter(ta) {
  const v = ta.value;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const lineStart = v.lastIndexOf('\n', start - 1) + 1;
  const lineHead = v.slice(lineStart, start);
  const headTabs = lineHead.match(/^\t*/)[0];
  const lineRest = v.slice(start, v.indexOf('\n', start) === -1 ? v.length : v.indexOf('\n', start));
  const isEmptyLine = (lineHead.replace(/^\t*/, '').trim() === '' && lineRest.trim() === '');

  // 빈 줄에서 Enter → 들여쓰기 한 단계 감소
  if (isEmptyLine && headTabs.length > 0) {
    const newHead = headTabs.slice(0, -1);
    ta.value = v.slice(0, lineStart) + newHead + v.slice(start);
    const newPos = lineStart + newHead.length;
    ta.selectionStart = ta.selectionEnd = newPos;
    ta.dispatchEvent(new Event('input'));
    return;
  }

  const insert = '\n' + headTabs;
  ta.value = v.slice(0, start) + insert + v.slice(end);
  ta.selectionStart = ta.selectionEnd = start + insert.length;
  ta.dispatchEvent(new Event('input'));
}

// 선택 영역(또는 현재 줄)의 들여쓰기 직후에 백틱(`) prefix 토글
function toggleBackticks(ta) {
  const v = ta.value;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const firstLineStart = v.lastIndexOf('\n', start - 1) + 1;
  const lastLineEndRaw = v.indexOf('\n', end);
  const lastLineEnd = lastLineEndRaw === -1 ? v.length : lastLineEndRaw;
  const before = v.slice(0, firstLineStart);
  const region = v.slice(firstLineStart, lastLineEnd);
  const after = v.slice(lastLineEnd);

  const lines = region.split('\n');
  const allHave = lines.every(l => /^\t*`/.test(l));
  const modified = lines.map(l => {
    if (allHave) return l.replace(/^(\t*)`/, '$1');
    if (/^\t*`/.test(l)) return l;
    return l.replace(/^(\t*)/, '$1`');
  }).join('\n');

  ta.value = before + modified + after;
  const delta = modified.length - region.length;
  ta.selectionStart = start;
  ta.selectionEnd = end + delta;
  ta.dispatchEvent(new Event('input'));
}

// 분할 핸들 — 위(preview) ↕ 아래(textarea) 비율
function bindSplitHandle() {
  const handle = document.getElementById('splitHandle');
  const stack = document.querySelector('.body-stack');
  if (!handle || !stack) return;
  applyEditSplit();
  let dragging = false;
  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    document.body.style.cursor = 'row-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const r = stack.getBoundingClientRect();
    let ratio = (e.clientY - r.top) / r.height;
    ratio = Math.max(0.15, Math.min(0.85, ratio));
    editSplit = ratio;
    applyEditSplit();
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    dragging = false;
    document.body.style.cursor = '';
    saveEditSplit();
  });
  handle.addEventListener('dblclick', () => { editSplit = 0.5; applyEditSplit(); saveEditSplit(); });
}

function applyEditSplit() {
  const stack = document.querySelector('.body-stack');
  if (!stack) return;
  const top = (editSplit * 100).toFixed(2);
  const bottom = (100 - editSplit * 100).toFixed(2);
  stack.style.gridTemplateRows = `minmax(0, ${top}fr) 6px minmax(0, ${bottom}fr)`;
}

// === 저장 디바운스 ===
let _saveTimer = null;

function markDirty() {
  dirty = true;
  setSyncState('dirty');
}

function scheduleSave() {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    commitEdits();
    saveNotes();
    refreshList();
    if (settings.ghAutoSync && settings.ghToken) {
      clearTimeout(_pushTimer);
      _pushTimer = setTimeout(() => autoPush(), 5000);
    }
  }, 700);
}
let _pushTimer = null;

function commitEdits() {
  if (!currentId) return;
  const n = findNote(currentId);
  if (!n) return;
  const subjEl = document.getElementById('subjectInput');
  const typed = subjEl.value.trim();
  n.subject = typed || (activeSubject && activeSubject !== '_미분류' ? activeSubject : '');
  n.subTopic = document.getElementById('subTopicInput').value.trim();
  n.topic = document.getElementById('topicInput').value.trim();
  n.mnemonic = document.getElementById('mnemonicInput').value.trim();
  n.body = document.getElementById('bodyInput').value;
  n.dueDate = document.getElementById('dueDateInput').value || '';
  n.updatedAt = new Date().toISOString();
}

function loadNoteIntoEditor(id) {
  const n = findNote(id);
  if (!n) return;
  currentId = id;
  document.getElementById('subjectInput').value = n.subject || '';
  document.getElementById('subTopicInput').value = n.subTopic || '';
  document.getElementById('topicInput').value = n.topic || '';
  document.getElementById('mnemonicInput').value = n.mnemonic || '';
  document.getElementById('bodyInput').value = n.body || '';
  document.getElementById('dueDateInput').value = n.dueDate || '';
  activeSubject = n.subject || '_미분류';
  renderPreview();
  refreshList();
  refreshSubTopicDatalist();
  dirty = false;
  setSyncState('synced');
}

// 모드 호환 shim — 다른 코드에서 호출해도 안전
function setViewMode() { /* no-op — 단일 화면 */ }

function setSyncState(state) {
  const el = document.getElementById('syncState');
  if (!el) return;
  el.classList.remove('synced', 'dirty', 'error');
  if (state) el.classList.add(state);
  const label = { synced: '동기화됨', dirty: '저장 대기', error: '오류' }[state] || '';
  el.title = label;
  const $lbl = document.getElementById('syncStateLabel');
  if ($lbl) $lbl.textContent = label || '동기화됨';
}
