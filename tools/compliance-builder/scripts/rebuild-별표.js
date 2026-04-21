// 보완자료 txt를 기준으로 별표 JSON의 별표내용 재생성 (범용)
// 사용: node scripts/rebuild-별표.js <txt파일경로> <json파일경로>
// 헤더(번호/제목/시행일자/파일명 등)는 유지, 별표내용만 새로 빌드
const fs = require('fs');
const path = require('path');

const TXT_PATH = process.argv[2];
const JSON_PATH = process.argv[3];
if (!TXT_PATH || !JSON_PATH) {
  console.error('Usage: node rebuild-별표.js <txt> <json>');
  process.exit(1);
}

// 백업
const backupDir = path.join(path.dirname(JSON_PATH), '_원본백업');
if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
const backupPath = path.join(backupDir, path.basename(JSON_PATH));
if (!fs.existsSync(backupPath)) {
  fs.copyFileSync(JSON_PATH, backupPath);
  console.log('백업 생성:', backupPath);
}

const txt = fs.readFileSync(TXT_PATH, 'utf8');
const lines = txt.split(/\r?\n/);

// 마커 패턴 — 들여쓰기 폭으로 depth 추정 (2-space step)
const PATTERNS = [
  { re: /^(\s*)(\d+)\.\s+(.*)$/,           type: 'number',          markerFmt: m => m + '.' },
  { re: /^(\s*)([가-힣])\.\s+(.*)$/,        type: 'korean',          markerFmt: m => m + '.' },
  { re: /^(\s*)(\d+)\)\s+(.*)$/,           type: 'paren-number',    markerFmt: m => m + ')' },
  { re: /^(\s*)([가-힣])\)\s+(.*)$/,        type: 'korean-paren',    markerFmt: m => m + ')' },
  { re: /^(\s*)\((\d+)\)\s+(.*)$/,         type: 'wrapped-number',  markerFmt: m => '(' + m + ')' },
  { re: /^(\s*)\(([가-힣])\)\s+(.*)$/,      type: 'wrapped-korean',  markerFmt: m => '(' + m + ')' },
  { re: /^(\s*)([①-⑳])\s+(.*)$/,           type: 'circled',         markerFmt: m => m },
  { re: /^(\s*)([㉠-㉯])\s+(.*)$/,          type: 'circled-korean',  markerFmt: m => m },
];

const items = [];

// 타이틀(■ 라인) — 다음 비-마커 라인이 있으면 합침
let titleHandled = false;
let titleEndIdx = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim().startsWith('■')) {
    let titleText = lines[i].trim();
    titleEndIdx = i;
    // 다음 줄들 중 마커가 안 붙은 라인을 타이틀로 합침
    for (let j = i + 1; j < lines.length; j++) {
      if (!lines[j].trim()) { titleEndIdx = j; continue; }
      const isMarker = PATTERNS.some(p => p.re.test(lines[j]));
      if (isMarker) break;
      titleText += lines[j].trim();
      titleEndIdx = j;
    }
    items.push({ depth: 0, type: 'title', marker: '■', text: titleText });
    titleHandled = true;
    break;
  }
}

// 표 감지: 빈 줄 직후 "시설" / "기준" 두 줄이 연속으로 나오는 패턴
function isTableStart(i) {
  if (i > 0 && lines[i - 1].trim() !== '') return false;
  return lines[i] && lines[i].trim() === '시설'
      && lines[i + 1] && lines[i + 1].trim() === '기준';
}

// 표 파싱: 헤더 2줄(시설/기준) + (키 라인 + 값 라인) 반복, 빈 줄에서 종료
function parseTable(startIdx) {
  const headers = [lines[startIdx].trim(), lines[startIdx + 1].trim()];
  let i = startIdx + 2;
  const rows = [];
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) break;
    const key = line.trim();
    let val = '';
    i++;
    while (i < lines.length && lines[i] && /^\s/.test(lines[i]) && lines[i].trim() !== '') {
      val += (val ? ' ' : '') + lines[i].trim();
      i++;
    }
    rows.push({ [headers[0]]: key, [headers[1]]: val });
  }
  return { headers, rows, endIdx: i };
}

let current = null;
const startIdx = titleHandled ? titleEndIdx + 1 : 0;

for (let i = startIdx; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;

  // 복합 표 영역 감지: '<...>' 헤더 또는 '○ ...' 헤더 → 표 영역 placeholder
  // 종료: 다음 마커 라인 OR 다른 표 헤더 라인 (수동 작성한 표 객체로 후처리 교체용)
  const tt = line.trim();
  const triangleMatch = tt.match(/^<(.+)>$/);
  const circleMatch   = tt.match(/^○\s+(.+)$/);
  if (triangleMatch || circleMatch) {
    if (current) { items.push(current); current = null; }
    const title = (triangleMatch || circleMatch)[1];
    let j = i + 1;
    while (j < lines.length) {
      const nl = lines[j];
      const ntt = nl.trim();
      if (PATTERNS.some(p => p.re.test(nl))) break;
      if (/^<.+>$/.test(ntt)) break;
      if (/^○\s+.+/.test(ntt)) break;
      j++;
    }
    const lastDepth = items.length > 0 ? items[items.length - 1].depth : 0;
    items.push({
      depth: lastDepth + 1,
      type: 'table-placeholder',
      title: title,
      note: '수동 삽입 필요',
    });
    i = j - 1;
    continue;
  }

  // '비고' 단독 라인 처리 (별도 헤더 항목으로 분리)
  // 직전 라인이 빈 줄인 경우만 처리 (표 안 헤더 '비고'와 구분)
  if (line.trim() === '비고' && i > 0 && lines[i - 1].trim() === '') {
    if (current) { items.push(current); current = null; }
    items.push({ depth: 0, type: 'note-header', marker: '비고', text: '' });
    continue;
  }

  // 표 진입 검사
  if (isTableStart(i)) {
    if (current) { items.push(current); current = null; }
    const tbl = parseTable(i);
    const lastDepth = items.length > 0 ? items[items.length - 1].depth : 0;
    items.push({
      depth: lastDepth + 1,
      type: 'table',
      headers: tbl.headers,
      rows: tbl.rows,
    });
    i = tbl.endIdx - 1; // for문 ++ 보정
    continue;
  }

  let matched = null;
  for (const pat of PATTERNS) {
    const m = line.match(pat.re);
    if (m) {
      const indent = m[1];
      const markerVal = m[2];
      const body = m[3];
      const depth = Math.floor(indent.length / 2);
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
    if (current) {
      current.text = current.text.replace(/\s+$/, '') + ' ' + line.trim();
    }
  }
}
if (current) items.push(current);

// 기존 헤더 보존
const existing = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
existing['별표내용'] = items;
fs.writeFileSync(JSON_PATH, JSON.stringify(existing, null, 2), 'utf8');

console.log('rebuilt items:', items.length);
items.forEach((it, i) => {
  if (it.type === 'table') {
    console.log(`  IDX:${i} d${it.depth} TABLE [${it.headers.join('/')}] rows=${it.rows.length}`);
    it.rows.forEach(r => {
      const k = r[it.headers[0]] || '';
      const v = (r[it.headers[1]] || '').substring(0, 60);
      console.log(`           - ${k} | ${v}`);
    });
  } else if (it.type === 'table-placeholder') {
    console.log(`  IDX:${i} d${it.depth} [PLACEHOLDER] ${it.title}`);
  } else if (it.type === 'note-header') {
    console.log(`  IDX:${i} d${it.depth} ${it.marker} (단독 헤더)`);
  } else {
    const text = it.text || '';
    const preview = text.length > 70 ? text.substring(0,70)+'...' : text;
    console.log(`  IDX:${i} d${it.depth} ${it.marker} | ${preview}`);
  }
});
