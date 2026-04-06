// === UI 관리 (필드 메타 테이블) ===

let uiHeaders = [
  { name: 'commentary', type: 'text', options: [] },
  { name: 'id', type: 'text', options: [] },
  { name: 'label', type: 'text', options: [] },
  { name: 'variableType', type: 'text', options: [] },
  { name: 'systemType', type: 'text', options: [] },
  { name: 'isRequired', type: 'combo', options: ['true', 'false'] },
  { name: 'defaultValue', type: 'text', options: [] },
  { name: 'showNode', type: 'combo', options: ['true', 'false'] },
  { name: 'showNodeDeatil', type: 'combo', options: ['true', 'false'] },
  { name: 'initialCreation', type: 'combo', options: ['true', 'false'] },
  { name: 'width', type: 'text', options: [] },
  { name: 'comboboxName', type: 'text', options: [] },
  { name: 'creationConditions', type: 'text', options: [] },
  { name: 'fnTriggerEvent', type: 'text', options: [] },
  { name: 'fnName', type: 'text', options: [] },
  { name: 'fnInputParams', type: 'text', options: [] },
  { name: 'fnOutputTarget', type: 'text', options: [] },
  { name: 'fnSyncCondition', type: 'text', options: [] },
  { name: 'dataSource', type: 'model', options: [] },
];

// metaStore: { [modelName]: { [fieldName]: { [header]: value } } }
let metaStore = {};
// rowOrderStore: { [modelName]: [fieldName, ...] }
let rowOrderStore = {};
let selectedUiModel = null;

function renderUiSidebar() {
  const sb = document.getElementById('uiSidebar');
  sb.innerHTML = '<div class="excel-sidebar-title">UI 관리</div>';

  const hd = document.createElement('div');
  hd.className = 'excel-model-item' + (selectedUiModel === null ? ' active' : '');
  hd.innerHTML = `<span style="font-size:14px">⚙️</span> 헤더 관리`;
  hd.onclick = () => { selectedUiModel = null; renderUiSidebar(); renderUiTable(); };
  sb.appendChild(hd);

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
  const wrap = document.getElementById('uiContent');

  // 헤더 관리 화면
  if (selectedUiModel === null) {
    document.getElementById('uiTitle').textContent = '⚙️ 헤더 관리';
    document.getElementById('uiAddRowBtn').style.display = 'none';
    document.getElementById('uiApplyBtn').style.display = 'none';

    let html = `
    <div style="padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
        <span style="font-size:13px;font-weight:600;color:var(--text-secondary)">헤더 목록 (드래그로 순서 변경 가능)</span>
        <button class="btn btn-accent" style="margin-left:auto" onclick="openAddHeaderModal()">+ 헤더 추가</button>
      </div>
      <table class="excel-table" id="headerMgmtTable" style="width:100%">
        <thead><tr><th style="width:32px"></th><th>헤더명</th><th>타입</th><th>콤보 옵션 (쉼표 구분)</th><th style="width:60px"></th></tr></thead>
        <tbody id="headerMgmtBody">`;

    uiHeaders.forEach((h, i) => {
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
            <option value="model"${h.type === 'model' ? ' selected' : ''}>모델 참조</option>
          </select>
        </td>
        <td>
          <input value="${h.type === 'model' ? '' : h.options.join(',')}"
            placeholder="${h.type === 'model' ? '스키마 모델에서 자동 생성' : '옵션1,옵션2,옵션3'}"
            onchange="uiHeaderOptionsChange(${i},this.value)"
            ${h.type !== 'combo' ? 'disabled style="opacity:0.4"' : ''}
            style="width:100%;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-primary);color:var(--text-primary);font-size:12px;font-family:var(--font-mono);outline:none">
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
  document.getElementById('uiTitle').textContent = selectedUiModel;
  document.getElementById('uiAddRowBtn').style.display = '';
  document.getElementById('uiApplyBtn').style.display = '';

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
    <thead><tr><th style="width:32px;position:sticky;left:0;z-index:11;background:var(--bg-secondary)"></th><th style="min-width:140px;position:sticky;left:32px;z-index:11;background:var(--bg-secondary)">fieldName</th>${thHtml}<th></th></tr></thead><tbody id="uiMetaTableBody">`;

  rows.forEach((row) => {
    const modelOpts = schema.models.map(m => m.name);
    const tds = uiHeaders.map(h => {
      const val = row.meta[h.name] !== undefined ? row.meta[h.name] : '';
      if (h.type === 'combo' && h.options.length > 0) {
        const opts = ['', ...h.options].map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '—'}</option>`).join('');
        return `<td style="min-width:100px;padding:4px 8px"><select data-field="${row.fieldName}" data-col="${h.name}" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);font-size:12px">${opts}</select></td>`;
      }
      if (h.type === 'model') {
        const opts = ['', ...modelOpts].map(o => `<option value="${o}"${o === val ? ' selected' : ''}>${o || '—'}</option>`).join('');
        return `<td style="min-width:120px;padding:4px 8px"><select data-field="${row.fieldName}" data-col="${h.name}" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:var(--bg-primary);color:var(--text-primary);font-size:12px">${opts}</select></td>`;
      }
      return `<td contenteditable="true" data-field="${row.fieldName}" data-col="${h.name}" style="min-width:90px">${val}</td>`;
    }).join('');

    const extraStyle = row.extraOnly ? 'color:var(--accent2)' : 'color:var(--text-muted)';
    html += `<tr draggable="true" data-field="${row.fieldName}">
      <td style="text-align:center;position:sticky;left:0;background:var(--bg-secondary);z-index:5;padding:2px 6px;cursor:grab;color:var(--text-muted);font-size:16px;user-select:none">⠿</td>
      <td style="font-weight:600;${extraStyle};white-space:nowrap;position:sticky;left:32px;background:var(--bg-secondary);z-index:5">${row.fieldName}</td>
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

function uiHeaderDelete(i) {
  if (!confirm(`헤더 "${uiHeaders[i].name}" 를 삭제할까요?`)) return;
  uiHeaders.splice(i, 1);
  renderUiTable();
}

function openAddHeaderModal() {
  const name = prompt('새 헤더 이름:');
  if (!name || !name.trim()) return;
  if (uiHeaders.find(h => h.name === name.trim())) { toast('이미 존재하는 헤더입니다', 'error'); return; }
  uiHeaders.push({ name: name.trim(), type: 'text', options: [] });
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

function uiApply() {
  if (selectedUiModel === null) { toast('헤더 변경은 자동 저장됩니다', 'info'); return; }
  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};
  document.querySelectorAll('#uiMetaTable tbody tr').forEach(row => {
    const fnCell = row.querySelector('td:nth-child(2)');
    if (!fnCell) return;
    const fieldName = fnCell.textContent.trim();
    if (!metaStore[selectedUiModel][fieldName]) metaStore[selectedUiModel][fieldName] = {};
    uiHeaders.forEach(h => {
      const cell = row.querySelector(`[data-col="${h.name}"]`);
      if (cell) {
        const val = cell.tagName === 'SELECT' ? cell.value : cell.textContent.trim();
        metaStore[selectedUiModel][fieldName][h.name] = val;
      }
    });
  });
  toast('UI 메타 저장 완료', 'success');
  renderUiTable();
}

function uiAddRow() {
  if (!selectedUiModel) return;
  // 모델 셀렉터 초기화
  const modelSel = document.getElementById('uiAddRowModelSel');
  modelSel.innerHTML = schema.models.map(m =>
    `<option value="${m.name}"${m.name === selectedUiModel ? ' selected' : ''}>${m.name}</option>`
  ).join('');
  uiAddRowModelChange();
  document.getElementById('uiAddRowModal').classList.add('show');
}

function uiAddRowModelChange() {
  const modelSel = document.getElementById('uiAddRowModelSel');
  const fieldSel = document.getElementById('uiAddRowFieldSel');
  const chosenModel = modelSel.value;
  const model = schema.models.find(m => m.name === chosenModel);
  if (!model) { fieldSel.innerHTML = ''; return; }

  // 이미 현재 모델 메타에 있는 행 키 목록
  const existing = new Set([
    ...(rowOrderStore[selectedUiModel] || []),
    ...Object.keys(metaStore[selectedUiModel] || {}),
  ]);

  const fields = model.fields.filter(f => {
    // 같은 모델이면 이미 있는 필드 제외, 다른 모델이면 "Model.field" 키로 체크
    const key = chosenModel === selectedUiModel ? f.name : `${chosenModel}.${f.name}`;
    return !existing.has(key);
  });

  if (fields.length === 0) {
    fieldSel.innerHTML = `<option value="">— 추가 가능한 필드 없음 —</option>`;
  } else {
    fieldSel.innerHTML = fields.map(f =>
      `<option value="${f.name}">${f.name}  (${f.type}${f.isArray ? '[]' : ''}${f.isOptional ? '?' : ''})</option>`
    ).join('');
  }
}

function uiAddRowConfirm() {
  if (!selectedUiModel) return;
  const modelSel = document.getElementById('uiAddRowModelSel');
  const fieldSel = document.getElementById('uiAddRowFieldSel');
  const chosenModel = modelSel.value;
  const chosenField = fieldSel.value;
  if (!chosenField) { toast('필드를 선택하세요', 'error'); return; }

  const rowKey = chosenModel === selectedUiModel ? chosenField : `${chosenModel}.${chosenField}`;
  if (!metaStore[selectedUiModel]) metaStore[selectedUiModel] = {};
  metaStore[selectedUiModel][rowKey] = {};
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
