// === EDITOR ===
// 메타 입력 + 본문 입력(Tab/Shift-Tab) + 보기/편집 모드 토글

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
    syncPreviewScroll();
  });

  // 좌측 스크롤 → 우측 미리보기 동기 스크롤
  $body.addEventListener('scroll', syncPreviewScroll);
  $body.addEventListener('keyup', syncPreviewScroll);
  $body.addEventListener('click', syncPreviewScroll);

  // 메타 입력들 — Enter 누르면 다음 입력으로 포커스 이동
  // (text input 의 기본 동작은 폼이 없을 때 무반응 → 저장 흐름이 끊겨 보임)
  // 마지막(dueDate)에서 Enter → 본문 편집 모드 + 본문 포커스
  const metaChain = [$topic, $mnemonic, $subTopic, $dueDate];
  metaChain.forEach((el, i) => {
    el.addEventListener('input', () => {
      markDirty();
      scheduleSave();
      refreshList();
      if (viewMode === 'study') renderPreview();
    });
    el.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      const next = metaChain[i + 1];
      if (next) { next.focus(); next.select?.(); }
      else {
        setViewMode('edit');
        setTimeout(() => $body.focus(), 0);
      }
    });
  });

  // 일정 변경 즉시 카드 갱신
  $dueDate.addEventListener('change', () => { markDirty(); scheduleSave(); refreshList(); });

  // 과목 입력: 현재 노트의 과목 변경 + 해당 과목 탭으로 전환
  const $subject = document.getElementById('subjectInput');
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
  // 과목 input에서도 Enter → 다음(소과목)으로
  $subject.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); $subTopic.focus(); $subTopic.select(); }
  });

  // 보기/편집 토글
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
  });

  // 본문 토글 버튼
  document.getElementById('bodyTextBtn')?.addEventListener('click', () => {
    if (viewMode !== 'edit') setViewMode('edit');
    setTimeout(() => { $body.focus(); toggleBackticks($body); }, 0);
  });

  // 분할 핸들 드래그
  bindSplitHandle();

  // Ctrl+E (편집/보기), Ctrl+/ (본문 토글) — 전역 단축키
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      setViewMode(viewMode === 'study' ? 'edit' : 'study');
    }
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '/' && viewMode === 'edit') {
      // bodyInput 포커스가 아닐 때만 (포커스 시엔 keydown 핸들러가 처리)
      if (document.activeElement?.id !== 'bodyInput') {
        e.preventDefault();
        $body.focus();
        toggleBackticks($body);
      }
    }
  });
}

function setViewMode(mode) {
  viewMode = mode;
  document.querySelectorAll('.view-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.mode === mode));
  const showStudy = mode === 'study';
  document.getElementById('preview').hidden = !showStudy;
  document.getElementById('editArea').hidden = showStudy;
  document.getElementById('page')?.classList.toggle('edit-wide', !showStudy);
  // 본문 토글 버튼은 편집 모드에서만 노출
  const $bbtn = document.getElementById('bodyTextBtn');
  if ($bbtn) $bbtn.hidden = showStudy;
  renderPreview();
  if (mode === 'edit') {
    applyEditSplit();
    setTimeout(() => {
      const $body = document.getElementById('bodyInput');
      $body.focus();
      const len = $body.value.length;
      try { $body.setSelectionRange(len, len); } catch (_) {}
      syncPreviewScroll();
    }, 0);
  }
}

// 좌측 textarea의 커서/스크롤 위치를 우측 미리보기에도 비례 적용
function syncPreviewScroll() {
  const $ta = document.getElementById('bodyInput');
  const $preview = document.getElementById('editPreview');
  if (!$ta || !$preview) return;
  // textarea 안에서 보이는 가운데 라인 비율(0~1)
  const taScrollMax = Math.max(1, $ta.scrollHeight - $ta.clientHeight);
  const ratio = Math.min(1, Math.max(0, $ta.scrollTop / taScrollMax));
  const previewScrollMax = Math.max(0, $preview.scrollHeight - $preview.clientHeight);
  $preview.scrollTop = ratio * previewScrollMax;
}

// sync-state 점은 rail 안의 .sync-dot로 이동
// (setSyncState가 #syncState를 찾아 클래스 토글하므로 그대로 동작)

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

  // 빈 줄에서 Enter → 들여쓰기 한 단계 감소 (한 단계 위로)
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

// 선택 영역(또는 현재 줄)의 첫 글자 위치에 백틱(`)을 토글한다.
// 백틱이 이미 들여쓰기 직후에 있으면 제거, 없으면 삽입.
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
  // 모든 줄이 이미 백틱 prefix 면 제거, 아니면 삽입 (혼합 시 삽입 우선)
  const allHave = lines.every(l => /^\t*`/.test(l));
  const modified = lines.map(l => {
    if (allHave) return l.replace(/^(\t*)`/, '$1');
    if (/^\t*`/.test(l)) return l;            // 이미 있는 줄은 그대로
    return l.replace(/^(\t*)/, '$1`');
  }).join('\n');

  ta.value = before + modified + after;
  // 선택 영역 보존
  const delta = modified.length - region.length;
  ta.selectionStart = start;
  ta.selectionEnd = end + delta;
  ta.dispatchEvent(new Event('input'));
}

// 분할 핸들 드래그로 좌:우 비율 조절
function bindSplitHandle() {
  const handle = document.getElementById('splitHandle');
  const area = document.getElementById('editArea');
  if (!handle || !area) return;
  applyEditSplit();
  let dragging = false;
  handle.addEventListener('mousedown', (e) => {
    dragging = true;
    document.body.style.cursor = 'col-resize';
    e.preventDefault();
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const r = area.getBoundingClientRect();
    let ratio = (e.clientX - r.left) / r.width;
    ratio = Math.max(0.2, Math.min(0.8, ratio));
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
  const area = document.getElementById('editArea');
  if (!area) return;
  const left = (editSplit * 100).toFixed(2);
  const right = (100 - editSplit * 100).toFixed(2);
  area.style.gridTemplateColumns = `minmax(0, ${left}fr) 6px minmax(0, ${right}fr)`;
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
      // 편집이 잦은 구간엔 5초 더 기다려 한 번만 PUT
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
