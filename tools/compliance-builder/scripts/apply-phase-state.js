/**
 * apply-phase-state.js
 * 별표5 항목에 tags.phaseState 부여
 *
 * solid  : 고상(고체상태)만 명시
 * liquid : 액상(액체상태)만 명시
 * mixed  : 고상+액상 모두 해당
 * null   : 상태 구분 없음 (범용)
 *
 * node scripts/apply-phase-state.js
 */
const fs = require('fs');

const B5_PATH = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const data  = JSON.parse(fs.readFileSync(B5_PATH, 'utf8'));
const items = data['별표내용'];

const SOLID_RE  = /고상|고체\s*상태|고형물|고형화|고체의|고상의|고상이|고상은|고상을/;
const LIQUID_RE = /액상|액체\s*상태|액체의|액상의|액상이|액상은|액상을|액상으로|액체상태의/;

let solid = 0, liquid = 0, mixed = 0, nulled = 0;

items.forEach(item => {
  if (!item.tags || !item.tags.action) return;

  const t = item.text;
  const hasSolid  = SOLID_RE.test(t);
  const hasLiquid = LIQUID_RE.test(t);

  let phase = null;
  if (hasSolid && hasLiquid) { phase = 'mixed';  mixed++;  }
  else if (hasSolid)          { phase = 'solid';  solid++;  }
  else if (hasLiquid)         { phase = 'liquid'; liquid++; }
  else                        { phase = null;     nulled++; }

  item.tags.phaseState = phase;
});

fs.writeFileSync(B5_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`phaseState 적용 완료`);
console.log(`  solid: ${solid}, liquid: ${liquid}, mixed: ${mixed}, null(범용): ${nulled}`);

// 샘플
console.log('\n--- solid 샘플 ---');
items.filter(i=>i.tags?.phaseState==='solid').slice(0,5)
  .forEach(i=>console.log(`  [d${i.depth}] ${i.text.slice(0,70)}`));
console.log('\n--- liquid 샘플 ---');
items.filter(i=>i.tags?.phaseState==='liquid').slice(0,5)
  .forEach(i=>console.log(`  [d${i.depth}] ${i.text.slice(0,70)}`));
console.log('\n--- mixed 샘플 ---');
items.filter(i=>i.tags?.phaseState==='mixed').slice(0,5)
  .forEach(i=>console.log(`  [d${i.depth}] ${i.text.slice(0,70)}`));
