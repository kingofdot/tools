// === EDITOR ===
// 메타 입력 + 본문 입력(Tab/Shift-Tab) + 보기/편집 모드 토글

function bindEditor() {
  const $body = document.getElementById('bodyInput');
  const $topic = document.getElementById('topicInput');
  const $mnemonic = document.getElementById('mnemonicInput');

  $body.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleTab($body, e.shiftKey);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleEnter($body);
    }
  });

  $body.addEventListener('input', () => {
    markDirty();
    renderPreview();
    scheduleSave();
  });

  [$topic, $mnemonic].forEach(el => {
    el.addEventListener('input', () => {
      markDirty();
      scheduleSave();
      refreshList();
      if (viewMode === 'study') renderPreview();
    });
  });

  // 보기/편집 토글
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => setViewMode(btn.dataset.mode));
  });

  // Ctrl+E 단축키 (편집/보기 토글)
  window.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      setViewMode(viewMode === 'study' ? 'edit' : 'study');
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
  renderPreview();
  if (mode === 'edit') {
    setTimeout(() => document.getElementById('bodyInput').focus(), 0);
  }
}

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
  const head = v.slice(lineStart, start).match(/^\t*/)[0];
  const insert = '\n' + head;
  ta.value = v.slice(0, start) + insert + v.slice(end);
  ta.selectionStart = ta.selectionEnd = start + insert.length;
  ta.dispatchEvent(new Event('input'));
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
  n.subject = activeSubject && activeSubject !== '_미분류' ? activeSubject : (n.subject || '');
  n.topic = document.getElementById('topicInput').value.trim();
  n.mnemonic = document.getElementById('mnemonicInput').value.trim();
  n.body = document.getElementById('bodyInput').value;
  n.updatedAt = new Date().toISOString();
}

function loadNoteIntoEditor(id) {
  const n = findNote(id);
  if (!n) return;
  currentId = id;
  document.getElementById('topicInput').value = n.topic || '';
  document.getElementById('mnemonicInput').value = n.mnemonic || '';
  document.getElementById('bodyInput').value = n.body || '';
  activeSubject = n.subject || '_미분류';
  renderPreview();
  refreshList();
  dirty = false;
  setSyncState('synced');
}

function setSyncState(state) {
  const el = document.getElementById('syncState');
  el.classList.remove('synced', 'dirty', 'error');
  if (state) el.classList.add(state);
  el.title = { synced: '동기화됨', dirty: '저장 대기', error: '오류' }[state] || '';
}
