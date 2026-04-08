// === UI생성테스트 ===
// metaStore + uiModelConfig 기반 실제 UI 렌더링 플레이그라운드
// 셀 컴포넌트: cell.js의 CellComponents / buildCell / CellGrid 사용

let uitestChecked = new Set();
let uitestViewContext = 'create'; // 'create' | 'list' | 'detail'

// CellComponents에 prisma-architect 옵션 리졸버 주입
// (comboboxStore는 ui-panel.js에 정의된 전역)
CellComponents.configure({
  optionsResolver: (groupName) => (comboboxStore[groupName] || []),
});

// mockStore: Zustand store 대체 (디버깅용 스냅샷)
// { [modelName]: [ { _id, ...fields } ] }
let mockStore = {};

// 엑셀 모드 상태
let uitestExcelRowCount = {}; // { modelName: number } — 현재 테이블 행 수
let uitestExcelData   = {}; // { modelName: [rowObj] } — 행 추가 전 데이터 보존

// CellGrid 인스턴스 (렌더마다 교체)
let _cellGrids = [];

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
  _cellGrids.forEach(g => g.commit()); // 편집 중인 셀 먼저 확정
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
  _cellGrids.forEach(g => g.commit()); // 편집 중인 셀 확정
  _captureExcelRows(modelName);        // 현재 셀 값 보존
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

  // CellGrid 재초기화
  _cellGrids.forEach(g => g.destroy());
  _cellGrids = [];
  content.querySelectorAll('.excel-cell-grid').forEach(el => {
    // data-model 속성으로 모델명 식별
    const modelName = el.dataset.model;
    _cellGrids.push(new CellGrid(el, {
      onCommit: (row, col) => {
        if (!modelName) return;
        // 바뀐 필드명 추출 (data-mockfield = "ModelName.fieldName.rowIndex")
        const cell = el.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const mockfield = cell?.querySelector('[data-mockfield]')?.dataset?.mockfield || '';
        const parts = mockfield.split('.');
        if (parts.length < 2) return;
        const changedField = parts[1];
        runFunctions(modelName, changedField, row);
      },
    }));
  });
  // 첫 번째 그리드의 (0,0) 자동 선택
  if (_cellGrids.length) _cellGrids[0].select(0, 0);
}

// ── 1:1 폼 ─────────────────────────────────────────────
function renderForm1to1(rows, modelName) {
  const labelH  = headerByRole('label');
  const reqH    = headerByRole('required');
  const widthH  = headerByRole('width');
  const fnRoles = _buildFnRoles(modelName);

  const fields = rows.map(([fieldName, meta]) => {
    const label    = (labelH && meta[labelH.name]) || fieldName;
    const ph       = meta.commentary || '';
    const required = (reqH && meta[reqH.name]) === 'true';
    const width    = (widthH && meta[widthH.name]) || '100%';
    const input    = buildInput(fieldName, meta, modelName);
    if (input === '') return ''; // hidden 필드 스킵

    const role = fnRoles[fieldName];
    const bg = role === 'input'  ? 'background:rgba(72,187,120,.08);border-radius:8px;padding:8px;'
             : role === 'output' ? 'background:rgba(229,62,62,.08);border-radius:8px;padding:8px;'
             : '';

    return `
      <div style="display:flex;flex-direction:column;gap:5px;width:${width};${bg}">
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

// ── 함수 역할 맵 ────────────────────────────────────────────
// 모델의 각 필드가 함수와 어떤 관계인지 반환.
//   'input'  — FunctionRegistry 어딘가의 watch 목록에 포함 (인자 필드)
//   'output' — systemType === 'calculation' (결과 필드)
//   undefined — 함수와 무관
function _buildFnRoles(modelName) {
  const meta = metaStore[modelName] || {};
  const roles = {};
  Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
    if (fieldMeta.systemType === 'calculation') roles[fieldName] = 'output';
  });
  Object.keys(meta).forEach(fieldName => {
    if (roles[fieldName] === 'output') return;
    if (FunctionRegistry.findByWatch(fieldName).length > 0) roles[fieldName] = 'input';
  });
  return roles;
}

// ── 컴포넌트 타입 결정 (prisma-architect 도메인 전용) ────────
// systemType 우선, variableType 보조
// → cell.js의 CellComponents 키와 1:1 대응
function _resolveCompType(meta) {
  const sys  = (meta.systemType  || '').toLowerCase();
  const var_ = (meta.variableType || '').toLowerCase();
  if (sys) return sys;
  if (var_ === 'integer' || var_ === 'float') return 'number';
  if (var_ === 'date')     return 'date';
  if (var_ === 'datetime') return 'datetime';
  if (var_ === 'boolean')  return 'boolean';
  if (var_ === 'json')     return 'json';
  return 'text';
}

// ── 엑셀(테이블) 뷰 ─────────────────────────────────────
// buildCell (cell.js) 로 조립 — 타입 결정만 여기서, 렌더는 CellComponents
function renderExcelView(rows, modelName) {
  const labelH  = headerByRole('label');
  const fnRoles = _buildFnRoles(modelName);

  // hidden 필드 제외
  const visibleRows = rows.filter(([, meta]) => _resolveCompType(meta) !== 'hidden');

  if (!uitestExcelRowCount[modelName]) uitestExcelRowCount[modelName] = 1;
  const rowCount  = uitestExcelRowCount[modelName];
  const savedData = uitestExcelData[modelName] || [];
  const storeData = mockStore[modelName] || [];

  const ths = visibleRows.map(([fn, meta]) => {
    const role  = fnRoles[fn];
    const bg    = role === 'input'  ? 'background:rgba(72,187,120,.18);'
                : role === 'output' ? 'background:rgba(229,62,62,.12);'
                : '';
    const w     = `width:${parseInt(meta.width) || 120}px;`;
    return `<th style="${w}${bg}">${(labelH && meta[labelH.name]) || fn}</th>`;
  }).join('');

  const bodyRows = Array.from({ length: rowCount }, (_, ri) => {
    const initData = savedData[ri] || storeData[ri] || {};
    const cells = visibleRows.map(([fn, meta], ci) => {
      const role       = fnRoles[fn];
      const extraClass = role === 'input' ? 'cell--fn-input' : role === 'output' ? 'cell--fn-output' : '';
      return buildCell({
        type:       _resolveCompType(meta),
        value:      initData[fn] ?? '',
        meta,
        row:        ri,
        col:        ci,
        mockField:  `${modelName}.${fn}.${ri}`,
        extraClass,
      });
    }).join('');
    return `<tr>${cells}</tr>`;
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
      <div class="excel-cell-grid" data-model="${modelName}">
        <table class="excel-table" style="width:max-content;table-layout:fixed">
          <thead><tr>${ths}</tr></thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>`;
}

// ── 폼용 인풋 빌더 (1:1 폼 전용) ─────────────────────────
// CellComponents 타입 결정 + optionsResolver 활용,
// 폼 전용 스타일로 직접 구성 (renderInput 결과 조작 없음)
//
// 렌더 시점에 UI모델의 fnName/systemType 정보를 기반으로
// onchange 핸들러를 자동 연결 → fn-engine.js runFunctions 호출
function buildInput(fieldName, meta, modelName) {
  const type = _resolveCompType(meta);
  const comp = CellComponents[type] || CellComponents.text;
  if (comp.hidden) return '';

  const mf  = modelName ? `data-mockfield="${modelName}.${fieldName}"` : '';
  const ph  = meta.commentary || '';
  const ro  = comp.readonly;
  const s   = `width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;box-sizing:border-box${ro ? ';opacity:0.6;cursor:default' : ''}`;

  // readonly/calculation이 아닌 입력 필드에 fn 트리거 연결
  // runFunctions가 내부에서 watch 매핑을 확인하므로, 모든 입력 필드에 붙여도 무방
  const onChange = (!ro && modelName)
    ? `onchange="runFunctions('${modelName}','${fieldName}',null)"`
    : '';

  if (type === 'select' || type === 'combobox') {
    const opts = CellComponents._resolver(meta.comboboxName || '')
      .map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select ${mf} ${onChange} style="${s}"><option value="">— 선택 —</option>${opts}</select>`;
  }
  if (type === 'boolean') {
    return `<select ${mf} ${onChange} style="${s}"><option value="">— 선택 —</option><option value="true">true</option><option value="false">false</option></select>`;
  }
  if (type === 'date' || type === 'datetime') {
    return `<input type="date" ${mf} ${onChange} style="${s}">`;
  }
  if (type === 'number') {
    return `<input type="number" placeholder="${ph}" ${mf} ${onChange} style="${s}">`;
  }
  if (type === 'lookup_editable' && meta.dataSource) {
    return `<select ${mf} ${onChange} style="${s}"><option value="">— ${meta.dataSource} 선택 —</option></select>`;
  }
  if (type === 'json') {
    return `<textarea rows="3" placeholder="${ph}" ${mf} ${onChange} style="${s};font-family:monospace"></textarea>`;
  }
  // text, calculation, lookup_readonly, 기타
  return `<input type="text" placeholder="${ph}" ${mf} style="${s}" ${ro ? 'readonly' : ''} ${onChange}>`;
}
