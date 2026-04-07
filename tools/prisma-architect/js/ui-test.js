// === UI생성테스트 ===
// metaStore + uiModelConfig 기반 실제 UI 렌더링 플레이그라운드

let uitestChecked = new Set();
let uitestViewContext = 'create'; // 'create' | 'list' | 'detail'

// mockStore: { [modelName]: [ { _id, ...fields } ] }
let mockStore = {};
let mockStoreNextId = 1;

function mockStoreCreate() {
  const models = [...uitestChecked];
  if (models.length === 0) { toast('먼저 모델을 선택하세요', 'error'); return; }

  // 현재 폼에서 값 수집
  models.forEach(name => {
    if (!mockStore[name]) mockStore[name] = [];
    const record = { _id: String(mockStoreNextId++) };
    const meta = metaStore[name] || {};
    Object.keys(meta).forEach(fieldName => {
      const el = document.querySelector(`[data-mockfield="${name}.${fieldName}"]`);
      record[fieldName] = el ? el.value ?? el.textContent ?? '' : '';
    });
    mockStore[name].push(record);
  });

  toast(`📦 mockStore에 레코드 추가됨 (총 ${models.map(n => `${n}: ${mockStore[n].length}건`).join(', ')})`, 'success');
  renderUiTestPreview();
}

function mockStoreView() {
  const viewer = document.getElementById('mockStoreViewer');
  viewer.textContent = JSON.stringify(mockStore, null, 2);
  document.getElementById('mockStoreModal').classList.add('show');
}

function mockStoreClear(modelName) {
  if (modelName) {
    delete mockStore[modelName];
    toast(`${modelName} 레코드 초기화`, 'info');
  } else {
    mockStore = {};
    toast('mockStore 전체 초기화', 'info');
  }
  renderUiTestPreview();
}

const UITEST_CONTEXTS = [
  { key: 'create', label: '생성폼',  role: 'showCreate' },
  { key: 'list',   label: '목록뷰',  role: 'showList' },
  { key: 'detail', label: '상세뷰',  role: 'showDetail' },
];

// uiHeaders에서 특정 역할 헤더 이름 찾기
function headerByRole(role) {
  return uiHeaders.find(h => h.uiRole === role);
}

function renderUiTestSidebar() {
  const sb = document.getElementById('uitestSidebar');
  if (!sb) return;

  const models = Object.keys(metaStore).filter(n => Object.keys(metaStore[n]).length > 0);

  let html = `<div class="excel-sidebar-title">UI생성테스트</div>`;

  // 컨텍스트 선택 (생성/목록/상세)
  html += `<div style="padding:8px 12px;display:flex;flex-direction:column;gap:3px;border-bottom:1px solid var(--border)">
    <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:2px">컨텍스트</div>
    ${UITEST_CONTEXTS.map(c => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 6px;border-radius:6px;${uitestViewContext === c.key ? 'background:var(--accent-dim);color:var(--accent);font-weight:600' : 'color:var(--text-primary)'}">
        <input type="radio" name="uitestCtx" value="${c.key}" ${uitestViewContext === c.key ? 'checked' : ''}
          onchange="uitestSetContext('${c.key}')" style="accent-color:var(--accent)">
        ${c.label}
      </label>`).join('')}
  </div>`;

  html += `<div style="padding:8px 16px 4px;font-size:10px;font-weight:700;color:var(--text-muted)">UI 모델</div>`;

  if (models.length === 0) {
    html += `<div style="padding:16px;font-size:12px;color:var(--text-muted);text-align:center">UI관리에서<br>모델을 설정하세요</div>`;
  } else {
    models.forEach(name => {
      const checked = uitestChecked.has(name);
      const vm = (uiModelConfig[name] || {}).viewMode || '1to1';
      const vmLabel = (VIEW_MODES.find(m => m.key === vm) || {}).label || vm;
      html += `<label class="excel-model-item" style="cursor:pointer;gap:8px;${checked ? 'background:var(--accent-dim);color:var(--accent)' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="uitestToggle('${name}')" style="accent-color:var(--accent);flex-shrink:0">
        <span style="font-weight:600">${name}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--accent2);font-weight:600">${vmLabel}</span>
      </label>`;
    });
  }

  sb.innerHTML = html;
}

function uitestToggle(name) {
  if (uitestChecked.has(name)) uitestChecked.delete(name);
  else uitestChecked.add(name);
  renderUiTestSidebar();
  renderUiTestPreview();
}

function uitestSetContext(ctx) {
  uitestViewContext = ctx;
  renderUiTestSidebar();
  renderUiTestPreview();
}

function renderUiTestPreview() {
  const title = document.getElementById('uitestTitle');
  const content = document.getElementById('uitestContent');
  if (!title || !content) return;

  if (uitestChecked.size === 0) {
    title.textContent = '모델 선택';
    content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">← 왼쪽에서 모델을 체크하세요</div>';
    return;
  }

  const checkedNames = [...uitestChecked];
  title.textContent = checkedNames.join(', ');

  const ctx = UITEST_CONTEXTS.find(c => c.key === uitestViewContext);
  const showHeader = headerByRole(ctx.role); // 노출 조건 헤더

  content.innerHTML = checkedNames.map(name => {
    const meta = metaStore[name] || {};
    const viewMode = (uiModelConfig[name] || {}).viewMode || '1to1';

    // 노출 조건 필터
    const rows = Object.entries(meta).filter(([, v]) => {
      if (!showHeader) return true; // 노출조건 헤더 없으면 전부 표시
      return v[showHeader.name] === 'true';
    });

    const sectionHeader = checkedNames.length > 1
      ? `<div style="font-size:12px;font-weight:700;color:var(--accent2);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--accent2)">${name}</div>`
      : '';

    if (rows.length === 0) {
      return `<div style="margin-bottom:32px">${sectionHeader}
        <div style="color:var(--text-muted);font-size:12px">표시할 필드 없음${showHeader ? ` — UI관리에서 <b>${showHeader.name} = true</b> 설정 필요` : ''}</div>
      </div>`;
    }

    // mockStore 레코드 현황
    const records = mockStore[name] || [];
    const recordBadge = records.length > 0
      ? `<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;background:var(--accent-dim);color:var(--accent);padding:3px 10px;border-radius:99px;font-weight:700">📦 저장된 레코드 ${records.length}건</span>
          <button class="btn" style="padding:2px 10px;font-size:11px" onclick="mockStoreClear('${name}')">초기화</button>
          <button class="btn" style="padding:2px 10px;font-size:11px" onclick="mockStoreView()">보기</button>
        </div>`
      : '';

    let body = '';
    if (uitestViewContext === 'list') body = renderExcelView(rows, name);
    else if (viewMode === 'excel') body = renderExcelView(rows, name);
    else body = renderForm1to1(rows, name);

    return `<div style="margin-bottom:40px">${sectionHeader}${recordBadge}${body}</div>`;
  }).join('');
}

// ── 1:1 폼 ─────────────────────────────────────────────
function renderForm1to1(rows, modelName) {
  const labelH    = headerByRole('label');
  const phH       = headerByRole('placeholder');
  const reqH      = headerByRole('required');
  const compH     = headerByRole('componentType');
  const widthH    = headerByRole('width');

  const fields = rows.map(([fieldName, meta]) => {
    const label    = (labelH    && meta[labelH.name])    || fieldName;
    const ph       = (phH       && meta[phH.name])       || '';
    const required = (reqH      && meta[reqH.name])      === 'true';
    const compType = (compH     && meta[compH.name])     || 'text';
    const width    = (widthH    && meta[widthH.name])    || '100%';
    const input    = buildInput(fieldName, meta, compType, ph, modelName);
    return `
      <div style="display:flex;flex-direction:column;gap:5px;width:${width}">
        <label style="font-size:13px;font-weight:600;color:var(--text-primary)">
          ${label}${required ? ' <span style="color:#e53e3e">*</span>' : ''}
        </label>
        ${ph ? `<div style="font-size:11px;color:var(--text-muted);margin-top:-3px">${ph}</div>` : ''}
        ${input}
      </div>`;
  }).join('');

  return `
    <div style="max-width:640px;display:flex;flex-direction:column;gap:20px">
      ${fields}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-accent" style="min-width:100px" onclick="mockStoreCreate()">📦 저장 → mockStore</button>
        <button class="btn">취소</button>
      </div>
    </div>`;
}

// ── 엑셀(테이블) 뷰 ─────────────────────────────────────
function renderExcelView(rows, modelName) {
  const labelH = headerByRole('label');
  const records = mockStore[modelName] || [];

  const ths = rows.map(([fn, meta]) =>
    `<th style="white-space:nowrap">${(labelH && meta[labelH.name]) || fn}</th>`
  ).join('');

  const bodyRows = records.length > 0
    ? records.map(rec => `<tr>${rows.map(([fn]) =>
        `<td style="font-size:12px">${rec[fn] !== undefined ? rec[fn] : '<span style="color:var(--text-muted)">—</span>'}</td>`
      ).join('')}</tr>`).join('')
    : `<tr><td colspan="${rows.length}" style="text-align:center;color:var(--text-muted);padding:20px;font-size:12px">저장된 레코드 없음 — 📦 mockStore 생성 버튼을 누르세요</td></tr>`;

  return `
    <table class="excel-table" style="width:100%">
      <thead><tr>${ths}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
}

// ── 인풋 빌더 ───────────────────────────────────────────
function buildInput(fieldName, meta, compType, ph, modelName) {
  const mockAttr = modelName ? `data-mockfield="${modelName}.${fieldName}"` : '';
  const base = `${mockAttr} style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;box-sizing:border-box"`;
  const t = (compType || '').toLowerCase();

  if (t === 'select' || t === 'combo') {
    const cbName = meta.comboboxName;
    const opts = (cbName && comboboxStore[cbName] || []).map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select ${base}><option value="">— 선택 —</option>${opts}</select>`;
  }
  if (meta.dataSource) {
    return `<select ${base}><option>— ${meta.dataSource} 선택 —</option></select>`;
  }
  if (t === 'date' || t === 'datetime') return `<input type="date" ${base}>`;
  if (t === 'number' || t === 'integer' || t === 'float') return `<input type="number" placeholder="${ph}" ${base}>`;
  if (t === 'boolean') return `<select ${base}><option value="">— 선택 —</option><option value="true">true</option><option value="false">false</option></select>`;
  if (t === 'textarea') return `<textarea rows="3" placeholder="${ph}" ${base}></textarea>`;

  return `<input type="text" placeholder="${ph}" ${base}>`;
}
