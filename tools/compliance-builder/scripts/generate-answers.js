const fs = require('fs');
const B5_PATH = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const data = JSON.parse(fs.readFileSync(B5_PATH, 'utf8'));
const items = data['별표내용'];

function clean(t) {
  return t.trim().replace(/\s+/g, ' ').replace(/\s*\.\s*$/, '');
}
function extractMain(t) {
  t = clean(t);
  const i = t.indexOf('다만,');
  if (i > 10) t = t.slice(0, i).trim().replace(/[.,;]\s*$/, '');
  return t;
}
function extractDan(t) {
  const i = t.indexOf('다만,');
  return i === -1 ? null : t.slice(i).replace(/[.]$/, '').trim();
}
function applyVerb(t) {
  t = t.replace(/하여야\s*한다/g,'하겠음').replace(/해야\s*한다/g,'하겠음');
  t = t.replace(/하여야\s*합니다/g,'하겠음');
  t = t.replace(/하여서는\s*아니\s*된다/g,'하지 않겠음').replace(/해서는\s*안\s*된다/g,'하지 않겠음');
  t = t.replace(/하여서는\s*아니\s*됩니다/g,'하지 않겠음');
  t = t.replace(/할\s*수\s*있다/g,'할 수 있겠음');
  return t.replace(/[.]\s*$/, '');
}
// 가장 가까운 상위 의무/허용/금지문 찾기 (할 수 있다 포함)
function findParent(idx) {
  const cur = items[idx].depth;
  for (let j = idx - 1; j >= 0; j--) {
    const it = items[j];
    if (it.depth >= cur) continue;
    if (/하여야\s*한다|해야\s*한다|하여서는\s*아니|해서는\s*안|할\s*수\s*있다/.test(it.text)) {
      return it.text.trim();
    }
  }
  return null;
}
function generate(idx) {
  const item = items[idx];
  const t = clean(item.text);
  if (/삭제\s*[<〈]/.test(t)) return '';

  // 의무문
  if (/하여야\s*한다|해야\s*한다/.test(t)) {
    const main = applyVerb(extractMain(t));
    const dan  = extractDan(t);
    if (dan) return main + '. ' + applyVerb(dan);
    return main;
  }
  // 금지문
  if (/하여서는\s*아니\s*된다|해서는\s*안\s*된다/.test(t)) return applyVerb(t);
  // 허용문 단독
  if (/할\s*수\s*있다/.test(t) && !/하여야/.test(t)) return applyVerb(t);

  // 조건절 (경우로 끝나고 의무동사 없음)
  const isCondOnly = /경우[.:]?\s*$/.test(t)
    && !/(하여야|하여서는|할\s*수\s*있|한다$|않는다)/.test(t);
  if (isCondOnly) {
    const cond = t.replace(/경우[.:]?\s*$/, '경우');
    const parent = findParent(idx);
    if (parent) return cond + ', ' + applyVerb(extractMain(parent));
    return cond + ', 관련 기준을 준수하겠음';
  }

  // 기타
  const tr = applyVerb(t);
  if (/겠음$/.test(tr)) return tr;
  return tr + '를 준수하겠음';
}

let done = 0;
items.forEach((item, idx) => {
  if (!item.tags?.action) return;
  item.answer = generate(idx);
  done++;
});
fs.writeFileSync(B5_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('완료:', done);

// 핵심 샘플
console.log('\n[조건절 - 수정 후]');
items.filter(i=>i.tags?.action && /경우$/.test(i.text.trim()) && !/하여야/.test(i.text)).slice(0,6).forEach(i=>{
  console.log('T:', i.text.slice(0,65));
  console.log('A:', i.answer);
  console.log('');
});
