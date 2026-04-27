// === STORAGE ===
// localStorage 기반 노트/설정 저장

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) Object.assign(settings, JSON.parse(raw));
  } catch (_) {}
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    notes = raw ? JSON.parse(raw) : [];
  } catch (_) {
    notes = [];
  }
  // 마이그레이션 — 누락 필드 채움
  let mutated = false;
  notes.forEach((n, i) => {
    if (typeof n.order !== 'number') { n.order = i; mutated = true; }
    if (typeof n.subTopic !== 'string') { n.subTopic = ''; mutated = true; }
    if (typeof n.dueDate !== 'string')  { n.dueDate = '';  mutated = true; }
  });
  if (mutated) saveNotes();
}

function loadSubjectOrder() {
  try {
    const raw = localStorage.getItem(SUBJECT_ORDER_KEY);
    subjectOrder = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(subjectOrder)) subjectOrder = [];
  } catch (_) { subjectOrder = []; }
}
function saveSubjectOrder() {
  localStorage.setItem(SUBJECT_ORDER_KEY, JSON.stringify(subjectOrder));
}

function loadEditSplit() {
  const v = parseFloat(localStorage.getItem(EDIT_SPLIT_KEY) || '');
  if (isFinite(v) && v >= 0.15 && v <= 0.85) editSplit = v;
}
function saveEditSplit() {
  localStorage.setItem(EDIT_SPLIT_KEY, String(editSplit));
}

function saveNotes() {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}

function findNote(id) {
  return notes.find(n => n.id === id);
}

function upsertNote(note) {
  const i = notes.findIndex(n => n.id === note.id);
  if (i >= 0) notes[i] = note;
  else notes.push(note);
  saveNotes();
}

function deleteNoteLocal(id) {
  notes = notes.filter(n => n.id !== id);
  saveNotes();
}

function nextOrderForSubject(subject) {
  const same = notes.filter(n => (n.subject || '_미분류') === subject);
  if (!same.length) return 0;
  return Math.max(...same.map(n => n.order ?? 0)) + 1;
}

function newNoteTemplate(subject) {
  const ts = new Date();
  const id = ts.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const subj = subject || '_미분류';
  return {
    id,
    subject: subj === '_미분류' ? '' : subj,
    subTopic: '',
    topic: '',
    mnemonic: '',
    body: '',
    dueDate: '',
    order: nextOrderForSubject(subj),
    updatedAt: ts.toISOString(),
    sha: null,
  };
}

// 같은 과목 내에서 두 노트 사이로 이동
function reorderNote(draggedId, targetId, position /* 'before' | 'after' */) {
  const dragged = findNote(draggedId);
  const target = findNote(targetId);
  if (!dragged || !target) return;
  if (dragged.subject !== target.subject) return; // 다른 과목으로 이동은 불가
  const subjectKey = dragged.subject || '_미분류';

  // 같은 과목의 노트만 정렬
  const same = notes
    .filter(n => (n.subject || '_미분류') === subjectKey)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const without = same.filter(n => n.id !== draggedId);
  const tIdx = without.findIndex(n => n.id === targetId);
  if (tIdx < 0) return;
  const insertAt = position === 'before' ? tIdx : tIdx + 1;
  without.splice(insertAt, 0, dragged);

  // order 재할당
  without.forEach((n, i) => { n.order = i; });
  saveNotes();
}
