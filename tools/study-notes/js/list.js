// === LIST ===
// 과목 탭 + 좌측 세로 노트 목록 (드래그 정렬)

let activeSubject = null;

function getSubjects() {
  return [...new Set(notes.map(n => n.subject || '_미분류'))].sort();
}

function refreshTabs() {
  const $tabs = document.getElementById('subjectTabs');
  const subs = getSubjects();
  if (!subs.length) subs.push('_미분류');
  if (!subs.includes(activeSubject)) activeSubject = subs[0];

  const html = subs.map((s, i) => {
    const label = s === '_미분류' ? '미분류' : s;
    const active = s === activeSubject ? 'active' : '';
    const hotkey = i < 9 ? `<span class="subject-tab-idx" title="Alt+${i + 1}">${i + 1}</span>` : '';
    return `<button class="subject-tab ${active}" data-subject="${esc(s)}" data-idx="${i}">${hotkey}${esc(label)}</button>`;
  }).join('') + `<button class="subject-tab subject-tab-add" id="addSubjectBtn" title="과목 추가">+</button>`;
  $tabs.innerHTML = html;

  $tabs.querySelectorAll('.subject-tab').forEach(el => {
    if (el.id === 'addSubjectBtn') return;
    el.addEventListener('click', () => {
      activeSubject = el.dataset.subject;
      refreshTabs();
      refreshList();
      const list = notesInActive();
      if (list.length) loadNoteIntoEditor(list[0].id);
    });
  });
  document.getElementById('addSubjectBtn').addEventListener('click', () => {
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
}

// 단축키용: 과목 탭 전환
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

// 단축키용: 이전/다음 노트
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

function notesInActive() {
  return notes
    .filter(n => (n.subject || '_미분류') === activeSubject)
    .filter(n => filterOne(n, searchQuery))
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

function refreshSubjectDatalist() {
  const $dl = document.getElementById('subjectList');
  if (!$dl) return;
  const subs = getSubjects().filter(s => s !== '_미분류');
  $dl.innerHTML = subs.map(s => `<option value="${esc(s)}">`).join('');
}

function refreshList() {
  refreshSubjectDatalist();
  const $ul = document.getElementById('noteList');
  const list = notesInActive();
  if (!list.length) {
    $ul.innerHTML = `<li class="note-list-empty">${searchQuery ? '검색 결과 없음' : '노트가 없습니다.\n+ 새 노트로 시작하세요.'}</li>`;
    return;
  }
  $ul.innerHTML = list.map(n => renderNoteItem(n)).join('');
  bindNoteItems($ul);
}

function renderNoteItem(n) {
  const active = n.id === currentId ? 'active' : '';
  const title = n.topic || '(제목 없음)';
  const mn = n.mnemonic ? `<span class="note-mnemonic">${esc(n.mnemonic)}</span>` : '';
  const date = n.updatedAt ? n.updatedAt.slice(0, 10) : '';
  return `
    <li class="note-item ${active}" data-id="${esc(n.id)}" draggable="true">
      <div class="note-handle" title="드래그해서 순서 변경">⋮⋮</div>
      <div class="note-body">
        <div class="note-title">${esc(title)}</div>
        <div class="note-meta">${mn}<span>${date}</span></div>
      </div>
    </li>
  `;
}

function bindNoteItems($ul) {
  let draggingId = null;

  $ul.querySelectorAll('.note-item').forEach(el => {
    el.querySelector('.note-body').addEventListener('click', () => {
      if (dirty) { commitEdits(); saveNotes(); }
      loadNoteIntoEditor(el.dataset.id);
      document.getElementById('sidebar').classList.remove('open');
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
      const rect = el.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      el.classList.toggle('drop-before', before);
      el.classList.toggle('drop-after', !before);
    });
    el.addEventListener('dragleave', () => {
      el.classList.remove('drop-before', 'drop-after');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!draggingId || draggingId === el.dataset.id) return;
      const rect = el.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      reorderNote(draggingId, el.dataset.id, before ? 'before' : 'after');
      refreshList();
    });
  });
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
