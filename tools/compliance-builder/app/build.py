# -*- coding: utf-8 -*-
"""
build.py — 별표5 + 상황코드_코드표 데이터를 임베드한 index.html 생성.

node 미설치 환경을 위한 Python 포팅. build.js 와 동일한 결과를 만든다.
실행: python app/build.py
"""

import json
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
B5_PATH = BASE / "data" / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"
CODE_PATH = BASE / "data" / "상황코드_코드표.json"
OUT_PATH = BASE / "app" / "index.html"

B5 = json.loads(B5_PATH.read_text(encoding="utf-8"))
CODE = json.loads(CODE_PATH.read_text(encoding="utf-8"))

ALL_RAW = []
for idx, item in enumerate(B5["별표내용"]):
    clone = dict(item)
    clone["_idx"] = idx
    ALL_RAW.append(clone)


def has_content_tag(i):
    t = i.get("tags")
    return bool(t and (t.get("action") or t.get("wasteClass")))


ITEMS = [i for i in ALL_RAW if has_content_tag(i)]
ALL_ITEMS_FOR_WORD = [
    i for i in ALL_RAW
    if not i.get("noWord") and (i.get("tags") is None or has_content_tag(i))
]

CODES = CODE["코드표"]
FT_LABEL = CODES["facilityType"]["값"]
FT_GROUP = CODES["facilityType"]["그룹"]


def js(obj):
    """JSON.stringify 호환 직렬화 (ensure_ascii=False 로 한글 그대로)."""
    return json.dumps(obj, ensure_ascii=False, separators=(",", ":"))


def escape_attr(s):
    return str(s).replace('"', "&quot;")


# ── 왼쪽 패널 셀렉트·체크박스 HTML 조각 ──────────────────────────────
def opt_list(entries):
    return "\n          ".join(
        f'<option value="{k}">{k} — {v}</option>' for k, v in entries
    )


def cb_list(entries, cls):
    return "\n        ".join(
        f'<label class="cb-item"><input type="checkbox" class="{cls}" value="{k}"> {k} {v}</label>'
        for k, v in entries
    )


category_opts = opt_list(CODES["category"]["값"].items())
wasteClass_opts = opt_list(CODES["wasteClass"]["값"].items())
action_cbs = cb_list(CODES["action"]["값"].items(), "cb-action")
rCode_cbs = "\n        ".join(
    f'<label class="cb-item"><input type="checkbox" class="cb-rCode" value="{k}"> {k}</label>'
    for k in CODES["rCode"]["값"].keys() if k != "0"
)

ft_groups_html = ""
for group, codes in FT_GROUP.items():
    if group == "없음":
        continue
    ft_cbs = "\n          ".join(
        f'<label class="cb-item" title="{escape_attr(FT_LABEL.get(c, c))}"><input type="checkbox" class="cb-ft" value="{c}"> {c}</label>'
        for c in codes
    )
    ft_groups_html += f"""
      <div class="ft-group">
        <div class="ft-group-title">{group.replace('_', ' ')}</div>
        <div class="checkbox-grid three">
          {ft_cbs}
        </div>
      </div>"""

approval_opts = "\n        ".join(
    f'<option value="{k}">{k} — {v}</option>'
    for k, v in CODES["facilityApproval"]["값"].items() if k != "0"
)

# BTYPE_MAP 에 W01~W05 포함
BTYPE_MAP = {}
for key in ("W01", "W02", "W03", "W04", "W05"):
    if key in CODES["bizType"]:
        BTYPE_MAP[key] = CODES["bizType"][key]


HTML = f"""<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>준수계획서 작성 도구</title>
<script src="https://unpkg.com/docx@8.5.0/build/index.umd.js"></script>
<style>
*{{box-sizing:border-box;margin:0;padding:0}}
body{{font-family:'Malgun Gothic',sans-serif;font-size:13px;background:#f0f2f5;color:#222}}
header{{background:#1a3a5c;color:#fff;padding:12px 20px;display:flex;align-items:center;gap:12px}}
header h1{{font-size:16px;font-weight:600}}
#code-bar{{background:#0d2b45;color:#7ec8e3;font-family:monospace;font-size:12px;padding:6px 20px;letter-spacing:.5px;min-height:28px}}
.layout{{display:grid;grid-template-columns:320px 1fr;height:calc(100vh - 70px)}}
.panel{{overflow-y:auto;padding:14px}}
.panel-left{{background:#fff;border-right:1px solid #dde}}
.panel-right{{background:#f8f9fb}}
.section{{margin-bottom:14px}}
.section-title{{font-size:11px;font-weight:700;color:#1a3a5c;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px;padding-bottom:4px;border-bottom:1px solid #e0e4ea}}
.field{{margin-bottom:8px}}
.field label{{display:block;font-size:11px;color:#555;margin-bottom:3px}}
select,input[type=text]{{width:100%;padding:5px 8px;border:1px solid #ccd;border-radius:4px;font-size:12px;font-family:inherit}}
select:focus,input:focus{{outline:none;border-color:#1a3a5c}}
.checkbox-grid{{display:grid;grid-template-columns:1fr 1fr;gap:2px}}
.checkbox-grid.three{{grid-template-columns:1fr 1fr 1fr}}
.cb-item{{display:flex;align-items:center;gap:4px;font-size:11px;padding:2px 0}}
.cb-item input{{margin:0;flex-shrink:0}}
.ft-group{{margin-bottom:8px}}
.ft-group-title{{font-size:10px;font-weight:700;color:#888;margin-bottom:3px}}
.btn{{padding:6px 12px;border:none;border-radius:4px;cursor:pointer;font-size:12px;font-family:inherit}}
.btn-primary{{background:#1a3a5c;color:#fff}}
.btn-primary:hover{{background:#245080}}
.btn-secondary{{background:#e8ecf0;color:#333}}
.btn-secondary:hover{{background:#d8dce0}}
.btn-row{{display:flex;gap:6px;margin-top:6px}}
#result-header{{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}}
#result-count{{font-size:12px;color:#666}}
.item-card{{background:#fff;border:1px solid #e0e4ea;border-radius:6px;margin-bottom:8px;overflow:hidden}}
.item-card.selected{{border-color:#1a3a5c;background:#f0f5ff}}
.item-header{{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;cursor:pointer}}
.item-cb{{margin-top:2px;flex-shrink:0}}
.item-marker{{font-size:11px;font-weight:700;color:#1a3a5c;min-width:30px}}
.item-text{{font-size:12px;line-height:1.6;flex:1}}
.item-answer{{font-size:12px;color:#2a6;background:#f5fff8;border-top:1px solid #ddeedd;padding:8px 10px 8px 48px;line-height:1.6;display:none}}
.item-card.open .item-answer{{display:block}}
.item-tags{{font-size:10px;color:#aaa;padding:0 10px 6px 48px;display:flex;flex-wrap:wrap;gap:4px}}
.tag-pill{{background:#e8ecf0;border-radius:10px;padding:1px 6px}}
.tag-pill.action{{background:#e8f0fe;color:#1a4a9c}}
.tag-pill.facility{{background:#fff3cd;color:#7a5c00}}
#export-bar{{position:sticky;bottom:0;background:#fff;border-top:1px solid #dde;padding:8px 14px;display:flex;gap:8px;align-items:center}}
#selected-count{{font-size:12px;color:#666;flex:1}}
.wastevar{{font-weight:600;color:#c06000}}
/* 전체 보기 모달 */
#all-view-modal{{display:none;position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:1000;overflow:auto}}
#all-view-inner{{background:#fff;margin:32px auto;max-width:1100px;border-radius:8px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,.3)}}
#all-view-header{{background:#1a3a5c;color:#fff;padding:12px 20px;display:flex;align-items:center;justify-content:space-between}}
#all-view-header h2{{font-size:14px;font-weight:700}}
#btn-close-all{{background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:4px;padding:3px 10px;cursor:pointer;font-size:12px}}
#btn-close-all:hover{{background:rgba(255,255,255,.15)}}
.av-filter-bar{{padding:8px 16px;background:#f0f4f8;border-bottom:1px solid #dde;display:flex;gap:10px;align-items:center;font-size:12px}}
.av-filter-bar label{{color:#555}}
#av-filter-src{{padding:3px 6px;border:1px solid #ccd;border-radius:4px;font-size:12px;font-family:inherit}}
#av-no-answer-toggle{{margin:0}}
#all-view-content{{padding:16px}}
.av-source-block{{margin-bottom:24px}}
.av-source-title{{font-size:12px;font-weight:700;color:#fff;background:#1a3a5c;padding:5px 12px;border-radius:4px;margin-bottom:8px}}
.av-table{{width:100%;border-collapse:collapse;font-size:12px;line-height:1.6}}
.av-table th{{background:#e8ecf2;color:#1a3a5c;font-weight:700;padding:6px 10px;border:1px solid #ccd;text-align:left;font-size:11px}}
.av-table td{{padding:7px 10px;border:1px solid #e0e4ea;vertical-align:top}}
.av-table td.av-marker{{color:#1a3a5c;font-weight:700;white-space:nowrap;width:36px}}
.av-table td.av-text{{background:#fff;width:48%}}
.av-table td.av-answer{{background:#f5fff8;color:#1a5c2a;width:48%}}
.av-table td.av-answer.empty{{color:#bbb;font-style:italic}}
</style>
</head>
<body>
<header>
  <h1>폐기물 준수계획서 작성 도구</h1>
  <span style="font-size:11px;opacity:.7">별표5 기준 검토 · 별표5 항목 선택 · 텍스트 내보내기</span>
  <button class="btn" id="btn-all-view" style="margin-left:auto;background:#2c5f8a;color:#fff;font-size:12px;padding:5px 14px">전체 보기</button>
</header>
<div id="code-bar">상황코드: —</div>
<div class="layout">
  <div class="panel panel-left" id="left-panel">
    <div class="section">
      <div class="section-title">분류 정보</div>
      <div class="field">
        <label>대분류 (category)</label>
        <select id="f-category">
          <option value="">선택</option>
          {category_opts}
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
          {wasteClass_opts}
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
        {action_cbs}
      </div>
    </div>

    <div class="section">
      <div class="section-title">재활용 유형 (rCode)</div>
      <div class="checkbox-grid">
        {rCode_cbs}
      </div>
    </div>

    <div class="section">
      <div class="section-title">처리시설 종류 (facilityType)</div>
      {ft_groups_html}
    </div>

    <div class="section">
      <div class="section-title">시설 설치 절차 (facilityApproval)</div>
      <select id="f-approval">
        <option value="0">0 — 해당없음</option>
        {approval_opts}
      </select>
    </div>

    <div class="btn-row">
      <button class="btn btn-primary" id="btn-filter">검토 항목 조회</button>
      <button class="btn btn-secondary" id="btn-reset">초기화</button>
    </div>
  </div>

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

<!-- 전체 보기 모달 -->
<div id="all-view-modal">
  <div id="all-view-inner">
    <div id="all-view-header">
      <h2>전체 검토사항 — 기준 · 답변</h2>
      <button id="btn-close-all">닫기 ✕</button>
    </div>
    <div class="av-filter-bar">
      <label>별표 선택: <select id="av-filter-src"><option value="">전체</option></select></label>
      <label><input type="checkbox" id="av-no-answer-toggle"> 답변 없는 항목 숨기기</label>
      <span id="av-count" style="margin-left:auto;color:#888"></span>
    </div>
    <div id="all-view-content"></div>
  </div>
</div>

<script>
const B5_ITEMS = {js(ITEMS)};
const B5_ALL_FOR_WORD = {js(ALL_ITEMS_FOR_WORD)};
const FT_LABEL = {js(FT_LABEL)};
const BTYPE_MAP = {js(BTYPE_MAP)};
const DOCTYPE_VALS = {js(CODES["docType"]["값"])};
const DOCTYPE_BY_CAT = {js(CODES["docType"]["분류별_사용가능"])};

const state = {{
  category: '', bizType: '', docType: '',
  wasteClass: '', wasteCode: '', physicalState: '',
  action: [], rCode: [], facilityType: [],
  approval: '0'
}};
let filteredItems = [];
let selectedIds = new Set();

function buildCode() {{
  const wc  = state.wasteCode.trim() || '0';
  const act = state.action.length  ? state.action.join('+')       : '0';
  const rc  = state.rCode.length   ? state.rCode.join('+')        : '0';
  const ft  = state.facilityType.length ? state.facilityType.join('+') : '0';
  return [state.category||'?', state.bizType||'?', state.docType||'?',
          state.wasteClass||'?', wc, act, rc, ft, state.approval||'0'].join('-');
}}

function matchTag(itemVal, stateVals) {{
  if (itemVal === null) return true;
  if (!stateVals || !stateVals.length) return true;
  return itemVal.some(v => stateVals.includes(v));
}}

function normalizeWasteCodes(raw) {{
  if (!raw || !raw.trim()) return [];
  return raw.trim().split('+').map(s => {{
    s = s.trim();
    if (s.length === 4 && /^\\d{{4}}$/.test(s)) return s.slice(0,2) + '-' + s.slice(2);
    return s;
  }}).filter(Boolean);
}}

function filterItems() {{
  const userWasteCodes = normalizeWasteCodes(state.wasteCode);
  return B5_ITEMS.filter(item => {{
    if (/^삭제[\\s<(]/.test(item.text || '')) return false;
    const t = item.tags;
    if (!matchTag(t.category,    state.category ? [state.category] : [])) return false;
    if (!matchTag(t.bizType,     state.bizType  ? [state.bizType]  : [])) return false;
    if (!matchTag(t.wasteClass,  state.wasteClass ? [state.wasteClass] : [])) return false;
    if (!matchTag(t.action,      state.action))    return false;
    if (!matchTag(t.facilityType, state.facilityType)) return false;
    if (t.physicalState && state.physicalState && state.physicalState !== 'SL') {{
      if (!t.physicalState.includes(state.physicalState)) return false;
    }}
    if (t.wasteCode !== null && t.wasteCode !== undefined) {{
      if (userWasteCodes.length === 0) return true;
      const matches = t.wasteCode.some(ic =>
        userWasteCodes.some(uc => uc === ic || uc.startsWith(ic + '-') || ic.startsWith(uc + '-'))
      );
      if (!matches) return false;
    }}
    return true;
  }});
}}

function renderAnswer(item) {{
  let text = item.answer || '';
  if (!item.tags.wasteVars) return escHtml(text);
  for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {{
    const display = '<span class="wastevar">' + escHtml(varName) + '(' + codes.join(',') + ')</span>';
    text = text.replace(new RegExp('{{' + varName + '}}', 'g'), display);
  }}
  return text;
}}

function escHtml(s) {{
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}}
function tagPill(label, cls) {{
  return '<span class="tag-pill ' + (cls||'') + '">' + escHtml(label) + '</span>';
}}

function renderItems() {{
  const container = document.getElementById('items-container');
  if (!filteredItems.length) {{
    container.innerHTML = '<div style="color:#aaa;text-align:center;margin-top:60px">조건에 맞는 항목이 없습니다.</div>';
    document.getElementById('result-count').textContent = '결과: 0건';
    return;
  }}
  document.getElementById('result-count').textContent = '결과: ' + filteredItems.length + '건';

  container.innerHTML = filteredItems.map((item, idx) => {{
    const id = 'item-' + idx;
    const isSel = selectedIds.has(idx);
    const tags = item.tags;
    const actionPills = tags.action ? tags.action.map(a => tagPill(a,'action')).join('') : '';
    const ftPills = tags.facilityType ? tags.facilityType.map(f => tagPill(FT_LABEL[f]||f,'facility')).join('') : '';
    return `<div class="item-card${{isSel?' selected':''}}" id="${{id}}">
  <div class="item-header" onclick="toggleCard(${{idx}})">
    <input type="checkbox" class="item-cb" ${{isSel?'checked':''}} onclick="event.stopPropagation();toggleSelect(${{idx}})">
    <span class="item-marker">${{escHtml(item.marker)}}</span>
    <span class="item-text">${{escHtml(item.text)}}</span>
  </div>
  <div class="item-answer">${{renderAnswer(item)}}</div>
  <div class="item-tags">${{actionPills}}${{ftPills}}</div>
</div>`;
  }}).join('');

  updateSelectedCount();
}}

function toggleCard(idx) {{
  const el = document.getElementById('item-' + idx);
  el.classList.toggle('open');
}}
function toggleSelect(idx) {{
  if (selectedIds.has(idx)) selectedIds.delete(idx);
  else selectedIds.add(idx);
  const el = document.getElementById('item-' + idx);
  if (el) el.classList.toggle('selected', selectedIds.has(idx));
  updateSelectedCount();
}}
function updateSelectedCount() {{
  document.getElementById('selected-count').textContent = '선택된 항목: ' + selectedIds.size + '개';
}}

function buildExportText() {{
  const code = buildCode();
  const lines = ['[준수계획서 검토 항목]', '상황코드: ' + code, '생성일시: ' + new Date().toLocaleString('ko-KR'), ''];
  const ordered = [...selectedIds].sort((a,b)=>a-b);
  ordered.forEach((idx, n) => {{
    const item = filteredItems[idx];
    if (!item) return;
    lines.push((n+1) + '. ' + item.text);
    let ans = item.answer || '';
    if (item.tags.wasteVars) {{
      for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {{
        ans = ans.replace(new RegExp('{{'+varName+'}}','g'), varName + '(' + codes.join(',') + ')');
      }}
    }}
    lines.push('   → ' + ans);
    lines.push('');
  }});
  return lines.join('\\n');
}}

function syncState() {{
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
}}

function updateCodeBar() {{
  syncState();
  document.getElementById('code-bar').textContent = '상황코드: ' + buildCode();
}}

function updateBizTypeSelect() {{
  const cat = document.getElementById('f-category').value;
  const sel = document.getElementById('f-bizType');
  sel.innerHTML = '<option value="">선택</option>';
  if (cat && BTYPE_MAP[cat]) {{
    for (const [k,v] of Object.entries(BTYPE_MAP[cat])) {{
      sel.innerHTML += '<option value="'+k+'">'+k+' — '+v+'</option>';
    }}
  }}
  updateDocTypeSelect();
}}

function updateDocTypeSelect() {{
  const cat = document.getElementById('f-category').value;
  const sel = document.getElementById('f-docType');
  sel.innerHTML = '<option value="">선택</option>';
  const allowed = DOCTYPE_BY_CAT[cat] || [];
  for (const k of allowed) {{
    const v = DOCTYPE_VALS[k] || k;
    sel.innerHTML += '<option value="'+k+'">'+k+' — '+v+'</option>';
  }}
}}

document.getElementById('f-category').addEventListener('change', () => {{
  updateBizTypeSelect();
  updateCodeBar();
}});
document.getElementById('f-bizType').addEventListener('change', updateCodeBar);
document.getElementById('f-docType').addEventListener('change', updateCodeBar);
document.getElementById('f-wasteClass').addEventListener('change', updateCodeBar);
document.getElementById('f-wasteCode').addEventListener('input', updateCodeBar);
document.getElementById('f-physicalState').addEventListener('change', updateCodeBar);
document.getElementById('f-approval').addEventListener('change', updateCodeBar);
document.querySelectorAll('.cb-action,.cb-rCode,.cb-ft').forEach(cb => {{
  cb.addEventListener('change', updateCodeBar);
}});

document.getElementById('btn-filter').addEventListener('click', () => {{
  syncState();
  selectedIds.clear();
  filteredItems = filterItems();
  renderItems();
}});

document.getElementById('btn-reset').addEventListener('click', () => {{
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
}});

document.getElementById('btn-select-all').addEventListener('click', () => {{
  filteredItems.forEach((_,i) => selectedIds.add(i));
  renderItems();
}});
document.getElementById('btn-deselect-all').addEventListener('click', () => {{
  selectedIds.clear();
  renderItems();
}});

document.getElementById('btn-copy').addEventListener('click', () => {{
  const text = buildExportText();
  navigator.clipboard.writeText(text).then(() => alert('클립보드에 복사되었습니다.')).catch(() => {{
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    document.execCommand('copy'); document.body.removeChild(ta);
    alert('복사 완료');
  }});
}});

document.getElementById('btn-download').addEventListener('click', exportToWord);

// ── 전체 보기 모달 ────────────────────────────────────────────────
(function() {{
  const modal = document.getElementById('all-view-modal');
  const content = document.getElementById('all-view-content');
  const srcSelect = document.getElementById('av-filter-src');
  const noAnswerToggle = document.getElementById('av-no-answer-toggle');
  const avCount = document.getElementById('av-count');

  // B5_ITEMS is a flat list — group by _source for display
  const srcMap = {{}};
  B5_ITEMS.forEach(function(it) {{
    const s = it._source || 'b5';
    if (!srcMap[s]) srcMap[s] = [];
    srcMap[s].push(it);
  }});
  const srcIds = Object.keys(srcMap);
  srcIds.forEach(function(sid) {{
    const opt = document.createElement('option');
    opt.value = sid; opt.textContent = '[' + sid + ']';
    srcSelect.appendChild(opt);
  }});

  function renderAll() {{
    const filterSrc = srcSelect.value;
    const hideNoAnswer = noAnswerToggle.checked;
    content.innerHTML = '';
    let total = 0;

    srcIds.forEach(function(sid) {{
      if (filterSrc && sid !== filterSrc) return;
      const rows = srcMap[sid].filter(function(it) {{
        return !(hideNoAnswer && !it.answer);
      }});
      if (!rows.length) return;
      total += rows.length;

      const block = document.createElement('div');
      block.className = 'av-source-block';
      block.innerHTML = '<div class="av-source-title">[' + sid + ']</div>';

      const table = document.createElement('table');
      table.className = 'av-table';
      table.innerHTML = '<thead><tr><th style="width:36px">번호</th><th>법령 기준</th><th>준수계획서 답변</th></tr></thead>';
      const tbody = document.createElement('tbody');

      rows.forEach(function(it) {{
        const tr = document.createElement('tr');
        const ans = it.answer || '';
        tr.innerHTML =
          '<td class="av-marker">' + (it.marker || '') + '</td>' +
          '<td class="av-text">' + (it.text || '') + '</td>' +
          '<td class="av-answer' + (ans ? '' : ' empty') + '">' + (ans || '(답변 없음)') + '</td>';
        tbody.appendChild(tr);
      }});

      table.appendChild(tbody);
      block.appendChild(table);
      content.appendChild(block);
    }});

    avCount.textContent = '총 ' + total + '건';
  }}

  document.getElementById('btn-all-view').addEventListener('click', function() {{
    renderAll();
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }});

  document.getElementById('btn-close-all').addEventListener('click', function() {{
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }});

  modal.addEventListener('click', function(e) {{
    if (e.target === modal) {{
      modal.style.display = 'none';
      document.body.style.overflow = '';
    }}
  }});

  srcSelect.addEventListener('change', renderAll);
  noAnswerToggle.addEventListener('change', renderAll);
}})();

async function exportToWord() {{
  if (!selectedIds.size) {{ alert('내보낼 항목을 선택해주세요.'); return; }}
  if (typeof docx === 'undefined') {{ alert('docx 라이브러리 로드 중입니다. 잠시 후 다시 시도해주세요.'); return; }}

  const {{ Document, Packer, Table, TableRow, TableCell, Paragraph, TextRun,
          WidthType, AlignmentType, BorderStyle }} = docx;

  const OUTER = {{ style: BorderStyle.THICK,  size: 12, color: '000000' }};
  const INNER = {{ style: BorderStyle.SINGLE, size: 6,  color: '000000' }};
  const NIL   = {{ style: BorderStyle.NIL }};
  const tableBorders = {{ top: OUTER, bottom: OUTER, left: OUTER, right: OUTER, insideH: NIL }};

  function headerRow(code) {{
    const p1 = [new TextRun({{ text: '■ 폐기물관리법 시행규칙 [별표5]', bold: true, size: 18 }})];
    p1.push(new TextRun({{ text: '  <' + code + '>', color: '1d4ed8', size: 16 }}));
    return new TableRow({{
      children: [new TableCell({{
        columnSpan: 2,
        borders: {{ bottom: INNER }},
        children: [new Paragraph({{ children: p1 }}),
                   new Paragraph({{ alignment: AlignmentType.CENTER,
                     children: [new TextRun({{ text: '폐기물의 처리에 관한 구체적 기준 및 방법', bold: true, size: 22 }})] }})]
      }})]
    }});
  }}

  function subHeaderRow() {{
    return new TableRow({{ children: [
      new TableCell({{ borders: {{ bottom: INNER, right: INNER }}, width: {{ size: 50, type: WidthType.PERCENTAGE }},
        children: [new Paragraph({{ alignment: AlignmentType.CENTER,
          children: [new TextRun({{ text: '기준', bold: true, size: 21 }})] }})] }}),
      new TableCell({{ borders: {{ bottom: INNER }}, width: {{ size: 50, type: WidthType.PERCENTAGE }},
        children: [new Paragraph({{ alignment: AlignmentType.CENTER,
          children: [new TextRun({{ text: '준수계획', bold: true, size: 21 }})] }})] }})
    ]}});
  }}

  const code = buildCode();

  const selectedOrigIdx = new Set(
    [...selectedIds].map(i => filteredItems[i]?._idx).filter(v => v !== undefined)
  );

  const B5_WORD_FILTERED = B5_ALL_FOR_WORD.filter(i => !i.noWord);

  const emptyTopSectionIdx = new Set();
  {{
    let curTopIdx = null, curTopHas = false;
    for (const item of B5_WORD_FILTERED) {{
      if (item.tags === null && item.depth === 0) {{
        if (curTopIdx !== null && !curTopHas) emptyTopSectionIdx.add(curTopIdx);
        curTopIdx = item._idx; curTopHas = false;
      }} else if (item.tags !== null && selectedOrigIdx.has(item._idx)) {{
        curTopHas = true;
      }}
    }}
    if (curTopIdx !== null && !curTopHas) emptyTopSectionIdx.add(curTopIdx);
  }}

  const wordRows = [];
  let pendingHeader = null;
  let sectionHasItems = false;
  let inEmptyTopSection = false;

  function flushPendingHeader(header, isNA = false) {{
    const text = (header.marker ? header.marker + ' ' : '') + (header.text || '');
    wordRows.push({{ leftText: text, rightText: isNA ? '해당하지 않으므로 기재하지 않음' : '', depth: header.depth, isHeader: true, isNA }});
  }}

  for (const item of B5_WORD_FILTERED) {{
    if (item.tags === null) {{
      if (item.depth === 0) {{
        if (pendingHeader !== null && !sectionHasItems && !inEmptyTopSection) {{
          flushPendingHeader(pendingHeader, true);
        }}
        pendingHeader = null; sectionHasItems = false;
        if (emptyTopSectionIdx.has(item._idx)) {{
          flushPendingHeader(item, true);
          inEmptyTopSection = true;
        }} else {{
          inEmptyTopSection = false;
          pendingHeader = item;
        }}
      }} else {{
        if (inEmptyTopSection) continue;
        if (pendingHeader !== null && !sectionHasItems) {{
          flushPendingHeader(pendingHeader, pendingHeader.depth > 0);
        }}
        pendingHeader = item;
        sectionHasItems = false;
      }}
    }} else {{
      if (inEmptyTopSection) continue;
      if (!selectedOrigIdx.has(item._idx)) continue;
      if (pendingHeader !== null) {{
        flushPendingHeader(pendingHeader);
        pendingHeader = null;
      }}
      let answerText = item.answer || '';
      if (item.tags && item.tags.wasteVars) {{
        for (const [varName, codes] of Object.entries(item.tags.wasteVars)) {{
          answerText = answerText.replace(new RegExp('{{'+varName+'}}','g'), varName+'('+codes.join(',')+')');
        }}
      }}
      wordRows.push({{
        leftText: (item.marker ? item.marker + ' ' : '') + (item.text || ''),
        rightText: answerText,
        depth: item.depth,
        isHeader: false
      }});
      sectionHasItems = true;
    }}
  }}
  if (pendingHeader !== null && !sectionHasItems && !inEmptyTopSection) {{
    flushPendingHeader(pendingHeader, pendingHeader.depth > 0);
  }}

  function buildDataRow(r, isLast) {{
    const bL = isLast ? {{ top: NIL, right: INNER }} : {{ top: NIL, bottom: NIL, right: INNER }};
    const bR = isLast ? {{ top: NIL }}               : {{ top: NIL, bottom: NIL }};
    const indent = r.depth ? {{ left: r.depth * 150 }} : undefined;
    return new TableRow({{ children: [
      new TableCell({{ borders: bL, width: {{ size: 50, type: WidthType.PERCENTAGE }},
        children: [new Paragraph({{ indent,
          children: [new TextRun({{ text: r.leftText, bold: r.isHeader, size: r.isHeader ? 21 : 20 }})] }})] }}),
      new TableCell({{ borders: bR, width: {{ size: 50, type: WidthType.PERCENTAGE }},
        children: [new Paragraph({{
          children: [new TextRun({{ text: r.rightText, color: r.isNA ? '888888' : '000000', size: 20 }})] }})] }})
    ]}});
  }}

  const rows = wordRows.map((r, i) => buildDataRow(r, i === wordRows.length - 1));

  const doc = new Document({{
    sections: [{{ children: [
      new Table({{
        width: {{ size: 100, type: WidthType.PERCENTAGE }},
        borders: tableBorders,
        rows: [headerRow(code), subHeaderRow(), ...rows]
      }})
    ]}}]
  }});

  const blob = await Packer.toBlob(doc);
  const safeCode = code.replace(/[^A-Za-z0-9_+\\-]/g,'');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'compliance_' + safeCode + '.docx';
  a.click();
}}
</script>
</body>
</html>"""

OUT_PATH.write_text(HTML, encoding="utf-8")
print(f"생성 완료: {OUT_PATH.relative_to(BASE)}")
print(f"임베드 항목 수: {len(ITEMS)}")
print(f"Word용 항목 수: {len(ALL_ITEMS_FOR_WORD)}")
