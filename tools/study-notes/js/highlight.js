// === HIGHLIGHT ===
// 법조문/판례 정규식 매칭 → HTML 뱃지로 치환.
// XSS 방지를 위해 escape 후 치환.

function escHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// 우선순위 높은 것부터 (긴 매치 우선)
const PATTERNS = [
  // ① 괄호 안에 "조"가 들어 있으면 그 괄호 안 전체를 한 덩어리로 하이라이트
  //    (제48조), (민사소송법 제48조 제1항), (행정사법 5조 2항), (민사소송법 165조, 166조)
  {
    re: /\([^()]*\d+\s*조[^()]*\)/g,
    cls: 'tag-law',
    type: 'law',
  },
  // ② "○○법 N조[, N조]+" — 법명 + 콤마로 여러 조항 (제 있어도 없어도)
  //    예: "민사소송법 165조, 166조" / "민법 제5조, 제6조 제1항"
  {
    re: /[가-힣]{1,14}법\s+제?\s*\d+\s*조(?:의\s*\d+)?(?:\s*제?\s*\d+\s*항)?(?:\s*제?\s*\d+\s*호)?(?:\s*[,，、]\s*제?\s*\d+\s*조(?:의\s*\d+)?(?:\s*제?\s*\d+\s*항)?(?:\s*제?\s*\d+\s*호)?)+/g,
    cls: 'tag-law',
    type: 'law-multi',
  },
  // ③ "○○법 제N조 ..." — 법명 + "제" 있는 형태  (민법·세법 같은 1+법 포함)
  {
    re: /[가-힣]{1,14}법\s+제\s*\d+\s*조(?:의\s*\d+)?(?:\s*제\s*\d+\s*항)?(?:\s*제\s*\d+\s*호)?/g,
    cls: 'tag-law',
    type: 'law',
  },
  // ④ "○○법 N조N항" / "민법 5조 2항" — 법명 + "제" 없는 형태
  {
    re: /[가-힣]{1,14}법\s+\d+\s*조(?:의\s*\d+)?(?:\s*\d+\s*항)?(?:\s*\d+\s*호)?/g,
    cls: 'tag-law',
    type: 'law',
  },
  // ④ "제N조 제N항" — 법명 없이, "제" 있는 형태
  {
    re: /제\s*\d+\s*조(?:의\s*\d+)?(?:\s*제\s*\d+\s*항)?(?:\s*제\s*\d+\s*호)?/g,
    cls: 'tag-law',
    type: 'law',
  },
  // ⑤ "N조N항" / "5조 2항" — 법명 없이, "제" 없는 형태 (오인식 줄이려고 항/호가 같이 있을 때만)
  {
    re: /\b\d+\s*조(?:의\s*\d+)?\s*\d+\s*항(?:\s*\d+\s*호)?/g,
    cls: 'tag-law',
    type: 'law',
  },
  // ⑥ 판례번호: 2004다8210, 95다14190, 91도1234, 2020헌마123
  {
    re: /\b\d{2,4}(?:다|도|두|므|마|허|헌(?:마|바|가|나|라)?|초)\d{1,6}\b/g,
    cls: 'tag-case',
    type: 'case',
  },
];

// PUA(Private Use Area) 한 글자를 토큰 구분자로 사용 — 본문에 절대 등장하지 않을 문자
const SENT = '';

function highlightInline(text) {
  // 현재 노트의 lawUnlinks — 우클릭으로 해제된 표현은 일반 텍스트로
  const unlinks = (function () {
    if (typeof currentId === 'undefined' || !currentId) return [];
    const n = (typeof findNote === 'function') ? findNote(currentId) : null;
    return (n && Array.isArray(n.lawUnlinks)) ? n.lawUnlinks : [];
  })();
  const isUnlinked = (m) => {
    if (!unlinks.length) return false;
    const t = m.trim();
    return unlinks.some(u => String(u).trim() === t);
  };

  // 토큰 슬롯을 만들어 escape 충돌 방지
  const tokens = [];
  let work = text;
  for (const p of PATTERNS) {
    work = work.replace(p.re, (m) => {
      if (isUnlinked(m)) return m;
      const i = tokens.length;
      tokens.push({ raw: m, cls: p.cls, type: p.type });
      return `${SENT}T${i}${SENT}`;
    });
  }
  let html = escHtml(work);
  const tokRe = new RegExp(`${SENT}T(\\d+)${SENT}`, 'g');
  html = html.replace(tokRe, (_, i) => {
    const t = tokens[+i];
    // 여러 조항 (콤마 구분) → 첫 뱃지는 풀 텍스트, 두번째부터 조항만
    if (t.type === 'law-multi') {
      const parts = splitMultiArticles(t.raw);
      if (parts && parts.length > 1) {
        return parts.map((part, idx) => {
          const display = idx === 0 ? part : part.replace(/^[가-힣]{1,14}법\s+/, '');
          const extraCls = idx === 0 ? '' : ' tag-law-extra';
          return `<span class="${t.cls}${extraCls}" data-type="law" data-raw="${escHtml(part)}">${escHtml(display.trim())}</span>`;
        }).join(' ');
      }
    }
    return `<span class="${t.cls}" data-type="${t.type}" data-raw="${escHtml(t.raw)}">${escHtml(t.raw.trim())}</span>`;
  });
  return html;
}

// "민사소송법 165조, 166조 1항" → ["민사소송법 165조", "민사소송법 166조 1항"]
function splitMultiArticles(raw) {
  const text = String(raw || '').replace(/^[\(\[]|[\)\]]$/g, '').trim();
  const lawMatch = text.match(/^([가-힣]{1,14}법)\s+/);
  if (!lawMatch) return null;
  const lawName = lawMatch[1];
  const tail = text.slice(lawMatch[0].length);
  const parts = tail.split(/\s*[,，、]\s*/).map(s => s.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts.filter(p => /^제?\s*\d+\s*조/.test(p))
              .map(p => `${lawName} ${p}`);
}

// 검색 매치 강조 (이미 escape된 HTML에 적용)
function highlightSearch(html, query) {
  if (!query) return html;
  const q = query.trim();
  if (!q) return html;
  // 태그 밖 텍스트 노드만 안전히 대체하기 위해 임시 DOM 사용
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
  const walker = document.createTreeWalker(wrap, NodeFilter.SHOW_TEXT, null);
  const targets = [];
  let n; while ((n = walker.nextNode())) targets.push(n);
  for (const node of targets) {
    if (!re.test(node.nodeValue)) continue;
    re.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let last = 0; let m;
    while ((m = re.exec(node.nodeValue)) !== null) {
      if (m.index > last) frag.appendChild(document.createTextNode(node.nodeValue.slice(last, m.index)));
      const mk = document.createElement('mark');
      mk.className = 'search-hit';
      mk.textContent = m[0];
      frag.appendChild(mk);
      last = m.index + m[0].length;
    }
    if (last < node.nodeValue.length) frag.appendChild(document.createTextNode(node.nodeValue.slice(last)));
    node.parentNode.replaceChild(frag, node);
  }
  return wrap.innerHTML;
}
