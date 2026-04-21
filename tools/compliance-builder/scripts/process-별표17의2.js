// 별표17의2 (폐기물처리 신고자의 준수사항) — answer + tags 일괄 적용
// 대상: W02 신고자 (RTR 수집운반신고 / RREC 재활용신고)
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표17의2_신고자준수사항.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

// ─── 베이스 프로필 (W02 신고자) ─────────────────────────────────────
const BASE = {
  category: ['W02'],
  bizType: ['RTR', 'RREC'],
  wasteClass: null,
  wasteCode: null,
  action: null,
  rCode: null,
  facilityType: null,
};

// 재활용 신고자 한정 (RREC)
const REC_ONLY = { ...BASE, bizType: ['RREC'], action: ['RCY'] };
// 수집운반 신고자 한정 (RTR)
const TR_ONLY = { ...BASE, bizType: ['RTR'], action: ['CT'] };

// ─── answer + tags 매핑 ─────────────────────────────────────────────
const M = {};
const SECTION = (answer = '') => ({ answer, tags: null });
const SKIP = { answer: '', tags: null, noWord: true };

// IDX:0 — title
M[0] = SKIP;

// IDX:1 — 1. 신고한 재활용 용도·방법대로 재활용
M[1] = { answer: '신고한 재활용 용도 또는 방법에 따라 재활용하겠음.', tags: { ...REC_ONLY } };

// IDX:2 — 2. 폐기물 위탁재활용(운반)계약서 작성 및 3년 보관
M[2] = { answer: '폐기물의 재활용을 위탁한 자와 다음 각 목의 내용이 포함된 폐기물 위탁재활용(운반)계약서를 작성하고, 그 계약서를 3년간 보관하겠음.', tags: { ...BASE } };

// IDX:3~9 — 가~사 (계약서 기재사항)
M[3] = { answer: '상호, 소재지 및 대표자를 기재하겠음.', tags: { ...BASE } };
M[4] = { answer: '위탁계약기간을 기재하겠음.', tags: { ...BASE } };
M[5] = { answer: '폐기물의 종류별 수량, 성질과 상태 및 취급 시 주의사항을 기재하겠음.', tags: { ...BASE } };
M[6] = { answer: '폐기물의 종류별 재활용장소 및 재활용방법을 기재하겠음.', tags: { ...REC_ONLY } };
M[7] = { answer: '운반단가 또는 운반비를 기재하겠음(폐기물수집·운반업자가 포함된 경우).', tags: { ...BASE } };
M[8] = { answer: '재활용처리단가 또는 재활용처리비를 기재하겠음.', tags: { ...REC_ONLY } };
M[9] = SKIP;  // 삭제 <2011.9.27>

// IDX:10 — 3. 재위탁 금지 (예외 있음)
M[10] = { answer: '위탁받은 폐기물을 재위탁하거나 재위탁받지 않겠음(법령이 허용하는 예외에 해당하는 경우에 한함).', tags: { ...BASE } };

// IDX:11 — 가. 제66조제5항 해당자 수집운반 예외
M[11] = { answer: '제66조제5항에 해당하는 자 중 같은 조 제3항 각 호의 폐기물을 수집·운반하는 자가 수집·운반한 폐기물을 같은 규정 대상자 간 재위탁하는 경우에만 해당 규정에 따라 처리하겠음.', tags: { ...TR_ONLY } };

// IDX:12 — 나. 법 제46조제1항제3호 해당자 수집운반 예외
M[12] = { answer: '법 제46조제1항제3호에 해당하는 자 중 제66조제6항제8호에 해당하는 폐기물을 수집·운반하는 자가 수집·운반한 폐기물을 같은 규정 대상자 간 재위탁하는 경우에만 해당 규정에 따라 처리하겠음.', tags: { ...TR_ONLY } };

// IDX:13 — 다. 천재지변·처리금지·휴폐업 등 시·도지사 승인 예외
M[13] = { answer: '천재지변, 처리금지, 휴업, 폐업 등 정당한 사유가 있는 경우에 한하여 시·도지사의 승인을 받은 후 재위탁하겠음.', tags: { ...BASE } };

// IDX:14 — 4. 재활용 능력 초과·불가 폐기물 위탁 금지
M[14] = { answer: '자신의 재활용시설에서 재활용할 수 없는 폐기물을 위탁받거나 재활용능력을 초과하여 폐기물을 위탁받지 않겠음.', tags: { ...REC_ONLY } };

// IDX:15 — 5. 허용보관량 초과·시설외 보관 금지
M[15] = { answer: '허용보관량을 초과하여 폐기물을 보관하거나 보관시설 외의 장소에 폐기물을 보관하지 않겠음.', tags: { ...BASE } };

// IDX:16 — 6. 정당한 사유 없이 수탁거부 금지
M[16] = { answer: '수집·운반 및 재활용할 수 있는 능력의 초과, 휴업·폐업 등 정당한 사유 없이 배출자가 요청한 폐기물의 수탁을 거부하지 않겠음.', tags: { ...BASE } };

// IDX:17 — 7. 1년 이상 휴업 금지
M[17] = { answer: '정당한 사유 없이 계속하여 1년 이상 휴업하지 않겠음.', tags: { ...BASE } };

// IDX:18 — 8. 명의대여·증명서 대여 금지
M[18] = { answer: '다른 사람에게 자기의 성명·상호를 사용하여 폐기물을 위탁받게 하거나 신고증명서를 다른 사람에게 빌려주지 않겠음.', tags: { ...BASE } };

// IDX:19 — 9. 제66조제5항 해당자 차폐·소음진동·악취 방지 조치
M[19] = { answer: '제66조제5항에 해당하는 자가 같은 조 제3항 각 호의 폐기물을 보관하는 경우 차폐 가림막 설치 등 필요한 조치를 하고, 수집·운반·보관 과정에서 발생하는 소음·진동·악취·분진 등을 방지하겠음.', tags: { ...TR_ONLY } };

// IDX:20 — 10. 처리금지·휴폐업 시 수집운반증 반납
M[20] = { answer: '처리금지, 휴업신고 또는 폐업신고 등으로 폐기물을 수집·운반하지 아니할 때에는 발급받은 폐기물수집·운반증을 시·도지사에게 반납하겠음.', tags: { ...TR_ONLY } };

// IDX:21 — 11. 수탁처리능력 확인서·신고증명서 사본·보증서류 허위·거부 금지
M[21] = { answer: '폐기물 배출자에게 수탁처리능력 확인서, 폐기물처리 신고증명서 사본 및 방치폐기물처리이행보증 확인 서류 사본을 거짓으로 제출하거나 제출을 거부하지 않겠음.', tags: { ...BASE } };

// IDX:22 — 12. 생활폐기물 수집운반 시 대상 제한
M[22] = { answer: '법 제14조제3항에 따라 생활폐기물을 수집·운반하려는 경우 일정한 장소에 보관되지 아니하고 버려진 생활폐기물이나 직접 배출자로부터 수거한 생활폐기물만을 수집·운반하겠음.', tags: { ...TR_ONLY, wasteClass: ['L'] } };

// IDX:23 — 13. 삭제
M[23] = SKIP;

// ─── 적용 ──────────────────────────────────────────────────────────
let applied = 0;
let warned = 0;
items.forEach((it, i) => {
  const m = M[i];
  if (!m) {
    console.warn(`경고: IDX:${i} 매핑 없음 (depth=${it.depth}, type=${it.type}, marker=${it.marker})`);
    it.answer = '';
    it.tags = null;
    warned++;
    return;
  }
  it.answer = m.answer;
  it.tags = m.tags;
  if (m.noWord) it.noWord = true;
  applied++;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`적용 완료: ${applied}/${items.length}개 항목 (경고 ${warned}개)`);
console.log(`내용 항목 (tags 객체): ${items.filter(it => it.tags && typeof it.tags === 'object').length}`);
console.log(`섹션 헤더 (tags=null, !noWord): ${items.filter(it => it.tags === null && !it.noWord).length}`);
console.log(`출력 제외 (noWord): ${items.filter(it => it.noWord).length}`);
