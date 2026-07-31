// 별표 JSON 파일에서 의미 없는 컬럼(depth/type/tags 등)을 제거하고
// 한 줄당 한 항목인 가독성 좋은 포맷으로 재저장.
//
// 사용:
//   node scripts/clean-beolpyo.js <파일경로> [keep=field1,field2,...] [array=배열키]
//
// 기본:
//   - 배열키: '별표내용'
//   - keep 미지정 시 marker,text 만 유지
//
// 예:
//   node scripts/clean-beolpyo.js data/air/law_active/docs/annex2_specificHazardousAirPollutants.json
//   node scripts/clean-beolpyo.js data/odor/law_active/docs/annex1_designatedOdorSubstances.json keep=id,name array=substances

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
if (!args.length) {
  console.error('파일 경로를 지정하세요. 예: node scripts/clean-beolpyo.js data/air/.../annex1.json');
  process.exit(1);
}

const file = path.resolve(args[0]);
let keep = ['marker', 'text'];
let arrayKey = '별표내용';
for (const a of args.slice(1)) {
  const [k, v] = a.split('=');
  if (k === 'keep') keep = v.split(',').map(s => s.trim()).filter(Boolean);
  else if (k === 'array') arrayKey = v;
}

if (!fs.existsSync(file)) { console.error(`파일 없음: ${file}`); process.exit(1); }
const d = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!Array.isArray(d[arrayKey])) { console.error(`${arrayKey} 배열 없음`); process.exit(1); }

const before = Object.keys(d[arrayKey][0] || {});
d[arrayKey] = d[arrayKey].map(it => Object.fromEntries(keep.map(k => [k, it[k]])));
const after = Object.keys(d[arrayKey][0] || {});

// 포맷: 객체 배열은 한 줄당 한 항목
function format(obj) {
  const lines = ['{'];
  const keys = Object.keys(obj);
  keys.forEach((k, ki) => {
    const tail = ki === keys.length - 1 ? '' : ',';
    if (Array.isArray(obj[k]) && obj[k].length && typeof obj[k][0] === 'object' && !Array.isArray(obj[k][0])) {
      lines.push(`  ${JSON.stringify(k)}: [`);
      obj[k].forEach((it, i) => {
        lines.push(`    ${JSON.stringify(it)}${i < obj[k].length - 1 ? ',' : ''}`);
      });
      lines.push(`  ]${tail}`);
    } else {
      lines.push(`  ${JSON.stringify(k)}: ${JSON.stringify(obj[k])}${tail}`);
    }
  });
  lines.push('}');
  return lines.join('\n');
}

fs.writeFileSync(file, format(d), 'utf8');
console.log(`✓ ${path.relative(process.cwd(), file)}`);
console.log(`  ${arrayKey}: ${d[arrayKey].length} rows`);
console.log(`  필드: [${before.join(',')}] → [${after.join(',')}]`);
