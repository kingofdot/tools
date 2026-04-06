// === 구글 시트 연동 ===

let sheetsUrl = localStorage.getItem('prisma_sheets_url') || 'https://script.google.com/macros/s/AKfycbzhngdoUwz5xqi3SG2s3ZVxAJKNjb5CusWDhIsWhMiJGalhrMm9ULxok8MACz2nlZa1gg/exec';

function initSheetsUI() {
  if (sheetsUrl) {
    document.getElementById('sheetsSaveBtn').style.display = '';
    document.getElementById('sheetsLoadBtn').style.display = '';
    document.getElementById('sheetsStatusDot').style.background = 'var(--accent3)';
    document.getElementById('sheetsStatusBtn').title = '구글 시트 연동됨: ' + sheetsUrl;
  }
}

function showSheetsModal() {
  document.getElementById('sheetsUrlInput').value = sheetsUrl;
  document.getElementById('sheetsTestResult').textContent = '';
  document.getElementById('sheetsDisconnectBtn').style.display = sheetsUrl ? '' : 'none';
  document.getElementById('sheetsModal').classList.add('show');
}

function sheetsSaveUrl() {
  const url = document.getElementById('sheetsUrlInput').value.trim();
  if (!url) { toast('URL을 입력하세요', 'error'); return; }
  if (!url.includes('script.google.com')) {
    if (!confirm('Apps Script URL이 아닌 것 같습니다. 그래도 저장할까요?')) return;
  }
  sheetsUrl = url;
  localStorage.setItem('prisma_sheets_url', url);
  document.getElementById('sheetsSaveBtn').style.display = '';
  document.getElementById('sheetsLoadBtn').style.display = '';
  document.getElementById('sheetsStatusDot').style.background = 'var(--accent3)';
  document.getElementById('sheetsDisconnectBtn').style.display = '';
  document.getElementById('sheetsModal').classList.remove('show');
  toast('구글 시트 URL 저장됨', 'success');
}

function sheetsDisconnect() {
  if (!confirm('연결을 해제할까요?')) return;
  sheetsUrl = '';
  localStorage.removeItem('prisma_sheets_url');
  document.getElementById('sheetsSaveBtn').style.display = 'none';
  document.getElementById('sheetsLoadBtn').style.display = 'none';
  document.getElementById('sheetsStatusDot').style.background = 'var(--text-muted)';
  document.getElementById('sheetsModal').classList.remove('show');
  toast('연결 해제됨', 'info');
}

async function sheetsTest() {
  const url = document.getElementById('sheetsUrlInput').value.trim();
  if (!url) { toast('URL을 입력하세요', 'error'); return; }
  const btn = document.getElementById('sheetsTestBtn');
  const res = document.getElementById('sheetsTestResult');
  btn.textContent = '⏳ 테스트 중...'; btn.disabled = true;
  res.textContent = ''; res.style.color = 'var(--text-muted)';
  try {
    const resp = await fetch(url + '?action=ping', { method: 'GET' });
    const data = await resp.json();
    if (data.ok) {
      res.textContent = '✅ 연결 성공!'; res.style.color = 'var(--accent3)';
    } else {
      res.textContent = '❌ 응답 오류: ' + data.msg; res.style.color = 'var(--danger)';
    }
  } catch (e) {
    res.textContent = '❌ 연결 실패 — CORS 우회를 위해 Apps Script 배포 설정을 확인하세요'; res.style.color = 'var(--danger)';
  }
  btn.textContent = '🔍 연결 테스트'; btn.disabled = false;
}

async function sheetsSave() {
  if (!sheetsUrl) { showSheetsModal(); return; }
  toast('저장 중...', 'info');
  const payload = {
    action: 'save',
    data: {
      schema: gen(schema),
      uiHeaders,
      metaStore,
      rowOrderStore,
      todoItems,
      suggestItems,
      modelPositions,
      cardinalityMap,
    }
  };
  try {
    const resp = await fetch(sheetsUrl, { method: 'POST', body: JSON.stringify(payload) });
    const data = await resp.json();
    if (data.ok) toast('☁️ 구글 시트에 저장 완료 — ' + (data.savedAt ? new Date(data.savedAt).toLocaleTimeString('ko-KR') : ''), 'success');
    else toast('저장 실패: ' + data.msg, 'error');
  } catch (e) {
    try {
      await fetch(sheetsUrl, { method: 'POST', body: JSON.stringify(payload), mode: 'no-cors' });
      toast('☁️ 저장 요청 전송됨 (no-cors — 응답 확인 불가)', 'success');
    } catch (e2) {
      toast('저장 실패: ' + e2.message, 'error');
    }
  }
}

async function sheetsLoad() {
  if (!sheetsUrl) { showSheetsModal(); return; }
  toast('불러오는 중...', 'info');
  try {
    const resp = await fetch(sheetsUrl + '?action=load');
    const data = await resp.json();
    if (!data.ok) { toast('불러오기 실패: ' + data.msg, 'error'); return; }

    if (data.schema && data.schema.trim()) {
      schema = parse(data.schema);
      cardSizes = {};
      snapshot = gen(schema);
      syncEditor();
    }
    if (data.modelPositions && Object.keys(data.modelPositions).length) {
      modelPositions = data.modelPositions;
    } else {
      modelPositions = {};
    }
    if (data.cardinalityMap && Object.keys(data.cardinalityMap).length) {
      cardinalityMap = data.cardinalityMap;
    }
    historyStack = [{ schemaStr: gen(schema), positions: JSON.stringify(modelPositions), cardinalities: JSON.stringify(cardinalityMap) }];
    historyIndex = 0; changeLog = [];

    const hasPositions = data.modelPositions && Object.keys(data.modelPositions).length > 0;
    setTimeout(() => { renderDiagram(); setTimeout(() => { if (!hasPositions) autoLayout(); else zoomFit(); }, 150); }, 50);

    if (data.uiHeaders && data.uiHeaders.length) uiHeaders = data.uiHeaders;
    if (data.metaStore) metaStore = data.metaStore;
    if (data.rowOrderStore) rowOrderStore = data.rowOrderStore;
    if (data.todoItems) todoItems = data.todoItems;
    if (data.suggestItems) suggestItems = data.suggestItems;

    const active = document.querySelector('.nav-tab.active')?.dataset?.panel;
    if (active === 'ui') { renderUiSidebar(); renderUiTable(); }
    if (active === 'todo') renderTodoList();
    if (active === 'suggest') renderSuggestList();

    toast('⬇️ 구글 시트에서 불러오기 완료', 'success');
  } catch (e) {
    toast('불러오기 실패: ' + e.message, 'error');
  }
}
