// === UI생성테스트 ===
// metaStore 기반 실제 UI 렌더링 플레이그라운드

let selectedUiTestModel = null;
let uitestViewMode = 'create'; // 'create' | 'list' | 'detail'

const UITEST_MODES = [
  { key: 'create', label: '생성폼',  flag: 'initialCreation' },
  { key: 'list',   label: '목록뷰',  flag: 'showNode' },
  { key: 'detail', label: '상세뷰',  flag: 'showNodeDetail' },
];

function renderUiTestSidebar() {
  const sb = document.getElementById('uitestSidebar');
  if (!sb) return;
  sb.innerHTML = '<div class="excel-sidebar-title">UI생성테스트</div>';

  const label = document.createElement('div');
  label.className = 'excel-sidebar-title';
  label.style.cssText = 'padding:8px 16px 4px;font-size:10px';
  label.textContent = 'MODELS';
  sb.appendChild(label);

  const configured = schema.models.filter(m => metaStore[m.name] && Object.keys(metaStore[m.name]).length > 0);
  const unconfigured = schema.models.filter(m => !metaStore[m.name] || Object.keys(metaStore[m.name]).length === 0);

  const render = (models, dimmed) => {
    models.forEach(m => {
      const d = document.createElement('div');
      d.className = 'excel-model-item' + (selectedUiTestModel === m.name ? ' active' : '');
      d.style.opacity = dimmed ? '0.4' : '1';
      d.innerHTML = `<span class="dot md"></span>${m.name}`;
      d.onclick = () => { selectedUiTestModel = m.name; renderUiTestSidebar(); renderUiTestPreview(); };
      sb.appendChild(d);
    });
  };

  render(configured, false);

  if (unconfigured.length) {
    const sep = document.createElement('div');
    sep.style.cssText = 'height:1px;background:var(--border);margin:6px 8px';
    sb.appendChild(sep);
    const lbl = document.createElement('div');
    lbl.style.cssText = 'padding:4px 16px;font-size:10px;color:var(--text-muted)';
    lbl.textContent = '미설정';
    sb.appendChild(lbl);
    render(unconfigured, true);
  }
}

function renderUiTestPreview() {
  const title = document.getElementById('uitestTitle');
  const content = document.getElementById('uitestContent');
  const viewBtns = document.getElementById('uitestViewBtns');
  if (!title || !content || !viewBtns) return;

  if (!selectedUiTestModel) {
    title.textContent = '모델 선택';
    viewBtns.innerHTML = '';
    content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">← 왼쪽에서 모델을 선택하세요</div>';
    return;
  }

  title.textContent = selectedUiTestModel;

  // 뷰 모드 버튼
  viewBtns.innerHTML = UITEST_MODES.map(m =>
    `<button class="btn${uitestViewMode === m.key ? ' btn-accent' : ''}"
      onclick="uitestSetMode('${m.key}')">${m.label}</button>`
  ).join('');

  const meta = metaStore[selectedUiTestModel] || {};
  const mode = UITEST_MODES.find(m => m.key === uitestViewMode);
  const rows = Object.entries(meta).filter(([, v]) => v[mode.flag] === 'true');

  if (rows.length === 0) {
    content.innerHTML = `<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">
      "${mode.label}" 로 설정된 필드가 없어요.<br>
      <span style="font-size:12px">UI관리 탭에서 <b>${mode.flag}</b> = true 로 설정하세요.</span>
    </div>`;
    return;
  }

  if (uitestViewMode === 'create') {
    content.innerHTML = renderCreateForm(rows);
  } else if (uitestViewMode === 'list') {
    content.innerHTML = renderListView(rows);
  } else {
    content.innerHTML = renderDetailView(rows);
  }
}

function uitestSetMode(mode) {
  uitestViewMode = mode;
  renderUiTestPreview();
}

// ── 생성폼 ─────────────────────────────────────────────
function renderCreateForm(rows) {
  const fields = rows.map(([fieldName, meta]) => {
    const label = meta.label || fieldName;
    const required = meta.isRequired === 'true';
    const placeholder = meta.commentary || '';
    const input = buildInput(fieldName, meta);
    return `
      <div style="display:flex;flex-direction:column;gap:5px;${meta.width ? 'width:' + meta.width : ''}">
        <label style="font-size:13px;font-weight:600;color:var(--text-primary)">
          ${label}${required ? ' <span style="color:#e53e3e">*</span>' : ''}
        </label>
        ${placeholder ? `<div style="font-size:11px;color:var(--text-muted);margin-top:-3px">${placeholder}</div>` : ''}
        ${input}
      </div>`;
  }).join('');

  return `
    <div style="max-width:640px;display:flex;flex-direction:column;gap:20px">
      ${fields}
      <div style="display:flex;gap:8px;margin-top:8px">
        <button class="btn btn-accent" style="min-width:100px">저장</button>
        <button class="btn">취소</button>
      </div>
    </div>`;
}

// ── 목록뷰 ─────────────────────────────────────────────
function renderListView(rows) {
  const ths = rows.map(([fn, meta]) =>
    `<th style="white-space:nowrap">${meta.label || fn}</th>`
  ).join('');
  const tds = rows.map(([fn, meta]) =>
    `<td style="color:var(--text-muted);font-size:12px">—</td>`
  ).join('');

  return `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:10px">※ 더미 데이터로 표시됩니다</div>
    <table class="excel-table" style="width:100%">
      <thead><tr>${ths}</tr></thead>
      <tbody>
        <tr>${tds}</tr>
        <tr>${tds}</tr>
        <tr>${tds}</tr>
      </tbody>
    </table>`;
}

// ── 상세뷰 ─────────────────────────────────────────────
function renderDetailView(rows) {
  const fields = rows.map(([fieldName, meta]) => {
    const label = meta.label || fieldName;
    return `
      <div style="display:flex;gap:16px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="min-width:160px;font-size:13px;font-weight:600;color:var(--text-muted)">${label}</div>
        <div style="font-size:13px;color:var(--text-muted)">—</div>
      </div>`;
  }).join('');
  return `<div style="max-width:640px">${fields}</div>`;
}

// ── 인풋 빌더 ───────────────────────────────────────────
function buildInput(fieldName, meta) {
  const base = `style="width:100%;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-primary);color:var(--text-primary);font-size:13px;box-sizing:border-box"`;

  if (meta.comboboxName) {
    return `<select ${base}><option>— 선택 —</option></select>`;
  }
  if (meta.dataSource) {
    return `<select ${base}><option>— ${meta.dataSource} 선택 —</option></select>`;
  }

  const type = (meta.variableType || '').toLowerCase();
  if (type.includes('date')) return `<input type="date" ${base}>`;
  if (type.includes('number') || type.includes('int') || type.includes('float')) return `<input type="number" ${base}>`;
  if (type.includes('bool')) return `<select ${base}><option>true</option><option>false</option></select>`;

  return `<input type="text" placeholder="${meta.commentary || ''}" ${base}>`;
}
