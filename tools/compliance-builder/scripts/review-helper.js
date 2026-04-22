// 사용:
//   dump <fileKey> <start> <count>  — 항목을 화면에 출력
//   apply <patchesJsonPath>          — patches.json에 명시된 fix를 적용 + MD 로그 append
//
// patches.json 형식:
// {
//   "fileKey": "b5",
//   "fixes": [ { "idx": 86, "before": "...", "after": "..." }, ... ]
// }
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'data', '검토사항');
const FILES = {
  law13:    ['법', '제13조_폐기물의 처리 기준 등.json'],
  law13_2:  ['법', '제13의2조_폐기물의 재활용 원칙 및 준수사항.json'],
  decree7:  ['시행령', '제7조_폐기물의 처리기준 등.json'],
  b5:       ['시행규칙', '별표5_처리구체적기준및방법.json'],
  b5_3:     ['시행규칙', '별표5의3_재활용기준.json'],
  b5_4:     ['시행규칙', '별표5의4_재활용자준수사항.json'],
  b6:       ['시행규칙', '별표6_폐기물인계인수입력방법.json'],
  b7:       ['시행규칙', '별표7_처리업시설장비기술능력기준.json'],
  b8:       ['시행규칙', '별표8_처리업자준수사항.json'],
  b9:       ['시행규칙', '별표9_처리시설설치기준.json'],
  b17:      ['시행규칙', '별표17_신고자시설기준.json'],
  b17_2:    ['시행규칙', '별표17의2_신고자준수사항.json'],
};
const MD_LOG = path.join(__dirname, '..', 'docs', 'answer-fixes.md');

function loadFile(key) {
  const [d, f] = FILES[key];
  const fp = path.join(ROOT, d, f);
  return { fp, data: JSON.parse(fs.readFileSync(fp, 'utf8')), label: `${d}/${f}` };
}

function getItems(data) {
  if (data['별표내용']) return { kind: 'flat', items: data['별표내용'] };
  if (data['항']) {
    const flat = [];
    data['항'].forEach((h, hi) => {
      flat.push({ _ref: ['항', hi], depth: 0, marker: h['항번호'], text: h['항내용'], answer: h.answer });
      (h['호'] || []).forEach((o, oi) => {
        flat.push({ _ref: ['항', hi, '호', oi], depth: 1, marker: o['호번호'], text: o['호내용'], answer: o.answer });
      });
    });
    return { kind: 'lawArticle', items: flat, raw: data };
  }
  return { kind: 'unknown', items: [] };
}

function setAnswerByRef(data, ref, val) {
  let node = data;
  for (let i = 0; i < ref.length; i++) node = node[ref[i]];
  node.answer = val;
}

const cmd = process.argv[2];
const arg = process.argv[3];

function ansStr(a) {
  if (typeof a === 'string') return a;
  if (Array.isArray(a)) return JSON.stringify(a);
  if (a && typeof a === 'object') return JSON.stringify(a);
  return '';
}

if (cmd === 'dump') {
  const start = parseInt(process.argv[4] || '0', 10);
  const count = parseInt(process.argv[5] || '20', 10);
  const { items } = getItems(loadFile(arg).data);
  const slice = items.slice(start, start + count);
  slice.forEach((it, k) => {
    const idx = start + k;
    if (it.answer == null || it.answer === '') return;
    console.log(`--- IDX:${idx} d${it.depth || 0} ${it.marker || ''}`);
    console.log('T:', (it.text || '').replace(/\s+/g, ' '));
    console.log('A:', ansStr(it.answer).replace(/\s+/g, ' '));
  });
  console.log(`\n[${arg}] dumped ${start}..${start + count - 1} (총 ${items.length})`);
} else if (cmd === 'dumpAll') {
  const { items } = getItems(loadFile(arg).data);
  items.forEach((it, idx) => {
    if (it.answer == null || it.answer === '') return;
    console.log(`--- IDX:${idx} d${it.depth || 0} ${it.marker || ''}`);
    console.log('T:', (it.text || '').replace(/\s+/g, ' '));
    console.log('A:', ansStr(it.answer).replace(/\s+/g, ' '));
  });
} else if (cmd === 'apply') {
  const patches = JSON.parse(fs.readFileSync(arg, 'utf8'));
  const { fp, data, label } = loadFile(patches.fileKey);
  const info = getItems(data);
  let changed = 0;
  const mdLines = [];
  mdLines.push(`\n## ${label}\n`);
  for (const fx of patches.fixes) {
    const it = info.items[fx.idx];
    if (!it) { console.log('SKIP idx', fx.idx); continue; }
    const oldAns = it.answer || '';
    if (info.kind === 'lawArticle') setAnswerByRef(data, [...it._ref, 'answer'], fx.after);
    else it.answer = fx.after;
    changed++;
    mdLines.push(`### IDX ${fx.idx} ${it.marker || ''}`);
    mdLines.push(`**기준:** ${(it.text || '').replace(/\s+/g, ' ')}\n`);
    mdLines.push(`- **Before:** ${oldAns.replace(/\s+/g, ' ')}`);
    mdLines.push(`- **After:**  ${fx.after.replace(/\s+/g, ' ')}\n`);
  }
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
  fs.mkdirSync(path.dirname(MD_LOG), { recursive: true });
  fs.appendFileSync(MD_LOG, mdLines.join('\n'), 'utf8');
  console.log(`Applied ${changed} fixes to ${label}, logged to ${MD_LOG}`);
} else {
  console.log('usage: dump|dumpAll|apply');
}
