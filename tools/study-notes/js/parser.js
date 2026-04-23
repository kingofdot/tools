// === PARSER ===
// 들여쓰기된 raw 텍스트 → 트리.
//   - 들여쓰기 1단계 = Tab 1개 (또는 공백 4개 환산)
//   - 한 줄 = 한 항목 (제목)
//   - 빈 줄은 무시 (직전 항목의 가독성 여백 정도)

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

function parseBody(text) {
  if (!text) return [];

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const root = { depth: -1, children: [] };
  const stack = [root];

  for (const raw of lines) {
    if (!raw.trim()) continue;
    const { depth, rest } = _measureIndent(raw);
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) stack.pop();
    const parent = stack[stack.length - 1];
    const node = { depth, name: rest.trim(), children: [] };
    parent.children.push(node);
    stack.push(node);
  }
  return root.children;
}

// 트리에 (1) 시스템 번호 numKey ("1.1.1")와 (2) 표시 마커 marker를 부여
function numberTree(nodes, prefix = []) {
  nodes.forEach((n, i) => {
    const idx = i + 1;
    const numKey = [...prefix, idx];
    n.numKey = numKey.join('.');
    n.marker = formatMarker(n.depth, idx);
    if (n.children.length) numberTree(n.children, numKey);
  });
  return nodes;
}
