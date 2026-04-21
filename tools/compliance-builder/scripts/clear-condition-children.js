// 부모-자식 "조건+허가/면제" 패턴: 자식 answer 비우기
// 부모 답변·태그는 유지, 자식의 태그도 유지 (필터 정확도 보존), answer만 비움
const fs = require('fs');
const path = require('path');

// [별표 ID, 부모 IDX, 메모]
const TARGETS = [
  // A-조건으로 분류된 5개
  ['b5',  156, '액체상태 물질 — 처리시설 종류 나열 (조건+허가)'],
  ['b5',  424, '폐기물수집·운반증 발급 조건'],
  ['b5',  435, '폐기물수집·운반증 발급 면제 조건'],
  ['b5',  444, '폐기물수집·운반증 차량 부착 면제 조건'],
  ['b5',  461, '임시차량 폐기물수집·운반증 발급 조건'],
  // ?-기타에서 A 확정된 4개
  ['b5',  438, '폐전기전자제품 회수·재활용 자격 조건'],
  ['b5',  454, '차량 명의 면제 조건'],
  ['b7',  137, '재활용업무 종사자 기술요원 인정 조건'],
  ['b8',   14, '폐기물수집·운반업자 일괄계약 가능 조건 (사용자 요청)'],
];

const FILE_BY_ID = {
  b5:    '별표5_처리구체적기준및방법.json',
  b5_4:  '별표5의4_재활용자준수사항.json',
  b6:    '별표6_폐기물인계인수입력방법.json',
  b7:    '별표7_처리업시설장비기술능력기준.json',
  b8:    '별표8_처리업자준수사항.json',
  b9:    '별표9_처리시설설치기준.json',
  b17_2: '별표17의2_신고자준수사항.json',
};

const dataCache = {};
function load(sid) {
  if (dataCache[sid]) return dataCache[sid];
  const file = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', FILE_BY_ID[sid]);
  dataCache[sid] = { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  return dataCache[sid];
}

let totalCleared = 0;
for (const [sid, parentIdx, memo] of TARGETS) {
  const { data } = load(sid);
  const items = data['별표내용'];
  const parent = items[parentIdx];
  if (!parent) { console.warn(`[${sid}] IDX:${parentIdx} 없음 — skip`); continue; }
  const childDepth = parent.depth + 1;
  let cleared = 0;
  for (let j = parentIdx + 1; j < items.length; j++) {
    const c = items[j];
    if (c.depth === undefined) continue;
    if (c.depth <= parent.depth) break;
    if (c.depth === childDepth && c.answer) {
      c.answer = '';
      cleared++;
    }
  }
  console.log(`[${sid}] IDX:${parentIdx} (${memo}) — 자식 ${cleared}개 답변 비움`);
  totalCleared += cleared;
}

// 변경된 파일 저장
for (const sid of Object.keys(dataCache)) {
  const { file, data } = dataCache[sid];
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

console.log(`\n총 ${totalCleared}개 자식 항목 답변 제거. 부모 답변/모든 태그는 유지.`);
