// data/검토사항/**/*.json 안의 모든 문자열에서 <개정 ...> 패턴 제거
// 예: "① ... <개정 2020.5.26, 2025.10.1>" → "① ..."
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', 'data', '검토사항');
const RE = /\s*<개정\s+[^>]+>/g;

let filesChanged = 0;
let strReplaced = 0;

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const fp = path.join(dir, name);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp);
    else if (name.endsWith('.json')) processFile(fp);
  }
}

function stripValue(v) {
  if (typeof v === 'string') {
    if (RE.test(v)) {
      const out = v.replace(RE, '');
      strReplaced++;
      return out;
    }
    return v;
  }
  if (Array.isArray(v)) return v.map(stripValue);
  if (v && typeof v === 'object') {
    const out = {};
    for (const [k, val] of Object.entries(v)) out[k] = stripValue(val);
    return out;
  }
  return v;
}

function processFile(fp) {
  const raw = fs.readFileSync(fp, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch { return; }
  const before = strReplaced;
  const out = stripValue(data);
  if (strReplaced > before) {
    fs.writeFileSync(fp, JSON.stringify(out, null, 2), 'utf8');
    filesChanged++;
    console.log(`  [${strReplaced - before}] ${path.relative(ROOT, fp)}`);
  }
}

walk(ROOT);
console.log(`\n총 ${filesChanged}개 파일, ${strReplaced}개 문자열에서 <개정 ...> 제거`);
