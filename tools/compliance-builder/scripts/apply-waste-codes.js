/**
 * apply-waste-codes.js
 * 별표5 항목에 tags.wasteCode 배열을 부여
 *
 * 원칙:
 *  1. 범용 항목 (해당 폐기물 대분류 전체에 적용) → wasteCode: null
 *  2. 특정 폐기물 섹션/서브섹션 항목 → 해당 별표4 XX-XX 코드 배열
 *  3. wasteVars 있는 항목 → wasteVars 코드 우선 사용
 *
 * 컨텍스트 추적 방식:
 *  - depth별 컨텍스트 스택 유지
 *  - tags===null 헤더 텍스트에서 특정 폐기물 감지 시 해당 depth 컨텍스트 갱신
 *  - 데이터 항목 텍스트 시작부분 "XXX의 경우" 패턴 감지 시 해당 depth 컨텍스트 갱신
 *  - 각 데이터 항목은 가장 가까운(깊은) 컨텍스트 상속
 *
 * node scripts/apply-waste-codes.js
 */
const fs = require('fs');

const B5_PATH = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const data  = JSON.parse(fs.readFileSync(B5_PATH, 'utf8'));
const items = data['별표내용'];

// ─── 폐기물 감지 규칙 (텍스트 → 별표4 XX-XX 코드) ─────────────────────
// 순서 중요: 더 specific한 패턴을 앞에
const WASTE_RULES = [
  // 음식물류 (L+G)
  { re: /음식물류\s*폐기물|음식물류폐기물/, codes: ['51-38', '91-02'], label: '음식물류폐기물' },
  // 의료폐기물
  { re: /의료폐기물/, codes: ['10-12'], label: '의료폐기물' },
  // 폐석면
  { re: /폐석면/, codes: ['07-01'], label: '폐석면' },
  // 수은폐기물
  { re: /수은함유폐기물|수은구성폐기물|수은폐기물|수은전용용기/, codes: ['11-01'], label: '수은폐기물' },
  // 폐유기용제 (04-XX, D only)
  { re: /폐유기용제/, codes: ['04-01', '04-02'], label: '폐유기용제' },
  // 폐페인트·폐래커
  { re: /폐페인트|폐래커|폐락카/, codes: ['05-01', '05-02', '05-03'], label: '폐페인트·폐래커' },
  // PCBs
  { re: /폴리클로리네이티드비페닐|PCBs?/, codes: ['08-01', '08-02', '08-03', '08-04'], label: 'PCBs' },
  // 폐유독물질
  { re: /폐유독물질/, codes: ['09-01', '09-02', '09-03', '09-04'], label: '폐유독물질' },
  // 폐광물유 (= 폐유, D)
  { re: /폐광물유/, codes: ['06-01'], label: '폐광물유' },
  // 폐유 - "폐유"만 있는 경우 (D class 섹션에서는 06-01, G는 해당없음)
  // 섹션 컨텍스트로만 처리
  // 소각재 (D+G)
  { re: /소각재/, codes: ['03-05', '51-08'], label: '소각재' },
  // 오니류 (D+G)
  { re: /오니류|오니$|^오니의/, codes: ['01-02', '51-01', '51-02'], label: '오니류' },
  // 폐산·폐알칼리
  { re: /폐산이나\s*폐알칼리|폐알칼리이나\s*폐산/, codes: ['02-01', '02-02'], label: '폐산·폐알칼리' },
  { re: /^폐산의\s*경우|^폐산$/, codes: ['02-01'], label: '폐산' },
  { re: /^폐알칼리의\s*경우|^폐알칼리$/, codes: ['02-02'], label: '폐알칼리' },
  // 폐합성고분자화합물 (D+G)
  { re: /폐합성고분자화합물/, codes: ['01-01', '51-03'], label: '폐합성고분자화합물' },
  // 폐농약 (D)
  { re: /폐농약/, codes: ['01-03'], label: '폐농약' },
  // 광재류 (D+G)
  { re: /광재/, codes: ['03-01', '51-04'], label: '광재' },
  // 폐촉매 (D+G)
  { re: /폐촉매/, codes: ['03-07', '51-10'], label: '폐촉매' },
  // 폐흡착제·흡수제 (D+G)
  { re: /폐흡착제|폐흡수제/, codes: ['03-08', '51-11'], label: '폐흡착제·흡수제' },
  // 폐전지류 (D+G+L)
  { re: /폐전지류/, codes: ['03-10', '51-41', '91-14'], label: '폐전지류' },
  // 천연방사성 (L)
  { re: /천연방사성제품생활폐기물|천연방사성제품폐기물/, codes: ['91-20'], label: '천연방사성제품폐기물' },
  // 폐냉매
  { re: /폐냉매물질|폐냉매/, codes: ['51-37'], label: '폐냉매물질' },
  // 폐타이어 (G+L)
  { re: /폐타이어/, codes: ['51-15', '91-07'], label: '폐타이어' },
  // 폐목재류 (G+L)
  { re: /폐목재류|폐목재/, codes: ['51-20', '91-10'], label: '폐목재류' },
  // 폐전기전자제품 (G+L)
  { re: /폐전기전자제품류|폐전기전자제품/, codes: ['51-18', '91-09'], label: '폐전기전자제품' },
  // 폐가전제품 (L)
  { re: /폐가전제품/, codes: ['91-09'], label: '폐가전제품' },
  // 폐가구류 (L)
  { re: /폐가구류/, codes: ['91-10'], label: '폐가구류' },
  // 조명폐기물 (G+L)
  { re: /조명폐기물|폐형광등|폐발광다이오드/, codes: ['51-47', '91-13'], label: '조명폐기물' },
  // 폐소화기 (G+L)
  { re: /폐소화기/, codes: ['51-40', '91-19'], label: '폐소화기' },
  // 동식물성잔재물 (G)
  { re: /동·식물성잔재물|동식물성잔재물/, codes: ['51-17'], label: '동·식물성잔재물' },
  // 폐토사 (G)
  { re: /폐토사류|폐토사/, codes: ['51-21'], label: '폐토사류' },
  // 폐콘크리트 (G)
  { re: /폐콘크리트류|폐콘크리트/, codes: ['51-22'], label: '폐콘크리트류' },
  // 폐섬유류 (G)
  { re: /폐섬유류/, codes: ['51-27'], label: '폐섬유류' },
  // 폐금속류 (G)
  { re: /폐금속류/, codes: ['51-29'], label: '폐금속류' },
];

// ─── 텍스트에서 특정 폐기물 감지 ─────────────────────────────────────────
// contextOnly=true: 섹션 헤더나 "~의 경우" 패턴에서만 컨텍스트 갱신용으로 사용
function detectWaste(text, contextOnly = false) {
  const t = text.trim();

  // 섹션 헤더 직접 매핑 (텍스트 전체 매칭)
  if (/^음식물류\s*폐기물/.test(t)) return ['51-38', '91-02'];
  if (/^의료폐기물/.test(t) || t === '의료폐기물') return ['10-12'];

  if (contextOnly) {
    // "경우"로 끝나는 짧은 텍스트에서만 감지 (종류별 처리기준 서브섹션)
    // 또는 단독 폐기물명으로 된 헤더
    const isSpecificSection =
      (t.length < 60 && /의\s*경우$|의\s*기준$/.test(t)) ||
      /^오니$/.test(t) ||
      /^폐유$/.test(t);
    if (!isSpecificSection) return null;
  }

  const foundCodes = new Set();
  for (const rule of WASTE_RULES) {
    if (rule.re.test(t)) {
      rule.codes.forEach(c => foundCodes.add(c));
    }
  }
  return foundCodes.size > 0 ? [...foundCodes] : null;
}

// ─── 메인: depth별 컨텍스트 스택으로 wasteCode 할당 ─────────────────────
// ctxStack[depth] = codes | null (null = 범용)
const ctxStack = new Array(10).fill(undefined); // undefined = 상속 없음

let processed = 0;
let nulled = 0;

items.forEach((item, idx) => {
  if (!item.tags) return; // tags===null 섹션헤더

  // ── 헤더 항목(tags===null)은 여기 안 옴, 별도로 사전 처리 필요
  // 위에서 return 했으니 여기서는 tags 있는 항목만 처리
});

// 다시 순서대로 처리 (헤더 포함)
for (let i = 0; i < items.length; i++) {
  const item = items[i];

  if (item.tags === null) {
    // ── 섹션 헤더: 컨텍스트 갱신 ──────────────────────────────
    const detected = detectWaste(item.text, true);
    ctxStack[item.depth] = detected; // null도 OK (범용 섹션)
    // 더 깊은 depth의 컨텍스트는 리셋
    for (let d = item.depth + 1; d < ctxStack.length; d++) ctxStack[d] = undefined;
    continue;
  }

  // ── 데이터 항목 ──────────────────────────────────────────────
  if (!item.tags.action) continue; // action 없는 항목 스킵

  // 1) wasteVars 있으면 그 코드가 우선
  if (item.tags.wasteVars) {
    const codes = [...new Set(Object.values(item.tags.wasteVars).flat())];
    item.tags.wasteCode = codes.length > 0 ? codes : null;
    processed++;
    continue;
  }

  // 2) 이 항목 텍스트 자체가 특정 폐기물 섹션 역할을 하면 컨텍스트 갱신
  //    ("XXX의 경우" 패턴 + 짧은 텍스트 or 확실한 폐기물명)
  const selfDetected = detectWaste(item.text, true);
  if (selfDetected) {
    ctxStack[item.depth] = selfDetected;
    for (let d = item.depth + 1; d < ctxStack.length; d++) ctxStack[d] = undefined;
    item.tags.wasteCode = selfDetected;
    processed++;
    continue;
  }

  // 3) 가장 가까운(깊은) 컨텍스트 상속
  let inheritedCodes = null;
  for (let d = item.depth; d >= 0; d--) {
    if (ctxStack[d] !== undefined) {
      inheritedCodes = ctxStack[d]; // null일 수도 있음 (범용)
      break;
    }
  }

  item.tags.wasteCode = inheritedCodes;
  if (inheritedCodes) processed++;
  else nulled++;
}

fs.writeFileSync(B5_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`완료: 특정 wasteCode 부여 ${processed}개 / 범용(null) ${nulled}개`);

// ─── 샘플 출력 ─────────────────────────────────────────────────────────────
console.log('\n--- 특정 wasteCode 항목 샘플 (30개) ---');
items.filter(i => i.tags?.wasteCode).slice(0, 30).forEach(i => {
  console.log(`[d${i.depth} ${i.marker}] ${i.text.slice(0, 55)}`);
  console.log(`  wasteCode: ${JSON.stringify(i.tags.wasteCode)}`);
});

console.log('\n--- 확인: 음식물류 관련 항목 ---');
items.filter(i => i.tags?.wasteCode?.includes('51-38') || i.tags?.wasteCode?.includes('91-02'))
  .forEach(i => console.log(`  [d${i.depth} ${i.marker}] ${i.text.slice(0, 60)}`));
