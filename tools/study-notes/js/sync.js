// === SYNC ===
// 단일 파일 push/pull (prisma-architect 패턴)

async function pushAll() {
  if (!settings.ghToken) return;
  const payload = {
    notes,
    savedAt: new Date().toLocaleString('ko-KR'),
  };
  await ghPutAll(payload);
}

async function pullAll() {
  if (!settings.ghToken) {
    toast('GitHub 토큰을 먼저 설정하세요.', 'error');
    return;
  }
  setSyncState('dirty');
  try {
    const data = await ghFetchAll();
    if (!data) {
      toast('원격에 저장된 노트가 없습니다. 첫 저장으로 만들어집니다.', 'info');
      setSyncState('synced');
      return;
    }
    if (Array.isArray(data.notes)) {
      notes = data.notes;
      saveNotes();
      refreshList();
      if (currentId && findNote(currentId)) loadNoteIntoEditor(currentId);
      else if (notes.length) loadNoteIntoEditor(notes[0].id);
      toast(`${notes.length}건 불러옴 (저장: ${data.savedAt || '?'})`, 'success');
    } else {
      toast('원격 데이터 형식이 올바르지 않습니다.', 'error');
    }
    setSyncState('synced');
  } catch (err) {
    console.error(err);
    setSyncState('error');
    toast('불러오기 실패: ' + err.message, 'error');
  }
}

// 수동 ⇅ 동기화 = pull → 합치고 → push
async function fullSync() {
  if (!settings.ghToken) {
    toast('GitHub 토큰을 먼저 설정하세요.', 'error');
    openModal('settingsModal');
    return;
  }
  setSyncState('dirty');
  try {
    if (currentId && dirty) { commitEdits(); saveNotes(); }
    // 원격 → 로컬 병합 (savedAt이 더 새로우면 원격으로 덮음)
    const data = await ghFetchAll();
    if (data && Array.isArray(data.notes)) {
      const remote = data.notes;
      const byId = new Map(notes.map(n => [n.id, n]));
      for (const r of remote) {
        const local = byId.get(r.id);
        if (!local || (r.updatedAt || '') >= (local.updatedAt || '')) byId.set(r.id, r);
      }
      notes = [...byId.values()];
      saveNotes();
    }
    // 로컬 → 원격
    await pushAll();
    refreshList();
    if (currentId && findNote(currentId)) loadNoteIntoEditor(currentId);
    setSyncState('synced');
    dirty = false;
    toast(`동기화 완료 — ${notes.length}건`, 'success');
  } catch (err) {
    console.error(err);
    setSyncState('error');
    toast('동기화 실패: ' + err.message, 'error');
  }
}

// 자동 push (편집 디바운스 후 호출)
async function autoPush() {
  try {
    await pushAll();
    setSyncState('synced');
  } catch (err) {
    console.error(err);
    setSyncState('error');
  }
}
