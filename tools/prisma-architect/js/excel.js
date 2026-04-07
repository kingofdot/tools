// === EXCEL (DB 관리) ===

function renderExcelSidebar() {
  const sb = document.getElementById('excelSidebar');
  sb.innerHTML = '<div class="excel-sidebar-title">Models & Enums</div>';
  schema.models.forEach(m => {
    const d = document.createElement('div');
    d.className = 'excel-model-item' + (selectedExcelModel === m.name ? ' active' : '');
    d.innerHTML = `<span class="dot md"></span>${m.name}`;
    d.onclick = () => { selectedExcelModel = m.name; renderExcelSidebar(); renderExcelTable(); };
    sb.appendChild(d);
  });
  schema.enums.forEach(e => {
    const d = document.createElement('div');
    d.className = 'excel-model-item' + (selectedExcelModel === e.name ? ' active' : '');
    d.innerHTML = `<span class="dot ed"></span>${e.name}`;
    d.onclick = () => { selectedExcelModel = e.name; renderExcelSidebar(); renderExcelTable(); };
    sb.appendChild(d);
  });
}

function renderExcelTable() {
  const wrap = document.getElementById('excelTableWrap');
  const model = schema.models.find(m => m.name === selectedExcelModel);
  const en = schema.enums.find(e => e.name === selectedExcelModel);
  document.getElementById('excelTitle').textContent = selectedExcelModel || '선택';
  document.getElementById('excelAddFieldBtn').style.display = model ? '' : 'none';
  document.getElementById('excelApplyBtn').style.display = model ? '' : 'none';

  if (model) {
    let h = '<table class="excel-table"><thead><tr><th style="width:32px"></th><th>#</th><th>필드명</th><th>타입</th><th>Opt</th><th>Arr</th><th>PK</th><th>Uniq</th><th>기본값</th><th>코멘트</th><th></th></tr></thead><tbody id="excelFieldBody">';
    model.fields.forEach((f, i) => {
      h += `<tr draggable="true" data-field="${f.name}">
        <td style="color:var(--text-muted);text-align:center;font-size:16px;cursor:grab;user-select:none">⠿</td>
        <td style="color:var(--text-muted)">${i + 1}</td>
        <td class="${f.isId ? 'cell-pk' : f.hasRelation ? 'cell-fk' : ''}" contenteditable="true" data-field="${f.name}" data-col="name">${f.name}</td>
        <td class="cell-type" contenteditable="true" data-field="${f.name}" data-col="type">${f.type}</td>
        <td style="text-align:center"><input type="checkbox"${f.isOptional ? ' checked' : ''} data-field="${f.name}" data-col="isOptional"></td>
        <td style="text-align:center"><input type="checkbox"${f.isArray ? ' checked' : ''} data-field="${f.name}" data-col="isArray"></td>
        <td style="text-align:center"><input type="checkbox"${f.isId ? ' checked' : ''} data-field="${f.name}" data-col="isId"></td>
        <td style="text-align:center"><input type="checkbox"${f.isUnique ? ' checked' : ''} data-field="${f.name}" data-col="isUnique"></td>
        <td contenteditable="true" data-field="${f.name}" data-col="default" style="color:var(--text-muted)">${f.defaultValue || ''}</td>
        <td contenteditable="true" data-field="${f.name}" data-col="comment" style="color:var(--text-muted)">${f.comment || ''}</td>
        <td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="excelDelF('${f.name}')">✕</button></td>
      </tr>`;
    });
    wrap.innerHTML = h + '</tbody></table>';
    initExcelFieldDragDrop();
  } else if (en) {
    let h = '<table class="excel-table"><thead><tr><th>#</th><th>값</th><th></th></tr></thead><tbody>';
    en.values.forEach((v, i) => {
      h += `<tr><td style="color:var(--text-muted)">${i + 1}</td><td contenteditable="true" class="cell-type" data-idx="${i}">${v}</td><td><button class="btn btn-danger" style="padding:2px 8px;font-size:10px" onclick="excelDelEV(${i})">✕</button></td></tr>`;
    });
    wrap.innerHTML = h + '</tbody></table><div style="padding:12px"><button class="btn" onclick="excelAddEV()">+ 값</button></div>';
  } else {
    wrap.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">모델 선택</div>';
  }
}

function excelAddField() { if (selectedExcelModel) openFieldEditor(selectedExcelModel, null); }

function initExcelFieldDragDrop() {
  const tbody = document.getElementById('excelFieldBody');
  if (!tbody) return;
  let dragSrc = null;
  tbody.querySelectorAll('tr').forEach(tr => {
    tr.addEventListener('dragstart', e => { dragSrc = tr; tr.style.opacity = '0.4'; e.dataTransfer.effectAllowed = 'move'; });
    tr.addEventListener('dragend', () => { tr.style.opacity = '1'; });
    tr.addEventListener('dragover', e => { e.preventDefault(); tr.style.background = 'var(--bg-hover)'; });
    tr.addEventListener('dragleave', () => { tr.style.background = ''; });
    tr.addEventListener('drop', e => {
      e.preventDefault(); tr.style.background = '';
      if (!dragSrc || dragSrc === tr) return;
      const model = schema.models.find(m => m.name === selectedExcelModel); if (!model) return;
      const fromField = dragSrc.dataset.field;
      const toField = tr.dataset.field;
      const fromIdx = model.fields.findIndex(f => f.name === fromField);
      const toIdx = model.fields.findIndex(f => f.name === toField);
      if (fromIdx < 0 || toIdx < 0) return;
      const [moved] = model.fields.splice(fromIdx, 1);
      model.fields.splice(toIdx, 0, moved);
      renderExcelTable(); renderDiagram(); syncEditor();
    });
  });
}

function excelDelF(fn) {
  const m = schema.models.find(x => x.name === selectedExcelModel); if (!m) return;
  m.fields = m.fields.filter(f => f.name !== fn);
  addLog('field', `삭제: ${selectedExcelModel}.${fn}`);
  renderExcelTable(); renderDiagram(); syncEditor();
}

function excelApply() {
  const model = schema.models.find(m => m.name === selectedExcelModel); if (!model) return;
  document.querySelectorAll('.excel-table tbody tr').forEach(row => {
    const nc = row.querySelector('[data-col="name"]'); if (!nc) return;
    const f = model.fields.find(x => x.name === nc.dataset.field); if (!f) return;
    f.name = nc.textContent.trim();
    f.type = row.querySelector('[data-col="type"]')?.textContent.trim() || f.type;
    f.isOptional = row.querySelector('[data-col="isOptional"]')?.checked || false;
    f.isArray = row.querySelector('[data-col="isArray"]')?.checked || false;
    f.isId = row.querySelector('[data-col="isId"]')?.checked || false;
    f.isUnique = row.querySelector('[data-col="isUnique"]')?.checked || false;
    const rawDef = row.querySelector('[data-col="default"]')?.textContent.trim() || null;
    f.defaultValue = rawDef ? (rawDef.startsWith('(') ? rawDef : `(${rawDef})`) : null;
    f.comment = row.querySelector('[data-col="comment"]')?.textContent.trim() || '';
    f.attrs = [];
    if (f.isId) f.attrs.push({ name: 'id', args: '' });
    if (f.isUnique) f.attrs.push({ name: 'unique', args: '' });
    if (f.defaultValue) f.attrs.push({ name: 'default', args: f.defaultValue });
    f.hasRelation = schema.models.some(m => m.name === f.type);
  });
  addLog('schema', `Excel 적용: ${selectedExcelModel}`);
  renderExcelTable(); renderDiagram(); syncEditor();
  toast('적용', 'success');
}

function excelDelEV(i) {
  const en = schema.enums.find(e => e.name === selectedExcelModel); if (!en) return;
  en.values.splice(i, 1);
  addLog('field', 'Enum 값 삭제');
  renderExcelTable(); renderDiagram(); syncEditor();
}

function excelAddEV() {
  const en = schema.enums.find(e => e.name === selectedExcelModel); if (!en) return;
  const v = prompt('새 값:'); if (!v) return;
  en.values.push(v.trim());
  addLog('field', `Enum 값 추가: ${v.trim()}`);
  renderExcelTable(); renderDiagram(); syncEditor();
}
