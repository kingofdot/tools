// === CANVAS 이벤트 & 줌/팬/드래그 ===

// 캔버스 이벤트는 DOM 로드 후 등록
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('canvasWrapper');

  wrapper.addEventListener('wheel', e => {
    e.preventDefault();
    const d = e.deltaY > 0 ? -0.1 : 0.1;
    const nz = Math.max(.15, Math.min(3, zoom + d));
    const r = wrapper.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    panX = mx - (mx - panX) * (nz / zoom);
    panY = my - (my - panY) * (nz / zoom);
    zoom = nz;
    updateTransform();
  }, { passive: false });

  wrapper.addEventListener('mousedown', e => {
    if (e.target === wrapper || e.target.classList.contains('canvas-grid')) {
      if (e.button === 0) {
        isDraggingCanvas = true;
        dragStartX = e.clientX - panX;
        dragStartY = e.clientY - panY;
        wrapper.style.cursor = 'grabbing';
      }
    }
  });

  wrapper.addEventListener('dblclick', e => {
    if (e.target === wrapper || e.target.classList.contains('canvas-grid')) {
      const r = wrapper.getBoundingClientRect();
      const x = Math.round((e.clientX - r.left - panX) / zoom);
      const y = Math.round((e.clientY - r.top - panY) / zoom);
      const text = prompt('메모 내용:');
      if (!text) return;
      annotations.push({ id: 'anno_' + Date.now(), x, y, text });
      renderAnnotations();
    }
  });

  document.addEventListener('mousemove', e => {
    if (isDraggingCanvas) {
      panX = e.clientX - dragStartX;
      panY = e.clientY - dragStartY;
      updateTransform();
    }
    if (draggingCard) {
      const r = wrapper.getBoundingClientRect();
      const x = (e.clientX - r.left - panX) / zoom - dragOffsetX;
      const y = (e.clientY - r.top - panY) / zoom - dragOffsetY;
      const n = draggingCard.dataset.name;
      modelPositions[n] = { x: Math.round(x), y: Math.round(y) };
      draggingCard.style.left = Math.round(x) + 'px';
      draggingCard.style.top = Math.round(y) + 'px';
      cardSizes[n] = { w: draggingCard.offsetWidth, h: draggingCard.offsetHeight };
drawRels();
    }
    if (draggingAnnotation) {
      const r = wrapper.getBoundingClientRect();
      const x = Math.round((e.clientX - r.left - panX) / zoom - draggingAnnotation.offX);
      const y = Math.round((e.clientY - r.top - panY) / zoom - draggingAnnotation.offY);
      const anno = annotations.find(a => a.id === draggingAnnotation.id);
      if (anno) { anno.x = x; anno.y = y; }
      draggingAnnotation.el.style.left = x + 'px';
      draggingAnnotation.el.style.top = y + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    isDraggingCanvas = false;
    wrapper.style.cursor = '';
    if (draggingCard) {
      const n = draggingCard.dataset.name;
      const p = modelPositions[n];
      if (p) addLog('model', `위치 이동: ${n}`, `x:${p.x}, y:${p.y}`);
      draggingCard.classList.remove('dragging');
      draggingCard = null;
    }
    if (draggingAnnotation) {
      draggingAnnotation.el.classList.remove('dragging');
      draggingAnnotation = null;
    }
  });

  document.addEventListener('click', () => document.getElementById('contextMenu').classList.remove('show'));

  // 탭 전환
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const p = tab.dataset.panel;
      document.querySelectorAll('.panel').forEach(x => x.classList.remove('active'));
      document.getElementById(p + 'Panel').classList.add('active');
      if (p === 'editor') syncEditor();
      if (p === 'excel') renderExcelSidebar();
      if (p === 'diagram') renderDiagram();
      if (p === 'ui') { renderUiSidebar(); renderUiTable(); }
      if (p === 'uitest') { renderUiTestSidebar(); renderUiTestPreview(); }
      if (p === 'todo') renderTodoList();
      if (p === 'suggest') renderSuggestList();
    });
  });
});

function zoomIn() { zoom = Math.min(3, zoom + .15); updateTransform(); }
function zoomOut() { zoom = Math.max(.15, zoom - .15); updateTransform(); }

function zoomFit() {
  const wrapper = document.getElementById('canvasWrapper');
  const ns = [...schema.models.map(m => m.name), ...schema.enums.map(e => e.name)];
  if (!ns.length) return;
  let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
  ns.forEach(n => {
    const p = modelPositions[n], s = cardSizes[n] || { w: 280, h: 300 };
    if (!p) return;
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + s.w); maxY = Math.max(maxY, p.y + s.h);
  });
  const r = wrapper.getBoundingClientRect(), w = maxX - minX + 100, h = maxY - minY + 100;
  zoom = Math.min(r.width / w, r.height / h, 1.2);
  panX = (r.width - w * zoom) / 2 - minX * zoom;
  panY = (r.height - h * zoom) / 2 - minY * zoom;
  updateTransform();
}

// === 컨텍스트 메뉴 액션 ===
function ctxAddField() { if (ctxTarget) openFieldEditor(ctxTarget, null); }

function ctxEditModel() {
  if (!ctxTarget) return;
  const nn = prompt('새 이름:', ctxTarget);
  if (!nn || nn === ctxTarget) return;
  const old = ctxTarget;
  const m = schema.models.find(x => x.name === old), en = schema.enums.find(x => x.name === old);
  if (m) { schema.models.forEach(x => x.fields.forEach(f => { if (f.type === old) f.type = nn; })); m.name = nn; }
  else if (en) { schema.models.forEach(x => x.fields.forEach(f => { if (f.type === old) f.type = nn; })); en.name = nn; }
  modelPositions[nn] = modelPositions[old]; delete modelPositions[old];
  cardSizes[nn] = cardSizes[old]; delete cardSizes[old];
  const nm = {}; Object.entries(cardinalityMap).forEach(([k, v]) => { nm[k.replaceAll(old, nn)] = v; }); cardinalityMap = nm;
  addLog('model', '이름 변경', `${old} → ${nn}`);
  renderDiagram(); syncEditor();
}

function ctxDeleteModel() {
  if (!ctxTarget || !confirm(`"${ctxTarget}" 삭제?`)) return;
  const old = ctxTarget;
  schema.models = schema.models.filter(m => m.name !== old);
  schema.enums = schema.enums.filter(e => e.name !== old);
  schema.models.forEach(m => { m.fields = m.fields.filter(f => f.type !== old); });
  delete modelPositions[old]; delete cardSizes[old];
  addLog('model', `삭제: ${old}`);
  renderDiagram(); syncEditor();
}

// === 모델/Enum 추가 ===
function addNewModel() {
  const name = prompt('모델 이름:'); if (!name) return;
  if (schema.models.some(m => m.name === name) || schema.enums.some(e => e.name === name)) { toast('중복', 'error'); return; }
  schema.models.push({
    name, mapName: null, indexes: [], fields: [
      { name: 'id', type: 'String', isOptional: false, isArray: false, isId: true, isUnique: false, attrs: [{ name: 'id', args: '' }, { name: 'default', args: '(cuid())' }], hasRelation: false, defaultValue: '(cuid())', comment: '' },
      { name: 'createdAt', type: 'DateTime', isOptional: false, isArray: false, isId: false, isUnique: false, attrs: [{ name: 'default', args: '(now())' }], hasRelation: false, defaultValue: '(now())', comment: '' },
      { name: 'updatedAt', type: 'DateTime', isOptional: false, isArray: false, isId: false, isUnique: false, attrs: [{ name: 'updatedAt', args: '' }], hasRelation: false, defaultValue: null, comment: '' }
    ]
  });
  addLog('model', `모델 추가: ${name}`);
  renderDiagram(); syncEditor();
}

function addNewEnum() {
  const name = prompt('Enum 이름:'); if (!name) return;
  const vals = prompt('값 (쉼표 구분):', 'VAL1, VAL2'); if (!vals) return;
  schema.enums.push({ name, values: vals.split(',').map(v => v.trim()).filter(Boolean) });
  addLog('model', `Enum 추가: ${name}`);
  renderDiagram(); syncEditor();
}

// === 편집기 동기화 ===
function syncEditor() { document.getElementById('schemaEditor').value = gen(schema); }

function applyEditorChanges() {
  try {
    schema = parse(document.getElementById('schemaEditor').value);
    addLog('schema', '텍스트 편집 적용');
    renderDiagram();
    toast('적용', 'success');
  } catch (e) { toast('오류', 'error'); }
}

// === 필드 편집 모달 ===
function openFieldEditor(mn, fn) {
  const model = schema.models.find(m => m.name === mn); if (!model) return;
  const field = fn ? model.fields.find(f => f.name === fn) : null;
  editingField = { modelName: mn, fieldName: fn, isNew: !field };
  document.getElementById('fieldModalTitle').textContent = field ? `${mn}.${fn}` : `새 필드: ${mn}`;
  document.getElementById('fieldDeleteBtn').style.display = field ? '' : 'none';
  const types = ['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'BigInt', 'Decimal', 'Bytes', ...schema.models.map(m => m.name), ...schema.enums.map(e => e.name)];
  document.getElementById('fieldModalBody').innerHTML = `
    <div class="form-group"><label>필드 이름</label><input id="fN" value="${field ? field.name : ''}"></div>
    <div class="form-group"><label>타입</label><select id="fT">${types.map(t => `<option value="${t}"${field && field.type === t ? ' selected' : ''}>${t}</option>`).join('')}</select></div>
    <div class="form-group" style="display:flex;gap:20px;flex-wrap:wrap">
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" id="fO"${field && field.isOptional ? ' checked' : ''}> Optional</label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" id="fA"${field && field.isArray ? ' checked' : ''}> Array</label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" id="fU"${field && field.isUnique ? ' checked' : ''}> @unique</label>
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:13px"><input type="checkbox" id="fI"${field && field.isId ? ' checked' : ''}> @id</label>
    </div>
    <div class="form-group"><label>기본값</label><input id="fD" value="${field && field.defaultValue ? field.defaultValue.replace(/^\(|\)$/g, '') : ''}"></div>
    <div class="form-group"><label>코멘트</label><input id="fC" value="${field ? field.comment || '' : ''}"></div>`;
  document.getElementById('fieldModal').classList.add('show');
}

function closeFieldModal() { document.getElementById('fieldModal').classList.remove('show'); editingField = null; }

function saveField() {
  if (!editingField) return;
  const model = schema.models.find(m => m.name === editingField.modelName); if (!model) return;
  const name = document.getElementById('fN').value.trim(); if (!name) { toast('이름 필요', 'error'); return; }
  const type = document.getElementById('fT').value;
  const isOpt = document.getElementById('fO').checked;
  const isArr = document.getElementById('fA').checked;
  const isUni = document.getElementById('fU').checked;
  const isId = document.getElementById('fI').checked;
  const def = document.getElementById('fD').value.trim();
  const com = document.getElementById('fC').value.trim();
  const defArgs = def ? (def.startsWith('(') ? def : `(${def})`) : null;
  const attrs = [];
  if (isId) attrs.push({ name: 'id', args: '' });
  if (isUni) attrs.push({ name: 'unique', args: '' });
  if (defArgs) attrs.push({ name: 'default', args: defArgs });
  const fd = { name, type, isOptional: isOpt, isArray: isArr, isId, isUnique: isUni, attrs, hasRelation: schema.models.some(m => m.name === type), defaultValue: defArgs, comment: com };
  if (editingField.isNew) { model.fields.push(fd); addLog('field', `필드 추가: ${editingField.modelName}.${name}`, type); }
  else { const i = model.fields.findIndex(f => f.name === editingField.fieldName); if (i >= 0) model.fields[i] = fd; addLog('field', `필드 수정: ${editingField.modelName}.${name}`, type); }
  closeFieldModal(); renderDiagram(); syncEditor();
  if (typeof renderExcelTable === 'function') renderExcelTable();
}

function deleteField() {
  if (!editingField || editingField.isNew) return;
  const model = schema.models.find(m => m.name === editingField.modelName); if (!model) return;
  model.fields = model.fields.filter(f => f.name !== editingField.fieldName);
  addLog('field', `필드 삭제: ${editingField.modelName}.${editingField.fieldName}`);
  closeFieldModal(); renderDiagram(); syncEditor();
  if (typeof renderExcelTable === 'function') renderExcelTable();
}
