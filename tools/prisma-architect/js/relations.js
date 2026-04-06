// === RELATIONS ===

function getRels() {
  const rels = [], seen = new Set();
  schema.models.forEach(model => {
    model.fields.forEach(field => {
      const tgt = schema.models.find(m => m.name === field.type);
      if (!tgt || tgt.name === model.name) return;
      const key = [model.name, tgt.name].sort().join('↔');
      if (seen.has(key)) return; seen.add(key);
      const rev = tgt.fields.find(f => f.type === model.name);
      if (!cardinalityMap[key]) {
        if (field.isArray && rev && rev.isArray) cardinalityMap[key] = 'M:N';
        else if (field.isArray || (rev && !rev.isArray)) cardinalityMap[key] = '1:N';
        else cardinalityMap[key] = '1:1';
      }
      rels.push({ from: model.name, to: tgt.name, key, cardinality: cardinalityMap[key], isEnum: false });
    });
    model.fields.forEach(field => {
      const en = schema.enums.find(e => e.name === field.type); if (!en) return;
      const key = model.name + '→' + en.name; if (seen.has(key)) return; seen.add(key);
      rels.push({ from: model.name, to: en.name, key, cardinality: 'enum', isEnum: true });
    });
  });
  return rels;
}

// === 관계 토글 ===
function cycleCard(fromName, toName, key) {
  const order = ['1:1', '1:N', 'M:N'], cur = cardinalityMap[key] || '1:N';
  const next = order[(order.indexOf(cur) + 1) % 3];
  cardinalityMap[key] = next;

  const m1 = schema.models.find(m => m.name === fromName);
  const m2 = schema.models.find(m => m.name === toName);

  if (m1 && m2) {
    const f1 = m1.fields.find(f => f.type === toName);
    const f2 = m2.fields.find(f => f.type === fromName);

    if (f1 && f2) {
      if (next === '1:1') {
        f1.isArray = false; f1.isOptional = true;
        f2.isArray = false; f2.isOptional = true;
      } else if (next === '1:N') {
        if (f1.hasRelation) {
          f1.isArray = false; f1.isOptional = true;
          f2.isArray = true; f2.isOptional = false;
        } else {
          f1.isArray = true; f1.isOptional = false;
          f2.isArray = false; f2.isOptional = true;
        }
      } else if (next === 'M:N') {
        f1.isArray = true; f1.isOptional = false;
        f2.isArray = true; f2.isOptional = false;
      }
    }
  }

  addLog('relation', `관계 변경: ${fromName} ↔ ${toName}`, `${cur} → ${next}`);
  renderDiagram();
  syncEditor();
}

function deleteRelation(fromName, toName, isEnum) {
  const fromModel = schema.models.find(m => m.name === fromName);
  if (fromModel) fromModel.fields = fromModel.fields.filter(f => f.type !== toName);
  if (!isEnum) {
    const toModel = schema.models.find(m => m.name === toName);
    if (toModel) toModel.fields = toModel.fields.filter(f => f.type !== fromName);
  }
  addLog('relation', `연결 끊기: ${fromName} ↔ ${toName}`);
  renderDiagram();
  syncEditor();
  toast('연결이 삭제되었습니다.', 'success');
}

function ctxAddRelation() {
  if (!ctxTarget) return;
  const select = document.getElementById('relationTargetSelect');
  select.innerHTML = '';
  const options = [
    ...schema.models.map(m => m.name),
    ...schema.enums.map(e => e.name)
  ].filter(name => name !== ctxTarget);

  if (options.length === 0) { toast('연결할 대상이 없습니다.', 'error'); return; }
  options.forEach(opt => {
    const el = document.createElement('option');
    el.value = opt; el.textContent = opt;
    select.appendChild(el);
  });
  document.getElementById('contextMenu').classList.remove('show');
  document.getElementById('relationModal').classList.add('show');
}

function closeRelationModal() {
  document.getElementById('relationModal').classList.remove('show');
}

function confirmRelation() {
  const targetName = document.getElementById('relationTargetSelect').value;
  if (!targetName || !ctxTarget) return;

  const sourceModel = schema.models.find(m => m.name === ctxTarget);
  const targetModel = schema.models.find(m => m.name === targetName);
  const targetEnum = schema.enums.find(e => e.name === targetName);

  if (!sourceModel) return;

  const tf = targetName.charAt(0).toLowerCase() + targetName.slice(1);

  if (targetEnum) {
    sourceModel.fields.push({ name: tf + 'Value', type: targetName, isOptional: true, isArray: false, isId: false, isUnique: false, attrs: [], hasRelation: false, defaultValue: null, comment: '' });
  } else {
    if (sourceModel.fields.some(f => f.type === targetName)) {
      toast('이미 연결된 대상입니다.', 'info');
      closeRelationModal();
      return;
    }
    sourceModel.fields.push({ name: tf, type: targetName, isOptional: true, isArray: false, isId: false, isUnique: false, attrs: [{ name: 'relation', args: `(fields: [${tf}Id], references: [id])` }], hasRelation: true, defaultValue: null, comment: '' });
    sourceModel.fields.push({ name: tf + 'Id', type: 'String', isOptional: true, isArray: false, isId: false, isUnique: false, attrs: [], hasRelation: false, defaultValue: null, comment: '' });

    const sf = ctxTarget.charAt(0).toLowerCase() + ctxTarget.slice(1) + 's';
    if (!targetModel.fields.some(f => f.name === sf)) {
      targetModel.fields.push({ name: sf, type: ctxTarget, isOptional: false, isArray: true, isId: false, isUnique: false, attrs: [], hasRelation: false, defaultValue: null, comment: '' });
    }
  }

  addLog('relation', `연결선 생성: ${ctxTarget} → ${targetName}`);
  closeRelationModal();
  renderDiagram();
  syncEditor();
  toast('새로운 연결이 생성되었습니다.', 'success');
}
