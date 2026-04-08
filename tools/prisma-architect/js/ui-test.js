// === UI생성테스트 ===
// metaStore + uiModelConfig 기반 실제 UI 렌더링 플레이그라운드

let uitestChecked = new Set();
let uitestViewContext = 'create'; // 'create' | 'list' | 'detail'

// mockStore: Zustand store 대체 (디버깅용 스냅샷)
// { [modelName]: [ { _id, ...fields } ] }
let mockStore = {};

// 엑셀 모드 상태
let uitestExcelRowCount = {}; // { modelName: number } — 현재 테이블 행 수
let uitestExcelData   = {}; // { modelName: [rowObj] } — 행 추가 전 데이터 보존

// ── mockStore 뷰어 ───────────────────────────────────────
function mockStoreView() {
  const viewer = document.getElementById('mockStoreViewer');
  viewer.textContent = JSON.stringify(mockStore, null, 2);
  document.getElementById('mockStoreModal').classList.add('show');
}

function mockStoreClear(modelName) {
  if (modelName) {
    delete mockStore[modelName];
    delete uitestExcelRowCount[modelName];
    delete uitestExcelData[modelName];
    toast(`${modelName} mockStore 초기화`, 'info');
  } else {
    mockStore = {};
    uitestExcelRowCount = {};
    uitestExcelData = {};
    toast('mockStore 전체 초기화', 'info');
  }
  renderUiTestPreview();
}

// ── mockStore 저장: 화면의 현재 데이터를 통째로 기록 ─────
function mockStoreCreate() {
  const models = [...uitestChecked];
  if (!models.length) { toast('먼저 모델을 선택하세요', 'error'); return; }

  models.forEach(name => {
    const viewMode  = (uiModelConfig[name] || {}).viewMode || '1to1';
    const isExcel   = uitestViewContext === 'list' || viewMode === 'excel';
    const meta      = metaStore[name] || {};

    if (isExcel) {
      // 엑셀 모드: 테이블 행 전체 → mockStore 교체
      const count   = uitestExcelRowCount[name] || 1;
      const records = [];
      for (let i = 0; i < count; i++) {
        const rec = { _id: String(i + 1) };
        Object.keys(meta).forEach(fn => {
          const el = document.querySelector(`[data-mockfield="${name}.${fn}.${i}"]`);
          rec[fn] = el ? (el.value ?? '') : '';
        });
        records.push(rec);
      }
      mockStore[name] = records;
    } else {
      // 폼 모드: 현재 폼 값 → mockStore append
      if (!mockStore[name]) mockStore[name] = [];
      const rec = { _id: String(Date.now()) };
      Object.keys(meta).forEach(fn => {
        const el = document.querySelector(`[data-mockfield="${name}.${fn}"]`);
        rec[fn] = el ? (el.value ?? '') : '';
      });
      mockStore[name].push(rec);
    }
  });

  const summary = models.map(n => `${n}: ${(mockStore[n] || []).length}건`).join(', ');
  toast(`📦 mockStore 저장됨 (${summary})`, 'success');
}

// ── 엑셀 모드 행 추가 ───────────────────────────────────
function uitestAddRow(modelName) {
  _captureExcelRows(modelName); // 현재 셀 값 보존
  uitestExcelRowCount[modelName] = (uitestExcelRowCount[modelName] || 1) + 1;
  renderUiTestPreview();
}

function _captureExcelRows(modelName) {
  const count = uitestExcelRowCount[modelName] || 1;
  const meta  = metaStore[modelName] || {};
  const rows  = [];
  for (let i = 0; i < count; i++) {
    const row = {};
    Object.keys(meta).forEach(fn => {
      const el = document.querySelector(`[data-mockfield="${modelName}.${fn}.${i}"]`);
      row[fn] = el ? (el.value ?? '') : '';
    });
    rows.push(row);
  }
  uitestExcelData[modelName] = rows;
}

// ────────────────────────────────────────────────────────
const UITEST_CONTEXTS = [
  { key: 'create', label: '생성폼',  role: 'showCreate' },
  { key: 'list',   label: '목록뷰',  role: 'showList'   },
  { key: 'detail', label: '상세뷰',  role: 'showDetail' },
];

function headerByRole(role) {
  return uiHeaders.find(h => h.uiRole === role);
}

// ── 사이드바 ────────────────────────────────────────────
function renderUiTestSidebar() {
  const sb = document.getElementById('uitestSidebar');
  if (!sb) return;

  const models = Object.keys(metaStore).filter(n => Object.keys(metaStore[n]).length > 0);

  let html = `<div class="excel-sidebar-title">UI생성테스트</div>`;

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
      const checked  = uitestChecked.has(name);
      const vm       = (uiModelConfig[name] || {}).viewMode || '1to1';
      const vmLabel  = (VIEW_MODES.find(m => m.key === vm) || {}).label || vm;
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

// ── 프리뷰 메인 ─────────────────────────────────────────
function renderUiTestPreview() {
  const title   = document.getElementById('uitestTitle');
  const content = document.getElementById('uitestContent');
  if (!title || !content) return;

  if (uitestChecked.size === 0) {
    title.textContent = '모델 선택';
    content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">← 왼쪽에서 모델을 체크하세요</div>';
    return;
  }

  const checkedNames = [...uitestChecked];
  title.textContent  = checkedNames.join(', ');

  const ctx        = UITEST_CONTEXTS.find(c => c.key === uitestViewContext);
  const showHeader = headerByRole(ctx.role);

  content.innerHTML = checkedNames.map(name => {
    const meta     = metaStore[name] || {};
    const viewMode = (uiModelConfig[name] || {}).viewMode || '1to1';
    const isExcel  = uitestViewContext === 'list' || viewMode === 'excel';

    // 노출 조건 필터
    const rows = Object.entries(meta).filter(([, v]) => {
      if (!showHeader) return true;
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

    // 폼 모드일 때만 상단 mockStore 배지 표시
    const records    = mockStore[name] || [];
    const recordBadge = !isExcel && records.length > 0
      ? `<div style="margin-bottom:12px;display:flex;align-items:center;gap:8px">
          <span style="font-size:11px;background:var(--accent-dim);color:var(--accent);padding:3px 10px;border-radius:99px;font-weight:700">📦 저장된 레코드 ${records.length}건</span>
          <button class="btn" style="padding:2px 10px;font-size:11px" onclick="mockStoreClear('${name}')">초기화</button>
          <button class="btn" style="padding:2px 10px;font-size:11px" onclick="mockStoreView()">보기</button>
        </div>`
      : '';

    const body = isExcel
      ? renderExcelView(rows, name)
      : renderForm1to1(rows, name);

    return `<div style="margin-bottom:40px">${sectionHeader}${recordBadge}${body}</div>`;
  }).join('');
}

// ── 1:1 폼 ─────────────────────────────────────────────
function renderForm1to1(rows, modelName) {
  const labelH = headerByRole('label');
  const phH    = headerByRole('placeholder');
  const reqH   = headerByRole('required');
  const compH  = headerByRole('componentType');
  const widthH = headerByRole('width');

  const fields = rows.map(([fieldName, meta]) => {
    const label    = (labelH && meta[labelH.name]) || fieldName;
    const ph       = (phH    && meta[phH.name])    || '';
    const required = (reqH   && meta[reqH.name])   === 'true';
    const compType = (compH  && meta[compH.name])  || 'text';
    const width    = (widthH && meta[widthH.name]) || '100%';
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
// 기본형: 최소 1행 편집 가능 테이블 + 우측 상단 행 추가 버튼
function renderExcelView(rows, modelName) {
  const labelH = headerByRole('label');

  // 행 수 초기화 (최소 1)
  if (!uitestExcelRowCount[modelName]) uitestExcelRowCount[modelName] = 1;
  const rowCount   = uitestExcelRowCount[modelName];

  // 초기값 우선순위: 행 추가 시 보존 데이터 > mockStore 데이터 > 빈값
  const savedData  = uitestExcelData[modelName] || [];
  const storeData  = mockStore[modelName] || [];

  const ths = rows.map(([fn, meta]) =>
    `<th style="white-space:nowrap">${(labelH && meta[labelH.name]) || fn}</th>`
  ).join('');

  const bodyRows = Array.from({ length: rowCount }, (_, i) => {
    const initData = savedData[i] || storeData[i] || {};
    return `<tr>${rows.map(([fn, meta]) => {
      const compH    = headerByRole('componentType');
      const compType = (compH && meta[compH.name]) || 'text';
      const phH      = headerByRole('placeholder');
      const ph       = (phH && meta[phH.name]) || '';
      return `<td style="padding:3px">${buildExcelCell(fn, meta, compType, ph, modelName, i, initData[fn])}</td>`;
    }).join('')}</tr>`;
  }).join('');

  const storeCount = storeData.length;
  const storeBadge = storeCount > 0
    ? `<span style="font-size:11px;background:var(--accent-dim);color:var(--accent);padding:2px 8px;border-radius:99px;font-weight:700">📦 저장됨 ${storeCount}건</span>`
    : '';

  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      ${storeBadge}
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn" style="padding:4px 14px;font-size:12px" onclick="uitestAddRow('${modelName}')">+ 행 추가</button>
        <button class="btn btn-accent" style="padding:4px 14px;font-size:12px" onclick="mockStoreCreate()">📦 mockStore 저장</button>
        <button class="btn" style="padding:4px 14px;font-size:12px" onclick="mockStoreView()">보기</button>
        ${storeCount > 0 ? `<button class="btn" style="padding:4px 14px;font-size:12px" onclick="mockStoreClear('${modelName}')">초기화</button>` : ''}
      </div>
    </div>
    <div style="overflow-x:auto">
      <table class="excel-table" style="width:100%">
        <thead><tr>${ths}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>`;
}

// ── 엑셀 셀 인풋 빌더 ───────────────────────────────────
function buildExcelCell(fieldName, meta, compType, ph, modelName, rowIdx, initVal) {
  const mockAttr = `data-mockfield="${modelName}.${fieldName}.${rowIdx}"`;
  const base = `${mockAttr} style="width:100%;padding:4px 7px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;box-sizing:border-box;min-width:80px"`;
  const val  = initVal !== undefined && initVal !== '' ? `value="${initVal}"` : '';
  const t    = (compType || '').toLowerCase();

  if (t === 'select' || t === 'combo') {
    const opts = ((meta.comboboxName && comboboxStore[meta.comboboxName]) || [])
      .map(o => `<option value="${o}" ${initVal === o ? 'selected' : ''}>${o}</option>`).join('');
    return `<select ${base}><option value="">—</option>${opts}</select>`;
  }
  if (meta.dataSource) {
    return `<select ${base}><option value="">— ${meta.dataSource} —</option></select>`;
  }
  if (t === 'date' || t === 'datetime') return `<input type="date" ${val} ${base}>`;
  if (t === 'number' || t === 'integer' || t === 'float') return `<input type="number" placeholder="${ph}" ${val} ${base}>`;
  if (t === 'boolean') return `<select ${base}><option value="">—</option><option value="true" ${initVal === 'true' ? 'selected' : ''}>true</option><option value="false" ${initVal === 'false' ? 'selected' : ''}>false</option></select>`;
  return `<input type="text" placeholder="${ph}" ${val} ${base}>`;
}

// ── 폼용 인풋 빌더 (1:1 폼 전용, 행 인덱스 없음) ────────
function buildInput(fieldName, meta, compType, ph, modelName) {
  const mockAttr = modelName ? `data-mockfield="${modelName}.${fieldName}"` : '';
  const base = `${mockAttr} style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;box-sizing:border-box"`;
  const t    = (compType || '').toLowerCase();

  if (t === 'select' || t === 'combo') {
    const opts = ((meta.comboboxName && comboboxStore[meta.comboboxName]) || [])
      .map(o => `<option value="${o}">${o}</option>`).join('');
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
