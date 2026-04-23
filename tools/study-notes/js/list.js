// === LIST ===
// 좌: 과목 레일 (vertical) / 가운데: 노트 카드 목록

let activeSubject = null;

function getSubjects() {
  return [...new Set(notes.map(n => n.subject || '_미분류'))].sort();
}

function countBySubject(subj) {
  return notes.filter(n => (n.subject || '_미분류') === subj).length;
}

function refreshTabs() {
  const $list = document.getElementById('subjectList');
  if (!$list) return;
  const subs = getSubjects();
  if (!subs.length) subs.push('_미분류');
  if (!subs.includes(activeSubject)) activeSubject = subs[0];

  const ROMAN_LO = ['i','ii','iii','iv','v','vi','vii','viii','ix','x','xi','xii'];

  const html = subs.map((s, i) => {
    const label = s === '_미분류' ? '미분류' : s;
    const active = s === activeSubject ? 'active' : '';
    const idx = ROMAN_LO[i] || (i + 1);
    return `
      <button class="subject-row ${active}" data-subject="${esc(s)}" title="Alt+${i + 1}">
        <span class="row-left">
          <span class="row-idx">${idx}</span>
          <span class="row-name">${esc(label)}</span>
        </span>
        <span class="row-count">${countBySubject(s)}</span>
      </button>`;
  }).join('') + `<button class="subject-add" id="addSubjectBtn">＋ 과목 추가</button>`;
  $list.innerHTML = html;

  // 활성 과목 표시 (가운데 컬럼 헤더)
  const $name = document.getElementById('activeSubjectName');
  if ($name) $name.textContent = activeSubject === '_미분류' ? '미분류' : activeSubject;

  $list.querySelectorAll('.subject-row').forEach(el => {
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
  if (!list.length) {
    $ul.innerHTML = `<li class="note-list-empty">${searchQuery ? '검색 결과 없음' : '노트가 없습니다.\n＋ 새 노트로 시작하세요.'}</li>`;
    return;
  }
  $ul.innerHTML = list.map(n => renderNoteCard(n)).join('');
  bindNoteCards($ul);
}

function renderNoteCard(n) {
  const active = n.id === currentId ? 'active' : '';
  const title = n.topic || '(제목 없음)';
  const mn = n.mnemonic ? `<span class="note-card-mnemonic">${esc(n.mnemonic)}</span>` : '';
  const date = n.updatedAt ? n.updatedAt.slice(0, 10).replace(/-/g, '.') : '';
  return `
    <li class="note-card ${active}" data-id="${esc(n.id)}" draggable="true">
      <div class="note-card-title">${esc(title)}</div>
      <div class="note-card-meta">${mn}<span class="note-card-date">${date}</span></div>
      <div class="note-card-handle" title="드래그해서 순서 변경">⋮⋮</div>
    </li>
  `;
}

function bindNoteCards($ul) {
  let draggingId = null;
  $ul.querySelectorAll('.note-card').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('.note-card-handle')) return;
      if (dirty) { commitEdits(); saveNotes(); }
      loadNoteIntoEditor(el.dataset.id);
      // 모바일에서 좌측 닫기
      document.querySelector('.library')?.classList.remove('show-rail');
    });
    el.addEventListener('dragstart', (e) => {
      draggingId = el.dataset.id;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', draggingId); } catch (_) {}
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      $ul.querySelectorAll('.drop-before, .drop-after').forEach(x => x.classList.remove('drop-before', 'drop-after'));
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
