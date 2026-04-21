/**
 * build.js — 처리 완료 별표 7종을 임베드한 index.html 생성
 * node app/build.js
 */
const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

// ── 별표 메타 ────────────────────────────────────────────────────────
const SOURCES = [
  { id: 'b5',    file: '별표5_처리구체적기준및방법.json',     title: '■ 폐기물관리법 시행규칙 [별표5]',    subtitle: '폐기물의 처리에 관한 구체적 기준 및 방법' },
  { id: 'b5_4',  file: '별표5의4_재활용자준수사항.json',     title: '■ 폐기물관리법 시행규칙 [별표5의4]', subtitle: '폐기물 재활용자의 준수사항' },
  { id: 'b6',    file: '별표6_폐기물인계인수입력방법.json',  title: '■ 폐기물관리법 시행규칙 [별표6]',    subtitle: '폐기물 인계·인수 사항과 폐기물처리현장정보의 입력 방법 및 절차' },
  { id: 'b7',    file: '별표7_처리업시설장비기술능력기준.json', title: '■ 폐기물관리법 시행규칙 [별표7]',  subtitle: '폐기물 처리업의 시설·장비 및 기술능력의 기준' },
  { id: 'b8',    file: '별표8_처리업자준수사항.json',        title: '■ 폐기물관리법 시행규칙 [별표8]',    subtitle: '폐기물 처리업자의 준수사항' },
  { id: 'b9',    file: '별표9_처리시설설치기준.json',        title: '■ 폐기물관리법 시행규칙 [별표9]',    subtitle: '폐기물 처분시설 또는 재활용시설의 설치기준' },
  { id: 'b17_2', file: '별표17의2_신고자준수사항.json',     title: '■ 폐기물관리법 시행규칙 [별표17의2]', subtitle: '폐기물처리 신고자의 준수사항' },
];

// 각 source 별로 raw / items(tagged) / allForWord 준비
// 콘텐츠 태그 판정: isHeader는 제외 (섹션 헤더는 카드로 안 뜸)
const hasContentTag = i => !i.isHeader && i.tags && (i.tags.action !== undefined || i.tags.wasteClass !== undefined || i.tags.facilityType !== undefined || i.tags.bizType !== undefined || i.tags.category !== undefined || i.tags.wasteCode !== undefined);

const SOURCE_META = SOURCES.map(s => ({ id: s.id, title: s.title, subtitle: s.subtitle }));
const ITEMS_BY_SOURCE = {};
const ALL_BY_SOURCE_FOR_WORD = {};
let ITEMS_ALL = [];

for (const src of SOURCES) {
  const json = JSON.parse(fs.readFileSync(path.join(BASE, 'data/검토사항/시행규칙', src.file), 'utf8'));
  const raw = json['별표내용'].map((item, idx) => ({ ...item, _idx: idx, _source: src.id }));
  const tagged = raw.filter(i => hasContentTag(i));
  // Word 출력용: noWord 제외, 섹션 헤더(tags===null 또는 isHeader)는 포함, 내용 태그 있는 것도 포함
  const forWord = raw.filter(i => !i.noWord && (i.tags === null || i.isHeader || hasContentTag(i)));
  ITEMS_BY_SOURCE[src.id] = tagged;
  ALL_BY_SOURCE_FOR_WORD[src.id] = forWord;
  ITEMS_ALL = ITEMS_ALL.concat(tagged);
}

const CODE = JSON.parse(fs.readFileSync(path.join(BASE, 'data/상황코드_코드표.json'), 'utf8'));
const CODES = CODE['코드표'];
const FT_LABEL = CODES.facilityType['값'];
const FT_GROUP = CODES.facilityType['그룹'];

const SOURCE_TITLE_MAP = Object.fromEntries(SOURCES.map(s => [s.id, { title: s.title, subtitle: s.subtitle, short: s.title.replace(/^■\s*/, '').replace('폐기물관리법 시행규칙 ', '') }]));

const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>준수계획서 작성 도구</title>
<script src="https://unpkg.com/docx@8.5.0/build/index.umd.js"></script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Malgun Gothic',sans-serif;font-size:13px;background:#f0f2f5;color:#222}
header{background:#1a3a5c;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}
header h1{font-size:16px;font-weight:600}
#code-bar{background:#0d2b45;color:#7ec8e3;font-family:monospace;font-size:12px;padding:6px 20px;letter-spacing:.5px;min-height:28px}
.layout{display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 70px)}
.panel{overflow-y:auto;padding:14px}
.panel-left{background:#fff;border-right:1px solid #dde}
.panel-right{background:#f8f9fb;display:flex;flex-direction:column}
.panel-right > #items-container{flex:1;overflow-y:auto}
.section{margin-bottom:14px}
.section-title{font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e0e4ea}
.field{margin-bottom:8px}
.field label{display:block;font-size:11px;color:#555;margin-bottom:3px}
select,input[type=text]{width:100%;padding:5px 8px;border:1px solid #ccd;border-radius:4px;font-size:12px;font-family:inherit}
select:focus,input:focus{outline:none;border-color:#1a3a5c}
.checkbox-grid{display:grid;grid-template-columns:1fr 1fr;gap:2px}
.checkbox-grid.three{grid-template-columns:1fr 1fr 1fr}
.cb-item{display:flex;align-items:center;gap:4px;font-size:11px;padding:2px 0}
.cb-item input{margin:0;flex-shrink:0}
.ft-group{margin-bottom:8px}
.ft-group-title{font-size:10px;font-weight:700;color:#888;margin-bottom:3px}
.btn{padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:inherit}
.btn-primary{background:#1a3a5c;color:#fff}
.btn-primary:hover{background:#245080}
.btn-secondary{background:#e8ecf0;color:#333}
.btn-secondary:hover{background:#d8dce0}
.btn-row{display:flex;gap:6px;margin-top:6px}
/* right panel */
#result-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
#result-count{font-size:12px;color:#666}
.source-group{margin-bottom:18px}
.source-header{position:sticky;top:0;background:#1a3a5c;color:#fff;padding:6px 12px;border-radius:4px 4px 0 0;font-weight:700;font-size:12px;display:flex;align-items:center;justify-content:space-between;z-index:1}
.source-header .src-meta{font-weight:400;font-size:11px;opacity:.85;margin-left:8px}
.source-header .src-actions{display:flex;gap:4px}
.src-actions .btn{padding:2px 8px;font-size:11px}
.item-card{background:#fff;border:1px solid #e0e4ea;border-radius:6px;margin-bottom:6px;overflow:hidden}
.item-card.selected{border-color:#1a3a5c;background:#f0f5ff}
.item-header{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;cursor:pointer}
.item-cb{margin-top:2px;flex-shrink:0}
.item-marker{font-size:11px;font-weight:700;color:#1a3a5c;min-width:30px}
.item-text{font-size:12px;line-height:1.6;flex:1}
.item-answer{font-size:12px;color:#2a6;background:#f5fff8;border-top:1px solid #ddeedd;padding:8px 10px 8px 48px;line-height:1.6;display:none}
.item-card.open .item-answer{display:block}
.item-tags{font-size:10px;color:#aaa;padding:0 10px 6px 48px;display:flex;flex-wrap:wrap;gap:4px}
.tag-pill{background:#e8ecf0;border-radius:10px;padding:1px 6px}
.tag-pill.action{background:#e8f0fe;color:#1a4a9c}
.tag-pill.facility{background:#fff3cd;color:#7a5c00}
#export-bar{background:#fff;border-top:1px solid #dde;padding:8px 14px;display:flex;gap:8px;align-items:center}
#selected-count{font-size:12px;color:#666;flex:1}
.wastevar{font-weight:600;color:#c06000}
</style>
</head>
<body>
<header>
  <h1>폐기물 준수계획서 작성 도구</h1>
  <span style="font-size:11px;opacity:.7">시행규칙 별표5/5의4/6/7/8/9/17의2 통합</span>
</header>
<div id="code-bar">상황코드: —</div>
<div class="layout">
  <!-- ── 왼쪽 입력 패널 ── -->
  <div class="panel panel-left" id="left-panel">
    <div class="section">
      <div class="section-title">분류 정보</div>
      <div class="field">
        <label>대분류 (category)</label>
        <select id="f-category">
          <option value="">선택</option>
          ${Object.entries(CODES.category['값']).map(([k,v])=>`<option value="${k}">${k} — ${v}</option>`).join('\n          ')}
        </select>
      </div>
      <div class="field">
        <label>업종·신고유형 (bizType)</label>
        <select id="f-bizType"><option value="">— 대분류 먼저 선택 —</option></select>
      </div>
      <div class="field">
        <label>문서 종류 (docType)</label>
        <select id="f-docType"><option value="">— 대분류 먼저 선택 —</option></select>
      </div>
    </div>

    <div class="section">
      <div class="section-title">폐기물 정보</div>
      <div class="field">
        <label>폐기물 대분류 (wasteClass)</label>
        <select id="f-wasteClass">
          <option value="">선택</option>
          ${Object.entries(CODES.wasteClass['값']).map(([k,v])=>`<option value="${k}">${k} — ${v}</option>`).join('\n          ')}
        </select>
      </div>
      <div class="field">
        <label>폐기물 코드 (wasteCode, 복수 가능)</label>
        <input type="text" id="f-wasteCode" placeholder="예: 01-06+01-07  (없으면 0)">
      </div>
      <div class="field">
        <label>폐기물 물리적 상태 (physicalState)</label>
        <select id="f-physicalState">
          <option value="">선택 안 함 (전체)</option>
          <option value="S">S — 고상 (고체 상태)</option>
          <option value="L">L — 액상 (액체 상태)</option>
          <option value="SL">S+L — 고상+액상 (둘 다)</option>
        </select>
      </div>
    </div>

    <div class="section">
      <div class="section-title">처리 행위 (action)</div>
      <div class="checkbox-grid">
        ${Object.entries(CODES.action['값']).map(([k,v])=>`<label class="cb-item"><input type="checkbox" class="cb-action" value="${k}"> ${k} ${v}</label>`).join('\n        ')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">재활용 유형 (rCode)</div>
      <div class="checkbox-grid">
        ${Object.entries(CODES.rCode['값']).filter(([k])=>k!=='0').map(([k,v])=>`<label class="cb-item"><input type="checkbox" class="cb-rCode" value="${k}"> ${k}</label>`).join('\n        ')}
      </div>
    </div>

    <div class="section">
      <div class="section-title">처리시설 종류 (facilityType)</div>
      ${Object.entries(FT_GROUP).filter(([g])=>g!=='없음').map(([group, codes])=>`
      <div class="ft-group">
        <div class="ft-group-title">${group.replace('_',' ')}</div>
        <div class="checkbox-grid three">
          ${codes.map(c=>`<label class="cb-item" title="${FT_LABEL[c]||c}"><input type="checkbox" class="cb-ft" value="${c}"> ${c}</label>`).join('\n          ')}
        </div>
      </div>`).join('')}
    </div>

    <div class="section">
      <div class="section-title">시설 설치 절차 (facilityApproval)</div>
      <select id="f-approval">
        <option value="0">0 — 해당없음</option>
        ${Object.entries(CODES.facilityApproval['값']).filter(([k])=>k!=='0').map(([k,v])=>`<option value="${k}">${k} — ${v}</option>`).join('\n        ')}
      </select>
    </div>

    <div class="section">
      <div class="section-title">검토 대상 별표</div>
      <div class="checkbox-grid">
        ${SOURCES.map(s=>`<label class="cb-item"><input type="checkbox" class="cb-source" value="${s.id}" checked> ${s.title.replace('■ 폐기물관리법 시행규칙 ','')}</label>`).join('\n        ')}
      </div>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="btn-filter">검토 항목 조회</button>
      <button class="btn btn-secondary" id="btn-reset">초기화</button>
    </div>
  </div>

  <!-- ── 오른쪽 결과 패널 ── -->
  <div class="panel panel-right" id="right-panel">
    <div id="result-header">
      <span id="result-count">조회 전</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary" id="btn-select-all">전체 선택</button>
        <button class="btn btn-secondary" id="btn-deselect-all">전체 해제</button>
      </div>
    </div>
    <div id="items-container">
      <div style="color:#aaa;text-align:center;margin-top:60px">왼쪽에서 조건을 선택하고<br>「검토 항목 조회」를 눌러주세요.</div>
    </div>
    <div id="export-bar">
      <span id="selected-count">선택된 항목: 0개</span>
      <button class="btn btn-secondary" id="btn-copy">클립보드 복사</button>
      <button class="btn btn-primary" id="btn-download">Word 다운로드 (.docx)</button>
    </div>
  </div>
</div>

<script>
// ── 임베드 데이터 ──────────────────────────────────────────────────
const SOURCES = ${JSON.stringify(SOURCE_META)};
const SOURCE_TITLE_MAP = ${JSON.stringify(SOURCE_TITLE_MAP)};
const ITEMS_BY_SOURCE = ${JSON.stringify(ITEMS_BY_SOURCE)};
const ALL_BY_SOURCE_FOR_WORD = ${JSON.stringify(ALL_BY_SOURCE_FOR_WORD)};
const FT_LABEL = ${JSON.stringify(FT_LABEL)};
const BTYPE_MAP = ${JSON.stringify({
  W01: CODES.bizType.W01,
  W02: CODES.bizType.W02,
  W03: CODES.bizType.W03,
  W04: CODES.bizType.W04,
  W05: CODES.bizType.W05,
})};
const DOCTYPE_VALS = ${JSON.stringify(CODES.docType['값'])};
const DOCTYPE_BY_CAT = ${JSON.stringify(CODES.docType['분류별_사용가능'])};

// ── 상태 ──────────────────────────────────────────────────────────
const state = {
  category: '', bizType: '', docType: '',
  wasteClass: '', wasteCode: '', physicalState: '',
  action: [], rCode: [], facilityType: [],
  approval: '0',
  sources: SOURCES.map(s => s.id),
};
let filteredItems = [];           // 통합 배열
let filteredBySource = {};        // { sourceId: [{item, fIdx}, ...] }
let selectedFIdxs = new Set();    // filteredItems 인덱스

// ── 코드 생성 ─────────────────────────────────────────────────────
function buildCode() {
  const wc  = state.wasteCode.trim() || '0';
  const act = state.action.length  ? state.action.join('+')       : '0';
  const rc  = state.rCode.length   ? state.rCode.join('+')        : '0';
  const ft  = state.facilityType.length ? state.facilityType.join('+') : '0';
  return [state.category||'?', state.bizType||'?', state.docType||'?',
          state.wasteClass||'?', wc, act, rc, ft, state.approval||'0'].join('-');
}

// ── 필터 ──────────────────────────────────────────────────────────
function matchTag(itemVal, stateVals) {
  if (itemVal === null || itemVal === undefined) return true;
  if (!stateVals || !stateVals.length) return true;
  return itemVal.some(v => stateVals.includes(v));
}

function normalizeWasteCodes(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.trim().split('+').map(s => {
    s = s.trim();
    if (s.length === 4 && /^\\d{4}$/.test(s)) return s.slice(0,2) + '-' + s.slice(2);
    return s;
  }).filter(Boolean);
}

function filterItems() {
  const userWasteCodes = normalizeWasteCodes(state.wasteCode);
  function passes(item) {
    if (/^삭제[\\s<(]/.test(item.text || '')) return false;
    const t = item.tags;
    if (!matchTag(t.category,    state.category ? [state.category] : [])) return false;
    if (!matchTag(t.bizType,     state.bizType  ? [state.bizType]  : [])) return false;
    if (!matchTag(t.wasteClass,  state.wasteClass ? [state.wasteClass] : [])) return false;
    if (!matchTag(t.action,      state.action))    return false;
    if (!matchTag(t.facilityType, state.facilityType)) return false;
    if (!matchTag(t.rCode,       state.rCode))     return false;
    if (t.physicalState && state.physicalState && state.physicalState !== 'SL') {
      if (!t.physicalState.includes(state.physicalState)) return false;
    }
    if (t.wasteCode !== null && t.wasteCode !== undefined && userWasteCodes.length > 0) {
      const matches = t.wasteCode.some(ic =>
        userWasteCodes.some(uc => uc === ic || uc.startsWith(ic + '-') || ic.startsWith(uc + '-'))
      );
      if (!matches) return false;
    }
    return true;
  }

  // 1차: 일반 필터링
  const passedKeys = new Set();
  for (const sid of state.sources) {
    for (const item of (ITEMS_BY_SOURCE[sid] || [])) {
      if (passes(item)) passedKeys.add(sid + ':' + item._idx);
    }
  }

  // 2차: 답변 빈값 자식 자동 포함 — 부모(이전 더 낮은 depth 비-헤더 항목) 통과 시
  for (const sid of state.sources) {
    const allItems = ALL_BY_SOURCE_FOR_WORD[sid] || [];
    const parentByDepth = {};
    for (const item of allItems) {
      if (item.tags === null || item.isHeader) continue;
      if (!item.answer && item.tags) {
        for (let d = item.depth - 1; d >= 0; d--) {
          if (parentByDepth[d] !== undefined && passedKeys.has(sid + ':' + parentByDepth[d])) {
            passedKeys.add(sid + ':' + item._idx);
            break;
          }
        }
      }
      parentByDepth[item.depth] = item._idx;
      for (const d of Object.keys(parentByDepth)) {
        if (+d > item.depth) delete parentByDepth[d];
      }
    }
  }

  // 결과 수집 (원래 순서 유지)
  const result = [];
  for (const sid of state.sources) {
    for (const item of (ITEMS_BY_SOURCE[sid] || [])) {
      if (passedKeys.has(sid + ':' + item._idx)) result.push(item);
    }
  }
  return result;
}

// ── wasteVars 치환 ────────────────────────────────────────────────
function renderAnswer(item) {
  let text = item.answer || '';
  if (!item.tags || !item.tags.wasteVars) return escHtml(text);
  for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {
    const display = '<span class="wastevar">' + escHtml(varName) + '(' + codes.join(',') + ')</span>';
    text = text.split('{' + varName + '}').join(display);
  }
  return text;
}

function plainAnswer(item) {
  let text = item.answer || '';
  if (!item.tags || !item.tags.wasteVars) return text;
  for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {
    text = text.split('{' + varName + '}').join(varName + '(' + codes.join(',') + ')');
  }
  return text;
}

// ── 유틸 ──────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function tagPill(label, cls) {
  return '<span class="tag-pill ' + (cls||'') + '">' + escHtml(label) + '</span>';
}

// ── 렌더 ──────────────────────────────────────────────────────────
function renderItems() {
  const container = document.getElementById('items-container');
  if (!filteredItems.length) {
    container.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:60px">조건에 맞는 항목이 없습니다.</div>';
    document.getElementById('result-count').textContent = '결과: 0건';
    updateSelectedCount();
    return;
  }
  document.getElementById('result-count').textContent = '결과: ' + filteredItems.length + '건 (' + Object.keys(filteredBySource).length + '개 별표)';

  let html = '';
  for (const sid of SOURCES.map(s=>s.id)) {
    const list = filteredBySource[sid];
    if (!list || !list.length) continue;
    const meta = SOURCE_TITLE_MAP[sid];
    html += '<div class="source-group">';
    html += '<div class="source-header">';
    html += '<div><span>' + escHtml(meta.short) + '</span><span class="src-meta">' + escHtml(meta.subtitle) + ' · ' + list.length + '건</span></div>';
    html += '<div class="src-actions">';
    html += '<button class="btn btn-secondary" onclick="selectGroup(\\'' + sid + '\\', true)">전체</button>';
    html += '<button class="btn btn-secondary" onclick="selectGroup(\\'' + sid + '\\', false)">해제</button>';
    html += '</div></div>';

    for (const { item, fIdx } of list) {
      const isSel = selectedFIdxs.has(fIdx);
      const tags = item.tags || {};
      const actionPills = tags.action ? tags.action.map(a => tagPill(a,'action')).join('') : '';
      const ftPills = tags.facilityType ? tags.facilityType.map(f => tagPill(FT_LABEL[f]||f,'facility')).join('') : '';
      html += '<div class="item-card' + (isSel ? ' selected' : '') + '" id="item-' + fIdx + '">' +
        '<div class="item-header" onclick="toggleCard(' + fIdx + ')">' +
          '<input type="checkbox" class="item-cb" ' + (isSel?'checked':'') + ' onclick="event.stopPropagation();toggleSelect(' + fIdx + ')">' +
          '<span class="item-marker">' + escHtml(item.marker || '') + '</span>' +
          '<span class="item-text">' + escHtml(item.text || '') + '</span>' +
        '</div>' +
        '<div class="item-answer">' + renderAnswer(item) + '</div>' +
        '<div class="item-tags">' + actionPills + ftPills + '</div>' +
      '</div>';
    }
    html += '</div>';
  }
  container.innerHTML = html;
  updateSelectedCount();
}

function toggleCard(fIdx) {
  const el = document.getElementById('item-' + fIdx);
  if (el) el.classList.toggle('open');
}

function toggleSelect(fIdx) {
  if (selectedFIdxs.has(fIdx)) selectedFIdxs.delete(fIdx);
  else selectedFIdxs.add(fIdx);
  const el = document.getElementById('item-' + fIdx);
  if (el) el.classList.toggle('selected', selectedFIdxs.has(fIdx));
  updateSelectedCount();
}

function selectGroup(sid, on) {
  const list = filteredBySource[sid] || [];
  for (const { fIdx } of list) {
    if (on) selectedFIdxs.add(fIdx);
    else selectedFIdxs.delete(fIdx);
  }
  renderItems();
}

function updateSelectedCount() {
  document.getElementById('selected-count').textContent = '선택된 항목: ' + selectedFIdxs.size + '개';
}

// ── 내보내기 텍스트 생성 ──────────────────────────────────────────
function buildExportText() {
  const code = buildCode();
  const lines = ['[준수계획서 검토 항목]', '상황코드: ' + code, '생성일시: ' + new Date().toLocaleString('ko-KR'), ''];
  // source 별로 그룹핑
  const bySource = {};
  for (const fIdx of [...selectedFIdxs].sort((a,b)=>a-b)) {
    const item = filteredItems[fIdx];
    if (!item) continue;
    if (!bySource[item._source]) bySource[item._source] = [];
    bySource[item._source].push(item);
  }
  for (const sid of SOURCES.map(s=>s.id)) {
    const items = bySource[sid];
    if (!items || !items.length) continue;
    const meta = SOURCE_TITLE_MAP[sid];
    lines.push('━━━ ' + meta.short + ' — ' + meta.subtitle + ' ━━━');
    items.forEach((item, n) => {
      lines.push((n+1) + '. ' + (item.marker ? item.marker + ' ' : '') + item.text);
      lines.push('   → ' + plainAnswer(item));
      lines.push('');
    });
  }
  return lines.join('\\n');
}

// ── 이벤트 ────────────────────────────────────────────────────────
function syncState() {
  state.category   = document.getElementById('f-category').value;
  state.bizType    = document.getElementById('f-bizType').value;
  state.docType    = document.getElementById('f-docType').value;
  state.wasteClass = document.getElementById('f-wasteClass').value;
  state.wasteCode  = document.getElementById('f-wasteCode').value.replace(/\\s/g,'');
  state.physicalState = document.getElementById('f-physicalState').value;
  state.action     = [...document.querySelectorAll('.cb-action:checked')].map(e=>e.value);
  state.rCode      = [...document.querySelectorAll('.cb-rCode:checked')].map(e=>e.value);
  state.facilityType = [...document.querySelectorAll('.cb-ft:checked')].map(e=>e.value);
  state.approval   = document.getElementById('f-approval').value;
  state.sources    = [...document.querySelectorAll('.cb-source:checked')].map(e=>e.value);
}

function updateCodeBar() {
  syncState();
  document.getElementById('code-bar').textContent = '상황코드: ' + buildCode();
}

function updateBizTypeSelect() {
  const cat = document.getElementById('f-category').value;
  const sel = document.getElementById('f-bizType');
  sel.innerHTML = '<option value="">선택</option>';
  if (cat && BTYPE_MAP[cat]) {
    for (const [k,v] of Object.entries(BTYPE_MAP[cat])) {
      sel.innerHTML += '<option value="'+k+'">'+k+' — '+v+'</option>';
    }
  }
  updateDocTypeSelect();
}

function updateDocTypeSelect() {
  const cat = document.getElementById('f-category').value;
  const sel = document.getElementById('f-docType');
  sel.innerHTML = '<option value="">선택</option>';
  const allowed = DOCTYPE_BY_CAT[cat] || [];
  for (const k of allowed) {
    const v = DOCTYPE_VALS[k] || k;
    sel.innerHTML += '<option value="'+k+'">'+k+' — '+v+'</option>';
  }
}

document.getElementById('f-category').addEventListener('change', () => {
  updateBizTypeSelect();
  updateCodeBar();
});
document.getElementById('f-bizType').addEventListener('change', updateCodeBar);
document.getElementById('f-docType').addEventListener('change', updateCodeBar);
document.getElementById('f-wasteClass').addEventListener('change', updateCodeBar);
document.getElementById('f-wasteCode').addEventListener('input', updateCodeBar);
document.getElementById('f-physicalState').addEventListener('change', updateCodeBar);
document.getElementById('f-approval').addEventListener('change', updateCodeBar);
document.querySelectorAll('.cb-action,.cb-rCode,.cb-ft,.cb-source').forEach(cb => {
  cb.addEventListener('change', updateCodeBar);
});

document.getElementById('btn-filter').addEventListener('click', () => {
  syncState();
  selectedFIdxs.clear();
  filteredItems = filterItems();
  filteredBySource = {};
  filteredItems.forEach((item, fIdx) => {
    if (!filteredBySource[item._source]) filteredBySource[item._source] = [];
    filteredBySource[item._source].push({ item, fIdx });
  });
  renderItems();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.querySelectorAll('input[type=checkbox]').forEach(c => { c.checked = c.classList.contains('cb-source'); });
  document.getElementById('f-wasteCode').value = '';
  updateBizTypeSelect();
  updateCodeBar();
  filteredItems = []; filteredBySource = {};
  selectedFIdxs.clear();
  document.getElementById('items-container').innerHTML = '<div style="color:#aaa;text-align:center;margin-top:60px">왼쪽에서 조건을 선택하고<br>「검토 항목 조회」를 눌러주세요.</div>';
  document.getElementById('result-count').textContent = '조회 전';
  updateSelectedCount();
});

document.getElementById('btn-select-all').addEventListener('click', () => {
  filteredItems.forEach((_,i) => selectedFIdxs.add(i));
  renderItems();
});
document.getElementById('btn-deselect-all').addEventListener('click', () => {
  selectedFIdxs.clear();
  renderItems();
});

document.getElementById('btn-copy').addEventListener('click', () => {
  const text = buildExportText();
  navigator.clipboard.writeText(text).then(() => alert('클립보드에 복사되었습니다.')).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    alert('복사 완료');
  });
});

document.getElementById('btn-download').addEventListener('click', exportToWord);

// ── Word 내보내기 ────────────────────────────────────────────────
async function exportToWord() {
  if (!selectedFIdxs.size) { alert('내보낼 항목을 선택해주세요.'); return; }
  if (typeof docx === 'undefined') { alert('docx 라이브러리 로드 중입니다. 잠시 후 다시 시도해주세요.'); return; }

  const { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun,
          WidthType, AlignmentType, BorderStyle, PageOrientation } = docx;

  const OUTER = { style: BorderStyle.THICK,  size: 12, color: '000000' };
  const INNER = { style: BorderStyle.SINGLE, size: 6,  color: '000000' };
  const NIL   = { style: BorderStyle.NIL };
  const tableBorders = { top: OUTER, bottom: OUTER, left: OUTER, right: OUTER, insideH: NIL };

  // 선택을 source별로 묶기
  const selectedBySource = {};
  for (const fIdx of selectedFIdxs) {
    const item = filteredItems[fIdx];
    if (!item) continue;
    if (!selectedBySource[item._source]) selectedBySource[item._source] = new Set();
    selectedBySource[item._source].add(item._idx);
  }

  const code = buildCode();
  const docChildren = [];

  function headerRow(meta) {
    const p1 = [new TextRun({ text: meta.title, bold: true, size: 18 })];
    p1.push(new TextRun({ text: '  <' + code + '>', color: '1d4ed8', size: 16 }));
    return new TableRow({
      children: [new TableCell({
        columnSpan: 2,
        borders: { bottom: INNER },
        children: [new Paragraph({ children: p1 }),
                   new Paragraph({ alignment: AlignmentType.CENTER,
                     children: [new TextRun({ text: meta.subtitle, bold: true, size: 22 })] })]
      })]
    });
  }

  function subHeaderRow() {
    return new TableRow({ children: [
      new TableCell({ borders: { bottom: INNER, right: INNER }, width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '기준', bold: true, size: 21 })] })] }),
      new TableCell({ borders: { bottom: INNER }, width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: '준수계획', bold: true, size: 21 })] })] })
    ]});
  }

  function buildDataRow(r, isLast) {
    const bL = isLast ? { top: NIL, right: INNER } : { top: NIL, bottom: NIL, right: INNER };
    const bR = isLast ? { top: NIL }               : { top: NIL, bottom: NIL };
    const indent = r.depth ? { left: r.depth * 150 } : undefined;
    return new TableRow({ children: [
      new TableCell({ borders: bL, width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ indent,
          children: [new TextRun({ text: r.leftText, bold: r.isHeader, size: r.isHeader ? 21 : 20 })] })] }),
      new TableCell({ borders: bR, width: { size: 50, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: r.rightText, color: r.isNA ? '888888' : '000000', size: 20 })] })] })
    ]});
  }

  function buildTableForSource(sid) {
    const meta = SOURCE_TITLE_MAP[sid];
    const allForWord = (ALL_BY_SOURCE_FOR_WORD[sid] || []).filter(i => !i.noWord);
    const selectedOrigIdx = selectedBySource[sid] || new Set();
    if (!selectedOrigIdx.size) return null;

    const isSectionHeader = item => item.isHeader || (item.tags === null);

    // 답변 빈값 자식 자동 포함: 부모(이전 더 낮은 depth 비-헤더 항목)가 선택되면 자식도 자동 포함
    // — (가)(나)(다) 같이 부모 (2)에 답변이 통합된 자식들이 카드 필터에서 떨어져도 Word에는 본문이 따라가도록
    {
      const parentByDepth = {};
      for (const item of allForWord) {
        if (isSectionHeader(item)) continue;
        if (!item.answer && item.tags) {
          for (let d = item.depth - 1; d >= 0; d--) {
            if (parentByDepth[d] !== undefined && selectedOrigIdx.has(parentByDepth[d])) {
              selectedOrigIdx.add(item._idx);
              break;
            }
          }
        }
        parentByDepth[item.depth] = item._idx;
        for (const d of Object.keys(parentByDepth)) {
          if (+d > item.depth) delete parentByDepth[d];
        }
      }
    }

    // 섹션 헤더(isHeader) 태그가 현재 필터와 매칭되는지 판단
    // 매칭 안 되면 섹션 자체를 Word 출력에서 제외 (법령 조문 구조상 우리 업체와 무관)
    function sectionMatchesFilter(item) {
      if (!item.isHeader || !item.tags) return true;
      const t = item.tags;
      const userCodes = normalizeWasteCodes(state.wasteCode);
      if (!matchTag(t.category,    state.category ? [state.category] : [])) return false;
      if (!matchTag(t.bizType,     state.bizType  ? [state.bizType]  : [])) return false;
      if (!matchTag(t.wasteClass,  state.wasteClass ? [state.wasteClass] : [])) return false;
      if (!matchTag(t.action,      state.action)) return false;
      if (!matchTag(t.facilityType, state.facilityType)) return false;
      if (!matchTag(t.rCode,       state.rCode)) return false;
      if (t.wasteCode && t.wasteCode.length && userCodes.length) {
        const matches = t.wasteCode.some(ic =>
          userCodes.some(uc => uc === ic || uc.startsWith(ic + '-') || ic.startsWith(uc + '-'))
        );
        if (!matches) return false;
      }
      // wasteCodeExclude: 사용자 코드가 전부 제외 목록에 들어가면 섹션 제외
      if (t.wasteCodeExclude && t.wasteCodeExclude.length && userCodes.length) {
        const allExcluded = userCodes.every(uc =>
          t.wasteCodeExclude.some(ec => uc === ec || uc.startsWith(ec + '-'))
        );
        if (allExcluded) return false;
      }
      return true;
    }

    // depth=0 섹션 중 선택 항목이 전혀 없는 섹션 파악 → 헤더+해당없음만 출력
    const emptyTopSectionIdx = new Set();
    {
      let curTopIdx = null, curTopHas = false;
      for (const item of allForWord) {
        if ((item.tags === null || item.isHeader) && item.depth === 0) {
          if (curTopIdx !== null && !curTopHas) emptyTopSectionIdx.add(curTopIdx);
          curTopIdx = item._idx; curTopHas = false;
        } else if (!item.isHeader && item.tags !== null && selectedOrigIdx.has(item._idx)) {
          curTopHas = true;
        }
      }
      if (curTopIdx !== null && !curTopHas) emptyTopSectionIdx.add(curTopIdx);
    }

    const wordRows = [];
    let pendingHeader = null;
    let sectionHasItems = false;
    let inEmptyTopSection = false;
    let inSkippedSection = false;  // 섹션 헤더 태그가 필터와 안 맞아 통째로 스킵

    function flushPendingHeader(header, isNA = false) {
      const text = (header.marker ? header.marker + ' ' : '') + (header.text || '');
      wordRows.push({ leftText: text, rightText: isNA ? '해당하지 않으므로 기재하지 않음' : '', depth: header.depth, isHeader: true, isNA });
    }

    for (const item of allForWord) {
      if (isSectionHeader(item)) {
        if (item.depth === 0) {
          // 이전 섹션 마감
          if (pendingHeader !== null && !sectionHasItems && !inEmptyTopSection && !inSkippedSection) {
            flushPendingHeader(pendingHeader, true);
          }
          pendingHeader = null; sectionHasItems = false;

          // 섹션 필터 매칭 체크 — 안 맞으면 섹션 통째로 Word에서 제외
          if (item.isHeader && !sectionMatchesFilter(item)) {
            inSkippedSection = true;
            inEmptyTopSection = false;
            continue;
          }
          inSkippedSection = false;

          if (emptyTopSectionIdx.has(item._idx)) {
            flushPendingHeader(item, true);
            inEmptyTopSection = true;
          } else {
            inEmptyTopSection = false;
            pendingHeader = item;
          }
        } else {
          if (inEmptyTopSection || inSkippedSection) continue;
          if (pendingHeader !== null && !sectionHasItems) {
            flushPendingHeader(pendingHeader, pendingHeader.depth > 0);
          }
          pendingHeader = item;
          sectionHasItems = false;
        }
      } else {
        if (inEmptyTopSection || inSkippedSection) continue;
        if (!selectedOrigIdx.has(item._idx)) continue;
        if (pendingHeader !== null) {
          flushPendingHeader(pendingHeader);
          pendingHeader = null;
        }
        let answerText = item.answer || '';
        if (item.tags && item.tags.wasteVars) {
          for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {
            answerText = answerText.split('{' + varName + '}').join(varName + '(' + codes.join(',') + ')');
          }
        }
        wordRows.push({
          leftText: (item.marker ? item.marker + ' ' : '') + (item.text || ''),
          rightText: answerText,
          depth: item.depth,
          isHeader: false
        });
        sectionHasItems = true;
      }
    }
    if (pendingHeader !== null && !sectionHasItems && !inEmptyTopSection && !inSkippedSection) {
      flushPendingHeader(pendingHeader, pendingHeader.depth > 0);
    }

    if (!wordRows.length) return null;

    const rows = wordRows.map((r, i) => buildDataRow(r, i === wordRows.length - 1));
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: tableBorders,
      rows: [headerRow(meta), subHeaderRow(), ...rows]
    });
  }

  // SOURCES 순서대로 별표별 테이블 생성
  for (const src of SOURCES) {
    const tbl = buildTableForSource(src.id);
    if (!tbl) continue;
    if (docChildren.length) {
      docChildren.push(new Paragraph({ text: '', spacing: { before: 200, after: 200 } }));
    }
    docChildren.push(tbl);
  }

  if (!docChildren.length) { alert('생성할 내용이 없습니다.'); return; }

  const doc = new Document({ sections: [{ children: docChildren }] });
  const blob = await Packer.toBlob(doc);
  const safeCode = code.replace(/[^A-Za-z0-9_+\\-]/g,'');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'compliance_' + safeCode + '.docx';
  a.click();
}

// 초기화
updateBizTypeSelect();
updateCodeBar();
</script>
</body>
</html>`;

fs.writeFileSync(path.join(BASE, 'app/index.html'), html, 'utf8');
console.log('생성 완료: app/index.html');
console.log('임베드 별표 수:', SOURCES.length);
console.log('총 임베드 항목:', ITEMS_ALL.length);
for (const src of SOURCES) {
  console.log('  -', src.title.replace('■ 폐기물관리법 시행규칙 ',''), ':', ITEMS_BY_SOURCE[src.id].length, '항목');
}
