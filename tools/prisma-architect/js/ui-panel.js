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

let uiHeaders = [
  { name: 'label',             type: 'text',  options: [],               uiRole: 'label' },
  { name: 'commentary',        type: 'text',  options: [],               uiRole: 'placeholder' },
  { name: 'isRequired',        type: 'combo', options: ['true','false'], uiRole: 'required' },
  { name: 'initialCreation',   type: 'combo', options: ['true','false'], uiRole: 'showCreate' },
  { name: 'showNode',          type: 'combo', options: ['true','false'], uiRole: 'showList' },
  { name: 'showNodeDetail',    type: 'combo', options: ['true','false'], uiRole: 'showDetail' },
  { name: 'systemType',        type: 'combo', options: [],               uiRole: 'none' },
  { name: 'variableType',      type: 'combo', options: [],               uiRole: 'componentType' },
  { name: 'width',             type: 'text',  options: [],               uiRole: 'width' },
  { name: 'defaultValue',      type: 'text',  options: [],               uiRole: 'none' },
  { name: 'comboboxName',      type: 'combo', options: [],               uiRole: 'none' },
  { name: 'dataSource',        type: 'model', options: [],               uiRole: 'none' },
  { name: 'creationConditions',type: 'text',  options: [],               uiRole: 'none' },
  { name: 'fnTriggerEvent',    type: 'text',  options: [],               uiRole: 'none' },
  { name: 'fnName',            type: 'text',  options: [],               uiRole: 'none' },
  { name: 'fnInputParams',     type: 'text',  options: [],               uiRole: 'none' },
  { name: 'fnOutputTarget',    type: 'text',  options: [],               uiRole: 'none' },
  { name: 'fnSyncCondition',   type: 'text',  options: [],               uiRole: 'none' },
];

// 동적 헤더 옵션 동기화 (systemType, variableType, comboboxName은 각 스토어에서 실시간 참조)
function syncDynamicHeaderOptions() {
  const st = uiHeaders.find(h => h.name === 'systemType');
  if (st) { st.type = 'combo'; st.options = systemTypeStore.map(t => t.key); }
  const vt = uiHeaders.find(h => h.name === 'variableType');
  if (vt) { vt.type = 'combo'; vt.options = variableTypeStore.map(t => t.key); }
  const cb = uiHeaders.find(h => h.name === 'comboboxName');
  if (cb) { cb.type = 'combo'; cb.options = Object.keys(comboboxStore); }
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
        <thead><tr><th style="width:32px"></th><th>헤더명</th><th>타입</th><th>콤보 옵션</th><th>UI역할</th><th style="width:48px"></th></tr></thead>
        <tbody id="headerMgmtBody">`;

    const sel = p => UI_ROLES.map(r => `<option value="${r.key}"${p === r.key ? ' selected' : ''}>${r.label}</option>`).join('');

    uiHeaders.forEach((h, i) => {
      const role = h.uiRole || 'none';
      const roleColor = role !== 'none' ? 'color:var(--accent)' : 'color:var(--text-muted)';
      html += `<tr data-idx="${i}" draggable="true" style="cursor:grab">
        <td style="color:var(--text-muted);text-align:center;font-size:16px;cursor:grab">⠿</td>
        <td contenteditable="true" data-hidx="${i}"
          style="font-weight:600;font-family:var(--font-mono);color:var(--accent);outline:none;min-width:120px"
          onblur="uiHeaderNameChange(${i},this.textContent.trim())"
          onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}"
        >${h.name}</td>
        <td>
          <select onchange="uiHeaderTypeChange(${i},this.value)" style="padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px">
            <option value="text"${h.type === 'text' ? ' selected' : ''}>텍스트</option>
            <option value="combo"${h.type === 'combo' ? ' selected' : ''}>콤보박스</option>
            <option value="model"${h.type === 'model' ? ' selected' : ''}>모델참조</option>
          </select>
        </td>
        <td>
          <input value="${h.type === 'model' ? '' : h.options.join(',')}"
            placeholder="${h.type === 'model' ? '자동 생성' : '옵션1,옵션2'}"
            onchange="uiHeaderOptionsChange(${i},this.value)"
            ${h.type !== 'combo' ? 'disabled style="opacity:0.4"' : ''}
            style="width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;font-family:var(--font-mono);outline:none">
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
    const badge = (h.type === 'combo' || h.type === 'model') ? `<span style="font-size:9px;color:var(--accent2);margin-left:3px">▼</span>` : '';
    return `<th style="white-space:nowrap">${h.name}${badge}</th>`;
  }).join('');

  let html = `<table class="excel-table" id="uiMetaTable">
    <thead><tr><th style="width:32px;position:sticky;left:0;z-index:11;background:var(--bg-secondary);border-right:1px solid var(--border)"></th><th style="min-width:140px;position:sticky;left:32px;z-index:11;background:var(--bg-secondary);border-right:1px solid var(--border)">fieldName</th>${thHtml}<th></th></tr></thead><tbody id="uiMetaTableBody">`;

  rows.forEach((row) => {
    const modelOpts = schema.models.map(m => m.name);
    const tds = uiHeaders.map(h => {
      const val = row.meta[h.name] !== undefined ? row.meta[h.name] : '';
      const fillBtn = `<button contenteditable="false" class="fill-down-btn" title="아래로 채우기" onclick="event.stopPropagation();fillDown('${row.fieldName}','${h.name}')">↓</button>`;
      if (h.type === 'combo' && h.options.length > 0) {
        const opts = ['', ...h.options].map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '—'}</option>`).join('');
        return `<td style="min-width:100px;padding:4px 8px;position:relative"><select data-field="${row.fieldName}" data-col="${h.name}" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);font-size:12px">${opts}</select>${fillBtn}</td>`;
      }
      if (h.type === 'model') {
        const opts = ['', ...modelOpts].map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '—'}</option>`).join('');
        return `<td style="min-width:120px;padding:4px 8px;position:relative"><select data-field="${row.fieldName}" data-col="${h.name}" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);font-size:12px">${opts}</select>${fillBtn}</td>`;
      }
      return `<td style="min-width:90px;position:relative;padding:0"><span contenteditable="true" data-field="${row.fieldName}" data-col="${h.name}" style="display:block;padding:7px 24px 7px 12px;outline:none;min-height:100%">${val}</span>${fillBtn}</td>`;
    }).join('');

    const isBorrowed = row.fieldName.includes('.');
    const fieldColor = isBorrowed ? 'color:var(--accent)' : row.extraOnly ? 'color:var(--accent2)' : 'color:var(--text-muted)';
    const borrowedBadge = isBorrowed ? `<span style="font-size:9px;background:var(--accent-dim);color:var(--accent);padding:1px 6px;border-radius:99px;font-weight:700;margin-left:6px">${row.fieldName.split('.')[0]}</span>` : '';
    html += `<tr draggable="true" data-field="${row.fieldName}">
      <td style="text-align:center;position:sticky;left:0;background:var(--bg-secondary);z-index:5;padding:2px 6px;cursor:grab;color:var(--text-muted);font-size:16px;user-select:none;border-right:1px solid var(--border)">⠿</td>
      <td style="font-weight:600;${fieldColor};white-space:nowrap;position:sticky;left:32px;background:var(--bg-secondary);z-index:5;border-right:1px solid var(--border)">${row.fieldName.includes('.') ? row.fieldName.split('.')[1] : row.fieldName}${borrowedBadge}</td>
      ${tds}
      <td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="uiDelRow('${row.fieldName}')">✕</button></td>
    </tr>`;
  });
  html += '</tbody></table>';
  wrap.innerHTML = html;
  initRowDragDrop();
}

function uiHeaderNameChange(i, val) {
  if (!val) return;
  if (uiHeaders.find((h, idx) => h.name === val && idx !== i)) { toast('이미 존재하는 헤더명입니다', 'error'); return; }
  uiHeaders[i].name = val;
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

function uiHeaderDelete(i) {
  if (!confirm(`헤더 "${uiHeaders[i].name}" 를 삭제할까요?`)) return;
  uiHeaders.splice(i, 1);
  renderUiTable();
}

function openAddHeaderModal() {
  const name = prompt('새 헤더 이름:');
  if (!name || !name.trim()) return;
  if (uiHeaders.find(h => h.name === name.trim())) { toast('이미 존재하는 헤더입니다', 'error'); return; }
  uiHeaders.push({ name: name.trim(), type: 'text', options: [], uiRole: 'none' });
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
      const v = cell.tagName === 'SELECT' ? cell.value : (() => { const c = cell.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); return c.textContent.trim(); })();
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
      if (cell) {
        const val = cell.tagName === 'SELECT' ? cell.value : (() => { const c = cell.cloneNode(true); c.querySelectorAll('button').forEach(b => b.remove()); return c.textContent.trim(); })();
        metaStore[selectedUiModel][fieldName][h.name] = val;
      }
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
