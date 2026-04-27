// === INIT ===
// 부팅 + 전역 이벤트 바인딩

function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

function openModal(id) {
  const m = document.getElementById(id);
  m.hidden = false;
}
function closeModal(id) {
  const m = document.getElementById(id);
  m.hidden = true;
}

function bindGlobal() {
  // 모바일 카드덱 토글
  document.getElementById('toggleSidebarBtn')?.addEventListener('click', () => {
    document.querySelector('.desk')?.classList.toggle('show-deck');
  });

  // PC ↔ 모바일 보기 토글 (auto / force-pc / force-mobile)
  const LAYOUT_KEY = 'study-notes:layout';
  const $layoutBtn = document.getElementById('layoutToggleBtn');
  function applyLayout(mode) {
    document.body.classList.remove('force-pc', 'force-mobile');
    if (mode === 'pc') document.body.classList.add('force-pc');
    else if (mode === 'mobile') document.body.classList.add('force-mobile');
    if ($layoutBtn) {
      $layoutBtn.textContent = mode === 'pc' ? '🖥' : mode === 'mobile' ? '📱' : '⇄';
      $layoutBtn.title = `현재 보기: ${mode === 'pc' ? 'PC 강제' : mode === 'mobile' ? '모바일 강제' : '자동'} — 클릭해서 전환`;
    }
    localStorage.setItem(LAYOUT_KEY, mode);
  }
  applyLayout(localStorage.getItem(LAYOUT_KEY) || 'auto');
  $layoutBtn?.addEventListener('click', () => {
    const cur = localStorage.getItem(LAYOUT_KEY) || 'auto';
    const next = cur === 'auto' ? 'pc' : cur === 'pc' ? 'mobile' : 'auto';
    applyLayout(next);
    toast(`보기 모드: ${next === 'pc' ? 'PC 강제' : next === 'mobile' ? '모바일 강제' : '자동(화면 크기에 따름)'}`, 'info');
  });

  // 새 노트 — 현재 활성 과목으로
  document.getElementById('newNoteBtn').addEventListener('click', () => {
    if (currentId && dirty) { commitEdits(); saveNotes(); }
    const note = newNoteTemplate(activeSubject);
    upsertNote(note);
    loadNoteIntoEditor(note.id);
    document.getElementById('topicInput').focus();
  });

  // 삭제 (로컬에서 제거 → 다음 autoPush 때 원격 파일 갱신)
  document.getElementById('deleteNoteBtn').addEventListener('click', () => {
    if (!currentId) return;
    const n = findNote(currentId);
    if (!n) return;
    if (!confirm(`"${n.topic || n.id}" 삭제할까요?`)) return;
    deleteNoteLocal(currentId);
    currentId = null;
    document.getElementById('topicInput').value = '';
    document.getElementById('mnemonicInput').value = '';
    document.getElementById('bodyInput').value = '';
    renderPreview();
    refreshList();
    const list = notesInActive();
    if (list.length) loadNoteIntoEditor(list[0].id);
    if (settings.ghAutoSync && settings.ghToken) autoPush();
    toast('삭제됨', 'success');
  });

  // 동기화
  document.getElementById('syncBtn').addEventListener('click', fullSync);

  // 설정
  document.getElementById('settingsBtn').addEventListener('click', () => {
    document.getElementById('ghOwner').value = settings.ghOwner;
    document.getElementById('ghRepo').value = settings.ghRepo;
    document.getElementById('ghPath').value = settings.ghPath;
    document.getElementById('ghToken').value = settings.ghToken;
    document.getElementById('ghAutoSync').checked = settings.ghAutoSync;
    openModal('settingsModal');
  });
  document.querySelectorAll('[data-close-modal]').forEach(el => {
    el.addEventListener('click', () => closeModal(el.dataset.closeModal));
  });
  document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
    settings.ghOwner = document.getElementById('ghOwner').value.trim() || 'kingofdot';
    settings.ghRepo = document.getElementById('ghRepo').value.trim() || 'tools';
    settings.ghPath = document.getElementById('ghPath').value.trim() || 'tools/study-notes/notes-data.json';
    settings.ghToken = document.getElementById('ghToken').value.trim();
    settings.ghAutoSync = document.getElementById('ghAutoSync').checked;
    saveSettings();
    closeModal('settingsModal');
    toast('설정 저장됨', 'success');
    // 첫 연결 시 원격에서 자동 pull
    if (settings.ghToken) {
      try { await pullAll(); } catch (_) {}
    }
  });

  // 단축키 도움말
  document.getElementById('shortcutsBtn').addEventListener('click', () => openModal('shortcutsModal'));

  // 전역 단축키
  window.addEventListener('keydown', (e) => {
    // 모달이 열려 있으면 ESC로 닫기만
    const openedModal = document.querySelector('.modal-overlay:not([hidden])');
    if (e.key === 'Escape' && openedModal) {
      // 시험 모달이면 quizState 정리까지 한 번에
      if (openedModal.id === 'quizModal' && typeof closeQuiz === 'function') closeQuiz();
      else openedModal.hidden = true;
      return;
    }

    const mod = e.ctrlKey || e.metaKey;
    const inInput = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '');
    const k = e.key.toLowerCase();

    // Ctrl 조합
    if (mod && !e.shiftKey && !e.altKey) {
      if (k === 's') { e.preventDefault(); fullSync(); return; }
      if (k === 'n') { e.preventDefault(); document.getElementById('newNoteBtn').click(); return; }
      if (k === 'k') { e.preventDefault(); document.getElementById('searchInput').focus(); document.getElementById('searchInput').select(); return; }
      if (k === ',') { e.preventDefault(); document.getElementById('settingsBtn').click(); return; }
      if (k === 't') { e.preventDefault(); document.getElementById('quizBtn').click(); return; }
      if (k === 'delete') { e.preventDefault(); document.getElementById('deleteNoteBtn').click(); return; }
    }

    // Alt 조합
    if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
      if (/^[1-9]$/.test(e.key)) {
        e.preventDefault();
        switchToSubjectAt(parseInt(e.key, 10) - 1);
        return;
      }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); switchSubjectByDelta(-1); return; }
      if (e.key === 'ArrowRight') { e.preventDefault(); switchSubjectByDelta(1); return; }
      if (e.key === 'ArrowUp')    { e.preventDefault(); switchNoteByDelta(-1); return; }
      if (e.key === 'ArrowDown')  { e.preventDefault(); switchNoteByDelta(1); return; }
    }

    // ? 단독 — 입력 필드에 포커스 없을 때만
    if (e.key === '?' && !inInput && !mod && !e.altKey) {
      e.preventDefault();
      openModal('shortcutsModal');
    }
  });

  // 종료 전 저장 보장
  window.addEventListener('beforeunload', () => {
    if (dirty) { commitEdits(); saveNotes(); }
  });

  // PWA 등록
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
}

(function boot() {
  loadSettings();
  loadNotes();
  loadSubjectOrder();
  loadEditSplit();

  // 아무것도 없으면 샘플 하나 삽입
  if (!notes.length) {
    const sample = newNoteTemplate();
    sample.subject = '민법';
    sample.topic = '매매의 효력';
    sample.mnemonic = '재대과';
    sample.body = [
      '매도인의 재산권이전의무',
      '\t재산권 이전 매도인은 매수인에 대하여 매매의 목적이 된 권리를 이전하여야 한다.(제568조 제1항)',
      '\t완전한 이전 매도인은 특별한 사정이 없는 한 제한이나 부담이 없는 완전한 소유권이전등기의무를 진다.',
      '매수인의 매매대금 지급 의무',
      '\t매매대금 지급 매수인은 매도인에게 매매대금을 지급하여야 한다.(제568조 제2항)',
      '\t동일기한 추정 일방에 대한 이행기한이 있으면 상대방도 동일한 기한 추정.(제585조)',
      '과실과 이자',
      '\t매도인, 매수인 이행하지 않은 경우',
      '\t\t인도하지 아니한 목적물로부터 생긴 과실은 매도인에게 속한다.(제587조)',
      '\t\t매수인이 대금을 완납하지 아니한 때에는 차임 상당의 손해배상금 청구 불가.(2004다8210)',
      '\t\t대금지급의무 지체를 이유로 이자 상당액 손해배상청구 불가.(95다14190)',
    ].join('\n');
    upsertNote(sample);
    currentId = sample.id;
  } else {
    currentId = notes[0].id;
  }

  bindEditor();
  bindSearch();
  bindGlobal();
  bindQuiz();

  loadNoteIntoEditor(currentId);
  refreshList();
})();
