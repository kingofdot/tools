// 별표5 JSON의 tags.wasteClass "G" → "GO"/"GN" 재분류
// 규칙:
//  - 항목을 순서대로 훑으면서 현재 top-level 섹션(1.~5.)과 subsection(가./나./...) 추적
//  - tags.wasteClass에 "G"가 들어있는 항목에 한해 재분류
//  - 결정 우선순위:
//      1. 항목 text 자체가 "사업장배출시설계"만 언급 → ["GO"]
//      2. 항목 text 자체가 "사업장비배출시설계"만 언급 → ["GN"]
//      3. 항목 text가 둘 다 또는 둘 다 없음 → subsection 헤더 언급 확인 (가./나./다.)
//      4. 섹션 3(사업장일반폐기물)의 기본값 → ["GO","GN"]
//      5. 섹션 2(음식물류)·기타 → ["GO","GN"]
//  - "G"를 유지해야 하는 경우는 없음 (GO/GN 중 하나 이상)

const fs = require('fs');
const path = require('path');

const BASE = path.resolve(__dirname, '..');
const TARGET = path.join(BASE, 'data/검토사항/시행규칙/별표5_처리구체적기준및방법.json');

const doc = JSON.parse(fs.readFileSync(TARGET, 'utf8'));
const items = doc['별표내용'] || doc.items || [];

function classifyByText(text) {
  if (!text) return null;
  const hasGO = text.includes('사업장배출시설계');
  const hasGN = text.includes('사업장비배출시설계');
  if (hasGO && hasGN) return ['GO', 'GN'];
  if (hasGO) return ['GO'];
  if (hasGN) return ['GN'];
  return null;
}

let topSection = null;   // "1." ~ "5."
let subSection = null;   // 가./나./다. 등 (depth=1)
let changed = 0;
let skipped = 0;
const summary = [];

for (let i = 0; i < items.length; i++) {
  const it = items[i];

  if (it.depth === 0 && it.type === 'number' && /^\d+\.$/.test(it.marker || '')) {
    const m = it.marker.match(/^(\d+)\./);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 1 && n <= 9) {
        topSection = { marker: it.marker, text: it.text };
        subSection = null;
      }
    }
  }

  if (it.depth === 1 && (it.type === 'korean-dot' || /^[가-힣]\.$/.test(it.marker || ''))) {
    subSection = { marker: it.marker, text: it.text };
  }

  if (!it.tags) continue;
  const wc = it.tags.wasteClass;
  if (!Array.isArray(wc) || !wc.includes('G')) continue;

  let decided = classifyByText(it.text);

  if (!decided && subSection) {
    decided = classifyByText(subSection.text);
  }

  if (!decided) {
    decided = ['GO', 'GN'];
  }

  const newWC = Array.from(new Set(wc.flatMap((c) => (c === 'G' ? decided : [c]))));

  if (JSON.stringify(newWC) !== JSON.stringify(wc)) {
    it.tags.wasteClass = newWC;
    changed++;
    if (summary.length < 20) {
      summary.push({
        idx: i,
        top: topSection ? topSection.marker + ' ' + topSection.text.slice(0, 30) : '',
        sub: subSection ? subSection.marker + ' ' + subSection.text.slice(0, 30) : '',
        marker: it.marker,
        before: wc,
        after: newWC,
      });
    }
  } else {
    skipped++;
  }
}

fs.writeFileSync(TARGET, JSON.stringify(doc, null, 2), 'utf8');

console.log('변경:', changed, '/ 건너뜀:', skipped);
console.log('샘플 (최대 20건):');
for (const s of summary) {
  console.log(`  [${s.idx}] ${s.top} > ${s.sub} > ${s.marker}: ${JSON.stringify(s.before)} → ${JSON.stringify(s.after)}`);
}
