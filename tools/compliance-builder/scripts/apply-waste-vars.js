/**
 * 별표5 answer 텍스트에서 폐기물명을 감지해 {변수명} 템플릿으로 변환하고
 * tags.wasteVars 매핑을 추가하는 스크립트
 *
 * 출력 렌더링 고려사항 (렌더러 미작성):
 *   1. answer에서 {폐목재류} 같은 토큰 파싱
 *   2. tags.wasteVars[토큰명] → wasteCode 배열 조회
 *   3. 사용자 선택 wasteCode ∩ 코드배열 → 일치하면 토큰을 이름으로 치환, 없으면 제거
 *   4. 연속 쉼표·가운뎃점 정리: "{A}, {B}" → B만 남으면 "B"
 *   5. 모든 토큰 제거 시 → 항목 전체 숨김 (wasteVars가 있는 경우에만 적용)
 *
 * node scripts/apply-waste-vars.js
 */
const fs = require('fs');

const B5_PATH  = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const MAP_PATH = 'd:/dev/tools/tools/compliance-builder/data/wasteVarMap.json';

const data    = JSON.parse(fs.readFileSync(B5_PATH, 'utf8'));
const varMap  = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')).map;
const items   = data['별표내용'];

// 감지 대상 이름 목록 (긴 이름 우선 정렬 - 부분 매칭 방지)
const NAMES = Object.keys(varMap).sort((a, b) => b.length - a.length);

/**
 * answer 텍스트에서 나열형 폐기물명을 감지하여 {변수명}으로 래핑
 * 반환: { newAnswer, wasteVars } | null
 */
function applyTemplate(answer, wasteClass) {
  if (!answer) return null;

  let newAnswer = answer;
  const wasteVars = {};
  let changed = false;

  NAMES.forEach(name => {
    // 이미 {} 안에 있는 건 건너뜀
    if (newAnswer.includes(`{${name}}`)) return;

    // 텍스트에 이름이 나열형으로 등장하는지 확인
    // 나열형 = 앞뒤가 , · 及 및 이거나 문장 끝
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const listContext = new RegExp(
      `(?<=[,·、\\s]|^)${escaped}(?=[,·、\\s]|$|은|는|이|가|을|를|과|와|및|등)`, 'g'
    );

    if (listContext.test(newAnswer)) {
      newAnswer = newAnswer.replace(
        new RegExp(`(?<=[,·、\\s]|^)(${escaped})(?=[,·、\\s]|$|은|는|이|가|을|를|과|와|및|등)`, 'g'),
        `{${name}}`
      );

      // wasteVars에 코드 추가
      const codeEntry = varMap[name];
      if (codeEntry) {
        // wasteClass에 맞는 코드 우선, 없으면 첫 번째
        const codes = wasteClass && codeEntry[wasteClass]
          ? codeEntry[wasteClass]
          : Object.values(codeEntry)[0];
        wasteVars[name] = codes;
        changed = true;
      }
    }
  });

  return changed ? { newAnswer, wasteVars } : null;
}

let processed = 0;

items.forEach(item => {
  if (!item.answer || !item.tags) return;

  const wasteClass = item.tags.wasteClass ? item.tags.wasteClass[0] : null;
  const result = applyTemplate(item.answer, wasteClass);

  if (result) {
    item.answer = result.newAnswer;
    item.tags.wasteVars = result.wasteVars;
    processed++;
  }
});

fs.writeFileSync(B5_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`완료: ${processed}개 항목 wasteVars 적용`);

// 결과 샘플 출력
const samples = items.filter(i => i.tags && i.tags.wasteVars);
console.log(`\n--- 샘플 (${samples.length}개 중 5개) ---`);
samples.slice(0, 5).forEach(i => {
  console.log(`[${i.marker}] ${i.answer.slice(0, 90)}`);
  console.log(`  wasteVars:`, JSON.stringify(i.tags.wasteVars));
});
