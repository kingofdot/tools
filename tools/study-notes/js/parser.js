// === PARSER ===
// 들여쓰기 텍스트 → 트리.
//
// 입력 규칙:
//   1) 들여쓰기 1단계 = Tab 1개 (공백 4개 환산)
//   2) 한 줄 = 한 항목
//   3) 빈 줄은 무시
//
// 자동 전처리:
//   A) 앞에 "1.", "1.1.", "1.1.1.2." 같은 숫자 마커가 붙어 있으면
//      → 그 숫자는 지움(표시용 번호는 앱이 다시 매김).
//      → 탭이 없을 때는 숫자의 점 개수로 depth 추정 (다른 곳에서 복붙 지원).
//   B) 줄이 `(백틱)로 시작하면 번호 없는 본문 항목(noMarker=true).
//      크기는 depth 3 본문처럼 렌더. 로마자 대제목 밑 바로 본문용.

const TAB_WIDTH = 4;

function _measureIndent(line) {
  let i = 0, indent = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === '\t') { indent++; i++; }
    else if (ch === ' ') {
      let s = 0;
      while (line[i] === ' ') { s++; i++; }
      indent += Math.round(s / TAB_WIDTH);
    } else break;
  }
  return { depth: indent, rest: line.slice(i) };
}

// "1.2.1.3." 같은 선두 숫자 마커 감지 → { depth, rest } 반환
// 매치 안 되면 null
function _stripLeadingNumber(rest) {
  // (숫자 + 점)의 1회 이상 반복, 그 뒤 공백 또는 문자 바로 붙음
  const m = rest.match(/^(\d+(?:\.\d+)*)\.\s*/);
  if (!m) return null;
  const segs = m[1].split('.').filter(Boolean).length;
  return { inferredDepth: segs - 1, textAfter: rest.slice(m[0].length) };
}

function parseBody(text) {
  if (!text) return [];

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const root = { depth: -1, children: [] };
  const stack = [root];

  for (const raw of lines) {
    if (!raw.trim()) continue;
    let { depth: tabDepth, rest } = _measureIndent(raw);

    // B) 백틱 접두 → noMarker
    let noMarker = false;
    if (rest.startsWith('`')) {
      noMarker = true;
      rest = rest.slice(1);
    }

    // A) 선두 숫자 마커 처리
    let depth = tabDepth;
    const stripped = _stripLeadingNumber(rest);
    if (stripped) {
      rest = stripped.textAfter;
      if (tabDepth === 0 && stripped.inferredDepth > 0) depth = stripped.inferredDepth;
    }

    // 스택 정리
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    const node = {
      depth,
      name: rest.trim(),
      noMarker,
      children: [],
    };
    parent.children.push(node);
    stack.push(node);
  }
  return root.children;
}

// 트리에 번호 부여 — noMarker는 카운터를 증가시키지 않음
function numberTree(nodes, prefix = []) {
  let counter = 0;
  nodes.forEach(n => {
    if (n.noMarker) {
      n.marker = '';
      n.numKey = '';
      if (n.children.length) numberTree(n.children, prefix.concat([counter || 0]));
    } else {
      counter++;
      const newPrefix = [...prefix, counter];
      n.numKey = newPrefix.join('.');
      n.marker = formatMarker(n.depth, counter);
      if (n.children.length) numberTree(n.children, newPrefix);
    }
  });
  return nodes;
}
