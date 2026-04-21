// 별표5 IDX:68(2) / 69(가) / 70(나) / 71(다) 보정
// - (2) 답변에 (가)(나)(다) 내용 통합
// - (가) wasteCode/wasteVars 태깅 일관성 확보
// - (가)(나)(다) 개별 답변 제거 (text 좌측만 표시, 우측 비움)
const fs = require('fs');
const path = require('path');
const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표5_처리구체적기준및방법.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

// (2) 답변 — 자식 (가)(나)(다) 본문이 같이 출력되므로 심플하게
items[68].answer = '다음 중 어느 하나에 해당하는 경우에는 밀폐형 덮개 설치차량으로 수집·운반하겠음.';

// (가) — wasteCode/wasteVars 추가, 답변 제거
items[69].tags.wasteCode = ['51-18', '51-20'];
items[69].tags.wasteVars = {
  '폐전기전자제품류': ['51-18'],
  '폐가구류': ['51-20'],
};
items[69].answer = '';

// (나) — 답변 제거 (태그는 유지)
items[70].answer = '';

// (다) — 답변 제거 (태그는 유지)
items[71].answer = '';

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log('IDX:68 (2) answer 통합 완료');
console.log('IDX:69 (가) wasteCode/wasteVars 추가, answer 제거');
console.log('IDX:70 (나) answer 제거');
console.log('IDX:71 (다) answer 제거');
