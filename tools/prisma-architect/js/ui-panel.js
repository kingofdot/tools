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
  { key: 'text',            desc: '사용자 직접 입력, 제한 없음' },
  { key: 'number',          desc: '숫자' },
  { key: 'date',            desc: '날짜' },
  { key: 'select',          desc: '목록에서 선택 (수정 불가)' },
  { key: 'combobox',        desc: '목록에서 선택 (수정 가능)' },
  { key: 'boolean',         desc: '참 그리고 거짓' },
  { key: 'calculation',     desc: '계산되는 값, 수정 불가' },
  { key: 'lookup_editable', desc: '일정 값에 따라 로딩되는 값, 수정 가능' },
  { key: 'lookup_readonly', desc: '일정 값에 따라 로딩되는 값, 수정 불가' },
  { key: 'hidden',          desc: 'UI에선 보이지 않음' },
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
  calculation: {
    highlight: ['onChange'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource','isRequired','defaultValue','variableType','onClick','focusOut','realtime'],
  },
  calculation_editable: {
    highlight: ['onChange'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','dataSource','isRequired','defaultValue','variableType','onClick','focusOut','realtime'],
  },
  lookup_readonly: {
    highlight: ['dataSource'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup','isRequired','defaultValue'],
  },
  lookup_editable: {
    highlight: ['dataSource'],
    dim: ['comboboxName','dbTable','dbColumn','syncGroup'],
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
    const tds = uiHeaders.map(h => {
      const val = row.meta[h.name] !== undefined ? row.meta[h.name] : '';
      const fillBtn = `<button contenteditable="false" class="fill-down-btn" title="아래로 채우기" onclick="event.stopPropagation();fillDown('${row.fieldName}','${h.name}')">↓</button>`;
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
      <thead><tr><th style="min-width:160px">타입 키</th><th>설명</th><th style="width:48px"></th></tr></thead>
      <tbody>
        ${store.map((t, i) => `
          <tr>
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
        <div onclick="comboboxSelectGroup('${g}')"
          style="padding:7px 10px;border-radius:7px;cursor:pointer;font-weight:600;font-family:var(--font-mono);font-size:12px;
          background:${selectedComboboxGroup === g ? 'var(--accent-dim)' : 'transparent'};
          color:${selectedComboboxGroup === g ? 'var(--accent)' : 'var(--text-primary)'};
          border:${selectedComboboxGroup === g ? '1px solid var(--accent)' : '1px solid transparent'};
          margin-bottom:3px;display:flex;align-items:center;gap:6px">
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
        <div onclick="fnStoreSelect(${i})"
          style="padding:7px 10px;border-radius:7px;cursor:pointer;margin-bottom:3px;
          background:${selectedFunctionIdx === i ? 'var(--accent-dim)' : 'transparent'};
          border:${selectedFunctionIdx === i ? '1px solid var(--accent)' : '1px solid transparent'};
          display:flex;align-items:center;gap:6px">
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
        return `<div onclick="masterDataSelect(${i})"
          style="padding:7px 10px;border-radius:7px;cursor:pointer;margin-bottom:3px;
          background:${active ? 'var(--accent-dim)' : 'transparent'};
          border:${active ? '1px solid var(--accent)' : '1px solid transparent'};
          display:flex;align-items:center;gap:6px">
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
