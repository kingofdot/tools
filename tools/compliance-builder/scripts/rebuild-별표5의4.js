// 보완자료 txt를 기준으로 별표5의4 JSON의 별표내용 재생성
// 헤더(번호/제목/시행일자/파일명 등)는 유지, 별표내용만 새로 빌드
const fs = require('fs');
const path = require('path');

const TXT_PATH = path.join(__dirname, '..', 'data', '참고자료', '검토사항의 보완자료',
  '[별표 5의4] 폐기물을 재활용하는 자의 준수사항(제14조의3제5항 관련)(폐기물관리법 시행규칙) (2).txt');
const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙',
  '별표5의4_재활용자준수사항.json');

const txt = fs.readFileSync(TXT_PATH, 'utf8');
const lines = txt.split(/\r?\n/);

// 마커 패턴 — 들여쓰기 폭으로 depth 추정
// depth 0: "1." (들여쓰기 없음)
// depth 1: "  가." (2칸)
// depth 2: "    1)" (4칸)
// depth 3: "      가)" (6칸)
// 보완자료 들여쓰기는 2-space step

const PATTERNS = [
  { re: /^(\s*)(\d+)\.\s+(.*)$/,           type: 'number',          markerFmt: m => m + '.' },
  { re: /^(\s*)([가-힣])\.\s+(.*)$/,        type: 'korean',          markerFmt: m => m + '.' },
  { re: /^(\s*)(\d+)\)\s+(.*)$/,           type: 'paren-number',    markerFmt: m => m + ')' },
  { re: /^(\s*)([가-힣])\)\s+(.*)$/,        type: 'korean-paren',    markerFmt: m => m + ')' },
  { re: /^(\s*)\((\d+)\)\s+(.*)$/,         type: 'wrapped-number',  markerFmt: m => '(' + m + ')' },
  { re: /^(\s*)\(([가-힣])\)\s+(.*)$/,      type: 'wrapped-korean',  markerFmt: m => '(' + m + ')' },
];

function depthFromIndent(indent, type) {
  // 들여쓰기 2칸 = depth 1단계
  return Math.floor(indent.length / 2);
}

const items = [];

// 헤더(타이틀 ■ 라인) 처리
const titleLine = lines.find(l => l.trim().startsWith('■'));
if (titleLine) {
  // ■ 라인 + 다음 라인 합쳐서 title
  const idx = lines.indexOf(titleLine);
  const titleText = titleLine.trim() + (lines[idx+1] && !lines[idx+1].match(/^\s*\d+\./) ? lines[idx+1].trim() : '');
  items.push({ depth: 0, type: 'title', marker: '■', text: titleText });
}

let current = null;
let currentDepth = -1;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  if (line.trim().startsWith('■')) continue;
  // 타이틀 두 번째 줄 스킵
  if (i > 0 && lines[i-1].trim().startsWith('■')) continue;

  let matched = null;
  for (const pat of PATTERNS) {
    const m = line.match(pat.re);
    if (m) {
      const indent = m[1];
      const markerVal = m[2];
      const body = m[3];
      const depth = depthFromIndent(indent, pat.type);
      matched = {
        depth,
        type: pat.type,
        marker: pat.markerFmt(markerVal),
        text: body.trim(),
      };
      break;
    }
  }

  if (matched) {
    if (current) items.push(current);
    current = matched;
  } else {
    // 본문 연속 라인 → 현재 항목 text에 이어 붙임
    if (current) {
      current.text = current.text.replace(/\s+$/, '') + ' ' + line.trim();
    }
  }
}
if (current) items.push(current);

// 기존 JSON 헤더 보존, 별표내용만 교체
const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
existing['별표내용'] = items;
fs.writeFileSync(JSON_PATH, JSON.stringify(existing, null, 2), 'utf8');

console.log('rebuilt items:', items.length);
items.forEach((it, i) => {
  const preview = it.text.length > 60 ? it.text.substring(0,60)+'...' : it.text;
  console.log(`  IDX:${i} d${it.depth} ${it.marker} | ${preview}`);
});
