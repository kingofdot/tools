// Shared data, parser, numbering, badge utilities for all three variations.
// Exports to window so each variation .jsx can use them.

// ─── Sample data (from user's JSON) ────────────────────────────────
const SAMPLE_NOTES = [
  {
    id: "2026-04-23T15-17-48",
    subject: "민법",
    topic: "매매의 효력",
    mnemonic: "재대과",
    body: `매도인의 재산권이전의무
\t재산권 이전 매도인은 매수인에 대하여 매매의 목적이 된 권리를 이전하여야 한다.(제568조 제1항)
\t완전한 이전 매도인은 특별한 사정이 없는 한 제한이나 부담이 없는 완전한 소유권이전등기의무를 진다.
매수인의 매매대금 지급 의무
\t매매대금 지급 매수인은 매도인에게 매매대금을 지급하여야 한다.(제568조 제2항)
\t동일기한 추정 일방에 대한 이행기한이 있으면 상대방도 동일한 기한 추정.(제585조)
과실과 이자
\t매도인, 매수인 이행하지 않은 경우
\t\t인도하지 아니한 목적물로부터 생긴 과실은 매도인에게 속한다.(제587조)
\t\t매수인이 대금을 완납하지 아니한 때에는 차임 상당의 손해배상금 청구 불가.(2004다8210)
\t\t대금지급의무 지체를 이유로 이자 상당액 손해배상청구 불가.(95다14190)`,
    updatedAt: "2026-04-23T15:30:22.737Z",
  },
  {
    id: "2026-04-23T15-31-19",
    subject: "행정사실무법",
    topic: "법원 직원의 제척, 기피, 회피",
    mnemonic: "",
    body: `민사소송법 준용
\t비송사건절차법 제4조는 제척 또는 기피에 관해 민사소송법 규정을 준용한다. 회피를 준용한다는 규정은 없다. 조문의 법원 직원은 법관 및 법원사무관을 모두 포함하는 의미이다.
제척
\t의의
\t\t제척이란 일정한 법정사유(제척이유)가 있는 경우 법률상 당연히 직무집행에서 배제되는 것을 말한다.
\t\t제척사유
\t\t\t법관 또는 그 배우자나 배우자이었던 사람이 사건의 당사자가 되거나, 사건의 당사자와 공동권리자, 공동의무자의 관계에 있었을 때
\t\t\t법관이 당사자의 친족의 관계에 있거나 그러한 관계에 있었을 때
\t\t\t법관이 사건에 관하여 증언이나 감정을 하였을 때
\t\t\t법관이 사건당사자의 대리인이었거나 대리인이 된 때
\t\t\t법관이 불복사건의 이전심급의 재판에 관여하였을 때
\t\t제척방식
\t\t\t법원의 직권 또는 당사자가 서명으로 신청한다
기피
\t기피란 법관에게 제척사유 이외에 재판의 공정을 기대하기 어려운 사정이 있을 때 당사자의 신청에 의해 직무집행에서 배제되는 것을 말한다.`,
    updatedAt: "2026-04-23T15:39:40.620Z",
  },
  {
    id: "2026-04-23T15-39-43",
    subject: "사무관리론",
    topic: "민원의 접수 절차",
    mnemonic: "접안신병시",
    body: `민원의 접수
\t행정기관의 장은 민원의 신청을 받았을 때에는 다른 법령에 특별한 규정이 있는 경우를 제외하고는 그 접수를 보류하거나 거부할 수 없으며, 접수된 민원문서를 부당하게 되돌려 보내서는 아니 된다.
접수 절차
\t접수
\t\t민원은 민원실(전자민원창구를 포함)에서 접수한다. 다만 민원실이 설치되어 있지 아니한 경우에는 문서의 접수, 발송을 주관하는 부서 또는 민원을 처리하는 주무부서에서 민원을 접수한다.
\t접수증교부
\t\t행정기관의 장은 민원을 접수하였을 때에는 그 순서에 따라 민원 처리부에 기록하고 해당 민원인에게 접수증을 발급하여야 한다.
\t\t다음 각 호의 어느 하나에 해당하는 경우에는 접수증 교부를 생략할 수 있다.
\t\t\t기타민원
\t\t\t민원인이 직접 방문하지 아니하고 신청한 민원
\t\t\t처리기간이 '즉시'인 민원
\t\t\t접수증을 갈음하는 문서를 주는 민원
\t처리절차 안내
\t\t행정기관의 장은 민원을 접수하였을 때에는 구비서류의 완비 여부, 처리 기준과 절차, 예상 처리소요기간, 필요한 현장확인 또는 조사 예정시기 등을 해당 민원인에게 안내하여야 한다.
\t신원 확인
\t\t행정기관 장은 민원을 접수할 때 필요하다고 인정되는 경우에는 해당 민원인 본인 또는 그 위임을 받은 사람이 맞는 지 확인할 수 있다.
\t병합 접수
\t\t행정기관의 장은 5명 이상의 민원인으로부터 동일한 취지의 민원을 접수할 때에는 이를 병합하여 접수할 수 있다.
\t접수시한
\t\t행정기관의 장은 전자민원창구를 통하여 민원이 신청된 경우에는 그 민원이 소관 행정기관의 전자민원창구에 도달한 때부터 8근무시간 이내에 접수해야 한다.`,
    updatedAt: "2026-04-23T15:45:33.594Z",
  },
  {
    id: "2026-04-23T15-17-51",
    subject: "행정절차론",
    topic: "처분의 사전통지",
    mnemonic: "사당처",
    body: `사전통지의 의의
\t행정청이 당사자에게 의무를 부과하거나 권익을 제한하는 처분을 하는 경우에는 미리 당사자등에게 통지하여야 한다.(제21조 제1항)
사전통지 사항
\t처분의 제목
\t당사자의 성명 또는 명칭과 주소
\t처분하려는 원인이 되는 사실과 처분의 내용 및 법적 근거
\t의견제출 기관의 명칭과 주소
\t의견제출 기한
사전통지 생략사유
\t공공의 안전 또는 복리를 위하여 긴급히 처분을 할 필요가 있는 경우
\t법령 등에서 요구된 자격이 없거나 없어지게 되면 반드시 일정한 처분을 하여야 하는 경우
\t해당 처분의 성질상 의견청취가 현저히 곤란하거나 명백히 불필요하다고 인정될 만한 상당한 이유가 있는 경우`,
    updatedAt: "2026-04-23T14:00:00.000Z",
  },
];

const SUBJECTS = ["민법", "행정절차론", "사무관리론", "행정사실무법"];

// ─── Numbering markers by depth ────────────────────────────────────
const ROMAN = ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"];
const CIRCLED = ["①","②","③","④","⑤","⑥","⑦","⑧","⑨","⑩","⑪","⑫","⑬","⑭","⑮"];
const HANGUL = ["가","나","다","라","마","바","사","아","자","차","카","타"];

function markerFor(depth, idx) {
  if (depth === 0) return `${ROMAN[idx] || idx+1}.`;
  if (depth === 1) return `${idx+1}.`;
  if (depth === 2) return `${idx+1})`;
  if (depth === 3) return CIRCLED[idx] || `(${idx+1})`;
  return `${HANGUL[idx] || idx+1}.`;
}

// ─── Parser: indented text → tree ──────────────────────────────────
function parseBody(body) {
  if (!body) return [];
  const lines = body.split("\n").filter(l => l.trim().length > 0);
  const root = { depth: -1, children: [], text: "" };
  const stack = [root];

  for (const raw of lines) {
    // Count leading tabs (4 spaces = 1 tab)
    const m = raw.match(/^([\t ]*)(.*)$/);
    let indent = m[1];
    let text = m[2];
    // Normalize spaces-as-tabs
    const tabs = indent.replace(/ {4}/g, "\t");
    let depth = (tabs.match(/\t/g) || []).length;

    // Detect leading dotted-number prefix (e.g. "1.2.3.4.")
    const numMatch = text.match(/^((?:\d+\.)+)\s*(.*)$/);
    if (numMatch) {
      const segments = numMatch[1].split(".").filter(Boolean).length;
      depth = Math.max(depth, segments - 1);
      text = numMatch[2];
    }

    // Backtick prefix = body line (no numbering)
    let isBody = false;
    if (text.startsWith("`")) {
      isBody = true;
      text = text.slice(1);
    }

    const node = { depth, text, isBody, children: [] };
    while (stack.length > 1 && stack[stack.length-1].depth >= depth) stack.pop();
    stack[stack.length-1].children.push(node);
    stack.push(node);
  }
  return root.children;
}

// ─── Highlight law/case patterns inline ────────────────────────────
// (제NNN조 제NN항) or (제NNN조) → law badge
// NNNN다NNNN / NN도NN / NN헌마NN / NN누NN etc → case badge
const LAW_RE = /\(제\d+조(?:\s*제\d+항)?(?:\s*제\d+호)?\)/g;
const CASE_RE = /\b\d{2,4}[다도누누헌마바카](?:\d+)?\d+\b/g;

function highlightText(text, opts = {}) {
  // Returns array of {type, text}
  if (!text) return [];
  const out = [];
  let tokens = [{type: "text", text}];

  const apply = (regex, type) => {
    const next = [];
    for (const tok of tokens) {
      if (tok.type !== "text") { next.push(tok); continue; }
      let last = 0;
      const s = tok.text;
      let match;
      const re = new RegExp(regex.source, regex.flags);
      while ((match = re.exec(s)) !== null) {
        if (match.index > last) next.push({type: "text", text: s.slice(last, match.index)});
        next.push({type, text: match[0]});
        last = match.index + match[0].length;
      }
      if (last < s.length) next.push({type: "text", text: s.slice(last)});
    }
    tokens = next;
  };
  apply(LAW_RE, "law");
  apply(CASE_RE, "case");

  // Apply search highlight (wraps within text tokens only)
  if (opts.search) {
    const needle = opts.search.trim();
    if (needle) {
      const re = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      const next = [];
      for (const tok of tokens) {
        if (tok.type !== "text") { next.push(tok); continue; }
        let last = 0;
        let match;
        while ((match = re.exec(tok.text)) !== null) {
          if (match.index > last) next.push({type: "text", text: tok.text.slice(last, match.index)});
          next.push({type: "hit", text: match[0]});
          last = match.index + match[0].length;
        }
        if (last < tok.text.length) next.push({type: "text", text: tok.text.slice(last)});
      }
      tokens = next;
    }
  }
  return tokens;
}

// ─── Format utility ────────────────────────────────────────────────
function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`;
}

Object.assign(window, {
  SAMPLE_NOTES, SUBJECTS,
  markerFor, parseBody, highlightText, formatDate,
});
