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
    } else if (e.key === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handleHome($body, e.shiftKey);
    } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && e.key === '/') {
      e.preventDefault();
      toggleBackticks($body);
    }
  });

  // 외부 텍스트 붙여넣기 — "1.1.", "1.1.1." 같은 선두 숫자 마커 자동 변환
  // 숫자 제거 + 점 개수로 추정한 깊이만큼 탭 들여쓰기
  $body.addEventListener('paste', (e) => handlePasteWithAutoIndent($body, e));

  $body.addEventListener('input', () => {
    markDirty();
    renderPreview();
    scheduleSave();
    // 렌더 직후에 두 동기화 — textarea 자기 자신은 가운데로, 미리보기는 해당 줄로
    requestAnimationFrame(() => {
      centerTextareaCursor($body);
      syncPreviewToCursor();
    });
  });

  // 커서 위치 변동 시 위 미리보기에서 해당 줄로 스크롤 + 강조
  $body.addEventListener('keyup', (e) => {
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','PageUp','PageDown','Enter'].includes(e.key)) {
      centerTextareaCursor($body);
      syncPreviewToCursor();
    }
  });
  $body.addEventListener('click', () => {
    centerTextareaCursor($body);
    syncPreviewToCursor();
  });
  $body.addEventListener('focus', () => {
    centerTextareaCursor($body);
    syncPreviewToCursor();
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

  // 중요도 별점 클릭 바인딩
  bindImportanceStars();

  // 기본 법령 입력 — 입력하는 순간 그 노트의 (subject, subTopic) 기준으로 lawMap 갱신
  // 같은 소과목의 다른 노트를 열면 자동으로 같은 값이 채워짐
  const $law = document.getElementById('lawNameInput');
  if ($law) {
    function commitLaw() {
      if (!currentId) return;
      const n = findNote(currentId);
      if (!n) return;
      const subj = (document.getElementById('subjectInput').value || '').trim();
      const sub  = (document.getElementById('subTopicInput').value || '').trim();
      if (!subj || !sub) return;            // 과목/소과목이 정해진 뒤에만 매핑
      if (typeof setLawForSubTopic !== 'function') return;
      setLawForSubTopic(subj, sub, $law.value);
      if (settings.ghAutoSync && settings.ghToken) {
        clearTimeout(_pushTimer);
        _pushTimer = setTimeout(() => autoPush(), 5000);
      }
      // 같은 소과목으로 묶인 노트가 있다면 미리보기 갱신 (뱃지 매핑 즉시 반영)
      if (typeof renderPreview === 'function') renderPreview();
    }
    $law.addEventListener('change', commitLaw);
    $law.addEventListener('blur', commitLaw);
  }

  // 소과목 변경 — 탭에도 바로 반영
  $subTopic.addEventListener('change', () => {
    if (!currentId) return;
    const n = findNote(currentId);
    if (n) { n.subTopic = $subTopic.value.trim(); n.updatedAt = new Date().toISOString(); }
    markDirty();
    saveNotes();
    refreshTabs();
    refreshList();
  });

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

// 호환용 (다른 곳에서 호출되는 경우 대비)
function syncPreviewScroll() { syncPreviewToCursor(); }

// textarea 의 cursor 가 항상 viewport 가운데(40%)에 위치하도록 textarea.scrollTop 조정
function centerTextareaCursor(ta) {
  if (!ta) ta = document.getElementById('bodyInput');
  if (!ta || document.activeElement !== ta) return;
  const cs = window.getComputedStyle(ta);
  const lineHeight = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.4);
  const padTop = parseFloat(cs.paddingTop) || 0;
  const upto = ta.value.slice(0, ta.selectionStart);
  const cursorLine = (upto.match(/\n/g) || []).length;
  const cursorY = padTop + cursorLine * lineHeight;
  // 커서가 textarea 가시영역의 40% 위치에 오도록
  const target = cursorY - ta.clientHeight * 0.4;
  ta.scrollTop = Math.max(0, target);
}

// textarea 커서가 위치한 줄 번호와 같은 data-line 항목을 미리보기에서 찾아
// 가운데로 스크롤 + 잠시 강조
function syncPreviewToCursor() {
  const $ta = document.getElementById('bodyInput');
  const $preview = document.getElementById('preview');
  // 실제 스크롤되는 컨테이너는 .preview-pane (overflow-y:auto)
  const $scroller = document.querySelector('.preview-pane') || $preview;
  if (!$ta || !$preview || !$scroller) return;

  const cursor = $ta.selectionStart || 0;
  // 커서 앞쪽의 \n 개수 = 0-based 줄 번호
  const upto = $ta.value.slice(0, cursor);
  const cursorLine = (upto.match(/\n/g) || []).length;

  // data-line ≤ cursorLine 중 가장 큰 라인의 노드 (없으면 첫 항목)
  const items = $preview.querySelectorAll('li[data-line]');
  if (!items.length) return;
  let best = null;
  let bestLine = -1;
  for (const li of items) {
    const ln = +li.dataset.line;
    if (ln <= cursorLine && ln > bestLine) {
      best = li;
      bestLine = ln;
    }
  }
  if (!best) best = items[0];
  if (!best) return;

  // 강조 효과 — 강조부터 적용한 뒤 스크롤하면 글자 크기 변화 영향 없음
  $preview.querySelectorAll('.item-line.editing').forEach(el => el.classList.remove('editing'));
  const focusEl = best.querySelector(':scope > .item-line') || best;
  // depth 0 (제일 큰 제목)에는 강조를 붙이지 않음 — 이미 시각적으로 강해서 지저분해짐
  const depth = focusEl.dataset?.depth ?? best.dataset?.depth;
  if (depth !== '0') {
    focusEl.classList.add('editing');
  }

  // 실제 스크롤 컨테이너 기준으로 가운데 정렬
  const r = focusEl.getBoundingClientRect();
  const sr = $scroller.getBoundingClientRect();
  const target = $scroller.scrollTop + (r.top - sr.top) - ($scroller.clientHeight / 2) + (r.height / 2);
  $scroller.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
}

// 외부 복붙 텍스트가 "1.1.", "1.1.1." 같은 숫자 마커로 시작하면 변환:
//   - 마커 제거
//   - 붙여넣은 텍스트의 최소 세그먼트 수를 기준으로 정규화 (가장 위 레벨이 depth 0)
//     예: "1.1.", "1.1.1.", "1.1.1.1." 가 섞여 있으면 minSegs=2
//          → "1.1."=depth 0, "1.1.1."=depth 1, "1.1.1.1."=depth 2
//   - 줄 중 숫자 마커 매치 비율이 60% 미만이면 변환 보류 (이질 텍스트 보호)
function handlePasteWithAutoIndent(ta, e) {
  const data = (e.clipboardData || window.clipboardData)?.getData('text');
  if (!data) return;

  const lines = data.replace(/\r\n/g, '\n').split('\n');
  const nonEmpty = lines.filter(l => l.trim());
  if (!nonEmpty.length) return;

  // 각 줄의 세그먼트 수 파싱 + 최소값 (= 정규화 기준)
  const segCounts = lines.map(l => {
    if (!l.trim()) return null;
    const trimmed = l.replace(/^[\s\t]+/, '');
    const m = trimmed.match(/^(\d+(?:\.\d+)*)\.\s+/);
    return m ? m[1].split('.').filter(Boolean).length : null;
  });
  const numbered = segCounts.filter(c => c !== null);
  if (numbered.length / nonEmpty.length < 0.6) return;
  const minSegs = Math.min.apply(null, numbered);

  e.preventDefault();
  const transformed = lines.map(l => {
    if (!l.trim()) return '';
    const trimmed = l.replace(/^[\s\t]+/, '');
    const m = trimmed.match(/^(\d+(?:\.\d+)*)\.\s*/);
    if (!m) return l;
    const segs = m[1].split('.').filter(Boolean).length;
    const depth = Math.max(0, segs - minSegs);
    return '\t'.repeat(depth) + trimmed.slice(m[0].length);
  }).join('\n');

  const start = ta.selectionStart, end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const after  = ta.value.slice(end);
  ta.value = before + transformed + after;
  const caret = start + transformed.length;
  ta.selectionStart = ta.selectionEnd = caret;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
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

// Home 키: 들여쓰기 다음 본문 시작으로 이동 (= "문단의 가장 앞").
//   이미 그 위치이면 진짜 줄 시작(col 0)으로 토글.
//   Shift+Home 은 anchor 보존하고 선택 영역 확장.
function handleHome(ta, isShift) {
  const v = ta.value;
  const start = ta.selectionStart, end = ta.selectionEnd;
  const cursor = (ta.selectionDirection === 'backward') ? start : end;
  const lineStart = v.lastIndexOf('\n', cursor - 1) + 1;
  let i = lineStart;
  while (i < v.length && (v[i] === '\t' || v[i] === ' ')) i++;
  const indentEnd = i;
  const target = (cursor === indentEnd) ? lineStart : indentEnd;

  if (!isShift) {
    ta.setSelectionRange(target, target);
  } else {
    // 선택 anchor: 현재 selectionDirection 으로부터 결정
    if (start === end) {
      // 선택 없는 상태 — anchor=현재 cursor, 새 head=target
      if (target < cursor) ta.setSelectionRange(target, cursor, 'backward');
      else                 ta.setSelectionRange(cursor, target, 'forward');
    } else if (ta.selectionDirection === 'backward') {
      ta.setSelectionRange(Math.min(target, end), end, 'backward');
    } else {
      if (target < start) ta.setSelectionRange(target, start, 'backward');
      else                ta.setSelectionRange(start, target, 'forward');
    }
  }
  // keyup 핸들러가 syncPreview/centerCursor 호출 — preventDefault 했으므로 수동 트리거
  centerTextareaCursor(ta);
  syncPreviewToCursor();
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
  if (typeof n.importance !== 'number') n.importance = 0;
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
  const $law = document.getElementById('lawNameInput');
  if ($law) $law.value = (typeof getLawForSubTopic === 'function')
    ? (getLawForSubTopic(n.subject, n.subTopic) || '')
    : '';
  renderImportanceStars(n.importance || 0);
  activeSubject = n.subject || '_미분류';
  renderPreview();
  refreshList();
  refreshSubTopicDatalist();
  dirty = false;
  setSyncState('synced');
  if (typeof rememberView === 'function') rememberView();
}

// ─── 중요도 별점 위젯 ────────────────────────────────────
function renderImportanceStars(value) {
  const $row = document.getElementById('importanceStars');
  if (!$row) return;
  const v = Math.max(0, Math.min(5, parseInt(value, 10) || 0));
  let h = '';
  for (let i = 1; i <= 5; i++) {
    h += `<button class="star ${i <= v ? 'on' : ''}" data-val="${i}" type="button" aria-label="중요도 ${i}">★</button>`;
  }
  $row.innerHTML = h;
}
function bindImportanceStars() {
  const $row = document.getElementById('importanceStars');
  if (!$row || $row.dataset.bound) return;
  $row.dataset.bound = '1';
  $row.addEventListener('click', (e) => {
    const btn = e.target.closest('.star');
    if (!btn || !currentId) return;
    const n = findNote(currentId);
    if (!n) return;
    const v = parseInt(btn.dataset.val, 10) || 0;
    // 같은 별을 다시 누르면 0 (취소). 다른 값은 그 값으로.
    n.importance = (n.importance === v) ? 0 : v;
    n.updatedAt = new Date().toISOString();
    renderImportanceStars(n.importance);
    markDirty();
    scheduleSave();
    refreshList();
  });
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
