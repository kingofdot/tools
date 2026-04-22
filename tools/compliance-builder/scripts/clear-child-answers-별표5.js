// 부모 항목이 "다음의 어느 하나에 해당하는 경우/방법" 패턴이면
// 직속 자식들의 answer를 빈 문자열로 비움 (tags는 유지)
// — 부모-자식 통합 답변 규칙 (feedback_compliance-answer-rules.md #1)
const fs = require('fs');
const path = require('path');

const FP = path.join(__dirname, '..', 'data', '검토사항', '시행규칙',
                     '별표5_처리구체적기준및방법.json');
const data = JSON.parse(fs.readFileSync(FP, 'utf8'));
const items = data['별표내용'];

const PARENT_RE = /(다음의?\s*어느\s*하나에\s*해당하|다음\s*각\s*호의\s*어느\s*하나에\s*해당|다음\s*각\s*호의\s*구분에\s*따른다)/;

// 사용자 IDX:86 — 명시 답변 지정
const PARENT_OVERRIDES = {
  86: '사업장에서 발생하는 폐기물은 보관 시작일로부터 90일(중간가공 폐기물은 120일)을 초과하여 보관하지 않겠음. 다만, 아래 가)~라)에 해당하는 경우는 예외로 하겠음.',
};

let parentsTouched = 0, childrenCleared = 0;

for (let i = 0; i < items.length; i++) {
  const it = items[i];
  if (!it.text || !PARENT_RE.test(it.text)) continue;

  // 부모 답변 override
  if (PARENT_OVERRIDES[i]) {
    it.answer = PARENT_OVERRIDES[i];
    parentsTouched++;
  }

  // 직속 자식 (depth = parent.depth + 1) 찾아 answer 비우기
  const parentDepth = it.depth || 0;
  const childDepth = parentDepth + 1;
  for (let j = i + 1; j < items.length; j++) {
    const c = items[j];
    const cd = c.depth || 0;
    if (cd <= parentDepth) break;
    if (cd === childDepth && c.answer) {
      c.answer = '';
      childrenCleared++;
    }
  }
}

fs.writeFileSync(FP, JSON.stringify(data, null, 2), 'utf8');
console.log(`부모 override: ${parentsTouched}개, 자식 answer 비움: ${childrenCleared}개`);
