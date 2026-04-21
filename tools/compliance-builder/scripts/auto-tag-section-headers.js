// 7개 별표 순회하며 상위 섹션 헤더 후보 추출 → bizType/wasteClass 자동 태깅
// dryRun: true면 결과만 출력, false면 JSON에 저장
const fs = require('fs');
const path = require('path');

const DRY_RUN = process.argv.includes('--apply') ? false : true;

const SOURCES = [
  { id: 'b5',    file: '별표5_처리구체적기준및방법.json' },
  { id: 'b5_4',  file: '별표5의4_재활용자준수사항.json' },
  { id: 'b6',    file: '별표6_폐기물인계인수입력방법.json' },
  { id: 'b7',    file: '별표7_처리업시설장비기술능력기준.json' },
  { id: 'b8',    file: '별표8_처리업자준수사항.json' },
  { id: 'b9',    file: '별표9_처리시설설치기준.json' },
  { id: 'b17_2', file: '별표17의2_신고자준수사항.json' },
];

// 텍스트에서 bizType/wasteClass 추론
function inferTags(text) {
  const t = text;
  const tags = {};

  // bizType (업종) — 코드: TR/RTR(수집운반), ID/FD(중간/최종처분), IR/CR/FR(재활용), RREC(재활용신고), DP(배출자)
  // ※ 'CD' 코드는 존재하지 않음. 종합처분업 = ID+FD, 종합재활용업 = CR
  const bizSet = new Set();
  if (/수집[ㆍ·]?운반(업자|업의|업|차량|증|을)/.test(t)) { bizSet.add('TR'); bizSet.add('RTR'); }
  if (/중간처분(업자|업의|업|시설|하는)/.test(t)) bizSet.add('ID');
  if (/최종처분(업자|업의|업|시설|하는)/.test(t)) bizSet.add('FD');
  if (/종합처분(업자|업의|업|시설|하는)/.test(t)) { bizSet.add('ID'); bizSet.add('FD'); }
  if (/처분업자/.test(t) && !bizSet.size) { bizSet.add('ID'); bizSet.add('FD'); }
  if (/중간재활용/.test(t)) bizSet.add('IR');
  if (/최종재활용/.test(t)) bizSet.add('FR');
  if (/종합재활용/.test(t)) bizSet.add('CR');
  if (/재활용(업자|업의|업|업,|시설|하는)/.test(t) && !/(중간|최종|종합)재활용/.test(t)) {
    bizSet.add('IR'); bizSet.add('CR'); bizSet.add('FR');
  }
  if (/신고자/.test(t)) { bizSet.add('RTR'); bizSet.add('RREC'); }
  if (/배출자/.test(t)) bizSet.add('DP');
  if (bizSet.size) tags.bizType = [...bizSet];

  // wasteClass (폐기물 대분류) — D / GO / GN / L
  const wcSet = new Set();
  const isExceptMed = /의료폐기물(은\s*)?제외/.test(t);
  const isExceptDesig = /지정폐기물\s*외의/.test(t);  // "지정폐기물 외의 폐기물" = NOT 지정
  if (/생활폐기물/.test(t)) wcSet.add('L');
  // 사업장배출시설계 / 비배출시설계
  if (/사업장배출시설계/.test(t)) wcSet.add('GO');
  if (/사업장비[\(（]?\s*非\s*[\)）]?\s*배출시설계|사업장비배출시설계|비배출시설계/.test(t)) wcSet.add('GN');
  // "사업장폐기물" / "사업장일반폐기물" 일반 표현 (구체적 GO/GN 명시 없을 때)
  if (/사업장(일반)?폐기물/.test(t) && !wcSet.has('GO') && !wcSet.has('GN') && !/지정/.test(t)) {
    wcSet.add('GO'); wcSet.add('GN');
  }
  if (/지정폐기물/.test(t) && !isExceptDesig) wcSet.add('D');
  // "지정폐기물 외의 폐기물" → 사업장+생활 (지정 제외 모든 폐기물)
  if (isExceptDesig) {
    wcSet.add('GO'); wcSet.add('GN'); wcSet.add('L');
  }
  if (wcSet.size) tags.wasteClass = [...wcSet];

  // wasteCode / wasteCodeExclude
  const MED = ['10'];
  if (/의료폐기물/.test(t) && !isExceptMed) tags.wasteCode = MED;
  if (isExceptMed && tags.wasteClass && tags.wasteClass.includes('D')) tags.wasteCodeExclude = MED;
  if (/음식물(류)?\s*폐기물/.test(t) && !tags.wasteCode) tags.wasteCode = ['51-19'];

  // action (행위)
  if (!tags.bizType) {
    if (/수집[ㆍ·]?운반/.test(t)) tags.action = ['CT'];
  } else {
    // bizType 있으면 action도 같이 추정
    const actSet = new Set();
    if (tags.bizType.includes('TR') || tags.bizType.includes('RTR')) actSet.add('CT');
    if (tags.bizType.includes('ID')) actSet.add('MI');
    if (tags.bizType.includes('FD')) actSet.add('FI');
    if (tags.bizType.includes('IR') || tags.bizType.includes('CR') || tags.bizType.includes('FR') || tags.bizType.includes('RREC')) actSet.add('RCY');
    if (actSet.size) tags.action = [...actSet];
  }

  // 시설 패턴 (별표9용)
  const FT = {
    '소각시설': ['INC_G','INC_H','INC_P','INC_F','INC_C'],
    '기계적\\s*처분시설': ['MCD_CMP','MCD_SHR','MCD_CUT','MCD_MLT','MCD_EVP','MCD_PUR','MCD_OWS','MCD_DRY','MCD_STR'],
    '화학적\\s*처분시설': ['CCD_SOL','CCD_RXN','CCD_CGP'],
    '생물학적\\s*처분시설': ['BCD_SMZ','BCD_BIO'],
    '매립시설': ['LF_BLK','LF_MGD'],
    '기계적\\s*재활용시설': ['MCR_CMP','MCR_SHR','MCR_CUT','MCR_MLT','MCR_FUL','MCR_EVP','MCR_PUR','MCR_OWS','MCR_DRY','MCR_WSH','MCR_SRT'],
    '화학적\\s*재활용시설': ['CCR_SOL','CCR_RXN','CCR_CGP','CCR_PYR'],
    '생물학적\\s*재활용시설': ['BCR_DIG','BCR_FED','BCR_CPT','BCR_BSF','BCR_HMF','BCR_MSH','BCR_BIO'],
    '시멘트\\s*소성로': ['KLN'],
    '용해로': ['SMT'],
    '소각열회수시설': ['INC_R'],
    '수은회수시설': ['MRC'],
    '선별시설': ['MCR_SRT'],
  };
  for (const [pat, ft] of Object.entries(FT)) {
    if (new RegExp('^' + pat).test(t.trim()) || new RegExp(pat + '$').test(t.trim())) {
      tags.facilityType = ft;
      break;
    }
  }

  return Object.keys(tags).length ? tags : null;
}

// 헤더 후보 판정
// - depth 0~1만 (depth=2는 본문 항목 가능성 높음)
// - text 짧음 (< 50자)
// - marker가 헤더 marker (1./2., 가./나./다.) — 본문 marker (1)/(가)/(1) 등 제외
// - answer가 text 거의 그대로 복제된 경우는 OK (별표9 패턴)
function isCandidateHeader(item) {
  if (!item.text) return false;
  if (item.depth > 1) return false;
  if (item.isHeader) return false;
  const t = item.text.trim();
  if (t.length > 50) return false;
  // marker 검증: 헤더 marker만 인정
  const m = (item.marker || '').trim();
  if (/^\d+\)$/.test(m)) return false;        // 1) 2) 3)
  if (/^\(\d+\)$/.test(m)) return false;       // (1) (2)
  if (/^\([가-힣]\)$/.test(m)) return false;   // (가) (나)
  if (/^[가-힣]\)$/.test(m)) return false;     // 가) 나)
  // marker가 1./2./가./나. 형태이거나 비어있어야 함
  if (m && !/^(\d+\.|[가-힣]\.|■)$/.test(m)) return false;
  // ■ 마커는 별표 제목 — 제외
  if (m === '■') return false;
  // answer가 text와 거의 동일하면 (별표9의 단순 헤더 패턴) OK
  if (item.answer) {
    const a = item.answer.trim().replace(/^[\d가-힣]+[\.\)]\s*/, '');
    const tStripped = t.replace(/^[\d가-힣]+[\.\)]\s*/, '');
    // answer가 text의 짧은 요약(50% 이상 일치 또는 길이 < 30)이면 헤더로 간주
    if (item.answer.length > 30 && !tStripped.startsWith(a.slice(0, 8))) return false;
  }
  // 1) 명시적 헤더 패턴 (말미)
  if (/(의\s*경우$|하는\s*경우$|업자의\s*경우|업의\s*경우|업의?\s*기준$|기준\s*및\s*방법$|준수사항$|시설의?\s*설치기준$|장비\s*기준$|기술능력\s*기준$|시설\s*기준$|보관시설$|사용의\s*경우$|개별기준$|공통기준$)/.test(t)) return true;
  // 2) 업종 명칭으로 시작
  if (/^(\s*\d+\.\s*)?(폐기물수집[ㆍ·]?운반업자|폐기물(중간|최종|종합)?처분업자|폐기물재활용업자|신고자)/.test(t)) return true;
  // 3) 시설 단독 명칭 (별표9용) — depth=1 + 한글 마커 + 시설/소성로/용해로/회수시설로 끝남
  if (item.depth === 1 && /^[가-힣]\.$/.test(m)) {
    if (/(시설|소성로|용해로|회수시설|소각열회수시설|수은회수시설|선별시설)$/.test(t)) return true;
  }
  return false;
}

const FILE_BY_ID = Object.fromEntries(SOURCES.map(s => [s.id, s.file]));

const dataCache = {};
function load(sid) {
  if (dataCache[sid]) return dataCache[sid];
  const file = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', FILE_BY_ID[sid]);
  dataCache[sid] = { file, data: JSON.parse(fs.readFileSync(file, 'utf8')) };
  return dataCache[sid];
}

const proposals = [];
for (const src of SOURCES) {
  const { data } = load(src.id);
  const items = data['별표내용'];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!isCandidateHeader(it)) continue;
    const inferred = inferTags(it.text) || {};  // 빈 태그도 OK — isHeader만 마킹
    proposals.push({ sid: src.id, idx: i, depth: it.depth, marker: it.marker, text: it.text.slice(0,60), inferred, hadHeader: !!it.isHeader });
  }
}

console.log(`=== 헤더 후보 ${proposals.length}개 ${DRY_RUN ? '(DRY RUN — --apply로 적용)' : '(적용 중)'} ===\n`);
for (const p of proposals) {
  console.log(`[${p.sid}] IDX:${p.idx} depth=${p.depth} ${p.marker} ${p.text}`);
  console.log(`         → ${JSON.stringify(p.inferred)}`);
}

if (!DRY_RUN) {
  const fullTagBase = { category: null, bizType: null, wasteClass: null, wasteCode: null, action: null, rCode: null, facilityType: null };
  for (const p of proposals) {
    const { data } = load(p.sid);
    const it = data['별표내용'][p.idx];
    it.isHeader = true;
    it.tags = { ...fullTagBase, ...p.inferred };
  }
  for (const sid of Object.keys(dataCache)) {
    const { file, data } = dataCache[sid];
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  }
  console.log(`\n적용 완료: ${proposals.length}개 항목에 isHeader + tags 부여`);
}
