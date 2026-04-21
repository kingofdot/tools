// 7개 별표 전체에서 "부모-자식 조건 나열" 패턴 후보 탐지
// 패턴: 부모 텍스트에 "다음의 모두", "다음의 어느 하나", "다음 각 호" 등이 있고
//       자식들(depth+1)이 조건을 나열하는데 자식에도 answer가 채워진 경우 → 자식 답변 제거 후보
const fs = require('fs');
const path = require('path');

const SOURCES = [
  { id: 'b5',    file: '별표5_처리구체적기준및방법.json' },
  { id: 'b5_4',  file: '별표5의4_재활용자준수사항.json' },
  { id: 'b6',    file: '별표6_폐기물인계인수입력방법.json' },
  { id: 'b7',    file: '별표7_처리업시설장비기술능력기준.json' },
  { id: 'b8',    file: '별표8_처리업자준수사항.json' },
  { id: 'b9',    file: '별표9_처리시설설치기준.json' },
  { id: 'b17_2', file: '별표17의2_신고자준수사항.json' },
];

const TRIGGER = /(다음의?\s*모두|다음의?\s*어느\s*하나|다음\s*각\s*호|다음과?\s*같은\s*경우)/;

const candidates = [];

for (const src of SOURCES) {
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', '검토사항', '시행규칙', src.file), 'utf8'));
  const items = data['별표내용'];

  for (let i = 0; i < items.length; i++) {
    const parent = items[i];
    if (!parent.answer || !parent.text) continue;
    if (!TRIGGER.test(parent.text)) continue;

    // 부모가 답변 있고 트리거 매칭. 자식들(depth+1) 수집
    const children = [];
    for (let j = i + 1; j < items.length; j++) {
      const c = items[j];
      if (c.depth === undefined) continue;
      if (c.depth <= parent.depth) break;     // 같은 또는 더 낮은 depth면 종료
      if (c.depth === parent.depth + 1) children.push({ idx: j, item: c });
    }

    // 자식이 2개 이상이고, 자식 중 answer 채워진 게 있으면 후보
    const childrenWithAnswer = children.filter(c => c.item.answer && c.item.answer.trim());
    if (children.length >= 2 && childrenWithAnswer.length > 0) {
      candidates.push({
        sid: src.id,
        parentIdx: i,
        parentMarker: parent.marker,
        parentText: parent.text.slice(0, 70),
        childCount: children.length,
        childrenWithAnswerIdx: childrenWithAnswer.map(c => c.idx),
      });
    }
  }
}

// 패턴 분류
// A. 조건+허가/금지: "경우에는 ~할 수 있다", "경우에는 ~한다", "경우에 ~체결할 수 있으며"
//    → 자식들은 단순 조건 나열. 자식 답변 비우기 필요
// B. 방법 나열: "방법으로 처분하여야 한다", "방법으로 처리해야 한다"
//    → 자식이 처분/처리 메소드. 자식별 답변 유지 (사용자가 선택한 방법이 의미)
// C. 구분/분류: "구분에 따른다"
//    → 자식이 분류별 행동. 자식 답변 유지
function classify(t) {
  if (/방법으로\s*(처분|처리|폐기)/.test(t)) return 'B-방법';
  if (/구분에?\s*따른/.test(t)) return 'C-구분';
  if (/(경우에는|경우에|경우)\s*(.{0,30})(할\s*수\s*있|체결할\s*수|발급|처리할\s*수|아니할|않을\s*수)/.test(t)) return 'A-조건';
  if (/경우.{0,30}한정한다/.test(t)) return 'A-조건';
  return '?-기타';
}

const grouped = { 'A-조건': [], 'B-방법': [], 'C-구분': [], '?-기타': [] };
for (const c of candidates) {
  c.kind = classify(c.parentText);
  grouped[c.kind].push(c);
}

console.log('=== 총', candidates.length, '개 후보, 패턴 분류 ===\n');
for (const kind of ['A-조건', 'B-방법', 'C-구분', '?-기타']) {
  const list = grouped[kind];
  console.log(`\n[${kind}] ${list.length}개`);
  for (const c of list) {
    console.log(`  [${c.sid}] IDX:${c.parentIdx} ${c.parentMarker} ${c.parentText}...`);
    console.log(`         자식 답변 채워진 IDX: ${c.childrenWithAnswerIdx.join(',')}`);
  }
}
console.log('\n→ A-조건 패턴이 자식 답변을 비울 후보. B/C는 자식별 답변 의미 있으므로 유지.');
