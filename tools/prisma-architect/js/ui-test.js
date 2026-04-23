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

// mockStore: Zustand store 대체 — 셀 확정(onCommit/onchange) 시 자동 업데이트
// { [modelName]: [ { _id, ...fields } ] }
let mockStore = {};

// 엑셀 모드 상태
let uitestExcelRowCount = {}; // { modelName: number } — 현재 테이블 행 수
// 소수점 자릿수: { 'ModelName.fieldName': number } — calculation/calculation_editable 컬럼별
let uitestDecimalPlaces = {};

// CellGrid 인스턴스 (렌더마다 교체)
let _cellGrids = [];

// ── 스토어 자동 업데이트 ─────────────────────────────────
// 호출 시점: 엑셀 onCommit / 폼 onchange / 함수 결과(_updateCell)
// rowIndex: null = 1:1 폼(index 0), number = 엑셀 행 번호
function _autoStoreSet(modelName, fieldName, rowIndex, value) {
  if (!mockStore[modelName]) mockStore[modelName] = [];
  const idx = (rowIndex === null || rowIndex === undefined) ? 0 : rowIndex;
  if (!mockStore[modelName][idx]) mockStore[modelName][idx] = { _id: String(idx + 1) };
  mockStore[modelName][idx][fieldName] = value;
}

// ── mockStore 뷰어 ───────────────────────────────────────
// 현재 테스트 화면에 체크된 모델은 전체 필드 셰이프를 채워 표시 (값 없으면 "")
// 체크 안 된 모델은 기존 저장값 그대로.
function mockStoreView() {
  const viewer = document.getElementById('mockStoreViewer');
  const view = JSON.parse(JSON.stringify(mockStore || {}));

  (uitestChecked instanceof Set ? [...uitestChecked] : []).forEach(modelName => {
    const model = (schema.models || []).find(m => m.name === modelName);
    if (!model) return;
    const fieldNames = model.fields.map(f => f.name);
    if (!Array.isArray(view[modelName])) view[modelName] = [];
    if (view[modelName].length === 0) view[modelName].push({ _id: '1' });
    view[modelName] = view[modelName].map((row, i) => {
      const filled = { _id: row?._id ?? String(i + 1) };
      fieldNames.forEach(fn => { filled[fn] = row?.[fn] ?? ''; });
      return filled;
    });
  });

  viewer.textContent = JSON.stringify(view, null, 2);
  document.getElementById('mockStoreModal').classList.add('show');
}

function mockStoreClear(modelName) {
  if (modelName) {
    delete mockStore[modelName];
    delete uitestExcelRowCount[modelName];
    toast(`${modelName} 스토어 초기화`, 'info');
  } else {
    mockStore = {};
    uitestExcelRowCount = {};
    toast('스토어 전체 초기화', 'info');
  }
  renderUiTestPreview();
}

// ── 소수점 표시 헬퍼 ────────────────────────────────────
// 컬럼 내 실제 값들을 분석해 통일 자릿수 결정
// - 기준: 설정 자릿수(maxSetting) 안에서 가장 많은 소수 자리가 필요한 값에 맞춤
// - 모두 정수이면 소수점 없이 표시 (4.00 → 4)
function _getColumnDisplayPlaces(modelName, fieldName) {
  const maxSetting = uitestDecimalPlaces[`${modelName}.${fieldName}`] ?? 2;
  const store = mockStore[modelName] || [];
  let maxActual = 0;
  store.forEach(row => {
    const raw = row?.[fieldName];
    if (raw === undefined || raw === null || raw === '') return;
    const n = parseFloat(raw);
    if (isNaN(n)) return;
    const fixed = n.toFixed(maxSetting);
    const dot = fixed.indexOf('.');
    if (dot < 0) return;
    const sigDecimals = fixed.slice(dot + 1).replace(/0+$/, '').length;
    maxActual = Math.max(maxActual, sigDecimals);
  });
  return maxActual;
}

// 단일 값 → 표시 문자열 (store는 항상 raw 숫자 유지, 표시만 포매팅)
function _calcDisplayVal(modelName, fieldName, rawVal) {
  const n = parseFloat(rawVal);
  if (isNaN(n)) return String(rawVal ?? '');
  const places = _getColumnDisplayPlaces(modelName, fieldName);
  return places === 0 ? String(Math.round(n * 1e10) / 1e10) : n.toFixed(places);
}

// 렌더 후 calculation 컬럼 전체에 포매팅 적용 (DOM 갱신만, store 불변)
function _applyAllDecimalFormatting() {
  const CALC_TYPES = new Set(['calculation_readonly', 'calculation_editable']);
  [...uitestChecked].forEach(modelName => {
    const meta = metaStore[modelName] || {};
    Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
      if (!CALC_TYPES.has(_resolveCompType(fieldMeta))) return;
      const store = mockStore[modelName] || [];
      store.forEach((row, ri) => {
        const raw = row?.[fieldName];
        if (raw === undefined || raw === null || raw === '') return;
        const input = document.querySelector(`[data-mockfield="${modelName}.${fieldName}.${ri}"]`);
        if (!input) return;
        const td   = input.closest('td.cell');
        if (!td) return;
        const disp = td.querySelector('.cell-display');
        const formatted = _calcDisplayVal(modelName, fieldName, raw);
        if (disp) disp.textContent = formatted;
        // input.value는 raw 유지 (calculation_editable 편집 시 원래 숫자 보이게)
      });
    });
  });
}

// ── 소수점 자릿수 변경 ───────────────────────────────────
function uitestChangeDecimal(modelName, fieldName, delta) {
  const key = `${modelName}.${fieldName}`;
  const cur = uitestDecimalPlaces[key] ?? 2;
  uitestDecimalPlaces[key] = Math.max(0, Math.min(8, cur + delta));
  // 헤더 숫자 즉시 갱신 + 컬럼 재포매팅 (전체 리렌더 없이)
  const header = document.querySelector(`[data-decimal-key="${key}"]`);
  if (header) header.textContent = uitestDecimalPlaces[key];
  _applyAllDecimalFormatting();
}

// ── 기본값 적용 ──────────────────────────────────────────
// metaStore[modelName][fieldName].defaultValue → mockStore 행 초기화
// 이미 값이 있는 필드는 덮어쓰지 않음
function _applyDefaultValues(modelName, rowIdx) {
  const meta = metaStore[modelName] || {};
  Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
    const dv = fieldMeta.defaultValue;
    if (dv === undefined || dv === null || dv === '') return;
    // 이미 값이 있으면 스킵 (행 수정 시 덮어쓰기 방지)
    if (mockStore[modelName]?.[rowIdx]?.[fieldName] !== undefined &&
        mockStore[modelName][rowIdx][fieldName] !== '') return;
    _autoStoreSet(modelName, fieldName, rowIdx, String(dv));
  });
}

// ── 엑셀 모드 행 추가 ───────────────────────────────────
// 편집 중인 셀을 확정(→ onCommit → _autoStoreSet)한 뒤 행 수 증가
function uitestAddRow(modelName) {
  _cellGrids.forEach(g => g.commit());
  const newIdx = uitestExcelRowCount[modelName] || 1; // 0-based: 현재 행 수 = 새 행 인덱스
  uitestExcelRowCount[modelName] = newIdx + 1;
  _applyDefaultValues(modelName, newIdx);
  renderUiTestPreview();
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

    const body = isExcel
      ? renderExcelView(rows, name)
      : renderForm1to1(rows, name);

    return `<div style="margin-bottom:40px">${sectionHeader}${body}</div>`;
  }).join('');

  // CellGrid 재초기화
  _cellGrids.forEach(g => g.destroy());
  _cellGrids = [];
  content.querySelectorAll('.excel-cell-grid').forEach(el => {
    // data-model 속성으로 모델명 식별
    const modelName = el.dataset.model;
    _cellGrids.push(new CellGrid(el, {
      onCommit: (row, col, val) => {
        if (!modelName) return;
        const cell = el.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const mockfield = cell?.querySelector('[data-mockfield]')?.dataset?.mockfield || '';
        const parts = mockfield.split('.');
        if (parts.length < 2) return;
        const changedField = parts[1];
        _autoStoreSet(modelName, changedField, row, val);
        runOnChange(modelName, changedField, row);
        // db_select / db_combobox: 같은 dbTable 참조 필드 자동 동기
        const fSysType = ((metaStore[modelName] || {})[changedField] || {}).systemType || '';
        if (fSysType === 'db_select' || fSysType === 'db_combobox') {
          runAutoDbSync(modelName, changedField, row);
        }
      },
      onSelect: (row, col) => {
        if (!modelName) return;
        const cell = el.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        const mockfield = cell?.querySelector('[data-mockfield]')?.dataset?.mockfield || '';
        const parts = mockfield.split('.');
        if (parts.length < 2) return;
        const fieldName = parts[1];
        runOnClick(modelName, fieldName, row);
      },
    }));
  });
  // 첫 번째 그리드의 (0,0) 자동 선택
  if (_cellGrids.length) _cellGrids[0].select(0, 0);

  // calculation 컬럼 소수점 포매팅 적용 (store는 raw, display만 포매팅)
  _applyAllDecimalFormatting();

  // headerControl: 초기 렌더 시 각 모델의 watch 필드 값 기준으로 visibility 계산
  //   onChange 트리거를 기다리지 않고도 첫 그림에서 Shape별 컬럼 정리가 되도록
  checkedNames.forEach(name => {
    const modelMeta = metaStore[name] || {};
    Object.values(FunctionRegistry._store).forEach(def => {
      if (!def.headerControl) return;
      const watchField = (def.watch || [])[0];
      if (!watchField || !(watchField in modelMeta)) return;
      const fnName = Object.keys(FunctionRegistry._store).find(k => FunctionRegistry._store[k] === def);
      if (fnName && typeof _executeHeaderControl === 'function') {
        _executeHeaderControl(name, fnName, null);
      }
    });
    if (typeof _applyHeaderVisibility === 'function') _applyHeaderVisibility(name);
  });
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
      <div data-col-key="${modelName}.${fieldName}" style="display:flex;flex-direction:column;gap:5px;width:${width};${bg}">
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
        <button class="btn" onclick="mockStoreClear('${modelName}')">초기화</button>
      </div>
    </div>`;
}

// ── 함수 역할 맵 ────────────────────────────────────────────
// 모델의 각 필드가 함수와 어떤 관계인지 반환.
//   'input'  — FunctionRegistry 어딘가의 watch 목록에 포함 (인자 필드)
//   'output' — systemType === 'calculation_readonly' (결과 필드)
//   undefined — 함수와 무관
function _buildFnRoles(modelName) {
  const meta = metaStore[modelName] || {};
  const roles = {};

  // calculation_readonly 필드 → output
  Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
    if (fieldMeta.systemType === 'calculation_readonly') roles[fieldName] = 'output';
  });

  // lookup outputFields → output
  Object.values(FunctionRegistry._store).forEach(def => {
    if (!def.outputFields) return;
    def.outputFields.forEach(f => { if (meta[f]) roles[f] = 'output'; });
  });

  // watch 필드 → input (output이 아닌 것만)
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

  if (!uitestExcelRowCount[modelName]) {
    uitestExcelRowCount[modelName] = 1;
    _applyDefaultValues(modelName, 0); // 첫 번째 행 기본값 적용
  }
  const rowCount  = uitestExcelRowCount[modelName];
  const storeData = mockStore[modelName] || [];

  const CALC_TYPES = new Set(['calculation_readonly', 'calculation_editable']);

  // 버튼 행 (calculation 컬럼만 표시, 나머지는 빈 th)
  const btnRow = visibleRows.map(([fn, meta]) => {
    const compType = _resolveCompType(meta);
    const w  = `width:${parseInt(meta.width) || 120}px;`;
    const ck = `data-col-key="${modelName}.${fn}"`;
    if (CALC_TYPES.has(compType)) {
      const key    = `${modelName}.${fn}`;
      const places = uitestDecimalPlaces[key] ?? 2;
      return `<th ${ck} style="${w}padding:2px 4px;border-bottom:none">
        <div style="display:inline-flex;align-items:center;gap:2px;font-size:10px;font-weight:400;color:var(--text-muted)">
          <button onclick="uitestChangeDecimal('${modelName}','${fn}',-1)" style="border:1px solid var(--border);background:var(--bg-primary);border-radius:3px;cursor:pointer;padding:0 5px;line-height:1.6;color:var(--text-primary)">−</button>
          <span data-decimal-key="${key}" style="min-width:16px;text-align:center">${places}</span>
          <button onclick="uitestChangeDecimal('${modelName}','${fn}',+1)" style="border:1px solid var(--border);background:var(--bg-primary);border-radius:3px;cursor:pointer;padding:0 5px;line-height:1.6;color:var(--text-primary)">+</button>
        </div>
      </th>`;
    }
    return `<th ${ck} style="${w}border-bottom:none;padding:2px"></th>`;
  }).join('');

  // 라벨 행
  const ths = visibleRows.map(([fn, meta]) => {
    const role = fnRoles[fn];
    const bg   = role === 'input'  ? 'background:rgba(72,187,120,.18);'
               : role === 'output' ? 'background:rgba(229,62,62,.12);'
               : '';
    const w    = `width:${parseInt(meta.width) || 120}px;`;
    const label = (labelH && meta[labelH.name]) || fn;
    return `<th data-col-key="${modelName}.${fn}" style="${w}${bg}">${label}</th>`;
  }).join('');

  const bodyRows = Array.from({ length: rowCount }, (_, ri) => {
    const initData = storeData[ri] || {};
    const cells = visibleRows.map(([fn, meta], ci) => {
      const role       = fnRoles[fn];
      const extraClass = role === 'input' ? 'cell--fn-input' : role === 'output' ? 'cell--fn-output' : '';
      const cellHtml   = buildCell({
        type:       _resolveCompType(meta),
        value:      initData[fn] ?? '',
        meta,
        row:        ri,
        col:        ci,
        mockField:  `${modelName}.${fn}.${ri}`,
        extraClass,
      });
      // data-col-key를 <td>에 주입 (헤더 visibility 연동)
      return cellHtml.replace(/^<td\b/, `<td data-col-key="${modelName}.${fn}"`);
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  return `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap">
      <div style="margin-left:auto;display:flex;gap:6px">
        <button class="btn" style="padding:4px 14px;font-size:12px" onclick="uitestAddRow('${modelName}')">+ 행 추가</button>
        <button class="btn" style="padding:4px 14px;font-size:12px" onclick="mockStoreClear('${modelName}')">초기화</button>
      </div>
    </div>
    <div style="overflow-x:auto">
      <div class="excel-cell-grid" data-model="${modelName}">
        <table class="excel-table" style="width:max-content;table-layout:fixed">
          <thead><tr>${btnRow}</tr><tr>${ths}</tr></thead>
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

  // readonly/calculation이 아닌 입력 필드: 스토어 자동 업데이트 + fn 트리거
  const isDbType = type === 'db_select' || type === 'db_combobox';
  const commitExpr = `_autoStoreSet('${modelName}','${fieldName}',null,this.value);runOnChange('${modelName}','${fieldName}',null)${isDbType ? `;runAutoDbSync('${modelName}','${fieldName}',null)` : ''}`;
  const onChange = (!ro && modelName) ? `onchange="${commitExpr}"` : '';
  // datalist: change는 blur 때만 터지므로 input + 옵션 매칭으로 즉시 커밋
  const onInputDatalist = (!ro && modelName)
    ? `oninput="if([...(document.getElementById(this.getAttribute('list'))?.options||[])].some(o=>o.value===this.value)){${commitExpr}}"`
    : '';

  if (type === 'select' || type === 'combobox') {
    const opts = CellComponents._resolver(meta.comboboxName || '')
      .map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select ${mf} ${onChange} style="${s}"><option value="">— 선택 —</option>${opts}</select>`;
  }
  if (type === 'db_select') {
    const vals = CellComponents._dbResolver(meta.dbTable || '', meta.dbColumn || '');
    const opts = vals.map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select ${mf} ${onChange} style="${s}"><option value="">— 선택 —</option>${opts}</select>`;
  }
  if (type === 'db_combobox') {
    const vals = CellComponents._dbResolver(meta.dbTable || '', meta.dbColumn || '');
    const listId = `dbl_${meta.dbTable || 'x'}_${meta.dbColumn || 'y'}`;
    const opts = vals.map(o => `<option value="${o}">`).join('');
    return `<input type="text" list="${listId}" ${mf} ${onChange} ${onInputDatalist} style="${s}" autocomplete="off" placeholder="${ph}">` +
           `<datalist id="${listId}">${opts}</datalist>`;
  }
  if (type === 'dynamic_select') {
    // meta.dbTable+dbColumn 있으면 mockStore에서 즉시 옵션 생성, 없으면 Options 함수가 채움
    const vals = (meta.dbTable && meta.dbColumn)
      ? CellComponents._mockResolver(meta.dbTable, meta.dbColumn) : [];
    const opts = vals.map(o => `<option value="${o}">${o}</option>`).join('');
    return `<select ${mf} ${onChange} style="${s}"><option value="">— 선택 —</option>${opts}</select>`;
  }
  if (type === 'dynamic_combobox') {
    const listId = `dynlist_${modelName}_${fieldName}`;
    const vals = (meta.dbTable && meta.dbColumn)
      ? CellComponents._mockResolver(meta.dbTable, meta.dbColumn) : [];
    const opts = vals.map(o => `<option value="${o}">`).join('');
    return `<input type="text" list="${listId}" ${mf} ${onChange} ${onInputDatalist} style="${s}" autocomplete="off" placeholder="${ph}">` +
           `<datalist id="${listId}">${opts}</datalist>`;
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
  // text, calculation_readonly, lookup_readonly, 기타
  return `<input type="text" placeholder="${ph}" ${mf} style="${s}" ${ro ? 'readonly' : ''} ${onChange}>`;
}
