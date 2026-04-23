// === LIST ===
// 상단: 파일폴더 탭 (과목별)
// 좌측: 카드덱 (현재 과목 노트들)

let activeSubject = null;

const TAB_VARS = ['--tab-1','--tab-2','--tab-3','--tab-4','--tab-5','--tab-6','--tab-7','--tab-8'];

function getSubjects() {
  return [...new Set(notes.map(n => n.subject || '_미분류'))].sort();
}
function countBySubject(subj) {
  return notes.filter(n => (n.subject || '_미분류') === subj).length;
}
function colorVarFor(idx) { return TAB_VARS[idx % TAB_VARS.length]; }

function applyActiveTabColor() {
  const subs = getSubjects();
  const idx = Math.max(0, subs.indexOf(activeSubject));
  const cssVar = colorVarFor(idx);
  // var(--tab-N) → 실제 색 풀어서 --active-tab-color로 박음
  const computed = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
  document.documentElement.style.setProperty('--active-tab-color', computed || 'var(--tab-1)');
}

function refreshTabs() {
  const $tabs = document.getElementById('folderTabs');
  if (!$tabs) return;
  const subs = getSubjects();
  if (!subs.length) subs.push('_미분류');
  if (!subs.includes(activeSubject)) activeSubject = subs[0];

  const html = subs.map((s, i) => {
    const label = s === '_미분류' ? '미분류' : s;
    const active = s === activeSubject ? 'active' : '';
    const colorVar = colorVarFor(i);
    return `
      <button class="folder-tab ${active}" data-subject="${esc(s)}" data-idx="${i}"
              style="--tab-color: var(${colorVar});" title="Alt+${i+1}">
        <span class="tab-num">${String(i+1).padStart(2,'0')}</span>
        <span class="tab-label">${esc(label)}</span>
        <span class="tab-count">${countBySubject(s)}</span>
      </button>`;
  }).join('') + `<button class="folder-tab-add" id="addSubjectBtn" title="과목 추가">＋</button>`;
  $tabs.innerHTML = html;

  $tabs.querySelectorAll('.folder-tab').forEach(el => {
    el.addEventListener('click', () => {
      activeSubject = el.dataset.subject;
      refreshTabs();
      refreshList();
      const list = notesInActive();
      if (list.length) loadNoteIntoEditor(list[0].id);
    });
  });
  document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
    const name = (prompt('새 과목 이름') || '').trim();
    if (!name) return;
    activeSubject = name;
    const note = newNoteTemplate(name);
    upsertNote(note);
    refreshTabs();
    refreshList();
    loadNoteIntoEditor(note.id);
    document.getElementById('topicInput').focus();
  });

  refreshSubjectDatalist();
  applyActiveTabColor();
}

function refreshSubjectDatalist() {
  const $dl = document.getElementById('subjectDataList');
  if (!$dl) return;
  const subs = getSubjects().filter(s => s !== '_미분류');
  $dl.innerHTML = subs.map(s => `<option value="${esc(s)}">`).join('');
}

function notesInActive() {
  return notes
    .filter(n => (n.subject || '_미분류') === activeSubject)
    .filter(n => filterOne(n, searchQuery))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function refreshList() {
  refreshTabs();
  const $ul = document.getElementById('noteList');
  const list = notesInActive();
  const $count = document.getElementById('noteCount');
  if ($count) $count.textContent = list.length;

  if (!list.length) {
    $ul.innerHTML = `<li class="note-list-empty">${searchQuery ? '검색 결과 없음' : '노트가 없습니다.\n＋ 추가로 시작하세요.'}</li>`;
    return;
  }
  $ul.innerHTML = list.map((n, i) => renderNoteCard(n, i)).join('');
  bindNoteCards($ul);
}

function renderNoteCard(n, i) {
  const active = n.id === currentId ? 'active' : '';
  const title = n.topic || '(제목 없음)';
  const date = n.updatedAt ? n.updatedAt.slice(0, 10).replace(/-/g, '.') : '';
  const mn = n.mnemonic
    ? `<div class="note-card-mnem"><span class="note-card-mnem-label">MNEM</span><span class="note-card-mnem-value">${esc(n.mnemonic)}</span></div>`
    : '';
  return `
    <li class="note-card ${active}" data-id="${esc(n.id)}" draggable="true">
      <div class="note-card-row">
        <span class="note-card-no">No. ${String(i+1).padStart(3,'0')}</span>
        <span class="note-card-date">${date}</span>
      </div>
      <div class="note-card-title">${esc(title)}</div>
      ${mn}
    </li>
  `;
}

function bindNoteCards($ul) {
  let draggingId = null;
  $ul.querySelectorAll('.note-card').forEach(el => {
    el.addEventListener('click', () => {
      if (dirty) { commitEdits(); saveNotes(); }
      loadNoteIntoEditor(el.dataset.id);
      document.querySelector('.desk')?.classList.remove('show-deck');
    });
    el.addEventListener('dragstart', (e) => {
      draggingId = el.dataset.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', draggingId); } catch (_) {}
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      $ul.querySelectorAll('.drop-before, .drop-after').forEach(x =>
        x.classList.remove('drop-before', 'drop-after'));
      draggingId = null;
    });
    el.addEventListener('dragover', (e) => {
      if (!draggingId || draggingId === el.dataset.id) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const before = (e.clientY - r.top) < r.height / 2;
      el.classList.toggle('drop-before', before);
      el.classList.toggle('drop-after', !before);
    });
    el.addEventListener('dragleave', () => el.classList.remove('drop-before', 'drop-after'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggingId || draggingId === el.dataset.id) return;
      const r = el.getBoundingClientRect();
      const before = (e.clientY - r.top) < r.height / 2;
      reorderNote(draggingId, el.dataset.id, before ? 'before' : 'after');
      refreshList();
    });
  });
}

// ─── 단축키용 ────────────────────────────────────────────
function switchToSubjectAt(idx) {
  const subs = getSubjects();
  if (!subs.length) return;
  const target = subs[Math.max(0, Math.min(subs.length - 1, idx))];
  if (!target || target === activeSubject) return;
  activeSubject = target;
  refreshTabs();
  refreshList();
  const list = notesInActive();
  if (list.length) loadNoteIntoEditor(list[0].id);
}
function switchSubjectByDelta(delta) {
  const subs = getSubjects();
  const i = subs.indexOf(activeSubject);
  if (i < 0) return switchToSubjectAt(0);
  switchToSubjectAt(i + delta);
}
function switchNoteByDelta(delta) {
  const list = notesInActive();
  if (!list.length) return;
  const i = list.findIndex(n => n.id === currentId);
  const next = list[Math.max(0, Math.min(list.length - 1, (i < 0 ? 0 : i + delta)))];
  if (next && next.id !== currentId) {
    if (dirty) { commitEdits(); saveNotes(); }
    loadNoteIntoEditor(next.id);
  }
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
