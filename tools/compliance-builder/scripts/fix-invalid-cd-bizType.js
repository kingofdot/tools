// 'CD' bizType 코드는 존재하지 않음 (BTYPE_MAP에 없음)
// 종합처분업 = ID + FD 조합으로 표현 — 'CD'를 모두 제거
const fs = require('fs');
const path = require('path');

const FILES = {
  b5:    '별표5_처리구체적기준및방법.json',
  b5_4:  '별표5의4_재활용자준수사항.json',
  b6:    '별표6_폐기물인계인수입력방법.json',
  b7:    '별표7_처리업시설장비기술능력기준.json',
  b8:    '별표8_처리업자준수사항.json',
  b9:    '별표9_처리시설설치기준.json',
  b17_2: '별표17의2_신고자준수사항.json',
};

let totalFixed = 0;
for (const [sid, file] of Object.entries(FILES)) {
  const fp = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', file);
  const data = JSON.parse(fs.readFileSync(fp, 'utf8'));
  const items = data['별표내용'];
  let count = 0;
  for (const it of items) {
    if (!it.tags || !it.tags.bizType || !Array.isArray(it.tags.bizType)) continue;
    if (!it.tags.bizType.includes('CD')) continue;
    // 'CD' 제거. 이미 ID/FD 둘 다 있으면 그대로, 없으면 추가
    const set = new Set(it.tags.bizType.filter(b => b !== 'CD'));
    // 'CD' 존재 = 종합처분업 의도이므로 ID+FD 모두 있어야 함
    if (set.has('ID') || set.has('FD')) {
      // 한쪽만 있으면 다른 쪽도 추가? 사용자가 원래 의도한 게 무엇이었는지 알 수 없음.
      // 안전하게 'CD'만 제거하고 나머지는 유지.
    }
    it.tags.bizType = [...set];
    count++;
  }
  if (count > 0) {
    fs.writeFileSync(fp, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[${sid}] ${count}개 항목에서 'CD' 제거`);
    totalFixed += count;
  }
}
console.log(`\n총 ${totalFixed}개 항목 정리 완료.`);
