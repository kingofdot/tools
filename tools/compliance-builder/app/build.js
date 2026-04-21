/**
 * build.js — 별표5 데이터를 임베드한 index.html 생성
 * node app/build.js
 */
const fs = require('fs');
const path = require('path');

const BASE = 'd:/dev/tools/tools/compliance-builder';
const B5   = JSON.parse(fs.readFileSync(`${BASE}/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json`, 'utf8'));
const CODE = JSON.parse(fs.readFileSync(`${BASE}/data/상황코드_코드표.json`, 'utf8'));

// _idx 부여 (ALL_ITEMS에서의 원본 인덱스)
const ALL_RAW = B5['별표내용'].map((item, idx) => ({ ...item, _idx: idx }));
const ITEMS = ALL_RAW.filter(i => i.tags && i.tags.action);
// Word용: tags===null(섹션헤더) + action있는 데이터 항목
const ALL_ITEMS_FOR_WORD = ALL_RAW.filter(i =>
  !i.noWord && (i.tags === null || (i.tags && i.tags.action)));
const CODES = CODE['코드표'];

// facilityType 값→라벨 맵
const FT_LABEL = CODES.facilityType['값'];
const FT_GROUP = CODES.facilityType['그룹'];

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
.panel-right{background:#f8f9fb}
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
.item-card{background:#fff;border:1px solid #e0e4ea;border-radius:6px;margin-bottom:8px;overflow:hidden}
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
#export-bar{position:sticky;bottom:0;background:#fff;border-top:1px solid #dde;padding:8px 14px;display:flex;gap:8px;align-items:center}
#selected-count{font-size:12px;color:#666;flex:1}
.wastevar{font-weight:600;color:#c06000}
</style>
</head>
<body>
<header>
  <h1>폐기물 준수계획서 작성 도구</h1>
  <span style="font-size:11px;opacity:.7">별표5 기준 검토 · 별표5 항목 선택 · 텍스트 내보내기</span>
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
        <input type="text" id="f-wasteCode" placeholder="예: 0106+0107  (없으면 0)">
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
const B5_ITEMS = ${JSON.stringify(ITEMS)};
const B5_ALL_FOR_WORD = ${JSON.stringify(ALL_ITEMS_FOR_WORD)};
const FT_LABEL = ${JSON.stringify(FT_LABEL)};
const BTYPE_MAP = ${JSON.stringify({
  W01: CODES.bizType.W01,
  W02: CODES.bizType.W02,
  W03: CODES.bizType.W03,
  W04: CODES.bizType.W04,
})};
const DOCTYPE_VALS = ${JSON.stringify(CODES.docType['값'])};
const DOCTYPE_BY_CAT = ${JSON.stringify(CODES.docType['분류별_사용가능'])};

// ── 상태 ──────────────────────────────────────────────────────────
const state = {
  category: '', bizType: '', docType: '',
  wasteClass: '', wasteCode: '',
  action: [], rCode: [], facilityType: [],
  approval: '0'
};
let filteredItems = [];
let selectedIds = new Set();

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
  if (itemVal === null) return true;                        // 공통
  if (!stateVals || !stateVals.length) return true;        // 사용자 미선택 → 모두 포함
  return itemVal.some(v => stateVals.includes(v));
}

// 4자리 입력 "5138" → 별표4 형식 "51-38"
function normalizeWasteCodes(raw) {
  if (!raw || !raw.trim()) return [];
  return raw.trim().split('+').map(s => {
    s = s.trim();
    if (s.length === 4 && /^\d{4}$/.test(s)) return s.slice(0,2) + '-' + s.slice(2);
    return s; // 이미 XX-XX 형식이거나 기타
  }).filter(Boolean);
}

function filterItems() {
  const userWasteCodes = normalizeWasteCodes(state.wasteCode);
  return B5_ITEMS.filter(item => {
    if (/^삭제[\s<(]/.test(item.text || '')) return false;
    const t = item.tags;
    if (!matchTag(t.category,    state.category ? [state.category] : [])) return false;
    if (!matchTag(t.bizType,     state.bizType  ? [state.bizType]  : [])) return false;
    if (!matchTag(t.wasteClass,  state.wasteClass ? [state.wasteClass] : [])) return false;
    if (!matchTag(t.action,      state.action))    return false;
    if (!matchTag(t.facilityType, state.facilityType)) return false;
    // wasteCode 필터: null=범용(항상 통과), 비null=교집합 필요
    if (t.wasteCode !== null && t.wasteCode !== undefined) {
      if (userWasteCodes.length === 0) return true; // 미입력 시 모두 포함
      if (!t.wasteCode.some(c => userWasteCodes.includes(c))) return false;
    }
    return true;
  });
}

// ── wasteVars 치환 ────────────────────────────────────────────────
function renderAnswer(item) {
  let text = item.answer || '';
  if (!item.tags.wasteVars) return escHtml(text);
  for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {
    const display = '<span class="wastevar">' + escHtml(varName) + '(' + codes.join(',') + ')</span>';
    text = text.replace(new RegExp('{' + varName + '}', 'g'), display);
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
    return;
  }
  document.getElementById('result-count').textContent = '결과: ' + filteredItems.length + '건';

  container.innerHTML = filteredItems.map((item, idx) => {
    const id = 'item-' + idx;
    const isSel = selectedIds.has(idx);
    const tags = item.tags;

    const actionPills = tags.action ? tags.action.map(a => tagPill(a,'action')).join('') : '';
    const ftPills = tags.facilityType ? tags.facilityType.map(f => tagPill(FT_LABEL[f]||f,'facility')).join('') : '';

    return \`<div class="item-card\${isSel?' selected':''}" id="\${id}">
  <div class="item-header" onclick="toggleCard(\${idx})">
    <input type="checkbox" class="item-cb" \${isSel?'checked':''} onclick="event.stopPropagation();toggleSelect(\${idx})">
    <span class="item-marker">\${escHtml(item.marker)}</span>
    <span class="item-text">\${escHtml(item.text)}</span>
  </div>
  <div class="item-answer">\${renderAnswer(item)}</div>
  <div class="item-tags">\${actionPills}\${ftPills}</div>
</div>\`;
  }).join('');

  updateSelectedCount();
}

function toggleCard(idx) {
  const el = document.getElementById('item-' + idx);
  el.classList.toggle('open');
}

function toggleSelect(idx) {
  if (selectedIds.has(idx)) selectedIds.delete(idx);
  else selectedIds.add(idx);
  const el = document.getElementById('item-' + idx);
  if (el) el.classList.toggle('selected', selectedIds.has(idx));
  updateSelectedCount();
}

function updateSelectedCount() {
  document.getElementById('selected-count').textContent = '선택된 항목: ' + selectedIds.size + '개';
}

// ── 내보내기 텍스트 생성 ──────────────────────────────────────────
function buildExportText() {
  const code = buildCode();
  const lines = ['[준수계획서 검토 항목]', '상황코드: ' + code, '생성일시: ' + new Date().toLocaleString('ko-KR'), ''];
  const ordered = [...selectedIds].sort((a,b)=>a-b);
  ordered.forEach((idx, n) => {
    const item = filteredItems[idx];
    if (!item) return;
    lines.push((n+1) + '. ' + item.text);
    let ans = item.answer || '';
    if (item.tags.wasteVars) {
      for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {
        ans = ans.replace(new RegExp('{'+varName+'}','g'), varName + '(' + codes.join(',') + ')');
      }
    }
    lines.push('   → ' + ans);
    lines.push('');
  });
  return lines.join('\\n');
}

// ── 이벤트 ────────────────────────────────────────────────────────
function syncState() {
  state.category   = document.getElementById('f-category').value;
  state.bizType    = document.getElementById('f-bizType').value;
  state.docType    = document.getElementById('f-docType').value;
  state.wasteClass = document.getElementById('f-wasteClass').value;
  state.wasteCode  = document.getElementById('f-wasteCode').value.replace(/\\s/g,'');
  state.action     = [...document.querySelectorAll('.cb-action:checked')].map(e=>e.value);
  state.rCode      = [...document.querySelectorAll('.cb-rCode:checked')].map(e=>e.value);
  state.facilityType = [...document.querySelectorAll('.cb-ft:checked')].map(e=>e.value);
  state.approval   = document.getElementById('f-approval').value;
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
document.getElementById('f-approval').addEventListener('change', updateCodeBar);
document.querySelectorAll('.cb-action,.cb-rCode,.cb-ft').forEach(cb => {
  cb.addEventListener('change', updateCodeBar);
});

document.getElementById('btn-filter').addEventListener('click', () => {
  syncState();
  selectedIds.clear();
  filteredItems = filterItems();
  renderItems();
});

document.getElementById('btn-reset').addEventListener('click', () => {
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = false);
  document.getElementById('f-wasteCode').value = '';
  updateBizTypeSelect();
  updateCodeBar();
  filteredItems = [];
  selectedIds.clear();
  document.getElementById('items-container').innerHTML = '<div style="color:#aaa;text-align:center;margin-top:60px">왼쪽에서 조건을 선택하고<br>「검토 항목 조회」를 눌러주세요.</div>';
  document.getElementById('result-count').textContent = '조회 전';
  updateSelectedCount();
});

document.getElementById('btn-select-all').addEventListener('click', () => {
  filteredItems.forEach((_,i) => selectedIds.add(i));
  renderItems();
});
document.getElementById('btn-deselect-all').addEventListener('click', () => {
  selectedIds.clear();
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

async function exportToWord() {
  if (!selectedIds.size) { alert('내보낼 항목을 선택해주세요.'); return; }
  if (typeof docx === 'undefined') { alert('docx 라이브러리 로드 중입니다. 잠시 후 다시 시도해주세요.'); return; }

  const { Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun,
          WidthType, AlignmentType, BorderStyle } = docx;

  const OUTER = { style: BorderStyle.THICK,  size: 12, color: '000000' };
  const INNER = { style: BorderStyle.SINGLE, size: 6,  color: '000000' };
  const NIL   = { style: BorderStyle.NIL };
  const tableBorders = { top: OUTER, bottom: OUTER, left: OUTER, right: OUTER, insideH: NIL };

  function headerRow(code) {
    const p1 = [new TextRun({ text: '■ 폐기물관리법 시행규칙 [별표5]', bold: true, size: 18 })];
    p1.push(new TextRun({ text: '  <' + code + '>', color: '1d4ed8', size: 16 }));
    return new TableRow({
      children: [new TableCell({
        columnSpan: 2,
        borders: { bottom: INNER },
        children: [new Paragraph({ children: p1 }),
                   new Paragraph({ alignment: AlignmentType.CENTER,
                     children: [new TextRun({ text: '폐기물의 처리에 관한 구체적 기준 및 방법', bold: true, size: 22 })] })]
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

  const code = buildCode();

  // 선택된 항목의 _idx Set
  const selectedOrigIdx = new Set(
    [...selectedIds].map(i => filteredItems[i]?._idx).filter(v => v !== undefined)
  );

  // noWord 항목 제외 (부칙·경과조치 등 Word 불필요 항목)
  const B5_WORD_FILTERED = B5_ALL_FOR_WORD.filter(i => !i.noWord);

  // 최상위(depth=0) 섹션 중 선택 항목이 전혀 없는 섹션 파악
  // → 해당 섹션은 헤더 한 줄 + "해당없음"만 출력하고 내부 전부 생략
  const emptyTopSectionIdx = new Set();
  {
    let curTopIdx = null, curTopHas = false;
    for (const item of B5_WORD_FILTERED) {
      if (item.tags === null && item.depth === 0) {
        if (curTopIdx !== null && !curTopHas) emptyTopSectionIdx.add(curTopIdx);
        curTopIdx = item._idx; curTopHas = false;
      } else if (item.tags !== null && selectedOrigIdx.has(item._idx)) {
        curTopHas = true;
      }
    }
    if (curTopIdx !== null && !curTopHas) emptyTopSectionIdx.add(curTopIdx);
  }

  const wordRows = [];
  let pendingHeader = null;
  let sectionHasItems = false;
  let inEmptyTopSection = false;

  // isNA=true 이면 우측 열에 "해당없음" 텍스트를 헤더와 같은 행에 출력
  function flushPendingHeader(header, isNA = false) {
    const text = (header.marker ? header.marker + ' ' : '') + (header.text || '');
    wordRows.push({ leftText: text, rightText: isNA ? '해당하지 않으므로 기재하지 않음' : '', depth: header.depth, isHeader: true, isNA });
  }

  for (const item of B5_WORD_FILTERED) {
    if (item.tags === null) {
      if (item.depth === 0) {
        // 최상위 섹션헤더 전환 시 이전 서브헤더 마무리
        if (pendingHeader !== null && !sectionHasItems && !inEmptyTopSection) {
          flushPendingHeader(pendingHeader, true);
        }
        pendingHeader = null; sectionHasItems = false;
        if (emptyTopSectionIdx.has(item._idx)) {
          // 전체 미해당 섹션 → 헤더+해당없음 한 행, 내부 생략
          flushPendingHeader(item, true);
          inEmptyTopSection = true;
        } else {
          inEmptyTopSection = false;
          pendingHeader = item;
        }
      } else {
        // 서브 섹션헤더
        if (inEmptyTopSection) continue;
        if (pendingHeader !== null && !sectionHasItems) {
          flushPendingHeader(pendingHeader, true);
        }
        pendingHeader = item;
        sectionHasItems = false;
      }
    } else {
      if (inEmptyTopSection) continue;
      if (!selectedOrigIdx.has(item._idx)) continue;
      if (pendingHeader !== null) {
        flushPendingHeader(pendingHeader);
        pendingHeader = null;
      }
      let answerText = item.answer || '';
      if (item.tags && item.tags.wasteVars) {
        for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {
          answerText = answerText.replace(new RegExp('{'+varName+'}','g'), varName+'('+codes.join(',')+')');
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
  // 마지막 서브헤더 마무리
  if (pendingHeader !== null && !sectionHasItems && !inEmptyTopSection) {
    flushPendingHeader(pendingHeader, true);
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

  const rows = wordRows.map((r, i) => buildDataRow(r, i === wordRows.length - 1));

  const doc = new Document({
    sections: [{ children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: tableBorders,
        rows: [headerRow(code), subHeaderRow(), ...rows]
      })
    ]}]
  });

  const blob = await Packer.toBlob(doc);
  const safeCode = code.replace(/[^A-Za-z0-9_+\-]/g,'');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'compliance_' + safeCode + '.docx';
  a.click();
}
</script>
</body>
</html>`;

fs.writeFileSync(`${BASE}/app/index.html`, html, 'utf8');
console.log('생성 완료: app/index.html');
console.log('임베드 항목 수:', ITEMS.length);
