// === UI생성테스트 ===
// metaStore 기반 실제 UI 렌더링 플레이그라운드

let uitestChecked = new Set(); // 체크된 모델 이름들
let uitestViewMode = 'create'; // 'create' | 'list' | 'detail'

const UITEST_MODES = [
  { key: 'create', label: '생성폼',  flag: 'initialCreation' },
  { key: 'list',   label: '목록뷰',  flag: 'showNode' },
  { key: 'detail', label: '상세뷰',  flag: 'showNodeDetail' },
];

function renderUiTestSidebar() {
  const sb = document.getElementById('uitestSidebar');
  if (!sb) return;

  // metaStore에 등록된 모델만 표시 (DB 스키마 무관)
  const models = Object.keys(metaStore).filter(name => Object.keys(metaStore[name]).length > 0);

  let html = `<div class="excel-sidebar-title">UI생성테스트</div>`;

  // 뷰 모드 선택
  html += `<div style="padding:8px 12px;display:flex;flex-direction:column;gap:4px;border-bottom:1px solid var(--border)">
    <div style="font-size:10px;font-weight:700;color:var(--text-muted);margin-bottom:2px">뷰 모드</div>
    ${UITEST_MODES.map(m => `
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:4px 6px;border-radius:6px;${uitestViewMode === m.key ? 'background:var(--accent-dim);color:var(--accent);font-weight:600' : 'color:var(--text-primary)'}">
        <input type="radio" name="uitestMode" value="${m.key}" ${uitestViewMode === m.key ? 'checked' : ''}
          onchange="uitestSetMode('${m.key}')" style="accent-color:var(--accent)">
        ${m.label}
      </label>`).join('')}
  </div>`;

  html += `<div style="padding:8px 16px 4px;font-size:10px;font-weight:700;color:var(--text-muted)">UI 모델 목록</div>`;

  if (models.length === 0) {
    html += `<div style="padding:16px;font-size:12px;color:var(--text-muted);text-align:center">UI관리에서 먼저<br>모델을 설정하세요</div>`;
  } else {
    models.forEach(name => {
      const checked = uitestChecked.has(name);
      html += `<label class="excel-model-item" style="cursor:pointer;display:flex;align-items:center;gap:8px;${checked ? 'background:var(--accent-dim);color:var(--accent)' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="uitestToggle('${name}')" style="accent-color:var(--accent);flex-shrink:0">
        <span style="font-weight:600">${name}</span>
        <span style="margin-left:auto;font-size:10px;color:var(--text-muted)">${Object.keys(metaStore[name]).length}필드</span>
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

function renderUiTestPreview() {
  const title = document.getElementById('uitestTitle');
  const content = document.getElementById('uitestContent');
  const viewBtns = document.getElementById('uitestViewBtns');
  if (!title || !content || !viewBtns) return;

  viewBtns.innerHTML = '';

  if (uitestChecked.size === 0) {
    title.textContent = '모델 선택';
    content.innerHTML = '<div style="text-align:center;padding:60px 20px;color:var(--text-muted)">← 왼쪽에서 모델을 체크하세요</div>';
    return;
  }

  const checkedNames = [...uitestChecked];
  title.textContent = checkedNames.join(', ');

  const mode = UITEST_MODES.find(m => m.key === uitestViewMode);

  // 체크된 모델 각각 렌더 (순서대로 쌓기 — 추후 변경 가능)
  content.innerHTML = checkedNames.map(name => {
    const meta = metaStore[name] || {};
    const rows = Object.entries(meta).filter(([, v]) => v[mode.flag] === 'true');

    const sectionHeader = checkedNames.length > 1
      ? `<div style="font-size:12px;font-weight:700;color:var(--accent2);margin-bottom:12px;padding-bottom:6px;border-bottom:2px solid var(--accent2)">${name}</div>`
      : '';

    if (rows.length === 0) {
      return `<div style="margin-bottom:32px">${sectionHeader}
        <div style="color:var(--text-muted);font-size:12px">"${mode.label}" 조건 필드 없음 — UI관리에서 <b>${mode.flag} = true</b> 설정 필요</div>
      </div>`;
    }

    let body = '';
    if (uitestViewMode === 'create') body = renderCreateForm(rows);
    else if (uitestViewMode === 'list') body = renderListView(rows);
    else body = renderDetailView(rows);

    return `<div style="margin-bottom:40px">${sectionHeader}${body}</div>`;
  }).join('');
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
