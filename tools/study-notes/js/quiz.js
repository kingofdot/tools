// === QUIZ ===
// 시험 보기: 과목/소과목 선택 → 본문 줄에서 "조사 앞 단어" 빈칸 → 한 줄 = 한 문제

// 한국어 조사 — 긴 것 먼저 매칭되도록 정렬 (alternation 좌→우 우선)
const QUIZ_PARTICLES = [
  '입니다','이며','이고','이다',
  '처럼','마다','부터','까지','에서','으로','한테','에게','같이','조차','보다',
  '은','는','이','가','을','를','의','에','로','와','과','도','만','께','뿐'
];
// stem 은 non-greedy(+?) — '민법으로' 가 '민법으'+'로'가 아니라 '민법'+'으로' 로 잡히도록.
// non-greedy 라도 최소 2글자 보장: 첫 [가-힣A-Za-z] + 1자 이상 [가-힣A-Za-z0-9]+?
const QUIZ_RE = new RegExp(
  '([가-힣A-Za-z][가-힣A-Za-z0-9]+?)(' + QUIZ_PARTICLES.join('|') + ')(?=[\\s.,!?)\\]\\}　]|$)',
  'g'
);

let quizState = null;
// { questions: [{noteId, noteTopic, noteSubject, lineRaw, stem, particle, blankIdx}], idx, score, history: [{userAnswer, correct, stem}] }

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
  document.getElementById('quizCheckBtn')?.addEventListener('click', checkAnswer);
  document.getElementById('quizNextBtn')?.addEventListener('click', nextQuestion);
  document.getElementById('quizSkipBtn')?.addEventListener('click', skipQuestion);
  document.getElementById('quizRestartBtn')?.addEventListener('click', () => {
    closeQuiz();
    openQuizSetup();
  });
  document.getElementById('quizAnswerInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const checkBtn = document.getElementById('quizCheckBtn');
      const nextBtn = document.getElementById('quizNextBtn');
      if (!checkBtn.hidden) checkAnswer();
      else if (!nextBtn.hidden) nextQuestion();
    } else if (e.key === 'Escape') {
      closeQuiz();
    }
  });
  // ESC로 닫기 (모달 전체)
  document.getElementById('quizModal')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeQuiz();
  });
}

function openQuizSetup() {
  // 과목 옵션 채우기
  const $sub = document.getElementById('quizSubject');
  const subs = (typeof getSubjects === 'function') ? getSubjects() : [];
  $sub.innerHTML = subs.map(s =>
    `<option value="${esc(s)}">${esc(s === '_미분류' ? '미분류' : s)}</option>`
  ).join('');
  if (activeSubject && subs.includes(activeSubject)) $sub.value = activeSubject;
  refreshQuizSubTopicOptions();
  updateQuizCount();

  // 화면 전환
  document.getElementById('quizSetup').hidden = false;
  document.getElementById('quizPlay').hidden = true;
  document.getElementById('quizResult').hidden = true;
  openModal('quizModal');
  setTimeout(() => $sub.focus(), 0);
}

// 시작 전 문제 수 미리보기 (시작 버튼에 표시)
function updateQuizCount() {
  const subj = document.getElementById('quizSubject')?.value;
  const subTop = document.getElementById('quizSubTopic')?.value || '';
  const $btn = document.getElementById('quizStartBtn');
  if (!$btn || !subj) return;
  const count = buildQuestions(subj, subTop).length;
  if (count === 0) {
    $btn.textContent = '문제 없음';
    $btn.disabled = true;
  } else {
    $btn.textContent = `${count}문제 시작 →`;
    $btn.disabled = false;
  }
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

function closeQuiz() {
  closeModal('quizModal');
  quizState = null;
}

// 노트 → 시험 문제 목록 변환
function buildQuestions(subject, subTopic) {
  const pool = notes.filter(n => (n.subject || '_미분류') === subject)
                    .filter(n => !subTopic || (n.subTopic || '') === subTopic);
  const questions = [];
  pool.forEach(n => {
    const lines = (n.body || '').split('\n');
    lines.forEach(raw => {
      // 들여쓰기·백틱·선두 숫자 마커 제거
      let line = raw.replace(/^\t+/, '').replace(/^`/, '');
      line = line.replace(/^(\d+(?:\.\d+)*)\.\s*/, '');
      line = line.trim();
      if (line.length < 4) return;

      // 후보 (단어, 조사) 쌍 모두 찾기
      const candidates = [];
      QUIZ_RE.lastIndex = 0;
      let m;
      while ((m = QUIZ_RE.exec(line)) !== null) {
        candidates.push({
          stem: m[1],
          particle: m[2],
          start: m.index,
          end: m.index + m[1].length,
        });
      }
      if (!candidates.length) return;

      // 한 줄당 무작위 1개 선택
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      questions.push({
        noteId: n.id,
        noteSubject: n.subject || '미분류',
        noteSubTopic: n.subTopic || '',
        noteTopic: n.topic || '(제목 없음)',
        lineRaw: line,
        stem: c.stem,
        particle: c.particle,
        blankStart: c.start,
        blankEnd: c.end,
      });
    });
  });
  // 셔플
  for (let i = questions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [questions[i], questions[j]] = [questions[j], questions[i]];
  }
  return questions;
}

function startQuiz(subject, subTopic) {
  const questions = buildQuestions(subject, subTopic);
  if (!questions.length) {
    if (typeof toast === 'function') {
      toast('해당 범위에서 문제로 만들 수 있는 문장이 없습니다.', 'error');
    } else {
      alert('해당 범위에서 문제로 만들 수 있는 문장이 없습니다.');
    }
    return;
  }
  // 1..N 순열을 무작위로 배정 — 진행 순서와 무관한 "문제 번호"
  const labels = Array.from({ length: questions.length }, (_, i) => i + 1);
  for (let i = labels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [labels[i], labels[j]] = [labels[j], labels[i]];
  }
  questions.forEach((q, i) => { q.displayNo = labels[i]; });

  quizState = { questions, idx: 0, score: 0, history: [] };
  document.getElementById('quizSetup').hidden = true;
  document.getElementById('quizResult').hidden = true;
  document.getElementById('quizPlay').hidden = false;
  showQuestion();
}

function showQuestion() {
  if (!quizState) return;
  const q = quizState.questions[quizState.idx];
  if (!q) { showResult(); return; }

  // 빈칸 처리
  const before = q.lineRaw.slice(0, q.blankStart);
  const after = q.lineRaw.slice(q.blankEnd);
  const blank = `<span class="quiz-blank">______</span>`;

  document.getElementById('quizMeta').innerHTML =
    `<span class="quiz-meta-subject">${esc(q.noteSubject)}</span>`
    + (q.noteSubTopic ? ` · <span class="quiz-meta-subtopic">${esc(q.noteSubTopic)}</span>` : '')
    + ` · <span class="quiz-meta-topic">${esc(q.noteTopic)}</span>`;

  document.getElementById('quizSentence').innerHTML =
    `${esc(before)}${blank}${esc(after)}`;

  // 큰 글씨로 랜덤 번호, 옆에 작게 실제 진행률
  document.getElementById('quizProgress').innerHTML =
    `<b class="quiz-no">#${q.displayNo}</b>`
    + `<span class="quiz-no-progress">(${quizState.idx + 1}/${quizState.questions.length})</span>`;
  document.getElementById('quizScore').textContent = `정답 ${quizState.score}`;

  const $a = document.getElementById('quizAnswerInput');
  $a.value = '';
  $a.disabled = false;
  $a.focus();

  document.getElementById('quizCheckBtn').hidden = false;
  document.getElementById('quizNextBtn').hidden = true;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('quizFeedback').className = 'quiz-feedback';
}

function checkAnswer() {
  if (!quizState) return;
  const q = quizState.questions[quizState.idx];
  if (!q) return;
  const $a = document.getElementById('quizAnswerInput');
  const userRaw = $a.value.trim();
  const correct = normalize(userRaw) === normalize(q.stem);

  if (correct) {
    quizState.score++;
    document.getElementById('quizFeedback').textContent = `✓ 정답 — ${q.stem}${q.particle}`;
    document.getElementById('quizFeedback').className = 'quiz-feedback ok';
  } else {
    document.getElementById('quizFeedback').innerHTML =
      `✗ 오답 — 정답: <b>${esc(q.stem)}</b>${esc(q.particle)}`
      + (userRaw ? ` <span class="quiz-feedback-yours">(입력: ${esc(userRaw)})</span>` : '');
    document.getElementById('quizFeedback').className = 'quiz-feedback bad';
  }
  quizState.history.push({ ...q, userAnswer: userRaw, correct });

  $a.disabled = true;
  document.getElementById('quizCheckBtn').hidden = true;
  document.getElementById('quizNextBtn').hidden = false;
  document.getElementById('quizScore').textContent = `정답 ${quizState.score}`;
  setTimeout(() => document.getElementById('quizNextBtn').focus(), 0);
}

function nextQuestion() {
  if (!quizState) return;
  quizState.idx++;
  showQuestion();
}

function skipQuestion() {
  if (!quizState) return;
  const q = quizState.questions[quizState.idx];
  if (q) quizState.history.push({ ...q, userAnswer: '', correct: false, skipped: true });
  quizState.idx++;
  showQuestion();
}

function showResult() {
  document.getElementById('quizPlay').hidden = true;
  document.getElementById('quizResult').hidden = false;
  const total = quizState.history.length;
  const correct = quizState.history.filter(h => h.correct).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  document.getElementById('quizResultScore').textContent = `${correct} / ${total}  (${pct}%)`;
  // 틀린 문제 목록
  const wrong = quizState.history.filter(h => !h.correct);
  const $list = document.getElementById('quizResultList');
  if (!wrong.length) {
    $list.innerHTML = '<div class="quiz-result-empty">전부 정답!</div>';
  } else {
    $list.innerHTML = wrong.map(w => `
      <div class="quiz-result-item">
        <div class="qri-meta"><b class="qri-no">#${w.displayNo}</b> ${esc(w.noteSubject)}${w.noteSubTopic ? ' · ' + esc(w.noteSubTopic) : ''} · ${esc(w.noteTopic)}</div>
        <div class="qri-line">${esc(w.lineRaw.slice(0, w.blankStart))}<b class="qri-stem">${esc(w.stem)}</b>${esc(w.particle)}${esc(w.lineRaw.slice(w.blankEnd))}</div>
        ${w.userAnswer && !w.skipped ? `<div class="qri-yours">입력: ${esc(w.userAnswer)}</div>` : (w.skipped ? `<div class="qri-yours">(건너뜀)</div>` : '')}
      </div>
    `).join('');
  }
}

function normalize(s) {
  return String(s ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}
