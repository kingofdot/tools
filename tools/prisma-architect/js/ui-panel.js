// === UI 관리 (필드 메타 테이블) ===

// UI역할 정의
const UI_ROLES = [
  { key: 'none',          label: '없음' },
  { key: 'label',         label: '라벨' },
  { key: 'placeholder',   label: '플레이스홀더' },
  { key: 'required',      label: '필수여부' },
  { key: 'showCreate',    label: '노출:생성' },
  { key: 'showList',      label: '노출:목록' },
  { key: 'showDetail',    label: '노출:상세' },
  { key: 'componentType', label: '컴포넌트타입' },
  { key: 'width',         label: '너비' },
];

// 뷰모드 정의
const VIEW_MODES = [
  { key: '1to1', label: '1:1폼' },
  { key: 'excel', label: '엑셀' },
  { key: 'card',  label: '카드' },
];

// 시스템타입 스토어
let systemTypeStore = [
  { key: 'text',                 desc: '사용자 직접 입력, 제한 없음' },
  { key: 'number',               desc: '숫자' },
  { key: 'date',                 desc: '날짜' },
  { key: 'select',               desc: '목록에서 선택 (수정 불가)' },
  { key: 'combobox',             desc: '목록에서 선택 (수정 가능)' },
  { key: 'boolean',              desc: '참 그리고 거짓' },
  { key: 'db_select',            desc: 'DB 테이블에서 옵션 목록을 불러와 선택 (수정 불가)' },
  { key: 'db_combobox',          desc: 'DB 테이블에서 옵션 목록을 불러와 선택 (수정 가능)' },
  { key: 'dynamic_select',       desc: '함수가 동적으로 결정하는 선택지에서 선택 (수정 불가)' },
  { key: 'dynamic_combobox',     desc: '함수가 동적으로 결정하는 선택지에서 선택 (수정 가능)' },
  { key: 'calculation_readonly', desc: '계산되는 값, 수정 불가' },
  { key: 'calculation_editable', desc: '계산되는 값, 수정 가능' },
  { key: 'lookup_editable',      desc: '일정 값에 따라 로딩되는 값, 수정 가능' },
  { key: 'lookup_readonly',      desc: '일정 값에 따라 로딩되는 값, 수정 불가' },
  { key: 'hidden',               desc: 'UI에선 보이지 않음' },
];

// 배리어블타입 스토어 (필드의 데이터/변수 타입)
let variableTypeStore = [
  { key: 'text',     desc: '텍스트 (문자열)' },
  { key: 'integer',  desc: '정수' },
  { key: 'float',    desc: '소수 (부동소수점)' },
  { key: 'date',     desc: '날짜 (YYYY-MM-DD)' },
  { key: 'datetime', desc: '날짜+시간' },
  { key: 'boolean',  desc: '참/거짓' },
  { key: 'json',     desc: 'JSON 객체' },
];

// 콤보박스 스토어: { groupName: ['option1', 'option2', ...] }
let comboboxStore = {};
let selectedComboboxGroup = null;

// 함수 스토어: [{ name, desc, params: [{name, desc}], outputType, outputDesc }]
let functionStore = [];
let selectedFunctionIdx = null;

let uiHeaders = [
  { name: 'label',             label: '라벨',    desc: '화면에 표시되는 필드 라벨 텍스트',                      type: 'text',    options: [],               uiRole: 'label' },
  { name: 'commentary',        label: '설명',    desc: '입력창 placeholder 텍스트',                           type: 'text',    options: [],               uiRole: 'placeholder' },
  { name: 'isRequired',        label: '필수',    desc: '필수 입력 여부 (* 표시)',                               type: 'combo',   options: ['true','false'], uiRole: 'required' },
  { name: 'initialCreation',   label: '최초생성', desc: '최초 생성 화면에 표시할 필드 여부',                     type: 'combo',   options: ['true','false'], uiRole: 'showCreate' },
  { name: 'showNode',          label: '목록',    desc: '목록 뷰에서 컬럼 표시 여부',                            type: 'combo',   options: ['true','false'], uiRole: 'showList' },
  { name: 'showNodeDetail',    label: '상세',    desc: '상세 화면에서 표시 여부',                               type: 'combo',   options: ['true','false'], uiRole: 'showDetail' },
  { name: 'systemType',        label: '위젯',    desc: '셀 위젯 타입 (text / select / calculation ...)',       type: 'combo',   options: [],               uiRole: 'none' },
  { name: 'variableType',      label: '변수',    desc: 'DB 저장 변수 타입 (text / integer / float ...)',       type: 'combo',   options: [],               uiRole: 'componentType' },
  { name: 'width',             label: '너비',    desc: '컬럼 너비 (px)',                                      type: 'text',    options: [],               uiRole: 'width' },
  { name: 'defaultValue',      label: '기본값',  desc: '초기 기본값',                                          type: 'text',    options: [],               uiRole: 'none' },
  { name: 'comboboxName',      label: '콤보그룹', desc: 'select/combobox 옵션 그룹 키 → comboboxStore 조회',   type: 'combo',   options: [],               uiRole: 'none' },
  { name: 'dbTable',           label: 'DB테이블', desc: 'db_ 타입에서 참조할 데이터 테이블명',                   type: 'text',    options: [],               uiRole: 'none' },
  { name: 'dbColumn',          label: 'DB컬럼',  desc: 'dbTable에서 목록으로 쓸 컬럼명',                       type: 'text',    options: [],               uiRole: 'none' },
  { name: 'syncGroup',         label: '동기그룹', desc: '같은 그룹명끼리 양방향 자동 연동 (wasteCode↔wasteName)', type: 'text',    options: [],               uiRole: 'none' },
  { name: 'dataSource',        label: '출처모델', desc: '다른 모델에서 빌려온 필드 (UI 조립용, 데이터 중복 방지)', type: 'model',   options: [],               uiRole: 'none' },
  { name: 'creationConditions',label: '표시조건', desc: '동적 show/hide 조건식',                               type: 'text',    options: [],               uiRole: 'none' },
  { name: 'onClick',           label: 'onClick', desc: '셀 클릭(선택) 시 실행할 함수',                          type: 'trigger', options: [],               uiRole: 'none' },
  { name: 'onChange',          label: 'onChange',desc: '값 확정(commit) 시 실행할 함수',                       type: 'trigger', options: [],               uiRole: 'none' },
  { name: 'focusOut',          label: 'focusOut',desc: '포커스 이탈 시 실행할 함수',                            type: 'trigger', options: [],               uiRole: 'none' },
  { name: 'realtime',          label: '실시간',  desc: '타이핑 중 실시간으로 실행할 함수',                       type: 'trigger', options: [],               uiRole: 'none' },
];

// ── 시스템타입별 컬럼 힌트 ────────────────────────────────
// highlight: 이 타입에서 반드시 채워야 할 컬럼 (강조)
// dim:       이 타입과 관계없는 컬럼 (흐리게)
const SYSTEM_TYPE_HINTS = {
  text: {
    highlight: [],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource'],
  },
  number: {
    highlight: [],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource'],
  },
  date: {
    highlight: [],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource'],
  },
  select: {
    highlight: ['comboboxName'],
    dim: ['dbTable','dbColumn','syncGroup','dataSource','variableType'],
  },
  combobox: {
    highlight: ['comboboxName'],
    dim: ['dbTable','dbColumn','syncGroup','dataSource','variableType'],
  },
  db_select: {
    highlight: ['dbTable','dbColumn','syncGroup'],
    dim: ['comboboxName','dataSource','variableType'],
  },
  db_combobox: {
    highlight: ['dbTable','dbColumn','syncGroup'],
    dim: ['comboboxName','dataSource','variableType'],
  },
  boolean: {
    highlight: [],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource'],
  },
  dynamic_select: {
    highlight: ['onClick'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource','variableType'],
  },
  dynamic_combobox: {
    highlight: ['onClick'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource','variableType'],
  },
  calculation_readonly: {
    highlight: ['onChange'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource','isRequired','defaultValue','variableType','onClick','focusOut','realtime'],
  },
  calculation_editable: {
    highlight: ['onChange'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource','isRequired','defaultValue','variableType','onClick','focusOut','realtime'],
  },
  lookup_readonly: {
    highlight: ['dbTable','dbColumn'],
    dim: ['comboboxName','dataSource','syncGroup','isRequired','defaultValue'],
  },
  lookup_editable: {
    highlight: ['dbTable','dbColumn'],
    dim: ['comboboxName','dataSource','syncGroup'],
  },
  hidden: {
    highlight: [],
    dim: ['label','commentary','isRequired','variableType','width','defaultValue','comboboxName',
          'dbTable','dbColumn','syncGroup','dataSource','creationConditions',
          'onClick','onChange','focusOut','realtime','initialCreation','showNode','showNodeDetail'],
  },
};

// systemType 변경 시 variableType 자동 세팅
const SYSTEM_TYPE_AUTO_VAR = {
  select:   'text',
  combobox: 'text',
  number:   'integer',
  date:     'date',
  datetime: 'datetime',
  boolean:  'boolean',
  hidden:   '',
};

// systemType 선택 → 해당 행 컬럼 강조/흐리기 적용
function applySystemTypeStyles(fieldName, sysType) {
  const hints = SYSTEM_TYPE_HINTS[sysType] || { highlight: [], dim: [] };
  // data-field 속성으로 행 찾기 (dots 포함 이름 대응)
  let row = null;
  document.querySelectorAll('#uiMetaTable tr[data-field]').forEach(r => {
    if (r.dataset.field === fieldName) row = r;
  });
  if (!row) return;

  uiHeaders.forEach(h => {
    const inner = row.querySelector(`[data-col="${h.name}"]`);
    const td = inner?.closest('td');
    if (!td) return;

    if (hints.highlight.includes(h.name)) {
      td.style.background   = 'var(--accent-dim)';
      td.style.outline      = '2px solid var(--accent)';
      td.style.outlineOffset = '-2px';
      td.style.opacity      = '1';
    } else if (hints.dim.includes(h.name)) {
      td.style.background   = '';
      td.style.outline      = '';
      td.style.opacity      = '0.2';
    } else {
      td.style.background   = '';
      td.style.outline      = '';
      td.style.opacity      = '1';
    }
  });
}

// systemType select onchange 핸들러
function onSystemTypeChange(fieldName, sysType) {
  if (!selectedUiModel) return;
  if (!metaStore[selectedUiModel])          metaStore[selectedUiModel] = {};
  if (!metaStore[selectedUiModel][fieldName]) metaStore[selectedUiModel][fieldName] = {};
  metaStore[selectedUiModel][fieldName].systemType = sysType;

  // variableType 자동 세팅
  if (sysType in SYSTEM_TYPE_AUTO_VAR) {
    const autoVar = SYSTEM_TYPE_AUTO_VAR[sysType];
    metaStore[selectedUiModel][fieldName].variableType = autoVar;
    let row = null;
    document.querySelectorAll('#uiMetaTable tr[data-field]').forEach(r => {
      if (r.dataset.field === fieldName) row = r;
    });
    const vtSel = row?.querySelector('[data-col="variableType"]');
    if (vtSel?.tagName === 'SELECT') vtSel.value = autoVar;
  }

  applySystemTypeStyles(fieldName, sysType);
}

// 동적 헤더 옵션 동기화 (systemType, variableType, comboboxName은 각 스토어에서 실시간 참조)
function syncDynamicHeaderOptions() {
  const st = uiHeaders.find(h => h.name === 'systemType');
  if (st) { st.type = 'combo'; st.options = systemTypeStore.map(t => t.key); }
  const vt = uiHeaders.find(h => h.name === 'variableType');
  if (vt) { vt.type = 'combo'; vt.options = variableTypeStore.map(t => t.key); }
  const cb = uiHeaders.find(h => h.name === 'comboboxName');
  if (cb) { cb.type = 'combo'; cb.options = Object.keys(comboboxStore); }
  // 트리거 컬럼: type 고정 (렌더 시 functionStore 직접 참조)
  ['onClick','onChange','focusOut','realtime'].forEach(triggerName => {
    const h = uiHeaders.find(h => h.name === triggerName);
    if (h) { h.type = 'trigger'; }
  });
}

// metaStore: { [modelName]: { [fieldName]: { [header]: value } } }
let metaStore = {};
// rowOrderStore: { [modelName]: [fieldName, ...] }
let rowOrderStore = {};
let selectedUiModel = null;

// ── 조립모델 스토어 ───────────────────────────────────────────────────────
// { screenName: { label, styles:{...}, layout: [{..., styles:{...}}], flows: [...] } }
let assemblyStore = {};
let selectedAssemblyScreen = null;
let _asmStylePanelIdx = null; // 패널 스타일 확장 행이 열린 인덱스 (null=닫힘)

// 헤더(컬럼) 동적 표시/숨김 상태
// { [modelName]: { [fieldName]: true(숨김) | false(표시) } }
// - 런타임 상태 (저장 불필요) — headerControl 함수 실행 시 갱신
let headerVisibilityStore = {};

function renderUiSidebar() {
  const sb = document.getElementById('uiSidebar');
  sb.innerHTML = '<div class="excel-sidebar-title">UI 관리</div>';

  const MGMT_ITEMS = [
    { key: null,             icon: '⚙️', label: '헤더 관리' },
    { key: '__systemType__', icon: '🔖', label: '시스템타입 관리' },
    { key: '__varType__',    icon: '🧩', label: '배리어블타입 관리' },
    { key: '__combobox__',   icon: '🔽', label: '콤보박스 관리' },
    { key: '__functions__',  icon: '⚡', label: '함수 관리' },
    { key: '__masterdata__', icon: '🗄️', label: '데이터 관리' },
    { key: '__assembly__',   icon: '🖥️', label: '조립모델 관리' },
  ];
  MGMT_ITEMS.forEach(item => {
    const d = document.createElement('div');
    d.className = 'excel-model-item' + (selectedUiModel === item.key ? ' active' : '');
    d.innerHTML = `<span style="font-size:14px">${item.icon}</span> ${item.label}`;
    d.onclick = () => { selectedUiModel = item.key; renderUiSidebar(); renderUiTable(); };
    sb.appendChild(d);
  });

  const sep = document.createElement('div');
  sep.style.cssText = 'height:1px;background:var(--border);margin:4px 0';
  sb.appendChild(sep);

  const modelLabel = document.createElement('div');
  modelLabel.className = 'excel-sidebar-title';
  modelLabel.style.cssText = 'padding:8px 16px 4px;font-size:10px';
  modelLabel.textContent = 'MODELS';
  sb.appendChild(modelLabel);

  schema.models.forEach(m => {
    const d = document.createElement('div');
    d.className = 'excel-model-item' + (selectedUiModel === m.name ? ' active' : '');
    d.innerHTML = `<span class="dot md"></span>${m.name}`;
    d.onclick = () => { selectedUiModel = m.name; renderUiSidebar(); renderUiTable(); };
    sb.appendChild(d);
  });
}

function renderUiTable() {
  syncDynamicHeaderOptions();
  const wrap = document.getElementById('uiContent');

  if (selectedUiModel === '__systemType__') { renderTypeStorePanel(wrap, '🔖 시스템타입 관리', systemTypeStore, 'systemType'); return; }
  if (selectedUiModel === '__varType__')    { renderTypeStorePanel(wrap, '🧩 배리어블타입 관리', variableTypeStore, 'varType'); return; }
  if (selectedUiModel === '__combobox__')   { renderComboboxPanel(wrap); return; }
  if (selectedUiModel === '__functions__')  { renderFunctionPanel(wrap); return; }
  if (selectedUiModel === '__masterdata__') { renderMasterDataPanel(wrap); return; }
  if (selectedUiModel === '__assembly__')   { renderAssemblyPanel(wrap);   return; }

  // 헤더 관리 화면
  if (selectedUiModel === null) {
    const titleEl = document.getElementById('uiTitle');
    const addBtn = document.getElementById('uiAddRowBtn');
    if (titleEl) titleEl.textContent = '⚙️ 헤더 관리';
    if (addBtn) addBtn.style.display = 'none';

    let html = `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">헤더 목록 (드래그로 순서 변경 가능)</span>
        <button class="btn btn-accent" style="margin-left:auto" onclick="openAddHeaderModal()">+ 헤더 추가</button>
      </div>
      <table class="excel-table" id="headerMgmtTable" style="width:100%">
        <thead><tr><th style="width:32px"></th><th>헤더명</th><th>약어(표시명)</th><th>설명</th><th>타입</th><th>콤보 옵션</th><th>UI역할</th><th style="width:48px"></th></tr></thead>
        <tbody id="headerMgmtBody">`;

    const sel = p => UI_ROLES.map(r => `<option value="${r.key}"${p === r.key ? ' selected' : ''}>${r.label}</option>`).join('');

    uiHeaders.forEach((h, i) => {
      const role = h.uiRole || 'none';
      const roleColor = role !== 'none' ? 'color:var(--accent)' : 'color:var(--text-muted)';
      const inputStyle = 'width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;outline:none';
      html += `<tr data-idx="${i}" draggable="true" style="cursor:grab">
        <td style="color:var(--text-muted);text-align:center;font-size:16px;cursor:grab">⠿</td>
        <td contenteditable="true" data-hidx="${i}"
          style="font-weight:600;font-family:var(--font-mono);color:var(--accent);outline:none;min-width:110px"
          onblur="uiHeaderNameChange(${i},this.textContent.trim())"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
        >${h.name}</td>
        <td>
          <input value="${(h.label || '').replace(/"/g, '&quot;')}" placeholder="약어"
            onchange="uiHeaderLabelChange(${i},this.value)"
            style="${inputStyle};min-width:70px">
        </td>
        <td>
          <input value="${(h.desc || '').replace(/"/g, '&quot;')}" placeholder="설명 (툴팁)"
            onchange="uiHeaderDescChange(${i},this.value)"
            style="${inputStyle};min-width:180px;color:var(--text-secondary)">
        </td>
        <td>
          <select onchange="uiHeaderTypeChange(${i},this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px">
            <option value="text"${h.type === 'text' ? ' selected' : ''}>텍스트</option>
            <option value="combo"${h.type === 'combo' ? ' selected' : ''}>콤보박스</option>
            <option value="model"${h.type === 'model' ? ' selected' : ''}>모델참조</option>
            <option value="trigger"${h.type === 'trigger' ? ' selected' : ''}>트리거</option>
          </select>
        </td>
        <td>
          <input value="${h.type === 'model' ? '' : h.options.join(',')}"
            placeholder="${h.type === 'model' ? '자동 생성' : '옵션1,옵션2'}"
            onchange="uiHeaderOptionsChange(${i},this.value)"
            ${h.type !== 'combo' ? 'disabled style="opacity:0.4"' : ''}
            style="${inputStyle};font-family:var(--font-mono)">
        </td>
        <td>
          <select onchange="uiHeaderRoleChange(${i},this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);font-size:12px;${roleColor}">${sel(role)}</select>
        </td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="uiHeaderDelete(${i})">✕</button></td>
      </tr>`;
    });

    html += `</tbody></table></div>`;
    wrap.innerHTML = html;
    initHeaderDragDrop();
    return;
  }

  // 모델 메타 테이블 화면
  const titleEl2 = document.getElementById('uiTitle');
  const addBtn2 = document.getElementById('uiAddRowBtn');
  if (addBtn2) addBtn2.style.display = '';

  // 뷰모드 드롭다운을 타이틀 영역에 렌더
  if (titleEl2) {
    const curMode = (uiModelConfig[selectedUiModel] || {}).viewMode || '1to1';
    const modeOpts = VIEW_MODES.map(m =>
      `<option value="${m.key}"${curMode === m.key ? ' selected' : ''}>${m.label}</option>`
    ).join('');
    titleEl2.innerHTML = `<span style="font-weight:700;color:var(--accent2)">${selectedUiModel}</span>
      <select onchange="uiSetViewMode(this.value)"
        style="margin-left:12px;padding:4px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--accent);font-size:12px;font-weight:700;cursor:pointer">
        ${modeOpts}
      </select>`;
  }

  const model = schema.models.find(m => m.name === selectedUiModel);
  if (!model) { wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">모델 없음</div>'; return; }

  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};

  if (!rowOrderStore[selectedUiModel]) {
    rowOrderStore[selectedUiModel] = model.fields.map(f => f.name);
  } else {
    model.fields.forEach(f => { if (!rowOrderStore[selectedUiModel].includes(f.name)) rowOrderStore[selectedUiModel].push(f.name); });
  }

  const orderedFieldNames = rowOrderStore[selectedUiModel];
  const rows = [];
  orderedFieldNames.forEach(fn => {
    if (!metaStore[selectedUiModel][fn]) metaStore[selectedUiModel][fn] = {};
    const f = model.fields.find(f => f.name === fn);
    rows.push({ fieldName: fn, meta: metaStore[selectedUiModel][fn], extraOnly: !f });
  });
  Object.keys(metaStore[selectedUiModel]).forEach(fn => {
    if (!orderedFieldNames.includes(fn)) {
      rows.push({ fieldName: fn, meta: metaStore[selectedUiModel][fn], extraOnly: true });
    }
  });

  const thHtml = uiHeaders.map(h => {
    const badge = (h.type === 'combo' || h.type === 'model' || h.type === 'trigger') ? `<span style="font-size:9px;color:var(--accent2);margin-left:2px">▼</span>` : '';
    const displayLabel = h.label || h.name;
    const tooltip = h.desc ? `${h.name}\n${h.desc}` : h.name;
    return `<th style="white-space:nowrap;cursor:default" title="${tooltip}">${displayLabel}${badge}</th>`;
  }).join('');

  let html = `<table class="excel-table" id="uiMetaTable">
    <thead><tr><th style="width:24px;background:var(--bg-secondary);border-right:1px solid var(--border)"></th><th style="min-width:120px;background:var(--bg-secondary);border-right:1px solid var(--border)">fieldName</th>${thHtml}<th></th></tr></thead><tbody id="uiMetaTableBody">`;

  rows.forEach((row) => {
    const modelOpts = schema.models.map(m => m.name);
    const isDbType = row.meta.systemType === 'db_select' || row.meta.systemType === 'db_combobox';
    // syncGroup: 현재 모델에서 이미 쓰인 그룹명 수집 (제안용)
    const existingSyncGroups = isDbType
      ? [...new Set(Object.values(metaStore[selectedUiModel] || {}).map(m => m.syncGroup || '').filter(Boolean))]
      : [];
    const selStyle = 'width:100%;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-primary);color:var(--text-primary);font-size:11px';

    const tds = uiHeaders.map(h => {
      const val = row.meta[h.name] !== undefined ? row.meta[h.name] : '';
      const fillBtn = `<button contenteditable="false" class="fill-down-btn" title="아래로 채우기" onclick="event.stopPropagation();fillDown('${row.fieldName}','${h.name}')">↓</button>`;

      // ── db_select / db_combobox 전용 셀 ─────────────────────
      if (isDbType && h.name === 'dbTable') {
        const opts = ['', ...masterDataRegistry.map(m => m.name)]
          .map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '— 선택 —'}</option>`).join('');
        return `<td style="min-width:120px;padding:2px 4px;position:relative">
          <select data-field="${row.fieldName}" data-col="dbTable"
            onchange="onDbTableChange('${row.fieldName}',this.value)"
            style="${selStyle}">${opts}</select>${fillBtn}</td>`;
      }
      if (isDbType && h.name === 'dbColumn') {
        const selectedTable = row.meta.dbTable || '';
        const entry = masterDataRegistry.find(m => m.name === selectedTable);
        const raw = entry ? window[entry.globalVar] : null;
        const cols = (Array.isArray(raw) && raw.length > 0) ? Object.keys(raw[0]) : [];
        const opts = ['', ...cols]
          .map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '— 선택 —'}</option>`).join('');
        return `<td style="min-width:120px;padding:2px 4px;position:relative">
          <select data-field="${row.fieldName}" data-col="dbColumn"
            style="${selStyle}">${opts}</select>${fillBtn}</td>`;
      }
      if (isDbType && h.name === 'syncGroup') {
        const listId = `sg-list-${row.fieldName}`;
        const datalist = existingSyncGroups.map(g => `<option value="${g}">`).join('');
        return `<td style="min-width:100px;padding:2px 4px;position:relative">
          <datalist id="${listId}">${datalist}</datalist>
          <input list="${listId}" data-field="${row.fieldName}" data-col="syncGroup"
            value="${val}" placeholder="그룹명"
            style="${selStyle}">${fillBtn}</td>`;
      }
      // ────────────────────────────────────────────────────────

      if (h.type === 'trigger') {
        const fnList = val ? String(val).split(',').map(s => s.trim()).filter(Boolean) : [];
        const displayVals = [...fnList, ''];
        const fnOpts = ['', ...functionStore.map(f => f.name)];
        const selStyle = 'width:100%;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-primary);color:var(--text-primary);font-size:11px;margin-bottom:2px';
        const selHtml = displayVals.map(fv => {
          const opts = fnOpts.map(o => `<option value="${o}"${o === fv ? ' selected' : ''}>${o || '— 선택 —'}</option>`).join('');
          return `<select class="trigger-select" onchange="onTriggerSelectChange(this)" style="${selStyle}">${opts}</select>`;
        }).join('');
        return `<td style="min-width:130px;padding:2px 4px;position:relative"><div class="trigger-multi-cell" data-col="${h.name}" data-field="${row.fieldName}" style="display:flex;flex-direction:column">${selHtml}</div>${fillBtn}</td>`;
      }
      if (h.type === 'combo' && h.options.length > 0) {
        const opts = ['', ...h.options].map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '—'}</option>`).join('');
        const onch = h.name === 'systemType' ? ` onchange="onSystemTypeChange('${row.fieldName}',this.value)"` : '';
        return `<td style="min-width:90px;padding:2px 4px;position:relative"><select data-field="${row.fieldName}" data-col="${h.name}"${onch} style="width:100%;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-primary);color:var(--text-primary);font-size:11px">${opts}</select>${fillBtn}</td>`;
      }
      if (h.type === 'model') {
        const opts = ['', ...modelOpts].map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '—'}</option>`).join('');
        return `<td style="min-width:100px;padding:2px 4px;position:relative"><select data-field="${row.fieldName}" data-col="${h.name}" style="width:100%;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-primary);color:var(--text-primary);font-size:11px">${opts}</select>${fillBtn}</td>`;
      }
      return `<td style="min-width:80px;position:relative;padding:0"><span contenteditable="true" data-field="${row.fieldName}" data-col="${h.name}" style="display:block;padding:4px 20px 4px 8px;outline:none;min-height:100%;font-size:11px">${val}</span>${fillBtn}</td>`;
    }).join('');

    const isBorrowed = row.fieldName.includes('.');
    const fieldColor = isBorrowed ? 'color:var(--accent)' : row.extraOnly ? 'color:var(--accent2)' : 'color:var(--text-muted)';
    const borrowedBadge = isBorrowed ? `<span style="font-size:9px;background:var(--accent-dim);color:var(--accent);padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">${row.fieldName.split('.')[0]}</span>` : '';
    html += `<tr draggable="true" data-field="${row.fieldName}">
      <td style="text-align:center;background:var(--bg-secondary);padding:2px 4px;cursor:grab;color:var(--text-muted);font-size:14px;user-select:none;border-right:1px solid var(--border)">⠿</td>
      <td style="font-weight:600;${fieldColor};white-space:nowrap;background:var(--bg-secondary);border-right:1px solid var(--border);padding:4px 8px;font-size:11px">${row.fieldName.includes('.') ? row.fieldName.split('.')[1] : row.fieldName}${borrowedBadge}</td>
      ${tds}
      <td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="uiDelRow('${row.fieldName}')">✕</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
  initRowDragDrop();

  // 기존 systemType 값에 따라 컬럼 힌트 즉시 적용
  rows.forEach(row => {
    if (row.meta.systemType) applySystemTypeStyles(row.fieldName, row.meta.systemType);
  });
}

function onDbTableChange(fieldName, tableName) {
  if (!selectedUiModel) return;
  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};
  if (!metaStore[selectedUiModel][fieldName]) metaStore[selectedUiModel][fieldName] = {};
  metaStore[selectedUiModel][fieldName].dbTable = tableName;
  metaStore[selectedUiModel][fieldName].dbColumn = ''; // 테이블 바뀌면 컬럼 초기화
  renderUiTable();
}

function uiHeaderNameChange(i, val) {
  if (!val) return;
  if (uiHeaders.find((h, idx) => h.name === val && idx !== i)) { toast('이미 존재하는 헤더명입니다', 'error'); return; }
  uiHeaders[i].name = val;
}

function uiHeaderLabelChange(i, val) {
  uiHeaders[i].label = val.trim();
}

function uiHeaderDescChange(i, val) {
  uiHeaders[i].desc = val.trim();
}

function uiHeaderTypeChange(i, val) {
  uiHeaders[i].type = val;
  if (val === 'text' || val === 'model') uiHeaders[i].options = [];
  renderUiTable();
}

function uiHeaderOptionsChange(i, val) {
  uiHeaders[i].options = val.split(',').map(s => s.trim()).filter(Boolean);
}

function uiHeaderRoleChange(i, val) {
  uiHeaders[i].uiRole = val;
}

function uiSetViewMode(val) {
  if (!selectedUiModel) return;
  if (!uiModelConfig[selectedUiModel]) uiModelConfig[selectedUiModel] = {};
  uiModelConfig[selectedUiModel].viewMode = val;
}

function onTriggerSelectChange(selectEl) {
  const container = selectEl.closest('.trigger-multi-cell');
  if (!container) return;

  const allSelects = Array.from(container.querySelectorAll('.trigger-select'));
  const lastSelect = allSelects[allSelects.length - 1];

  // 마지막 select에 값이 생기면 새 빈 select 추가
  if (lastSelect.value) {
    const fnOpts = ['', ...functionStore.map(f => f.name)];
    const newSel = document.createElement('select');
    newSel.className = 'trigger-select';
    newSel.onchange = function() { onTriggerSelectChange(this); };
    newSel.style.cssText = 'width:100%;padding:2px 4px;border:1px solid var(--border);border-radius:3px;background:var(--bg-primary);color:var(--text-primary);font-size:11px;margin-bottom:2px';
    newSel.innerHTML = fnOpts.map(o => `<option value="${o}">${o || '— 선택 —'}</option>`).join('');
    container.appendChild(newSel);
  }

  // 빈 select가 마지막이 아니면 제거 (중간 빈칸 정리)
  const updated = Array.from(container.querySelectorAll('.trigger-select'));
  updated.forEach((s, i) => {
    if (!s.value && i < updated.length - 1) s.remove();
  });
}

function uiHeaderDelete(i) {
  if (!confirm(`헤더 "${uiHeaders[i].name}" 를 삭제할까요?`)) return;
  uiHeaders.splice(i, 1);
  renderUiTable();
}

function openAddHeaderModal() {
  const name = prompt('새 헤더 이름:');
  if (!name || !name.trim()) return;
  if (uiHeaders.find(h => h.name === name.trim())) { toast('이미 존재하는 헤더입니다', 'error'); return; }
  uiHeaders.push({ name: name.trim(), label: '', desc: '', type: 'text', options: [], uiRole: 'none' });
  renderUiTable();
  toast(`헤더 "${name.trim()}" 추가됨`, 'success');
}

function initHeaderDragDrop() {
  const tbody = document.getElementById('headerMgmtBody');
  if (!tbody) return;
  let dragSrc = null;
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('dragstart', e => { dragSrc = tr; tr.style.opacity = '0.4'; });
    tr.addEventListener('dragend', e => { tr.style.opacity = '1'; });
    tr.addEventListener('dragover', e => { e.preventDefault(); tr.style.background = 'var(--bg-hover)'; });
    tr.addEventListener('dragleave', e => { tr.style.background = ''; });
    tr.addEventListener('drop', e => {
      e.preventDefault(); tr.style.background = '';
      if (dragSrc === tr) return;
      const fromIdx = parseInt(dragSrc.dataset.idx);
      const toIdx = parseInt(tr.dataset.idx);
      const moved = uiHeaders.splice(fromIdx, 1)[0];
      uiHeaders.splice(toIdx, 0, moved);
      renderUiTable();
    });
  });
}

function fillDown(fieldName, colName) {
  if (!selectedUiModel) return;
  // 현재 DOM 상태를 metaStore에 먼저 동기화
  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};
  document.querySelectorAll('#uiMetaTable tbody tr').forEach(row => {
    const fn = row.dataset.field;
    if (!fn) return;
    if (!metaStore[selectedUiModel][fn]) metaStore[selectedUiModel][fn] = {};
    uiHeaders.forEach(h => {
      const cell = row.querySelector(`[data-col="${h.name}"]`);
      if (!cell) return;
      let v;
      if (h.type === 'trigger') {
        v = Array.from(cell.querySelectorAll('.trigger-select')).map(s => s.value).filter(Boolean).join(',');
      } else if (cell.tagName === 'SELECT') {
        v = cell.value;
      } else {
        const c = cell.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); v = c.textContent.trim();
      }
      metaStore[selectedUiModel][fn][h.name] = v;
    });
  });
  const val = metaStore[selectedUiModel][fieldName]?.[colName] ?? '';
  const order = rowOrderStore[selectedUiModel] || [];
  const startIdx = order.indexOf(fieldName);
  if (startIdx < 0) return;
  for (let i = startIdx + 1; i < order.length; i++) {
    const fn = order[i];
    if (!metaStore[selectedUiModel][fn]) metaStore[selectedUiModel][fn] = {};
    metaStore[selectedUiModel][fn][colName] = val;
  }
  const count = order.length - startIdx - 1;
  renderUiTable();
  if (count > 0) toast(`↓ ${count}개 행에 적용`, 'success');
}

function uiApply() {
  if (selectedUiModel === null) { toast('헤더 변경은 자동 저장됩니다', 'info'); return; }
  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};
  document.querySelectorAll('#uiMetaTable tbody tr').forEach(row => {
    const fieldName = row.dataset.field;
    if (!fieldName) return;
    if (!metaStore[selectedUiModel][fieldName]) metaStore[selectedUiModel][fieldName] = {};
    uiHeaders.forEach(h => {
      const cell = row.querySelector(`[data-col="${h.name}"]`);
      if (!cell) return;
      let val;
      if (h.type === 'trigger') {
        val = Array.from(cell.querySelectorAll('.trigger-select')).map(s => s.value).filter(Boolean).join(',');
      } else if (cell.tagName === 'SELECT') {
        val = cell.value;
      } else {
        const c = cell.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); val = c.textContent.trim();
      }
      metaStore[selectedUiModel][fieldName][h.name] = val;
    });
  });
  toast('UI 메타 저장 완료', 'success');
  renderUiTable();
}

let _uiAddRowSelectedModel = null;
let _uiAddRowSelectedField = null;

function uiAddRow() {
  if (!selectedUiModel) return;
  _uiAddRowSelectedModel = null;
  _uiAddRowSelectedField = null;

  const modal = document.getElementById('uiAddRowModal');
  if (!modal) { toast('모달을 찾을 수 없습니다', 'error'); return; }

  const ms = document.getElementById('uiAddRowModelSearch');
  const fs = document.getElementById('uiAddRowFieldSearch');
  if (ms) ms.value = '';
  if (fs) fs.value = '';

  const confirmBtn = document.getElementById('uiAddRowConfirmBtn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.4'; }

  // 모델 목록 렌더
  const list = document.getElementById('uiAddRowModelList');
  if (list) {
    list.innerHTML = schema.models.map(m => {
      const isCurrent = m.name === selectedUiModel;
      const dot = `<span style="width:8px;height:8px;border-radius:50%;flex-shrink:0;background:${isCurrent ? 'var(--accent)' : 'var(--accent2)'}"></span>`;
      const badge = isCurrent ? `<span style="margin-left:auto;font-size:10px;background:var(--accent-dim);color:var(--accent);padding:2px 7px;border-radius:99px;font-weight:700">현재</span>` : '';
      return `<div class="ui-add-row-item" data-model="${m.name}" onclick="uiAddRowSelectModel(this)"
        style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:7px;cursor:pointer;transition:background .12s">
        ${dot}
        <span style="font-weight:600;font-family:var(--font-mono);font-size:13px;color:var(--text-primary)">${m.name}</span>
        ${badge}
      </div>`;
    }).join('');
  }

  // 필드 목록 초기화
  const fieldList = document.getElementById('uiAddRowFieldList');
  if (fieldList) fieldList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">← 먼저 모델을 선택하세요</div>';

  modal.classList.add('show');
}

function uiAddRowSelectModel(el) {
  const modelName = el.dataset.model;
  _uiAddRowSelectedModel = modelName;
  _uiAddRowSelectedField = null;

  const confirmBtn = document.getElementById('uiAddRowConfirmBtn');
  if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.style.opacity = '0.4'; }

  // 모델 항목 하이라이트
  document.querySelectorAll('.ui-add-row-item[data-model]').forEach(item => {
    item.style.background = item.dataset.model === modelName ? 'var(--bg-hover)' : '';
    item.style.outline = item.dataset.model === modelName ? '2px solid var(--accent)' : '';
  });

  const model = schema.models.find(m => m.name === modelName);
  if (!model) return;

  const isCurrent = modelName === selectedUiModel;
  const existing = new Set([
    ...(rowOrderStore[selectedUiModel] || []),
    ...Object.keys(metaStore[selectedUiModel] || {}),
  ]);

  const fields = model.fields.filter(f => {
    const key = isCurrent ? f.name : `${modelName}.${f.name}`;
    return !existing.has(key);
  });

  const fieldList = document.getElementById('uiAddRowFieldList');
  if (fields.length === 0) {
    fieldList.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">추가 가능한 필드가 없습니다</div>';
    return;
  }

  fieldList.innerHTML = fields.map(f => {
    const typeStr = f.type + (f.isArray ? '[]' : '') + (f.isOptional ? '?' : '');
    return `<div class="ui-add-row-item" data-field="${f.name}" onclick="uiAddRowSelectField(this)"
      style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:7px;cursor:pointer;transition:background .12s">
      <span style="font-weight:600;font-family:var(--font-mono);font-size:13px;color:var(--text-primary)">${f.name}</span>
      <span style="margin-left:auto;font-size:11px;color:var(--accent3);font-family:var(--font-mono);font-weight:500">${typeStr}</span>
    </div>`;
  }).join('');
}

function uiAddRowFilterModels() {
  const q = document.getElementById('uiAddRowModelSearch').value.toLowerCase();
  document.querySelectorAll('.ui-add-row-item[data-model]').forEach(el => {
    el.style.display = el.dataset.model.toLowerCase().includes(q) ? '' : 'none';
  });
}

function uiAddRowFilterFields() {
  const q = document.getElementById('uiAddRowFieldSearch').value.toLowerCase();
  document.querySelectorAll('.ui-add-row-item[data-field]').forEach(el => {
    el.style.display = el.dataset.field.toLowerCase().includes(q) ? '' : 'none';
  });
}

function uiAddRowSelectField(el) {
  const fieldName = el.dataset.field;
  _uiAddRowSelectedField = fieldName;

  document.querySelectorAll('.ui-add-row-item[data-field]').forEach(item => {
    item.style.background = item.dataset.field === fieldName ? 'var(--bg-hover)' : '';
    item.style.outline = item.dataset.field === fieldName ? '2px solid var(--accent)' : '';
  });

  const confirmBtn = document.getElementById('uiAddRowConfirmBtn');
  confirmBtn.disabled = false;
  confirmBtn.style.opacity = '1';
}

function uiAddRowConfirm() {
  if (!selectedUiModel || !_uiAddRowSelectedModel || !_uiAddRowSelectedField) {
    toast('모델과 필드를 선택하세요', 'error'); return;
  }
  const isCurrent = _uiAddRowSelectedModel === selectedUiModel;
  const rowKey = isCurrent ? _uiAddRowSelectedField : `${_uiAddRowSelectedModel}.${_uiAddRowSelectedField}`;

  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};
  const rowMeta = {};
  if (!isCurrent) rowMeta['dataSource'] = _uiAddRowSelectedModel;
  metaStore[selectedUiModel][rowKey] = rowMeta;
  if (!rowOrderStore[selectedUiModel]) rowOrderStore[selectedUiModel] = [];
  if (!rowOrderStore[selectedUiModel].includes(rowKey)) rowOrderStore[selectedUiModel].push(rowKey);

  document.getElementById('uiAddRowModal').classList.remove('show');
  renderUiTable();
}

function uiDelRow(fieldName) {
  if (!selectedUiModel || !metaStore[selectedUiModel]) return;
  delete metaStore[selectedUiModel][fieldName];
  if (rowOrderStore[selectedUiModel]) {
    rowOrderStore[selectedUiModel] = rowOrderStore[selectedUiModel].filter(n => n !== fieldName);
  }
  renderUiTable();
}

function initRowDragDrop() {
  const tbody = document.getElementById('uiMetaTableBody');
  if (!tbody) return;
  let dragSrc = null;
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('dragstart', e => {
      dragSrc = tr;
      tr.style.opacity = '0.4';
      e.dataTransfer.effectAllowed = 'move';
    });
    tr.addEventListener('dragend', () => { tr.style.opacity = '1'; });
    tr.addEventListener('dragover', e => { e.preventDefault(); tr.style.background = 'var(--bg-hover)'; });
    tr.addEventListener('dragleave', () => { tr.style.background = ''; });
    tr.addEventListener('drop', e => {
      e.preventDefault();
      tr.style.background = '';
      if (!dragSrc || dragSrc === tr) return;
      uiApply();
      const order = rowOrderStore[selectedUiModel];
      if (!order) return;
      const fromField = dragSrc.dataset.field;
      const toField = tr.dataset.field;
      const fromIdx = order.indexOf(fromField);
      const toIdx = order.indexOf(toField);
      if (fromIdx < 0 || toIdx < 0) return;
      order.splice(fromIdx, 1);
      order.splice(toIdx, 0, fromField);
      renderUiTable();
    });
  });
}

// ── 시스템타입 / 배리어블타입 관리 패널 ──────────────────────────────────
function renderTypeStorePanel(wrap, title, store, storeKey) {
  const titleEl = document.getElementById('uiTitle');
  const addBtn  = document.getElementById('uiAddRowBtn');
  if (titleEl) titleEl.textContent = title;
  if (addBtn)  addBtn.style.display = 'none';

  wrap.innerHTML = `
  <div style="padding:16px;max-width:700px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
      <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">타입 목록</span>
      <button class="btn btn-accent" style="margin-left:auto" onclick="typeStoreAdd('${storeKey}')">+ 타입 추가</button>
    </div>
    <table class="excel-table" style="width:100%">
      <thead><tr><th style="width:28px"></th><th style="min-width:160px">타입 키</th><th>설명</th><th style="width:48px"></th></tr></thead>
      <tbody>
        ${store.map((t, i) => `
          <tr draggable="true"
            ondragstart="listDragStart('${storeKey}',${i})"
            ondragover="listDragOver(event)"
            ondrop="listDragDrop('${storeKey}',${i})"
            style="cursor:grab">
            <td style="color:var(--text-muted);text-align:center;font-size:14px;cursor:grab;user-select:none">⠿</td>
            <td contenteditable="true" data-store="${storeKey}" data-idx="${i}" data-field="key"
              style="font-family:var(--font-mono);font-weight:600;color:var(--accent);outline:none"
              onblur="typeStoreEdit('${storeKey}',${i},'key',this.textContent.trim())"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
            >${t.key}</td>
            <td contenteditable="true" data-store="${storeKey}" data-idx="${i}" data-field="desc"
              style="color:var(--text-secondary);outline:none"
              onblur="typeStoreEdit('${storeKey}',${i},'desc',this.textContent.trim())"
              onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
            >${t.desc}</td>
            <td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="typeStoreDelete('${storeKey}',${i})">✕</button></td>
          </tr>`).join('')}
      </tbody>
    </table>
  </div>`;
}

// ── 리스트 드래그 순서 변경 공통 헬퍼 ────────────────────────────────────
let _listDragSrc = null;

function listDragStart(storeType, idx) {
  _listDragSrc = { storeType, idx };
}

function listDragOver(e) {
  e.preventDefault();
}

function listDragDrop(storeType, idx) {
  if (!_listDragSrc || _listDragSrc.storeType !== storeType) return;
  const from = _listDragSrc.idx;
  const to = idx;
  _listDragSrc = null;
  if (from === to) return;
  const arr = _listStoreGetRef(storeType);
  if (!arr) return;
  const moved = arr.splice(from, 1)[0];
  arr.splice(to, 0, moved);
  renderUiTable();
}

function _listStoreGetRef(storeType) {
  if (storeType === 'systemType') return systemTypeStore;
  if (storeType === 'varType')    return variableTypeStore;
  if (storeType === 'function')   return functionStore;
  if (storeType === 'masterData') return masterDataRegistry;
  return null;
}

// 콤보박스 그룹 순서 변경 (object → 키 순서 재구성)
function comboboxGroupDragDrop(fromGroup, toGroup) {
  if (fromGroup === toGroup) return;
  const keys = Object.keys(comboboxStore);
  const fromIdx = keys.indexOf(fromGroup);
  const toIdx = keys.indexOf(toGroup);
  if (fromIdx < 0 || toIdx < 0) return;
  keys.splice(fromIdx, 1);
  keys.splice(toIdx, 0, fromGroup);
  const newStore = {};
  keys.forEach(k => { newStore[k] = comboboxStore[k]; });
  // 참조 유지를 위해 기존 객체 키를 재구성
  Object.keys(comboboxStore).forEach(k => delete comboboxStore[k]);
  Object.assign(comboboxStore, newStore);
  renderUiTable();
}

function typeStoreGetRef(storeKey) {
  return storeKey === 'systemType' ? systemTypeStore : variableTypeStore;
}

function typeStoreAdd(storeKey) {
  const key = prompt('새 타입 키:');
  if (!key || !key.trim()) return;
  const store = typeStoreGetRef(storeKey);
  if (store.find(t => t.key === key.trim())) { toast('이미 존재하는 키입니다', 'error'); return; }
  store.push({ key: key.trim(), desc: '' });
  syncDynamicHeaderOptions();
  renderUiTable();
}

function typeStoreEdit(storeKey, i, field, val) {
  const store = typeStoreGetRef(storeKey);
  if (!store[i]) return;
  store[i][field] = val;
  syncDynamicHeaderOptions();
}

function typeStoreDelete(storeKey, i) {
  const store = typeStoreGetRef(storeKey);
  if (!confirm(`타입 "${store[i].key}" 를 삭제할까요?`)) return;
  store.splice(i, 1);
  syncDynamicHeaderOptions();
  renderUiTable();
}

// ── 콤보박스 관리 패널 ──────────────────────────────────────────────────
function renderComboboxPanel(wrap) {
  const titleEl = document.getElementById('uiTitle');
  const addBtn  = document.getElementById('uiAddRowBtn');
  if (titleEl) titleEl.textContent = '🔽 콤보박스 관리';
  if (addBtn)  addBtn.style.display = 'none';

  const groups = Object.keys(comboboxStore);
  const options = selectedComboboxGroup && comboboxStore[selectedComboboxGroup]
    ? comboboxStore[selectedComboboxGroup] : [];

  wrap.innerHTML = `
  <div style="display:flex;height:100%;gap:0">
    <div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);padding:12px;overflow-y:auto">
      <div style="display:flex;align-items:center;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px">그룹</span>
        <button class="btn btn-accent" style="margin-left:auto;padding:2px 10px;font-size:11px" onclick="comboboxAddGroup()">+ 추가</button>
      </div>
      ${groups.map(g => `
        <div draggable="true"
          ondragstart="event.dataTransfer.setData('text/plain','${g}');event.currentTarget.style.opacity='.4'"
          ondragend="event.currentTarget.style.opacity='1'"
          ondragover="event.preventDefault()"
          ondrop="event.preventDefault();event.currentTarget.style.background='';comboboxGroupDragDrop(event.dataTransfer.getData('text/plain'),'${g}')"
          ondragenter="event.currentTarget.style.background='var(--bg-hover)'"
          ondragleave="event.currentTarget.style.background=''"
          onclick="comboboxSelectGroup('${g}')"
          style="padding:7px 10px;border-radius:7px;cursor:grab;font-weight:600;font-family:var(--font-mono);font-size:12px;
          background:${selectedComboboxGroup === g ? 'var(--accent-dim)' : 'transparent'};
          color:${selectedComboboxGroup === g ? 'var(--accent)' : 'var(--text-primary)'};
          border:${selectedComboboxGroup === g ? '1px solid var(--accent)' : '1px solid transparent'};
          margin-bottom:3px;display:flex;align-items:center;gap:6px">
          <span style="color:var(--text-muted);font-size:13px;flex-shrink:0">⠿</span>
          <span style="flex:1">${g}</span>
          <button class="btn btn-danger" style="padding:1px 6px;font-size:10px" onclick="event.stopPropagation();comboboxDeleteGroup('${g}')">✕</button>
        </div>`).join('') || '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px">그룹 없음</div>'}
    </div>
    <div style="flex:1;padding:12px;overflow-y:auto">
      ${selectedComboboxGroup ? `
        <div style="display:flex;align-items:center;margin-bottom:10px">
          <span style="font-size:13px;font-weight:700;color:var(--accent)">${selectedComboboxGroup}</span>
          <span style="margin-left:8px;font-size:11px;color:var(--text-muted)">옵션 목록</span>
          <button class="btn btn-accent" style="margin-left:auto;padding:2px 10px;font-size:11px" onclick="comboboxAddOption()">+ 옵션 추가</button>
        </div>
        <table class="excel-table" style="width:100%">
          <thead><tr><th>#</th><th>옵션 값</th><th style="width:48px"></th></tr></thead>
          <tbody>
            ${options.map((opt, i) => `
              <tr>
                <td style="color:var(--text-muted);width:40px">${i + 1}</td>
                <td contenteditable="true" style="font-family:var(--font-mono);outline:none"
                  onblur="comboboxEditOption(${i},this.textContent.trim())"
                  onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
                >${opt}</td>
                <td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="comboboxDeleteOption(${i})">✕</button></td>
              </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:20px">옵션 없음</td></tr>'}
          </tbody>
        </table>` : `<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:60px">← 왼쪽에서 그룹을 선택하세요</div>`}
    </div>
  </div>`;
}

function comboboxSelectGroup(name) {
  selectedComboboxGroup = name;
  renderUiTable();
}

function comboboxAddGroup() {
  const name = prompt('새 그룹 이름 (예: INDUSTRY_TYPE):');
  if (!name || !name.trim()) return;
  if (comboboxStore[name.trim()]) { toast('이미 존재하는 그룹입니다', 'error'); return; }
  comboboxStore[name.trim()] = [];
  selectedComboboxGroup = name.trim();
  syncDynamicHeaderOptions();
  renderUiTable();
}

function comboboxDeleteGroup(name) {
  if (!confirm(`그룹 "${name}" 와 모든 옵션을 삭제할까요?`)) return;
  delete comboboxStore[name];
  if (selectedComboboxGroup === name) selectedComboboxGroup = null;
  syncDynamicHeaderOptions();
  renderUiTable();
}

function comboboxAddOption() {
  if (!selectedComboboxGroup) return;
  const val = prompt('새 옵션 값:');
  if (!val || !val.trim()) return;
  comboboxStore[selectedComboboxGroup].push(val.trim());
  renderUiTable();
}

function comboboxEditOption(i, val) {
  if (!selectedComboboxGroup || !val) return;
  comboboxStore[selectedComboboxGroup][i] = val;
}

function comboboxDeleteOption(i) {
  if (!selectedComboboxGroup) return;
  comboboxStore[selectedComboboxGroup].splice(i, 1);
  renderUiTable();
}

// ── 함수 관리 패널 ──────────────────────────────────────────────────────
function renderFunctionPanel(wrap) {
  const titleEl = document.getElementById('uiTitle');
  const addBtn  = document.getElementById('uiAddRowBtn');
  if (titleEl) titleEl.textContent = '⚡ 함수 관리';
  if (addBtn)  addBtn.style.display = 'none';

  const fn = selectedFunctionIdx !== null ? functionStore[selectedFunctionIdx] : null;

  wrap.innerHTML = `
  <div style="display:flex;height:100%;gap:0">

    <!-- 좌: 함수 목록 -->
    <div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);padding:12px;overflow-y:auto">
      <div style="display:flex;align-items:center;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px">함수 목록</span>
        <button class="btn btn-accent" style="margin-left:auto;padding:2px 10px;font-size:11px" onclick="fnStoreAdd()">+ 추가</button>
      </div>
      ${functionStore.map((f, i) => `
        <div draggable="true"
          ondragstart="listDragStart('function',${i});event.currentTarget.style.opacity='.4'"
          ondragend="event.currentTarget.style.opacity='1'"
          ondragover="listDragOver(event);event.currentTarget.style.background='var(--bg-hover)'"
          ondragleave="event.currentTarget.style.background=''"
          ondrop="event.currentTarget.style.background='';listDragDrop('function',${i})"
          onclick="fnStoreSelect(${i})"
          style="padding:7px 10px;border-radius:7px;cursor:grab;margin-bottom:3px;
          background:${selectedFunctionIdx === i ? 'var(--accent-dim)' : 'transparent'};
          border:${selectedFunctionIdx === i ? '1px solid var(--accent)' : '1px solid transparent'};
          display:flex;align-items:center;gap:6px">
          <span style="color:var(--text-muted);font-size:13px;flex-shrink:0">⠿</span>
          <div style="flex:1;overflow:hidden">
            <div style="font-weight:600;font-family:var(--font-mono);font-size:12px;color:${selectedFunctionIdx === i ? 'var(--accent)' : 'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.name}</div>
            <div style="font-size:10px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${f.desc || '설명 없음'}</div>
          </div>
          <button class="btn btn-danger" style="padding:1px 6px;font-size:10px;flex-shrink:0" onclick="event.stopPropagation();fnStoreDelete(${i})">✕</button>
        </div>`).join('') || '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px">함수 없음</div>'}
    </div>

    <!-- 우: 선택된 함수 상세 -->
    <div style="flex:1;padding:16px;overflow-y:auto">
      ${fn ? `
        <div style="display:flex;flex-direction:column;gap:14px;max-width:600px">

          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">함수명</div>
            <input value="${fn.name}"
              onblur="fnStoreEditField(${selectedFunctionIdx},'name',this.value)"
              style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--accent);font-family:var(--font-mono);font-size:13px;font-weight:700;outline:none">
          </div>

          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">설명</div>
            <input value="${fn.desc || ''}"
              placeholder="이 함수가 하는 일을 설명하세요"
              onblur="fnStoreEditField(${selectedFunctionIdx},'desc',this.value)"
              style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;outline:none">
          </div>

          <div>
            <div style="display:flex;align-items:center;margin-bottom:8px">
              <span style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px">입력 파라미터</span>
              <button class="btn btn-accent" style="margin-left:auto;padding:2px 10px;font-size:11px" onclick="fnStoreAddParam(${selectedFunctionIdx})">+ 파라미터</button>
            </div>
            <table class="excel-table" style="width:100%">
              <thead><tr><th style="min-width:140px">파라미터명</th><th>설명</th><th style="width:40px"></th></tr></thead>
              <tbody>
                ${(fn.params || []).map((p, pi) => `
                  <tr>
                    <td><input value="${p.name}" onblur="fnStoreEditParam(${selectedFunctionIdx},${pi},'name',this.value)"
                      style="width:100%;border:none;background:transparent;font-family:var(--font-mono);font-size:12px;color:var(--accent);outline:none;padding:2px 4px"></td>
                    <td><input value="${p.desc || ''}" placeholder="설명" onblur="fnStoreEditParam(${selectedFunctionIdx},${pi},'desc',this.value)"
                      style="width:100%;border:none;background:transparent;font-size:12px;color:var(--text-secondary);outline:none;padding:2px 4px"></td>
                    <td><button class="btn btn-danger" style="padding:2px 6px;font-size:10px" onclick="fnStoreDeleteParam(${selectedFunctionIdx},${pi})">✕</button></td>
                  </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-muted);padding:12px;font-size:12px">파라미터 없음</td></tr>'}
              </tbody>
            </table>
          </div>

          <div style="display:flex;gap:12px">
            <div style="flex:1">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">출력 타입</div>
              <select onchange="fnStoreEditField(${selectedFunctionIdx},'outputType',this.value)"
                style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;outline:none">
                ${['float','integer','text','boolean','date','json'].map(t =>
                  `<option value="${t}"${fn.outputType === t ? ' selected' : ''}>${t}</option>`).join('')}
              </select>
            </div>
            <div style="flex:2">
              <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">출력 설명</div>
              <input value="${fn.outputDesc || ''}" placeholder="예: 바닥 면적 (㎡)"
                onblur="fnStoreEditField(${selectedFunctionIdx},'outputDesc',this.value)"
                style="width:100%;padding:8px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;outline:none">
            </div>
          </div>

        </div>
      ` : '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:60px">← 왼쪽에서 함수를 선택하세요</div>'}
    </div>
  </div>`;
}

function fnStoreSelect(i) { selectedFunctionIdx = i; renderUiTable(); }

function fnStoreAdd() {
  const name = prompt('새 함수명 (camelCase):');
  if (!name || !name.trim()) return;
  if (functionStore.find(f => f.name === name.trim())) { toast('이미 존재하는 함수명입니다', 'error'); return; }
  functionStore.push({ name: name.trim(), desc: '', params: [], outputType: 'float', outputDesc: '' });
  selectedFunctionIdx = functionStore.length - 1;
  syncDynamicHeaderOptions();
  renderUiTable();
}

function fnStoreDelete(i) {
  if (!confirm(`함수 "${functionStore[i].name}" 를 삭제할까요?`)) return;
  functionStore.splice(i, 1);
  if (selectedFunctionIdx >= functionStore.length) selectedFunctionIdx = functionStore.length - 1;
  if (functionStore.length === 0) selectedFunctionIdx = null;
  syncDynamicHeaderOptions();
  renderUiTable();
}

function fnStoreEditField(i, field, val) {
  if (!functionStore[i]) return;
  functionStore[i][field] = val;
  if (field === 'name') { syncDynamicHeaderOptions(); renderUiTable(); }
}

function fnStoreAddParam(i) {
  if (!functionStore[i]) return;
  functionStore[i].params.push({ name: 'param' + (functionStore[i].params.length + 1), desc: '' });
  renderUiTable();
}

function fnStoreEditParam(i, pi, field, val) {
  if (!functionStore[i] || !functionStore[i].params[pi]) return;
  functionStore[i].params[pi][field] = val;
}

function fnStoreDeleteParam(i, pi) {
  if (!functionStore[i]) return;
  functionStore[i].params.splice(pi, 1);
  renderUiTable();
}

// ── 데이터 관리 패널 ─────────────────────────────────────────────────────
// 여러 마스터 데이터 소스를 등록하고, 선택 시 테이블로 조회
// 읽기 전용 — 실제 데이터는 각 globalVar(전역 변수)에서 참조

let masterDataRegistry = [
  {
    name:         'WasteMasterDB',
    label:        '폐기물 마스터',
    globalVar:    'WasteMasterDB',
    searchFields: 'wasteCode,wasteName',
  },
];
let selectedMasterDataIdx = 0;
let _masterDataSearch = '';

function renderMasterDataPanel(wrap) {
  const titleEl = document.getElementById('uiTitle');
  const addBtn  = document.getElementById('uiAddRowBtn');
  if (titleEl) titleEl.textContent = '🗄️ 데이터 관리';
  if (addBtn)  addBtn.style.display = 'none';

  const entry = selectedMasterDataIdx !== null ? masterDataRegistry[selectedMasterDataIdx] : null;

  // 선택된 데이터 소스의 실제 데이터 읽기
  let db = [], cols = [];
  if (entry) {
    const raw = (typeof window !== 'undefined' && window[entry.globalVar]);
    db = Array.isArray(raw) ? raw : [];
    cols = db.length > 0 ? Object.keys(db[0]) : [];
    const searchFields = (entry.searchFields || '').split(',').map(s => s.trim()).filter(Boolean);
    const q = _masterDataSearch.trim().toLowerCase();
    if (q && searchFields.length > 0) {
      db = db.filter(r => searchFields.some(f => String(r[f] || '').toLowerCase().includes(q)));
    }
  }

  wrap.innerHTML = `
  <div style="display:flex;height:100%;gap:0">

    <!-- 좌: 데이터 소스 목록 -->
    <div style="width:220px;flex-shrink:0;border-right:1px solid var(--border);padding:12px;overflow-y:auto">
      <div style="display:flex;align-items:center;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px">데이터 목록</span>
        <button class="btn btn-accent" style="margin-left:auto;padding:2px 10px;font-size:11px" onclick="masterDataAdd()">+ 추가</button>
      </div>
      ${masterDataRegistry.map((m, i) => {
        const raw = (typeof window !== 'undefined' && window[m.globalVar]);
        const count = Array.isArray(raw) ? raw.length : 0;
        const active = selectedMasterDataIdx === i;
        return `<div draggable="true"
          ondragstart="listDragStart('masterData',${i});event.currentTarget.style.opacity='.4'"
          ondragend="event.currentTarget.style.opacity='1'"
          ondragover="listDragOver(event);event.currentTarget.style.background='var(--bg-hover)'"
          ondragleave="event.currentTarget.style.background=''"
          ondrop="event.currentTarget.style.background='';listDragDrop('masterData',${i})"
          onclick="masterDataSelect(${i})"
          style="padding:7px 10px;border-radius:7px;cursor:grab;margin-bottom:3px;
          background:${active ? 'var(--accent-dim)' : 'transparent'};
          border:${active ? '1px solid var(--accent)' : '1px solid transparent'};
          display:flex;align-items:center;gap:6px">
          <span style="color:var(--text-muted);font-size:13px;flex-shrink:0">⠿</span>
          <div style="flex:1;overflow:hidden">
            <div style="font-weight:600;font-family:var(--font-mono);font-size:12px;color:${active ? 'var(--accent)' : 'var(--text-primary)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${m.label || m.name}</div>
            <div style="font-size:10px;color:var(--text-muted)">${count > 0 ? count + '개' : (m.globalVar || '변수 미설정')}</div>
          </div>
          <button class="btn btn-danger" style="padding:1px 6px;font-size:10px;flex-shrink:0" onclick="event.stopPropagation();masterDataDelete(${i})">✕</button>
        </div>`;
      }).join('') || '<div style="color:var(--text-muted);font-size:12px;text-align:center;padding:20px">데이터 없음</div>'}
    </div>

    <!-- 우: 선택된 데이터 상세 -->
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">
      ${entry ? `

        <!-- 상단 정보/설정 바 -->
        <div style="padding:10px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;flex-shrink:0;flex-wrap:wrap">
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:var(--text-muted)">표시명</span>
            <input value="${(entry.label || '').replace(/"/g,'&quot;')}" placeholder="표시명"
              onblur="masterDataEditField(${selectedMasterDataIdx},'label',this.value)"
              style="padding:3px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;font-weight:700;width:120px;outline:none">
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:var(--text-muted)">전역변수</span>
            <input value="${(entry.globalVar || '').replace(/"/g,'&quot;')}" placeholder="window.XXX"
              onblur="masterDataEditField(${selectedMasterDataIdx},'globalVar',this.value)"
              style="padding:3px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--accent);font-family:var(--font-mono);font-size:12px;width:150px;outline:none">
          </div>
          <div style="display:flex;align-items:center;gap:6px">
            <span style="font-size:11px;color:var(--text-muted)">검색 필드</span>
            <input value="${(entry.searchFields || '').replace(/"/g,'&quot;')}" placeholder="field1,field2"
              onblur="masterDataEditField(${selectedMasterDataIdx},'searchFields',this.value)"
              style="padding:3px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-family:var(--font-mono);font-size:12px;width:160px;outline:none">
          </div>
          <span style="font-size:11px;background:var(--accent-dim);color:var(--accent);padding:2px 8px;border-radius:99px;font-weight:700">${db.length}건</span>
          <input type="text" placeholder="검색…" value="${_masterDataSearch}"
            oninput="_masterDataSearch=this.value;renderUiTable()"
            style="margin-left:auto;padding:4px 10px;border:1px solid var(--border);border-radius:7px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;width:180px">
        </div>

        <!-- 데이터 테이블 -->
        <div style="flex:1;overflow:auto;padding:0">
          ${cols.length === 0
            ? `<div style="padding:60px;text-align:center;color:var(--text-muted);font-size:13px">전역변수 <code>${entry.globalVar}</code> 에서 데이터를 찾을 수 없습니다</div>`
            : `<table class="excel-table" style="width:100%">
                <thead><tr>${cols.map(c => `<th style="white-space:nowrap;font-size:11px">${c}</th>`).join('')}</tr></thead>
                <tbody>
                  ${db.length === 0
                    ? `<tr><td colspan="${cols.length}" style="text-align:center;padding:20px;color:var(--text-muted)">검색 결과 없음</td></tr>`
                    : db.map(r => `<tr>${cols.map(c => `<td style="font-size:11px;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis" title="${String(r[c]||'').replace(/"/g,'&quot;')}">${r[c] ?? ''}</td>`).join('')}</tr>`).join('')}
                </tbody>
              </table>`}
        </div>

      ` : '<div style="color:var(--text-muted);font-size:13px;text-align:center;padding:60px">← 왼쪽에서 데이터 소스를 선택하세요</div>'}
    </div>

  </div>`;
}

function masterDataSelect(i) {
  selectedMasterDataIdx = i;
  _masterDataSearch = '';
  renderUiTable();
}

function masterDataAdd() {
  const label = prompt('데이터 소스 표시명:');
  if (!label || !label.trim()) return;
  const globalVar = prompt('전역 변수명 (window.XXX):');
  if (!globalVar || !globalVar.trim()) return;
  masterDataRegistry.push({
    name:         globalVar.trim(),
    label:        label.trim(),
    globalVar:    globalVar.trim(),
    searchFields: '',
  });
  selectedMasterDataIdx = masterDataRegistry.length - 1;
  _masterDataSearch = '';
  renderUiTable();
  toast(`"${label.trim()}" 추가됨`, 'success');
}

function masterDataDelete(i) {
  if (!confirm(`"${masterDataRegistry[i].label || masterDataRegistry[i].name}" 을 삭제할까요?`)) return;
  masterDataRegistry.splice(i, 1);
  if (selectedMasterDataIdx >= masterDataRegistry.length) selectedMasterDataIdx = masterDataRegistry.length - 1;
  if (masterDataRegistry.length === 0) selectedMasterDataIdx = null;
  _masterDataSearch = '';
  renderUiTable();
}

function masterDataEditField(i, key, val) {
  if (!masterDataRegistry[i]) return;
  masterDataRegistry[i][key] = val.trim();
  renderUiTable();
}

// ══════════════════════════════════════════════════════════════
// 조립모델 관리
// assemblyStore: { [screenName]: { label, layout: [...], flows: [...] } }
//   layout[]: { panelId, model, view, col, title, fields: [] }
//     fields: 빈 배열 = 전체 표시, 값 있으면 해당 필드만 표시
//   flows[]:  { watchModel, watchField, type, outputModel, outputField, rowMap }
// ══════════════════════════════════════════════════════════════

function _assemblyScreen() {
  if (!selectedAssemblyScreen) return null;
  return assemblyStore[selectedAssemblyScreen] || null;
}

function _assemblyEnsure(screenName) {
  if (!assemblyStore[screenName]) {
    assemblyStore[screenName] = { label: screenName, styles: {}, panelStyle: {}, layout: [], flows: [] };
  }
  const s = assemblyStore[screenName];
  if (!s.styles) s.styles = {};
  if (!s.panelStyle) s.panelStyle = {};
  s.layout.forEach(p => { if (!p.styles) p.styles = {}; });
  return s;
}

// ── 렌더 메인 ─────────────────────────────────────────────────
function renderAssemblyPanel(wrap) {
  const titleEl = document.getElementById('uiTitle');
  const addBtn  = document.getElementById('uiAddRowBtn');
  if (titleEl) titleEl.textContent = '🖥️ 조립모델 관리';
  if (addBtn)  addBtn.style.display = 'none';

  // 왼쪽 사이드바 클릭 (다른 화면 선택)에만 _q 사용
  // 현재 화면 편집은 selectedAssemblyScreen 전역변수 직접 참조
  const _q = s => "'" + String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'") + "'";

  const screenNames = Object.keys(assemblyStore);
  const current = _assemblyScreen();
  const modelNames = (schema.models || []).map(m => m.name);

  // ── 왼쪽 리스트 ──────────────────────────────────────────
  let leftHtml = `
  <div style="display:flex;flex-direction:column;gap:6px">
    <button class="btn btn-accent" style="width:100%;font-size:12px;padding:8px 10px" onclick="openAssemblyAddModal()">＋ 화면 추가</button>
    <div style="display:flex;flex-direction:column;gap:3px;margin-top:2px">`;

  if (screenNames.length === 0) {
    leftHtml += `<div style="text-align:center;padding:24px 8px;color:var(--text-muted);font-size:11px;line-height:1.6">화면이 없습니다.<br>위 버튼으로<br>추가하세요.</div>`;
  }

  screenNames.forEach(name => {
    const s = assemblyStore[name];
    const isActive = name === selectedAssemblyScreen;
    const panelCount = (s.layout || []).length;
    leftHtml += `
      <div onclick="assemblySelect(${_q(name)})"
           style="position:relative;border-radius:8px;padding:8px 10px;cursor:pointer;border:1px solid ${isActive ? 'var(--accent)' : 'var(--border)'};background:${isActive ? 'var(--accent-dim)' : 'transparent'};transition:all .15s">
        <div style="display:flex;align-items:center;gap:5px;padding-right:20px">
          <span style="font-size:12px">🖥️</span>
          <span style="font-size:12px;font-weight:700;color:${isActive ? 'var(--accent)' : 'var(--text-primary)'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.label || name}</span>
        </div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;padding-left:2px">${name}${panelCount > 0 ? ` · 패널 ${panelCount}개` : ''}</div>
        <button onclick="event.stopPropagation();assemblyDelete(${_q(name)})"
                style="position:absolute;top:6px;right:6px;width:18px;height:18px;border-radius:4px;border:none;background:transparent;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:10px;padding:0"
                onmouseover="this.style.color='var(--error)'" onmouseout="this.style.color='var(--text-muted)'">✕</button>
      </div>`;
  });

  leftHtml += `</div></div>`;

  // ── 오른쪽 에디터 ─────────────────────────────────────────
  let rightHtml = '';
  if (!selectedAssemblyScreen || !current) {
    rightHtml = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:12px;color:var(--text-muted)">
        <span style="font-size:40px">🖥️</span>
        <span style="font-size:14px;font-weight:600">화면을 선택하거나 추가하세요</span>
        <button class="btn btn-accent" style="margin-top:4px" onclick="openAssemblyAddModal()">＋ 첫 화면 추가</button>
      </div>`;
  } else {
    const sn = selectedAssemblyScreen;

    // ── 스타일 기본값 ─────────────────────────────────────────
    const SS = Object.assign({
      // 레이아웃
      direction:'vertical', maxWidth:'100%', padding:'md', gap:'md',
      colGap:'md', justifyContent:'flex-start', minHeight:'',
      // 시각/폰트
      theme:'default', fontSize:'md', fontFamily:'default',
      fontColor:'', lineHeight:'normal', background:'', backgroundImage:'',
    }, current.styles || {});

    // 패널 스타일 기본값 (하드코딩 → 전체 기본값 → 개별 오버라이드)
    const _GPS_DEFAULTS = {
      width:'auto', minWidth:'', maxWidth:'', maxHeight:'',
      overflow:'visible', flexGrow:'0', opacity:'1',
      background:'', borderPos:'all', borderStyle:'solid', borderWidth:'1',
      borderColor:'', radius:'md', shadow:'none',
      hideHeader:false, headerBg:'', headerHeight:'auto', headerPaddingX:'md',
      titleColor:'', titleSize:'md', titleWeight:'700', titleAlign:'left',
      headerDivider:true, headerDividerColor:'',
      cellBorderPos:'horizontal', cellBorderStyle:'solid', cellBorderWidth:'1',
      cellBorderColor:'', cellPaddingX:'sm', cellPaddingY:'xs',
      rowHeight:'auto', rowStripe:false, rowStripeColor:'',
      rowHover:true, textOverflow:'ellipsis',
      colHeaderBg:'', colHeaderColor:'', colHeaderSize:'xs',
      colHeaderWeight:'700', colHeaderAlign:'left',
    };
    // GPS = 전체 패널 기본 스타일 (개별 적용 없는 패널에 일괄 적용)
    const GPS = Object.assign({}, _GPS_DEFAULTS, current.panelStyle || {});
    // _pS = 해당 패널의 실효 스타일 (GPS + 개별 오버라이드)
    const _pS = p => p.useCustomStyle
      ? Object.assign({}, GPS, p.styles || {})
      : GPS;

    // ── 공통 헬퍼 ──────────────────────────────────────────────
    const sizeOpts = (cur, map) => Object.entries(map).map(([k,l]) =>
      `<option value="${k}"${cur===k?' selected':''}>${l}</option>`).join('');
    const selS = 'padding:3px 6px;border:1px solid var(--border);border-radius:5px;background:var(--bg-primary);color:var(--text-primary);font-size:11px;width:100%';
    const inpS = 'padding:3px 7px;border:1px solid var(--border);border-radius:5px;background:var(--bg-primary);color:var(--text-primary);font-size:11px;width:100%';
    const lbl  = t => `<div style="font-size:9px;font-weight:700;color:var(--text-muted);margin-bottom:3px;text-transform:uppercase;letter-spacing:.05em">${t}</div>`;
    const sec  = t  => `<div style="grid-column:1/-1;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);padding-bottom:4px;margin-top:6px;margin-bottom:2px"><span style="font-size:10px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.07em">${t}</span></div>`;
    const selRow = (val, handler, opts) => `<select style="${selS}" onchange="${handler}">${sizeOpts(val, opts)}</select>`;
    const inpRow = (val, handler, ph='') => `<input type="text" value="${(val||'').replace(/"/g,'&quot;')}" placeholder="${ph}" style="${inpS}" oninput="${handler}">`;
    const clrRow = (val, handler) => {
      const safe = val || '#1a1a2e';
      return `<div style="display:flex;gap:4px;align-items:center"><input type="color" value="${safe}" style="width:26px;height:24px;padding:0;border:1px solid var(--border);border-radius:4px;cursor:pointer;flex-shrink:0" onchange="${handler}"><input type="text" value="${val||''}" placeholder="기본" style="${inpS};flex:1" oninput="${handler}"></div>`;
    };
    const chkRow = (checked, handler, label) => `<label style="display:flex;align-items:center;gap:5px;font-size:11px;cursor:pointer"><input type="checkbox" ${checked?'checked':''} style="accent-color:var(--accent)" onchange="${handler}">${label}</label>`;
    const SS_H  = k => `asmSSSet('${k}',this.value)`;
    const GPS_H  = k => `asmGPSSet('${k}',this.value)`;
    const GPS_HC = k => `asmGPSSet('${k}',this.checked)`;

    // ── 패널 스타일 그리드 생성기 (전체/개별 공용) ─────────────
    const _panelStyleGrid = (V, H, HC, extra='') => `
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(142px,1fr));gap:8px 12px${extra}">
        ${sec('크기 · 배치')}
        <div>${lbl('너비')}${selRow(V.width,H('width'),{auto:'자동 (기본)',full:'100%','50%':'50%','33%':'33%','25%':'25%'})}</div>
        <div>${lbl('최소 너비')}${inpRow(V.minWidth,H('minWidth'),'예: 280px')}</div>
        <div>${lbl('최대 너비')}${inpRow(V.maxWidth,H('maxWidth'),'예: 600px')}</div>
        <div>${lbl('최대 높이')}${inpRow(V.maxHeight,H('maxHeight'),'예: 400px')}</div>
        <div>${lbl('넘침 처리')}${selRow(V.overflow,H('overflow'),{visible:'기본',auto:'스크롤 (auto)',scroll:'항상 스크롤',hidden:'숨김'})}</div>
        <div>${lbl('Flex 늘이기')}${selRow(V.flexGrow,H('flexGrow'),{'0':'고정','1':'늘이기 (1)','2':'늘이기 (2)','3':'늘이기 (3)'})}</div>
        <div>${lbl('투명도')}<div style="display:flex;align-items:center;gap:6px;margin-top:3px"><input type="range" min="0.1" max="1" step="0.05" value="${V.opacity}" style="flex:1;accent-color:var(--accent)" oninput="${H('opacity')};this.nextElementSibling.textContent=Math.round(this.value*100)+'%'"><span style="font-size:10px;color:var(--text-muted);width:30px;text-align:right">${Math.round(parseFloat(V.opacity||1)*100)}%</span></div></div>
        ${sec('배경 · 테두리')}
        <div>${lbl('배경색')}${clrRow(V.background,H('background'))}</div>
        <div>${lbl('테두리 위치')}${selRow(V.borderPos,H('borderPos'),{all:'전체',top:'위만',bottom:'아래만','top-bottom':'위+아래',left:'왼쪽만',right:'오른쪽만','left-right':'좌+우',none:'없음'})}</div>
        <div>${lbl('테두리 스타일')}${selRow(V.borderStyle,H('borderStyle'),{solid:'실선',dashed:'점선 (dash)',dotted:'점 (dot)',double:'이중선',groove:'홈',ridge:'돌출'})}</div>
        <div>${lbl('테두리 굵기')}${selRow(V.borderWidth,H('borderWidth'),{'0':'0px','1':'1px','2':'2px','3':'3px','4':'4px','6':'6px'})}</div>
        <div>${lbl('테두리 색')}${clrRow(V.borderColor,H('borderColor'))}</div>
        <div>${lbl('모서리 둥글기')}${selRow(V.radius,H('radius'),{none:'직각',xs:'2px',sm:'4px',md:'8px',lg:'12px',xl:'20px',full:'완전 둥글'})}</div>
        <div>${lbl('그림자')}${selRow(V.shadow,H('shadow'),{none:'없음',xs:'극소',sm:'작게',md:'보통',lg:'크게',xl:'매우 크게','2xl':'최대',inner:'안쪽'})}</div>
        ${sec('헤더')}
        <div style="grid-column:span 2;display:flex;gap:16px;flex-wrap:wrap;padding:4px 0">
          ${chkRow(V.hideHeader,HC('hideHeader'),'헤더 전체 숨김')}
          ${chkRow(V.headerDivider!==false,HC('headerDivider'),'하단 구분선')}
        </div>
        <div>${lbl('헤더 배경색')}${clrRow(V.headerBg,H('headerBg'))}</div>
        <div>${lbl('헤더 구분선 색')}${clrRow(V.headerDividerColor,H('headerDividerColor'))}</div>
        <div>${lbl('헤더 높이')}${selRow(V.headerHeight,H('headerHeight'),{auto:'자동',xs:'24px',sm:'32px',md:'40px',lg:'48px',xl:'60px'})}</div>
        <div>${lbl('헤더 가로 패딩')}${selRow(V.headerPaddingX,H('headerPaddingX'),{none:'없음',xs:'4px',sm:'8px',md:'14px',lg:'20px'})}</div>
        <div>${lbl('제목 글꼴 크기')}${selRow(V.titleSize,H('titleSize'),{xs:'10px',sm:'11px',md:'13px',lg:'15px',xl:'18px','2xl':'22px'})}</div>
        <div>${lbl('제목 굵기')}${selRow(V.titleWeight,H('titleWeight'),{'300':'가늘게','400':'보통','500':'중간','600':'세미볼드','700':'굵게','800':'더 굵게','900':'최대'})}</div>
        <div>${lbl('제목 색')}${clrRow(V.titleColor,H('titleColor'))}</div>
        <div>${lbl('제목 정렬')}${selRow(V.titleAlign,H('titleAlign'),{left:'왼쪽',center:'가운데',right:'오른쪽'})}</div>
        ${sec('테이블 · 셀')}
        <div>${lbl('셀 테두리 위치')}${selRow(V.cellBorderPos,H('cellBorderPos'),{all:'전체',horizontal:'가로만',vertical:'세로만',outer:'외곽만',none:'없음'})}</div>
        <div>${lbl('셀 테두리 스타일')}${selRow(V.cellBorderStyle,H('cellBorderStyle'),{solid:'실선',dashed:'점선',dotted:'점',double:'이중선'})}</div>
        <div>${lbl('셀 테두리 굵기')}${selRow(V.cellBorderWidth,H('cellBorderWidth'),{'1':'1px','2':'2px','3':'3px'})}</div>
        <div>${lbl('셀 테두리 색')}${clrRow(V.cellBorderColor,H('cellBorderColor'))}</div>
        <div>${lbl('셀 패딩 (좌우)')}${selRow(V.cellPaddingX,H('cellPaddingX'),{none:'없음',xs:'4px',sm:'8px',md:'12px',lg:'16px',xl:'24px'})}</div>
        <div>${lbl('셀 패딩 (위아래)')}${selRow(V.cellPaddingY,H('cellPaddingY'),{none:'없음',xs:'3px',sm:'6px',md:'10px',lg:'14px',xl:'20px'})}</div>
        <div>${lbl('행 높이')}${selRow(V.rowHeight,H('rowHeight'),{auto:'자동',xs:'24px',sm:'32px',md:'40px',lg:'48px',xl:'56px','2xl':'72px'})}</div>
        <div>${lbl('줄무늬 (홀짝)')}${chkRow(V.rowStripe,HC('rowStripe'),'줄무늬 적용')}</div>
        <div>${lbl('줄무늬 배경색')}${clrRow(V.rowStripeColor,H('rowStripeColor'))}</div>
        <div>${lbl('행 hover 강조')}${chkRow(V.rowHover!==false,HC('rowHover'),'hover 하이라이트')}</div>
        <div>${lbl('텍스트 넘침')}${selRow(V.textOverflow,H('textOverflow'),{ellipsis:'말줄임 (…)',clip:'잘라내기',nowrap:'줄바꿈 금지',wrap:'줄바꿈 허용'})}</div>
        ${sec('컬럼 헤더 (thead)')}
        <div>${lbl('컬럼명 배경색')}${clrRow(V.colHeaderBg,H('colHeaderBg'))}</div>
        <div>${lbl('컬럼명 글꼴 색')}${clrRow(V.colHeaderColor,H('colHeaderColor'))}</div>
        <div>${lbl('컬럼명 크기')}${selRow(V.colHeaderSize,H('colHeaderSize'),{xs:'10px',sm:'11px',md:'13px',lg:'15px'})}</div>
        <div>${lbl('컬럼명 굵기')}${selRow(V.colHeaderWeight,H('colHeaderWeight'),{'400':'보통','500':'중간','600':'세미볼드','700':'굵게','800':'더 굵게'})}</div>
        <div>${lbl('컬럼명 정렬')}${selRow(V.colHeaderAlign,H('colHeaderAlign'),{left:'왼쪽',center:'가운데',right:'오른쪽'})}</div>
      </div>`;

    // ── 전체 패널 기본 스타일 섹션 ────────────────────────────
    const globalPanelStyleHtml = `
      <details style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <summary style="background:var(--bg-secondary);padding:9px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border);cursor:pointer;list-style:none;outline:none;user-select:none">
          <span style="font-size:13px;font-weight:700">⚙️ 전체 패널 기본 스타일</span>
          <span style="font-size:10px;color:var(--text-muted)">— 개별 적용 없는 패널에 일괄 적용됩니다</span>
          <span style="margin-left:auto;font-size:10px;color:var(--accent);font-weight:600">▼ 클릭하여 펼치기</span>
        </summary>
        <div style="padding:12px 16px">
          ${_panelStyleGrid(GPS, GPS_H, GPS_HC)}
        </div>
      </details>`;

    // ── 화면 스타일 섹션 ──────────────────────────────────────
    const screenStyleHtml = `
      <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
        <div style="background:var(--bg-secondary);padding:9px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:700">🎨 화면 스타일</span>
          <span style="font-size:10px;color:var(--text-muted)">— 전체 화면 레이아웃 및 시각 설정</span>
        </div>
        <div style="padding:12px 16px;display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:8px 14px">
          ${sec('레이아웃')}
          <div>${lbl('패널 배열')}${selRow(SS.direction,SS_H('direction'),{vertical:'세로 쌓기',horizontal:'가로 배열',grid2:'2열 그리드',grid3:'3열 그리드',grid4:'4열 그리드',split:'좌우 분할 (1:2)','split-eq':'좌우 균등'})}</div>
          <div>${lbl('최대 너비')}${selRow(SS.maxWidth,SS_H('maxWidth'),{'100%':'제한 없음','1600px':'1600px','1440px':'1440px','1200px':'1200px','1024px':'1024px','960px':'960px','800px':'800px','640px':'640px'})}</div>
          <div>${lbl('화면 패딩')}${selRow(SS.padding,SS_H('padding'),{none:'없음',xs:'4px',sm:'8px',md:'16px',lg:'24px',xl:'40px','2xl':'64px'})}</div>
          <div>${lbl('패널 간격 (세로)')}${selRow(SS.gap,SS_H('gap'),{none:'없음',xs:'4px',sm:'8px',md:'16px',lg:'24px',xl:'40px'})}</div>
          <div>${lbl('패널 간격 (가로)')}${selRow(SS.colGap,SS_H('colGap'),{none:'없음',xs:'4px',sm:'8px',md:'16px',lg:'24px',xl:'40px'})}</div>
          <div>${lbl('가로 정렬')}${selRow(SS.justifyContent,SS_H('justifyContent'),{'flex-start':'왼쪽','center':'가운데','flex-end':'오른쪽','space-between':'양끝','stretch':'균등 늘리기'})}</div>
          <div>${lbl('최소 높이')}${inpRow(SS.minHeight,SS_H('minHeight'),'예: 100vh, 600px')}</div>
          ${sec('시각 / 폰트')}
          <div>${lbl('테마')}${selRow(SS.theme,SS_H('theme'),{default:'기본 다크',card:'카드형',minimal:'미니멀',dense:'밀집',light:'라이트'})}</div>
          <div>${lbl('글꼴 크기')}${selRow(SS.fontSize,SS_H('fontSize'),{xs:'10px',sm:'11px',md:'13px (기본)',lg:'15px',xl:'17px'})}</div>
          <div>${lbl('글꼴 패밀리')}${selRow(SS.fontFamily,SS_H('fontFamily'),{default:'기본 (시스템)',monospace:'고정폭 (mono)',sans:'Sans-Serif',serif:'Serif','Pretendard':'Pretendard','Noto Sans KR':'Noto Sans KR'})}</div>
          <div>${lbl('줄 높이')}${selRow(SS.lineHeight,SS_H('lineHeight'),{normal:'기본','1.2':'좁게 (1.2)','1.4':'보통 (1.4)','1.6':'넓게 (1.6)','1.8':'최대 (1.8)'})}</div>
          <div>${lbl('글꼴 색')}${clrRow(SS.fontColor,SS_H('fontColor'))}</div>
          <div>${lbl('배경색')}${clrRow(SS.background,SS_H('background'))}</div>
          <div style="grid-column:span 2">${lbl('배경 이미지 URL')}${inpRow(SS.backgroundImage,SS_H('backgroundImage'),'https://... 또는 비워두면 없음')}</div>
        </div>
      </div>`;

    // ── 레이아웃 행들 ──────────────────────────────────────
    let layoutRows = '';
    (current.layout || []).forEach((p, i) => {
      const vSel = VIEW_MODES.map(v => `<option value="${v.key}"${p.view===v.key?' selected':''}>${v.label}</option>`).join('');
      const mSel = `<option value="">— 모델 선택 —</option>` + modelNames.map(n => `<option value="${n}"${p.model===n?' selected':''}>${n}</option>`).join('');
      const cSel = [{k:'full',l:'전체폭'},{k:'left',l:'왼쪽'},{k:'right',l:'오른쪽'}]
        .map(c => `<option value="${c.k}"${p.col===c.k?' selected':''}>${c.l}</option>`).join('');

      const fields = p.fields || [];
      const allFields = p.model ? ((schema.models.find(m=>m.name===p.model)||{}).fields||[]).map(f=>f.name) : [];
      const badgeLabel = fields.length === 0
        ? `<span style="font-size:10px;color:var(--text-muted);font-style:italic">전체 (${allFields.length}개)</span>`
        : fields.slice(0,3).map(f => `<span style="background:var(--accent-dim);color:var(--accent);border-radius:3px;padding:1px 5px;font-size:10px;font-weight:600">${f}</span>`).join('')
          + (fields.length > 3 ? `<span style="font-size:10px;color:var(--text-muted)">+${fields.length-3}</span>` : '');

      const isStyleOpen = _asmStylePanelIdx === i;
      const PS = _pS(p);

      const styleHints = [];
      if (PS.shadow !== 'none') styleHints.push('그림자');
      if (PS.background) styleHints.push('배경색');
      if (PS.hideHeader) styleHints.push('헤더숨김');
      if (PS.borderPos === 'none') styleHints.push('테두리없음');
      if (PS.rowStripe) styleHints.push('줄무늬');
      const styleBadge = styleHints.length
        ? styleHints.map(h=>`<span style="background:rgba(126,87,194,.15);color:var(--accent2);border-radius:3px;padding:0 4px;font-size:9px">${h}</span>`).join('')
        : `<span style="font-size:9px;color:var(--text-muted)">기본</span>`;

      layoutRows += `
        <tr style="${isStyleOpen ? 'background:var(--accent-dim)' : ''}">
          <td style="padding:6px 8px;color:var(--text-muted);font-size:11px;text-align:center;width:28px">${i+1}</td>
          <td style="padding:4px 6px">
            <select class="inline-input" style="width:120px" onchange="asmLayoutSet(${i},'model',this.value)">${mSel}</select>
          </td>
          <td style="padding:4px 6px">
            <select class="inline-input" style="width:74px" onchange="asmLayoutSet(${i},'view',this.value)">${vSel}</select>
          </td>
          <td style="padding:4px 6px">
            <select class="inline-input" style="width:74px" onchange="asmLayoutSet(${i},'col',this.value)">${cSel}</select>
          </td>
          <td style="padding:4px 6px">
            <input class="inline-input" style="width:100px" value="${(p.title||'').replace(/"/g,'&quot;')}"
                   placeholder="패널 제목" oninput="asmLayoutSet(${i},'title',this.value)">
          </td>
          <td style="padding:4px 6px">
            <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-height:26px">
              ${badgeLabel}
              <button class="btn" style="padding:2px 6px;font-size:10px;white-space:nowrap${!p.model?';opacity:0.4':''}"
                      onclick="openAssemblyFieldModal(${i})" ${!p.model?'disabled':''}>필드</button>
            </div>
          </td>
          <td style="padding:4px 6px;min-width:80px">
            <div style="display:flex;align-items:center;gap:3px;flex-wrap:wrap">
              ${styleBadge}
            </div>
          </td>
          <td style="padding:4px 6px;white-space:nowrap">
            <button class="btn" style="padding:2px 8px;font-size:11px;${isStyleOpen?'background:var(--accent);color:#fff;border-color:var(--accent)':''}"
                    onclick="asmStyleToggle(${i})">🎨</button>
            <button class="btn" style="padding:2px 6px;color:var(--error);font-size:11px;margin-left:2px"
                    onclick="asmLayoutDel(${i})">✕</button>
          </td>
        </tr>`;

      // ── 패널 스타일 확장 행 ───────────────────────────────
      if (isStyleOpen) {
        const ph  = k => `asmPSSet(${i},'${k}',this.value)`;
        const phc = k => `asmPSSet(${i},'${k}',this.checked)`;
        const customOn = p.useCustomStyle === true;
        // 개별 적용 OFF 시 컨트롤 표시는 하되 수정 불가 (전체값 미리보기)
        const lockStyle = customOn ? '' : ';opacity:0.45;pointer-events:none;filter:grayscale(0.2)';
        // 개별 적용 시 보여줄 값: GPS 위에 p.styles 오버라이드
        const PSown = Object.assign({}, GPS, p.styles || {});
        layoutRows += `
        <tr>
          <td colspan="8" style="padding:0;border-top:none">
            <div style="background:var(--bg-secondary);border-top:1px dashed var(--accent);padding:12px 16px">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;flex-wrap:wrap">
                <span style="font-size:11px;font-weight:700;color:var(--accent)">🎨 패널 #${i+1} 스타일</span>
                <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;font-weight:600;padding:4px 10px;border-radius:6px;border:1px solid ${customOn?'var(--accent)':'var(--border)'};background:${customOn?'var(--accent-dim)':'transparent'};color:${customOn?'var(--accent)':'var(--text-muted)'}">
                  <input type="checkbox" ${customOn?'checked':''} style="accent-color:var(--accent)"
                         onchange="asmPSSet(${i},'useCustomStyle',this.checked)">
                  개별 스타일 적용
                </label>
                ${customOn
                  ? `<span style="font-size:10px;color:var(--accent2)">✓ 이 패널만 별도 설정 — 전체 기본값 위에 덮어씁니다</span>`
                  : `<span style="font-size:10px;color:var(--text-muted)">⚙️ 전체 기본 스타일 적용 중 — 아래는 현재 전체값 미리보기입니다 (수정하려면 개별 적용 체크)</span>`}
              </div>
              ${_panelStyleGrid(PSown, ph, phc, lockStyle)}
            </div>
          </td>
        </tr>`;
      }
    });

    // ── Flow 행들 ──────────────────────────────────────────
    let flowRows = '';
    (current.flows || []).forEach((f, i) => {
      const wModel = modelNames.map(n => `<option value="${n}"${f.watchModel===n?' selected':''}>${n}</option>`).join('');
      const oModel = modelNames.map(n => `<option value="${n}"${f.outputModel===n?' selected':''}>${n}</option>`).join('');
      const wFields = f.watchModel ? ((schema.models.find(m=>m.name===f.watchModel)||{}).fields||[]).map(fld =>
        `<option value="${fld.name}"${f.watchField===fld.name?' selected':''}>${fld.name}</option>`).join('') : '';
      const oFields = f.outputModel ? ((schema.models.find(m=>m.name===f.outputModel)||{}).fields||[]).map(fld =>
        `<option value="${fld.name}"${f.outputField===fld.name?' selected':''}>${fld.name}</option>`).join('') : '';
      const rmSel = [{k:'same',l:'같은 행'},{k:'broadcast',l:'전체 행'},{k:'selected',l:'선택 행'}]
        .map(r => `<option value="${r.k}"${f.rowMap===r.k?' selected':''}>${r.l}</option>`).join('');

      flowRows += `
        <tr>
          <td style="padding:4px 6px"><select class="inline-input" style="width:110px" onchange="asmFlowSet(${i},'watchModel',this.value)"><option value="">— 모델 —</option>${wModel}</select></td>
          <td style="padding:4px 6px"><select class="inline-input" style="width:110px" onchange="asmFlowSet(${i},'watchField',this.value)"><option value="">— 필드 —</option>${wFields}</select></td>
          <td style="padding:4px 6px;text-align:center"><span style="font-size:12px;color:var(--accent2);font-weight:700">→</span></td>
          <td style="padding:4px 6px"><select class="inline-input" style="width:110px" onchange="asmFlowSet(${i},'outputModel',this.value)"><option value="">— 모델 —</option>${oModel}</select></td>
          <td style="padding:4px 6px"><select class="inline-input" style="width:110px" onchange="asmFlowSet(${i},'outputField',this.value)"><option value="">— 필드 —</option>${oFields}</select></td>
          <td style="padding:4px 6px"><select class="inline-input" style="width:76px" onchange="asmFlowSet(${i},'rowMap',this.value)">${rmSel}</select></td>
          <td style="padding:4px 6px;width:28px"><button class="btn" style="padding:2px 6px;color:var(--error);font-size:11px" onclick="asmFlowDel(${i})">✕</button></td>
        </tr>`;
    });

    rightHtml = `
    <div style="display:flex;flex-direction:column;gap:0;overflow-y:auto;flex:1;min-height:0">

      <!-- 헤더 바 -->
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--bg-primary);flex-shrink:0">
        <div>
          <div style="font-size:15px;font-weight:700;color:var(--text-primary)">${current.label || sn}</div>
          <div style="font-size:10px;color:var(--text-muted);font-family:var(--font-mono)">${sn}</div>
        </div>
        <div style="margin-left:12px;display:flex;align-items:center;gap:6px">
          <span style="font-size:11px;color:var(--text-muted)">라벨</span>
          <input class="inline-input" style="width:150px;font-size:12px"
                 value="${(current.label||'').replace(/"/g,'&quot;')}"
                 placeholder="화면 표시 이름" oninput="asmEditLabel(this.value)">
        </div>
        <button class="btn btn-accent"
                style="margin-left:auto;padding:6px 18px;font-size:13px;font-weight:700"
                onclick="runAssemblyTest()">▶ 테스트</button>
      </div>

      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:14px">

        ${screenStyleHtml}

        ${globalPanelStyleHtml}

        <!-- Layout 섹션 -->
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <div style="background:var(--bg-secondary);padding:9px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;font-weight:700">📐 레이아웃</span>
            <span style="font-size:10px;color:var(--text-muted)">— 패널 구성 및 필드·스타일 설정</span>
            <button class="btn btn-accent" style="margin-left:auto;font-size:11px;padding:4px 12px" onclick="asmLayoutAdd()">＋ 패널 추가</button>
          </div>
          <div style="overflow-x:auto">
            <table class="excel-table" style="width:100%;min-width:700px">
              <thead><tr>
                <th style="width:28px">#</th>
                <th style="min-width:120px">모델</th>
                <th style="min-width:74px">뷰모드</th>
                <th style="min-width:74px">컬럼배치</th>
                <th style="min-width:100px">패널 제목</th>
                <th>표시 필드</th>
                <th>현재 스타일</th>
                <th style="width:60px"></th>
              </tr></thead>
              <tbody>
                ${layoutRows || `<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">패널을 추가하세요</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

        <!-- Flow 섹션 -->
        <div style="border:1px solid var(--border);border-radius:8px;overflow:hidden">
          <div style="background:var(--bg-secondary);padding:9px 14px;display:flex;align-items:center;gap:8px;border-bottom:1px solid var(--border)">
            <span style="font-size:13px;font-weight:700">🔀 데이터 흐름 (Flow)</span>
            <span style="font-size:10px;color:var(--text-muted)">— 한 모델의 값 변경 시 다른 모델로 자동 복사</span>
            <button class="btn btn-accent" style="margin-left:auto;font-size:11px;padding:4px 12px" onclick="asmFlowAdd()">＋ Flow 추가</button>
          </div>
          <div style="overflow-x:auto">
            <table class="excel-table" style="width:100%;min-width:660px">
              <thead><tr>
                <th>감시 모델</th><th>감시 필드</th><th style="width:28px"></th>
                <th>출력 모델</th><th>출력 필드</th><th>행 매핑</th><th style="width:32px"></th>
              </tr></thead>
              <tbody>
                ${flowRows || `<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--text-muted);font-size:12px">Flow를 추가하세요</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>`;
  }

  wrap.innerHTML = `
  <div style="display:flex;flex-direction:row;min-height:100%">
    <div style="width:196px;flex-shrink:0;border-right:1px solid var(--border);padding:10px;overflow-y:auto;background:var(--bg-secondary)">
      ${leftHtml}
    </div>
    <div style="flex:1;min-width:0;display:flex;flex-direction:column">
      ${rightHtml}
    </div>
  </div>`;
}

// ── 화면 추가 모달 ─────────────────────────────────────────────
function openAssemblyAddModal() {
  const modal = document.getElementById('assemblyAddModal');
  if (!modal) return;
  document.getElementById('assemblyAddName').value = '';
  document.getElementById('assemblyAddLabel').value = '';
  document.getElementById('assemblyAddNameErr').textContent = '';
  document.getElementById('assemblyAddConfirmBtn').disabled = true;
  document.getElementById('assemblyAddConfirmBtn').style.opacity = '0.4';
  modal.classList.add('show');
  setTimeout(() => document.getElementById('assemblyAddName').focus(), 50);
}

function closeAssemblyAddModal() {
  document.getElementById('assemblyAddModal').classList.remove('show');
}

function assemblyAddValidate() {
  const name = document.getElementById('assemblyAddName').value.trim();
  const errEl = document.getElementById('assemblyAddNameErr');
  const btn = document.getElementById('assemblyAddConfirmBtn');
  if (!name) {
    errEl.textContent = '';
    btn.disabled = true; btn.style.opacity = '0.4';
    return;
  }
  if (assemblyStore[name]) {
    errEl.textContent = `"${name}" 은 이미 존재합니다`;
    btn.disabled = true; btn.style.opacity = '0.4';
    return;
  }
  errEl.textContent = '';
  btn.disabled = false; btn.style.opacity = '1';
}

function assemblyAddConfirm() {
  const name = document.getElementById('assemblyAddName').value.trim();
  if (!name || assemblyStore[name]) return;
  const label = document.getElementById('assemblyAddLabel').value.trim() || name;
  _assemblyEnsure(name).label = label;
  selectedAssemblyScreen = name;
  closeAssemblyAddModal();
  renderUiTable();
  toast(`"${label}" 화면 추가됨`, 'success');
}

// ── 화면 CRUD ──────────────────────────────────────────────────
function assemblyDelete(screenName) {
  if (!confirm(`"${screenName}" 화면을 삭제할까요?`)) return;
  delete assemblyStore[screenName];
  if (selectedAssemblyScreen === screenName) selectedAssemblyScreen = Object.keys(assemblyStore)[0] || null;
  renderUiTable();
}

function assemblySelect(screenName) {
  selectedAssemblyScreen = screenName;
  renderUiTable();
}

function assemblyEditLabel(screenName, val) {
  _assemblyEnsure(screenName).label = val;
}

// ── 현재 화면 전용 래퍼 (onchange/oninput 에서 selectedAssemblyScreen 직접 참조) ──
// 이 함수들은 onchange="asmLayoutSet(0,'model',this.value)" 형태로 호출됨.
// screenName을 HTML attribute에 문자열로 박지 않아 파싱 버그가 없음.
function asmLayoutAdd()           { if (!selectedAssemblyScreen) return; assemblyLayoutAdd(selectedAssemblyScreen); }
function asmLayoutDel(i)          { if (!selectedAssemblyScreen) return; assemblyLayoutDel(selectedAssemblyScreen, i); }
function asmLayoutSet(i, key, val){ if (!selectedAssemblyScreen) return; assemblyLayoutEdit(selectedAssemblyScreen, i, key, val); }
function asmFlowAdd()             { if (!selectedAssemblyScreen) return; assemblyFlowAdd(selectedAssemblyScreen); }
function asmFlowDel(i)            { if (!selectedAssemblyScreen) return; assemblyFlowDel(selectedAssemblyScreen, i); }
function asmFlowSet(i, key, val)  { if (!selectedAssemblyScreen) return; assemblyFlowEdit(selectedAssemblyScreen, i, key, val); }
function asmEditLabel(val)        { if (!selectedAssemblyScreen) return; assemblyEditLabel(selectedAssemblyScreen, val); }

function asmStyleToggle(i) {
  _asmStylePanelIdx = (_asmStylePanelIdx === i) ? null : i;
  renderUiTable();
}
function asmSSSet(key, val) {
  if (!selectedAssemblyScreen) return;
  const s = _assemblyEnsure(selectedAssemblyScreen);
  if (!s.styles) s.styles = {};
  s.styles[key] = val;
}
function asmPSSet(i, key, val) {
  if (!selectedAssemblyScreen) return;
  const s = _assemblyEnsure(selectedAssemblyScreen);
  if (!s.layout[i]) return;
  if (!s.layout[i].styles) s.layout[i].styles = {};
  s.layout[i].styles[key] = val;
  if (key === 'useCustomStyle') renderUiTable();
}
function asmGPSSet(key, val) {
  if (!selectedAssemblyScreen) return;
  const s = _assemblyEnsure(selectedAssemblyScreen);
  s.panelStyle[key] = val;
}

// ── Layout CRUD ────────────────────────────────────────────────
function assemblyLayoutAdd(screenName) {
  const s = _assemblyEnsure(screenName);
  s.layout.push({ panelId: 'p' + Date.now(), model: '', view: '1to1', col: 'full', title: '', fields: [] });
  renderUiTable();
}

function assemblyLayoutDel(screenName, i) {
  const s = _assemblyEnsure(screenName);
  s.layout.splice(i, 1);
  renderUiTable();
}

function assemblyLayoutEdit(screenName, i, key, val) {
  const s = _assemblyEnsure(screenName);
  if (!s.layout[i]) return;
  if (key === 'model') s.layout[i].fields = [];
  s.layout[i][key] = val;
  // ⚠️ 규칙: 텍스트 oninput → 저장만, re-render 금지 (포커스 소실 방지)
  // select/구조 변경 키(model/view/col/fields)만 re-render
  const RERENDERS = ['model', 'view', 'col', 'fields', 'useCustomStyle'];
  if (RERENDERS.includes(key)) renderUiTable();
}

// ── 필드 선택 모달 ─────────────────────────────────────────────
let _assemblyFieldTarget = null; // { screenName, panelIdx }

function openAssemblyFieldModal(panelIdx) {
  const screenName = selectedAssemblyScreen;
  if (!screenName) return;
  const s = assemblyStore[screenName];
  if (!s || !s.layout[panelIdx]) return;
  const p = s.layout[panelIdx];
  if (!p.model) return;

  _assemblyFieldTarget = { screenName, panelIdx };

  const modelDef = schema.models.find(m => m.name === p.model);
  const allFields = (modelDef?.fields || []).map(f => f.name);
  const selected = new Set(p.fields || []);

  document.getElementById('assemblyFieldModalTitle').textContent = `📋 ${p.model} — 표시 필드 선택`;
  document.getElementById('assemblyFieldSearch').value = '';
  _renderAssemblyFieldList(allFields, selected, '');

  document.getElementById('assemblyFieldModal').classList.add('show');
}

function _renderAssemblyFieldList(allFields, selected, query) {
  const list = document.getElementById('assemblyFieldList');
  const filtered = query ? allFields.filter(f => f.toLowerCase().includes(query.toLowerCase())) : allFields;

  if (filtered.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">검색 결과 없음</div>`;
    return;
  }

  list.innerHTML = filtered.map(f => {
    const chk = selected.has(f);
    return `
      <label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;transition:background .1s"
             onmouseover="this.style.background='var(--bg-hover)'" onmouseout="this.style.background='transparent'">
        <input type="checkbox" ${chk ? 'checked' : ''} value="${f}"
               style="accent-color:var(--accent);width:14px;height:14px;flex-shrink:0"
               onchange="_assemblyFieldToggle('${f}',this.checked)">
        <span style="font-size:12px;font-family:var(--font-mono);color:var(--text-primary)">${f}</span>
      </label>`;
  }).join('');
}

function assemblyFieldFilter() {
  if (!_assemblyFieldTarget) return;
  const { screenName, panelIdx } = _assemblyFieldTarget;
  const p = assemblyStore[screenName]?.layout[panelIdx];
  if (!p) return;
  const allFields = ((schema.models.find(m=>m.name===p.model)||{}).fields||[]).map(f=>f.name);
  const selected = new Set(p.fields || []);
  _renderAssemblyFieldList(allFields, selected, document.getElementById('assemblyFieldSearch').value);
}

function _assemblyFieldToggle(fieldName, checked) {
  if (!_assemblyFieldTarget) return;
  const { screenName, panelIdx } = _assemblyFieldTarget;
  const p = assemblyStore[screenName]?.layout[panelIdx];
  if (!p) return;
  if (!p.fields) p.fields = [];
  if (checked) { if (!p.fields.includes(fieldName)) p.fields.push(fieldName); }
  else { p.fields = p.fields.filter(f => f !== fieldName); }
}

function assemblyFieldSelectAll() {
  if (!_assemblyFieldTarget) return;
  const { screenName, panelIdx } = _assemblyFieldTarget;
  const p = assemblyStore[screenName]?.layout[panelIdx];
  if (!p) return;
  const allFields = ((schema.models.find(m=>m.name===p.model)||{}).fields||[]).map(f=>f.name);
  p.fields = [...allFields];
  assemblyFieldFilter();
}

function assemblyFieldClearAll() {
  if (!_assemblyFieldTarget) return;
  const { screenName, panelIdx } = _assemblyFieldTarget;
  const p = assemblyStore[screenName]?.layout[panelIdx];
  if (!p) return;
  p.fields = [];
  assemblyFieldFilter();
}

function assemblyFieldConfirm() {
  closeAssemblyFieldModal();
  renderUiTable();
}

function closeAssemblyFieldModal() {
  document.getElementById('assemblyFieldModal').classList.remove('show');
  _assemblyFieldTarget = null;
}

// ── Flow CRUD ──────────────────────────────────────────────────
function assemblyFlowAdd(screenName) {
  const s = _assemblyEnsure(screenName);
  s.flows.push({ watchModel: '', watchField: '', type: 'copy', outputModel: '', outputField: '', rowMap: 'same' });
  renderUiTable();
}

function assemblyFlowDel(screenName, i) {
  const s = _assemblyEnsure(screenName);
  s.flows.splice(i, 1);
  renderUiTable();
}

function assemblyFlowEdit(screenName, i, key, val) {
  const s = _assemblyEnsure(screenName);
  if (!s.flows[i]) return;
  s.flows[i][key] = val;
  renderUiTable();
}

// ── 테스트 실행 ────────────────────────────────────────────────
function runAssemblyTest(screenName) {
  const sn = screenName || selectedAssemblyScreen;
  const s = assemblyStore[sn];
  if (!s) return;

  const models = (s.layout || []).map(p => p.model).filter(Boolean);
  if (models.length === 0) { toast('레이아웃에 모델을 추가하세요', 'error'); return; }

  uitestChecked = new Set(models);

  const uitestTab = document.querySelector('.nav-tab[data-panel="uitest"]');
  if (uitestTab) uitestTab.click();

  setTimeout(() => {
    if (typeof renderUiTestSidebar === 'function') renderUiTestSidebar();
    if (typeof renderUiTestPreview === 'function') renderUiTestPreview();
  }, 50);
}
