// === QUIZ ===
// 시험 보기 — 한 페이지 = 한 노트(주제) 전체.
// 좌측: 노트 본문 (빈칸 자리에 #번호), 우측: 빈칸별 입력란.
// 빈칸 종류:
//   1) 조사 앞 단어 (예: "매수인은" → 답 "매수인", 힌트 "은")
//   2) 법조항 통째 (예: "(제568조 제2항)")
//   3) 판례번호 통째 (예: "2004다8210", "95다14190")

const QUIZ_PARTICLES = [
  '입니다','이며','이고','이다',
  '처럼','마다','부터','까지','에서','으로','한테','에게','같이','조차','보다',
  '은','는','이','가','을','를','의','에','로','와','과','도','만','께','뿐'
];
// stem non-greedy — '민법으로'가 '민법'+'으로' 로 정상 매칭
const PARTICLE_RE = new RegExp(
  '([가-힣A-Za-z][가-힣A-Za-z0-9]+?)(' + QUIZ_PARTICLES.join('|') + ')(?=[\\s.,!?)\\]\\}　]|$)',
  'g'
);
// 법조항 — (제○조), (제○조 제○항), (제○조 제○항 제○호), (제○조의2) 등
const LAW_RE = /\(\s*제\s*\d+조(?:의\s*\d+)?(?:\s*제\s*\d+항)?(?:\s*제\s*\d+호)?\s*\)/g;
// 판례번호 — 95다14190, 2004다8210, 2018두12345 등 (한 글자 한자식 + 양쪽 비숫자 경계)
const CASE_BODY_RE = /(\d{2,4}(?:다|두|모|마|사|드|아|허|누|회|기|배)\d{2,})/g;

let quizState = null;
// {
//   notes: [{ noteId, subject, subTopic, topic, lines: [{raw, blanks: [...]}], totalBlanks, displayNo }],
//   idx,
//   history: [{ noteId, totalBlanks, correctCount, blanks: [...with userAnswer/correct] }],
//   answeredCurrent: bool
// }

function bindQuiz() {
  document.getElementById('quizBtn')?.addEventListener('click', openQuizSetup);
  document.getElementById('quizStartBtn')?.addEventListener('click', () => {
    const subj = document.getElementById('quizSubject').value;
    const subTop = document.getElementById('quizSubTopic').value;
    startQuiz(subj, subTop);
  });
  document.getElementById('quizSubject')?.addEventListener('change', () => {
    refreshQuizSubTopicOptions();
    updateQuizCount();
  });
  document.getElementById('quizSubTopic')?.addEventListener('change', updateQuizCount);
  document.getElementById('quizCloseBtn')?.addEventListener('click', closeQuiz);
  document.getElementById('quizCheckBtn')?.addEventListener('click', checkAllAnswers);
  document.getElementById('quizNextBtn')?.addEventListener('click', nextNote);
  document.getElementById('quizSkipBtn')?.addEventListener('click', skipNote);
  document.getElementById('quizRestartBtn')?.addEventListener('click', () => {
    closeQuiz();
    openQuizSetup();
  });
  document.getElementById('quizModal')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { closeQuiz(); }
  });
}

function openQuizSetup() {
  const $sub = document.getElementById('quizSubject');
  const subs = (typeof getSubjects === 'function') ? getSubjects() : [];
  $sub.innerHTML = subs.map(s =>
    `<option value="${esc(s)}">${esc(s === '_미분류' ? '미분류' : s)}</option>`
  ).join('');
  if (activeSubject && subs.includes(activeSubject)) $sub.value = activeSubject;
  refreshQuizSubTopicOptions();
  updateQuizCount();

  document.getElementById('quizSetup').hidden = false;
  document.getElementById('quizPlay').hidden = true;
  document.getElementById('quizResult').hidden = true;
  openModal('quizModal');
  setTimeout(() => $sub.focus(), 0);
}

function refreshQuizSubTopicOptions() {
  const subj = document.getElementById('quizSubject').value;
  const tops = [...new Set(
    notes.filter(n => (n.subject || '_미분류') === subj)
         .map(n => (n.subTopic || '').trim())
         .filter(s => s.length)
  )].sort();
  const $st = document.getElementById('quizSubTopic');
  $st.innerHTML = `<option value="">— 전체 —</option>`
    + tops.map(t => `<option value="${esc(t)}">${esc(t)}</option>`).join('');
}

function updateQuizCount() {
  const subj = document.getElementById('quizSubject')?.value;
  const subTop = document.getElementById('quizSubTopic')?.value || '';
  const $btn = document.getElementById('quizStartBtn');
  if (!$btn || !subj) return;
  const built = buildNoteQuestions(subj, subTop);
  const noteCount = built.length;
  const blankSum = built.reduce((s, q) => s + q.totalBlanks, 0);
  if (noteCount === 0) {
    $btn.textContent = '문제 없음';
    $btn.disabled = true;
  } else {
    $btn.textContent = `${noteCount}개 노트 · 빈칸 ${blankSum}개 시작 →`;
    $btn.disabled = false;
  }
}

function closeQuiz() {
  closeModal('quizModal');
  quizState = null;
}

// ─── 빈칸 추출 ─────────────────────────────────────────
function extractBlanks(line) {
  const blanks = [];

  // 1) 조사 앞 단어
  PARTICLE_RE.lastIndex = 0;
  let m;
  while ((m = PARTICLE_RE.exec(line)) !== null) {
    blanks.push({
      type: 'word',
      start: m.index,
      end: m.index + m[1].length,
      answer: m[1],
      hint: m[2],          // 조사 (오른쪽 힌트로 노출)
    });
  }

  // 2) 법조항
  LAW_RE.lastIndex = 0;
  while ((m = LAW_RE.exec(line)) !== null) {
    blanks.push({
      type: 'law',
      start: m.index,
      end: m.index + m[0].length,
      answer: m[0],
      hint: '법조항',
    });
  }

  // 3) 판례번호 — 양쪽 비숫자 경계 확인
  CASE_BODY_RE.lastIndex = 0;
  while ((m = CASE_BODY_RE.exec(line)) !== null) {
    const start = m.index;
    const end = m.index + m[0].length;
    const before = start > 0 ? line[start - 1] : '';
    const after = end < line.length ? line[end] : '';
    if (/[0-9]/.test(before) || /[0-9]/.test(after)) continue;
    blanks.push({
      type: 'case',
      start, end,
      answer: m[0],
      hint: '판례번호',
    });
  }

  // 겹치는 후보 제거 — 시작점 정렬 후 앞쪽 우선
  blanks.sort((a, b) => a.start - b.start || (a.end - a.start) - (b.end - b.start));
  const out = [];
  let lastEnd = -1;
  for (const b of blanks) {
    if (b.start >= lastEnd) { out.push(b); lastEnd = b.end; }
  }
  return out;
}

// ─── 노트 단위로 question 빌드 ─────────────────────────
function buildNoteQuestions(subject, subTopic) {
  const pool = notes.filter(n => (n.subject || '_미분류') === subject)
                    .filter(n => !subTopic || (n.subTopic || '') === subTopic);
  const questions = [];
  pool.forEach(n => {
    const lines = (n.body || '').split('\n').map(raw => {
      // 들여쓰기·백틱·자동 번호 prefix 제거 (보여주는 본문은 raw 그대로 — 학습 맥락 유지)
      // 빈칸 추출은 prefix 제거된 텍스트에서, 매치 위치는 다시 raw에 매핑.
      const trimmed = raw.replace(/^\t+/, '').replace(/^`/, '').replace(/^(\d+(?:\.\d+)*)\.\s*/, '');
      const removed = raw.length - trimmed.length;  // 앞에서 잘려나간 길이
      const blanks = extractBlanks(trimmed).map(b => ({
        ...b,
        start: b.start + removed,   // raw 기준으로 다시 보정
        end: b.end + removed,
      }));
      return { raw, blanks };
    });

    const totalBlanks = lines.reduce((s, l) => s + l.blanks.length, 0);
    if (totalBlanks === 0) return;

    // 빈칸에 1..N 라벨 부여 (노트 전체 통합)
    let lbl = 0;
    lines.forEach(line => line.blanks.forEach(b => { lbl++; b.label = lbl; }));

    questions.push({
      noteId: n.id,
      subject: n.subject || '미분류',
      subTopic: n.subTopic || '',
      topic: n.topic || '(제목 없음)',
      lines,
      totalBlanks,
    });
  });
  // 노트 셔플
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}

// ─── 시작 ──────────────────────────────────────────────
function startQuiz(subject, subTopic) {
  const built = buildNoteQuestions(subject, subTopic);
  if (!built.length) {
    if (typeof toast === 'function') toast('해당 범위에서 빈칸을 만들 수 있는 노트가 없습니다.', 'error');
    else alert('해당 범위에서 빈칸을 만들 수 있는 노트가 없습니다.');
    return;
  }

  // 노트마다 랜덤 번호 부여 (1..N 순열)
  const labels = Array.from({ length: built.length }, (_, i) => i + 1);
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  built.forEach((q, i) => { q.displayNo = labels[i]; });

  quizState = { notes: built, idx: 0, history: [], answeredCurrent: false };
  document.getElementById('quizSetup').hidden = true;
  document.getElementById('quizResult').hidden = true;
  document.getElementById('quizPlay').hidden = false;
  showNote();
}

// ─── 노트 화면 그리기 ─────────────────────────────────
function showNote() {
  if (!quizState) return;
  const q = quizState.notes[quizState.idx];
  if (!q) { showResult(); return; }
  quizState.answeredCurrent = false;

  // 헤더
  document.getElementById('quizMeta').innerHTML =
    `<span class="quiz-meta-subject">${esc(q.subject)}</span>`
    + (q.subTopic ? ` · <span class="quiz-meta-subtopic">${esc(q.subTopic)}</span>` : '')
    + ` · <span class="quiz-meta-topic">${esc(q.topic)}</span>`;
  document.getElementById('quizProgress').innerHTML =
    `<b class="quiz-no">#${q.displayNo}</b>`
    + `<span class="quiz-no-progress">(${quizState.idx + 1}/${quizState.notes.length})</span>`;
  const totalSoFar = quizState.history.reduce((s, h) => s + h.correctCount, 0);
  const totalBlanks = quizState.history.reduce((s, h) => s + h.totalBlanks, 0);
  document.getElementById('quizScore').textContent =
    totalBlanks ? `누적 ${totalSoFar}/${totalBlanks}` : '시작';

  // 좌측: 본문에 빈칸 라벨 삽입
  const $page = document.getElementById('quizPage');
  $page.innerHTML = q.lines.map(ln => renderLineWithBlanks(ln)).join('');

  // 우측: 빈칸별 입력란
  const allBlanks = q.lines.flatMap(l => l.blanks);
  const $inputs = document.getElementById('quizInputs');
  $inputs.innerHTML = allBlanks.map(b => `
    <li class="quiz-input-row" data-label="${b.label}">
      <span class="quiz-input-label">#${b.label}</span>
      <input type="text" class="quiz-input-field" data-label="${b.label}" autocomplete="off"
             placeholder="빈칸의 답">
      <span class="quiz-input-hint quiz-hint-${b.type}">${esc(b.hint || '')}</span>
    </li>
  `).join('');

  // 입력 사이 Tab/Enter 이동, 마지막에서 Enter → 채점
  const $fields = $inputs.querySelectorAll('.quiz-input-field');
  $fields.forEach((el, i) => {
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const next = $fields[i + 1];
        if (next) next.focus();
        else checkAllAnswers();
      }
    });
    el.addEventListener('focus', () => highlightBlank(el.dataset.label, true));
    el.addEventListener('blur',  () => highlightBlank(el.dataset.label, false));
  });

  document.getElementById('quizCheckBtn').hidden = false;
  document.getElementById('quizNextBtn').hidden = true;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizFeedback').className = 'quiz-feedback';
  setTimeout(() => $fields[0]?.focus(), 0);
}

function renderLineWithBlanks(ln) {
  if (!ln.blanks.length) {
    return `<div class="quiz-line">${esc(ln.raw) || '&nbsp;'}</div>`;
  }
  // raw 기준 위치로 자르되 leading tabs는 시각적 들여쓰기로 변환
  const leadingTabs = (ln.raw.match(/^\t*/) || [''])[0].length;
  const indent = leadingTabs > 0 ? `style="padding-left:${leadingTabs * 18}px"` : '';
  let inner = '';
  let cursor = 0;
  ln.blanks.forEach(b => {
    inner += esc(ln.raw.slice(cursor, b.start));
    inner += `<span class="quiz-blank-num quiz-blank-${b.type}" data-label="${b.label}">#${b.label}</span>`;
    cursor = b.end;
  });
  inner += esc(ln.raw.slice(cursor));
  // 시각적 들여쓰기는 padding으로, 텍스트의 leading tabs는 제거
  const textWithoutLeadTabs = inner.replace(/^\t+/, '');
  return `<div class="quiz-line" ${indent}>${textWithoutLeadTabs}</div>`;
}

function highlightBlank(label, on) {
  document.querySelectorAll(`.quiz-blank-num[data-label="${label}"]`).forEach(el => {
    el.classList.toggle('focused', on);
  });
}

// ─── 채점 ──────────────────────────────────────────────
function checkAllAnswers() {
  if (!quizState) return;
  const q = quizState.notes[quizState.idx];
  if (!q || quizState.answeredCurrent) return;

  const allBlanks = q.lines.flatMap(l => l.blanks);
  let correctCount = 0;
  const results = [];

  allBlanks.forEach(b => {
    const $f = document.querySelector(`.quiz-input-field[data-label="${b.label}"]`);
    const userAnswer = ($f?.value || '').trim();
    const correct = normalizeAnswer(userAnswer) === normalizeAnswer(b.answer);
    if (correct) correctCount++;

    // 입력란 색상
    if ($f) {
      $f.disabled = true;
      $f.classList.toggle('ok', correct);
      $f.classList.toggle('bad', !correct);
      if (!correct && userAnswer) {
        $f.title = `정답: ${b.answer}`;
      }
    }
    // 본문 빈칸 라벨 색상 + 정답으로 텍스트 교체
    document.querySelectorAll(`.quiz-blank-num[data-label="${b.label}"]`).forEach(el => {
      el.classList.toggle('ok', correct);
      el.classList.toggle('bad', !correct);
      el.textContent = correct ? b.answer : `${b.answer}`;
      if (!correct) el.title = `오답 — 정답: ${b.answer}`;
    });
    // 입력란 옆에 정답 표시
    if ($f) {
      const row = $f.closest('.quiz-input-row');
      if (row && !correct) {
        const ans = document.createElement('span');
        ans.className = 'quiz-answer-shown';
        ans.textContent = `→ ${b.answer}`;
        row.appendChild(ans);
      }
    }
    results.push({ ...b, userAnswer, correct });
  });

  quizState.history.push({
    noteId: q.noteId,
    subject: q.subject,
    subTopic: q.subTopic,
    topic: q.topic,
    displayNo: q.displayNo,
    totalBlanks: allBlanks.length,
    correctCount,
    blanks: results,
  });
  quizState.answeredCurrent = true;

  const pct = allBlanks.length ? Math.round((correctCount / allBlanks.length) * 100) : 0;
  const $fb = document.getElementById('quizFeedback');
  $fb.textContent = `이 노트: ${correctCount} / ${allBlanks.length} (${pct}%)`;
  $fb.className = `quiz-feedback ${correctCount === allBlanks.length ? 'ok' : (correctCount === 0 ? 'bad' : 'mixed')}`;

  // 누적 점수 갱신
  const totalSoFar = quizState.history.reduce((s, h) => s + h.correctCount, 0);
  const totalBlanks = quizState.history.reduce((s, h) => s + h.totalBlanks, 0);
  document.getElementById('quizScore').textContent = `누적 ${totalSoFar}/${totalBlanks}`;

  document.getElementById('quizCheckBtn').hidden = true;
  document.getElementById('quizNextBtn').hidden = false;
  setTimeout(() => document.getElementById('quizNextBtn').focus(), 0);
}

function nextNote() {
  if (!quizState) return;
  quizState.idx++;
  showNote();
}

function skipNote() {
  if (!quizState) return;
  const q = quizState.notes[quizState.idx];
  if (q) {
    const allBlanks = q.lines.flatMap(l => l.blanks);
    quizState.history.push({
      noteId: q.noteId,
      subject: q.subject,
      subTopic: q.subTopic,
      topic: q.topic,
      displayNo: q.displayNo,
      totalBlanks: allBlanks.length,
      correctCount: 0,
      skipped: true,
      blanks: allBlanks.map(b => ({ ...b, userAnswer: '', correct: false })),
    });
  }
  quizState.idx++;
  showNote();
}

// ─── 결과 ──────────────────────────────────────────────
function showResult() {
  document.getElementById('quizPlay').hidden = true;
  document.getElementById('quizResult').hidden = false;
  const total = quizState.history.reduce((s, h) => s + h.totalBlanks, 0);
  const correct = quizState.history.reduce((s, h) => s + h.correctCount, 0);
  const pct = total ? Math.round((correct / total) * 100) : 0;
  document.getElementById('quizResultScore').textContent = `${correct} / ${total}  (${pct}%)`;

  // 노트별 요약 + 틀린 빈칸
  const $list = document.getElementById('quizResultList');
  if (!quizState.history.length) {
    $list.innerHTML = '<div class="quiz-result-empty">결과 없음</div>';
    return;
  }
  $list.innerHTML = quizState.history.map(h => {
    const headCls = h.correctCount === h.totalBlanks ? 'ok'
                   : h.correctCount === 0 ? 'bad' : 'mixed';
    const wrong = h.blanks.filter(b => !b.correct);
    const wrongHtml = wrong.length ? wrong.map(b => `
      <li class="qri-blank">
        <span class="qri-no">#${b.label}</span>
        <span class="qri-stem">${esc(b.answer)}</span>
        ${b.userAnswer ? `<span class="qri-yours">(입력: ${esc(b.userAnswer)})</span>`
                       : (h.skipped ? `<span class="qri-yours">(건너뜀)</span>` : `<span class="qri-yours">(미입력)</span>`)}
      </li>
    `).join('') : '<li class="qri-blank ok">전부 정답</li>';
    return `
      <div class="quiz-result-item">
        <div class="qri-meta">
          <b class="qri-no">#${h.displayNo}</b>
          ${esc(h.subject)}${h.subTopic ? ' · ' + esc(h.subTopic) : ''} · ${esc(h.topic)}
          <span class="qri-score qri-score-${headCls}">${h.correctCount}/${h.totalBlanks}</span>
        </div>
        <ul class="qri-blank-list">${wrongHtml}</ul>
      </div>
    `;
  }).join('');
}

// ─── 헬퍼 ──────────────────────────────────────────────
function normalizeAnswer(s) {
  return String(s ?? '').trim().toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[　 ]/g, '');  // 전각·NBSP 공백 제거
}
