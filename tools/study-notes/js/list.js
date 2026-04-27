// === LIST ===
// 상단: 파일폴더 탭 (과목별)
// 좌측: 카드덱 (현재 과목 노트들 — 소과목별 그룹)

let activeSubject = null;

const TAB_VARS = ['--tab-1','--tab-2','--tab-3','--tab-4','--tab-5','--tab-6','--tab-7','--tab-8'];

// subjectOrder 가 정의돼 있으면 그 순서 우선, 나머지는 알파벳 순으로 뒤에 붙임
function getSubjects() {
  const present = [...new Set(notes.map(n => n.subject || '_미분류'))];
  if (!subjectOrder || !subjectOrder.length) return present.sort();
  const ordered = subjectOrder.filter(s => present.includes(s));
  const rest = present.filter(s => !ordered.includes(s)).sort();
  return [...ordered, ...rest];
}

// 노트 중 한 과목 안에서 사용된 소과목 목록 (활성 과목 기준)
function getSubTopicsForActive() {
  return [...new Set(
    notes.filter(n => (n.subject || '_미분류') === activeSubject)
         .map(n => (n.subTopic || '').trim())
         .filter(s => s.length)
  )].sort();
}

function notesInActiveSubject() {
  return notes
    .filter(n => (n.subject || '_미분류') === activeSubject)
    .filter(n => filterOne(n, searchQuery));
}

function countSubTopic(subTopic) {
  return notes.filter(n =>
    (n.subject || '_미분류') === activeSubject &&
    (n.subTopic || '') === subTopic
  ).length;
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
      <button class="folder-tab ${active}" data-subject="${esc(s)}" data-idx="${i}" draggable="true"
              style="--tab-color: var(${colorVar});" title="Alt+${i+1} · 드래그로 순서 변경">
        <span class="tab-num">${String(i+1).padStart(2,'0')}</span>
        <span class="tab-label">${esc(label)}</span>
        <span class="tab-count">${countBySubject(s)}</span>
      </button>`;
  }).join('') + `<button class="folder-tab-add" id="addSubjectBtn" title="과목 추가">＋</button>`;
  $tabs.innerHTML = html;

  $tabs.querySelectorAll('.folder-tab').forEach(el => {
    el.addEventListener('click', () => {
      activeSubject = el.dataset.subject;
      activeSubTopic = null;  // 과목 전환 시 소과목 필터 해제
      refreshTabs();
      refreshList();
      const list = notesInActive();
      if (list.length) loadNoteIntoEditor(list[0].id);
    });
  });
  bindTabDragSort($tabs);
  document.getElementById('addSubjectBtn')?.addEventListener('click', () => {
    const name = (prompt('새 과목 이름') || '').trim();
    if (!name) return;
    activeSubject = name;
    const note = newNoteTemplate(name);
    upsertNote(note);
    // 새 과목은 마지막에 추가
    if (!subjectOrder.includes(name)) {
      subjectOrder = [...getSubjects().filter(s => s !== name), name];
      saveSubjectOrder();
    }
    refreshTabs();
    refreshList();
    loadNoteIntoEditor(note.id);
    document.getElementById('topicInput').focus();
  });

  refreshSubjectDatalist();
  refreshSubTopicDatalist();
  refreshSubTopicTabs();
  applyActiveTabColor();
}

function refreshSubTopicTabs() {
  const $row = document.getElementById('subTopicTabs');
  const $bar = document.getElementById('subTopicBar');
  if (!$row || !$bar) return;
  const tops = getSubTopicsForActive();

  // 활성 소과목이 현재 과목에 없으면 리셋
  if (activeSubTopic !== null && !tops.includes(activeSubTopic)) activeSubTopic = null;

  if (!tops.length) {
    $row.innerHTML = '';
    $bar.style.display = 'none';
    return;
  }
  $bar.style.display = '';

  const totalCount = notesInActiveSubject().length;
  const allActive = activeSubTopic === null ? 'active' : '';
  let html = `<button class="subtopic-tab ${allActive}" data-subtopic="">
    <span class="subtopic-label">전체</span>
    <span class="subtopic-count">${totalCount}</span>
  </button>`;

  html += tops.map(t => {
    const cnt = countSubTopic(t);
    const active = activeSubTopic === t ? 'active' : '';
    return `<button class="subtopic-tab ${active}" data-subtopic="${esc(t)}">
      <span class="subtopic-label">${esc(t)}</span>
      <span class="subtopic-count">${cnt}</span>
    </button>`;
  }).join('');

  $row.innerHTML = html;

  $row.querySelectorAll('.subtopic-tab').forEach(el => {
    el.addEventListener('click', () => {
      const v = el.dataset.subtopic || '';
      activeSubTopic = v === '' ? null : v;
      refreshSubTopicTabs();
      refreshList();
      const list = notesInActive();
      if (list.length) loadNoteIntoEditor(list[0].id);
    });
  });
}

// 폴더 탭 드래그 정렬
function bindTabDragSort($tabs) {
  let dragging = null;
  $tabs.querySelectorAll('.folder-tab').forEach(el => {
    el.addEventListener('dragstart', (e) => {
      dragging = el;
      el.classList.add('tab-dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', el.dataset.subject); } catch (_) {}
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('tab-dragging');
      $tabs.querySelectorAll('.tab-drop-before, .tab-drop-after')
        .forEach(x => x.classList.remove('tab-drop-before', 'tab-drop-after'));
      dragging = null;
    });
    el.addEventListener('dragover', (e) => {
      if (!dragging || dragging === el) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const before = (e.clientX - r.left) < r.width / 2;
      el.classList.toggle('tab-drop-before', before);
      el.classList.toggle('tab-drop-after', !before);
    });
    el.addEventListener('dragleave', () => el.classList.remove('tab-drop-before', 'tab-drop-after'));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragging || dragging === el) return;
      const r = el.getBoundingClientRect();
      const before = (e.clientX - r.left) < r.width / 2;
      const fromSub = dragging.dataset.subject;
      const toSub   = el.dataset.subject;
      reorderSubject(fromSub, toSub, before ? 'before' : 'after');
      refreshTabs();
      refreshList();
    });
  });
}

function reorderSubject(fromSub, toSub, position) {
  // 현재 보이는 과목 순서를 기준으로 재배치 → subjectOrder 갱신
  const cur = getSubjects();
  const without = cur.filter(s => s !== fromSub);
  const tIdx = without.indexOf(toSub);
  if (tIdx < 0) return;
  const insertAt = position === 'before' ? tIdx : tIdx + 1;
  without.splice(insertAt, 0, fromSub);
  subjectOrder = without;
  saveSubjectOrder();
}

function refreshSubTopicDatalist() {
  const $dl = document.getElementById('subTopicDataList');
  if (!$dl) return;
  $dl.innerHTML = getSubTopicsForActive().map(s => `<option value="${esc(s)}">`).join('');
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
    .filter(n => activeSubTopic === null || (n.subTopic || '') === activeSubTopic)
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
  // 소과목별 그룹핑 — 소과목 없는 카드는 "(미분류)" 그룹 (혹은 그룹 헤더 생략)
  const groups = new Map();
  list.forEach(n => {
    const key = (n.subTopic || '').trim();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(n);
  });
  const subTopicCount = [...groups.keys()].filter(k => k).length;
  // "전체"일 때만 그룹 헤더 표시 — 특정 소과목 선택 시엔 깔끔하게 카드만
  const showHeaders = (activeSubTopic === null) && subTopicCount > 0;

  let html = '';
  let cardIndex = 0;
  // 빈 키(소과목 없음) 먼저, 그 외는 알파벳 순
  const keys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  if (keys.includes('')) { keys.splice(keys.indexOf(''), 1); keys.unshift(''); }

  keys.forEach(key => {
    if (showHeaders) {
      const label = key || '(소과목 없음)';
      html += `<li class="note-group-header">${esc(label)}</li>`;
    }
    groups.get(key).forEach(n => {
      cardIndex++;
      html += renderNoteCard(n, cardIndex);
    });
  });
  $ul.innerHTML = html;
  bindNoteCards($ul);
}

function renderNoteCard(n, i) {
  const active = n.id === currentId ? 'active' : '';
  const title = n.topic || '(제목 없음)';
  const date = n.updatedAt ? n.updatedAt.slice(0, 10).replace(/-/g, '.') : '';
  const mn = n.mnemonic
    ? `<div class="note-card-mnem"><span class="note-card-mnem-label">MNEM</span><span class="note-card-mnem-value">${esc(n.mnemonic)}</span></div>`
    : '';
  // 일정 — 오늘 이후/오늘/지난 으로 색 구분
  let dueHtml = '';
  if (n.dueDate) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(n.dueDate); due.setHours(0,0,0,0);
    const diffDays = Math.round((due - today) / (1000*60*60*24));
    let cls = 'due-future';
    if (diffDays < 0) cls = 'due-past';
    else if (diffDays === 0) cls = 'due-today';
    else if (diffDays <= 3) cls = 'due-soon';
    const label = diffDays === 0 ? '오늘'
                : diffDays > 0 ? `D-${diffDays}`
                : `D+${-diffDays}`;
    dueHtml = `<span class="note-card-due ${cls}" title="일정: ${esc(n.dueDate)}">📅 ${label}</span>`;
  }
  return `
    <li class="note-card ${active}" data-id="${esc(n.id)}" draggable="true">
      <div class="note-card-row">
        <span class="note-card-no">No. ${String(i).padStart(3,'0')}</span>
        ${dueHtml}
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
