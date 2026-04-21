// 별표6 (폐기물 인계·인수 사항과 폐기물처리현장정보의 입력 방법 및 절차) — answer + tags 일괄 적용
// 사업장폐기물을 다루는 모든 처리 주체에 적용되므로 베이스 태그 광범위
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표6_폐기물인계인수입력방법.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

// 사업장폐기물 인계·인수는 배출자/수집운반자/처분자/재활용자 모두 적용
const BASE = {
  category: ['W01', 'W02', 'W04'],
  bizType: ['IR', 'CR', 'FR', 'ID', 'FD', 'TR', 'RTR', 'RREC', '06', '07', '08'],
  wasteClass: ['D', 'GO', 'GN'],
  action: null,
  rCode: null,
  facilityType: null,
};

// 수집·운반자 한정
const CT_ONLY = { ...BASE, action: ['CT'], bizType: ['TR', 'RTR'] };
// 처분/재활용자 한정
const PROC_ONLY = { ...BASE, action: ['MI', 'FI', 'RCY'], bizType: ['IR', 'CR', 'FR', 'ID', 'FD', 'RREC'] };
// 배출자 한정
const EMITTER_ONLY = { ...BASE, category: ['W04'], bizType: ['06', '07', '08'] };

const M = {};

// IDX:0 — title
M[0] = { answer: '', tags: null, noWord: true };

// IDX:1 — 1. 입력 매체 (헤더)
M[1] = { answer: '전자정보처리프로그램에 컴퓨터, 이동형 통신수단 또는 ARS를 이용하여 입력하겠음.', tags: { ...BASE } };

// IDX:2~4 — 가./나./다. 입력 매체 종류 (서브 항목, noWord 처리)
M[2] = { answer: '', tags: null, noWord: true };
M[3] = { answer: '', tags: null, noWord: true };
M[4] = { answer: '', tags: null, noWord: true };

// IDX:5 — 2. 시스템 장애 시 처리
M[5] = { answer: '시스템·통신망 장애 또는 천재지변·화재 등으로 입력하지 못한 경우 장애복구 후 또는 환경부장관 고시에 따라 입력하겠음.', tags: { ...BASE } };

// IDX:6 — 3. 인계·인수 입력 의무 (헤더)
M[6] = { answer: '인계·인수하는 폐기물의 종류와 양 등을 전자정보처리프로그램에 입력하겠음.', tags: { ...BASE } };

// IDX:7 — 가. 배출자 입력
M[7] = { answer: '배출자로서 폐기물 인계 전에 종류·양 등을 확정 또는 예약입력하고, 예약입력 시에는 처분·재활용자가 인수 후 2일 이내에 확정입력하겠음.', tags: { ...EMITTER_ONLY } };

// IDX:8 — 나. 운반자 입력
M[8] = { answer: '운반자로서 배출자로부터 폐기물을 인수받은 날부터 2일 이내에 인계번호를 입력하겠음.', tags: { ...CT_ONLY } };

// IDX:9 — 다. 처분/재활용자 인수 입력
M[9] = { answer: '처분·재활용자로서 운반자로부터 폐기물을 인수한 날부터 2일 이내에 인계번호·인계일자·인수량 등을 입력하겠음.', tags: { ...PROC_ONLY } };

// IDX:10 — 라. 처분/재활용자 처리 입력
M[10] = { answer: '처분·재활용자로서 인수한 폐기물을 처리한 후 2일 이내에 처리량·처리일자 등을 입력하겠음(처리기간 초과 금지).', tags: { ...PROC_ONLY } };

// IDX:11 — 4. 현장정보 전송 의무 (헤더)
M[11] = { answer: '폐기물처리현장정보를 전자정보처리프로그램에 전송하겠음.', tags: { ...BASE, action: ['CT', 'MI', 'FI', 'RCY'] } };

// IDX:12 — 가. 수집·운반자 GPS 정보
M[12] = { answer: '수집·운반차량 GPS 등을 통한 실시간 위치정보를 전송하겠음.', tags: { ...CT_ONLY } };

// IDX:13 — 나. 처분/재활용자 계량값·영상정보
M[13] = { answer: '계량시설 측정 계량값, 진입로·계량시설·보관시설 영상정보처리기기의 영상정보를 전송하겠음.', tags: { ...PROC_ONLY } };

// IDX:14 — 5. 전송장치 설치·점검
M[14] = { answer: '현장정보 전송장치를 설치·운영하고 정상작동 여부를 점검·관리하며, 이상 시 즉시 조치하겠음.', tags: { ...BASE, action: ['CT', 'MI', 'FI', 'RCY'] } };

// IDX:15 — 6. 환경부장관 고시 사항
M[15] = { answer: '그 밖의 세부사항은 기후에너지환경부장관 고시에 따르겠음.', tags: { ...BASE } };

// 적용
let applied = 0;
items.forEach((it, i) => {
  const m = M[i];
  if (!m) {
    console.warn(`경고: IDX:${i} 매핑 없음`);
    it.answer = '';
    it.tags = null;
    return;
  }
  it.answer = m.answer;
  it.tags = m.tags;
  if (m.noWord) it.noWord = true;
  applied++;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`적용 완료: ${applied}/${items.length}개 항목`);
console.log(`내용 항목: ${items.filter(it => it.tags && typeof it.tags === 'object').length}`);
console.log(`noWord(생략): ${items.filter(it => it.noWord).length}`);
