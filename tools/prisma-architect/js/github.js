// === GITHUB 연동 ===
// GitHub API를 통해 schema-data.json 파일로 데이터를 저장/불러오기
// 저장 위치: kingofdot/tools → tools/prisma-architect/schema-data.json

const GH_CFG_KEY = 'prisma_architect_github';

function getGhConfig() {
  try { return JSON.parse(localStorage.getItem(GH_CFG_KEY)) || null; }
  catch (e) { return null; }
}

function openGhModal() {
  const cfg = getGhConfig() || {};
  document.getElementById('gh_token').value = cfg.token || '';
  document.getElementById('gh_owner').value = cfg.owner || '';
  document.getElementById('gh_repo').value = cfg.repo || '';
  document.getElementById('gh_path').value = cfg.path || 'tools/prisma-architect/schema-data.json';
  document.getElementById('ghModal').classList.add('show');
}

function saveGhConfig() {
  const cfg = {
    token: document.getElementById('gh_token').value.trim(),
    owner: document.getElementById('gh_owner').value.trim(),
    repo: document.getElementById('gh_repo').value.trim(),
    path: document.getElementById('gh_path').value.trim(),
  };
  if (!cfg.token || !cfg.owner || !cfg.repo || !cfg.path) {
    toast('모든 항목을 입력하세요', 'error'); return;
  }
  localStorage.setItem(GH_CFG_KEY, JSON.stringify(cfg));
  document.getElementById('ghModal').classList.remove('show');

  // 연결됨 표시
  document.getElementById('ghStatusDot').style.background = 'var(--accent3)';
  document.getElementById('ghSaveBtn').style.display = '';
  document.getElementById('ghLoadBtn').style.display = '';
  document.getElementById('ghStatusBtn').title = `GitHub 연동됨: ${cfg.owner}/${cfg.repo}`;

  toast('GitHub 설정이 저장되었습니다.', 'success');
}

// 앱 시작 시 기존 설정 반영
function initGithubUI() {
  const cfg = getGhConfig();
  if (cfg?.token && cfg?.owner && cfg?.repo && cfg?.path) {
    document.getElementById('ghStatusDot').style.background = 'var(--accent3)';
    document.getElementById('ghSaveBtn').style.display = '';
    document.getElementById('ghLoadBtn').style.display = '';
    document.getElementById('ghStatusBtn').title = `GitHub 연동됨: ${cfg.owner}/${cfg.repo}`;
  }
}

async function githubLoad() {
  const cfg = getGhConfig();
  if (!cfg?.token || !cfg?.owner || !cfg?.repo || !cfg?.path) {
    toast('GitHub 설정을 먼저 완료하세요.', 'error');
    openGhModal();
    return;
  }
  toast('GitHub에서 불러오는 중…', 'info');
  try {
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;
    const resp = await fetch(url, {
      headers: { Authorization: `token ${cfg.token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || `HTTP ${resp.status}`);
    }
    const fileData = await resp.json();
    // SHA 저장 (다음 저장 시 필요)
    localStorage.setItem('gh_sha_' + cfg.path, fileData.sha);

    const content = decodeURIComponent(escape(atob(fileData.content.replace(/\n/g, ''))));
    const data = JSON.parse(content);

    // 스키마 복원
    if (data.schemaText && data.schemaText.trim()) {
      schema = parse(data.schemaText);
      cardSizes = {};
      snapshot = gen(schema);
      syncEditor();
    }
    // 위치 복원
    if (data.modelPositions && Object.keys(data.modelPositions).length) {
      modelPositions = data.modelPositions;
    } else {
      modelPositions = {};
    }
    // 카디널리티 복원
    if (data.cardinalityMap && Object.keys(data.cardinalityMap).length) {
      cardinalityMap = data.cardinalityMap;
    }
    // 히스토리 초기화
    historyStack = [{ schemaStr: gen(schema), positions: JSON.stringify(modelPositions), cardinalities: JSON.stringify(cardinalityMap) }];
    historyIndex = 0; changeLog = [];

    // UI 데이터 복원
    if (data.uiHeaders && data.uiHeaders.length) {
      uiHeaders = data.uiHeaders.map(h => ({ uiRole: 'none', ...h })); // 구버전 호환
    }
    if (data.metaStore) metaStore = data.metaStore;
    if (data.rowOrderStore) rowOrderStore = data.rowOrderStore;
    if (data.uiModelConfig) uiModelConfig = data.uiModelConfig;
    if (data.systemTypeStore && data.systemTypeStore.length) systemTypeStore = data.systemTypeStore;
    if (data.variableTypeStore && data.variableTypeStore.length) variableTypeStore = data.variableTypeStore;
    if (data.comboboxStore) comboboxStore = data.comboboxStore;
    if (data.functionStore) functionStore = data.functionStore;
    if (data.todoItems) todoItems = data.todoItems;
    if (data.suggestItems) suggestItems = data.suggestItems;
    if (data.annotations) annotations = data.annotations;

    // 다이어그램 렌더
    const hasPositions = data.modelPositions && Object.keys(data.modelPositions).length > 0;
    setTimeout(() => { renderDiagram(); setTimeout(() => { if (!hasPositions) autoLayout(); else zoomFit(); }, 150); }, 50);

    // 현재 패널 새로고침
    const active = document.querySelector('.nav-tab.active')?.dataset?.panel;
    if (active === 'ui') { try { renderUiSidebar(); renderUiTable(); } catch(e) { console.error('UI 렌더 오류:', e); } }
    if (active === 'todo') renderTodoList();
    if (active === 'suggest') renderSuggestList();

    toast(`⬇️ GitHub에서 불러오기 완료 (저장: ${data.savedAt || '알 수 없음'})`, 'success');
  } catch (e) {
    toast('불러오기 오류: ' + e.message, 'error');
  }
}

async function githubSave() {
  const cfg = getGhConfig();
  if (!cfg?.token || !cfg?.owner || !cfg?.repo || !cfg?.path) {
    toast('GitHub 설정을 먼저 완료하세요.', 'error');
    openGhModal();
    return;
  }
  // UI관리 편집 중인 내용 먼저 반영
  if (typeof uiApply === 'function') uiApply();
  toast('GitHub에 저장 중…', 'info');
  try {
    // 저장할 데이터 구성
    const data = {
      schemaText: gen(schema),
      modelPositions,
      cardinalityMap,
      uiHeaders,
      metaStore,
      rowOrderStore,
      uiModelConfig,
      systemTypeStore,
      variableTypeStore,
      comboboxStore,
      functionStore,
      todoItems,
      suggestItems,
      annotations,
      savedAt: new Date().toLocaleString('ko-KR'),
    };

    const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
    const url = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${cfg.path}`;

    // SHA 항상 최신으로 가져오기 (git push 등으로 SHA가 바뀌어도 대응)
    let sha = null;
    const check = await fetch(url, {
      headers: { Authorization: `token ${cfg.token}`, Accept: 'application/vnd.github.v3+json' }
    });
    if (check.ok) { const d = await check.json(); sha = d.sha; localStorage.setItem('gh_sha_' + cfg.path, sha); }

    const body = {
      message: `chore: update schema-data (${new Date().toLocaleString('ko-KR')})`,
      content: encoded,
    };
    if (sha) body.sha = sha;

    const resp = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `token ${cfg.token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json();
      throw new Error(err.message || `HTTP ${resp.status}`);
    }

    const result = await resp.json();
    // SHA 업데이트
    localStorage.setItem('gh_sha_' + cfg.path, result.content.sha);

    toast('⬆️ GitHub에 저장되었습니다.', 'success');
  } catch (e) {
    toast('저장 오류: ' + e.message, 'error');
  }
}
