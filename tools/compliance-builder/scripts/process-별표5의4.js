// 별표5의4 (폐기물을 재활용하는 자의 준수사항) — answer + tags 일괄 적용
// 별표5와 동일한 태그 스키마 사용
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표5의4_재활용자준수사항.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

// 재활용 공통 베이스 태그 (별표5의4 전체가 재활용 행위 한정)
// - 재활용업(W01-IR/CR/FR), 재활용 신고(W02-RREC), 재활용시설 설치(W03-DP, W05-DP)
const RCY_BASE = {
  category: ['W01', 'W02', 'W03', 'W05'],
  bizType: ['IR', 'CR', 'FR', 'RREC', 'DP'],
  wasteClass: null,
  action: ['RCY'],
  rCode: null,
  facilityType: null,
};

// IDX → { answer, tags, noWord? } 매핑
const M = {};

// IDX:0 — title
M[0] = { answer: '', tags: null, noWord: true };

// IDX:1 — "1. 폐기물의 재활용에 따른 오염예방 및 저감방법의 종류와 정도" (섹션 헤더)
M[1] = { answer: '', tags: null };

// IDX:2 — "가. 오염예방 및 저감방법" (서브섹션 헤더)
M[2] = { answer: '', tags: null };

// IDX:3 — "1) ... 다음의 방법으로 처리하거나 방지시설을 설치ㆍ운영하여 ..." (가)~라) 부모)
M[3] = {
  answer: '재활용 과정에서 발생하는 오염물질(대기·소음·진동·수질·악취·침출수·토양오염물질)에 대해 해당 배출시설이 설치된 경우 아래의 방법으로 처리하거나 방지시설을 설치·운영하여 사람과 환경에 위해가 발생하지 않도록 하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:4 — "가) 대기오염물질"
M[4] = {
  answer: {
    applicable: '{대기오염방지시설}을 설치·운영하여 대기오염물질을 처리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '대기오염물질발생',
  tags: { ...RCY_BASE, facilityVars: { 대기오염방지시설: [] } },
};

// IDX:5 — "나) 소음ㆍ진동"
M[5] = {
  answer: {
    applicable: '{소음진동방지시설}을 설치·운영하여 소음·진동을 처리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '소음진동발생',
  tags: { ...RCY_BASE, facilityVars: { 소음진동방지시설: [] } },
};

// IDX:6 — "다) 수질오염물질"
M[6] = {
  answer: {
    applicable: '{수질오염방지시설}을 설치·운영하여 수질오염물질을 처리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '수질오염물질발생',
  tags: { ...RCY_BASE, facilityVars: { 수질오염방지시설: [] } },
};

// IDX:7 — "라) 악취"
M[7] = {
  answer: {
    applicable: '악취방지계획을 수립하고 {악취방지시설}을 설치·운영하여 악취를 처리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '악취발생',
  tags: { ...RCY_BASE, facilityVars: { 악취방지시설: [] } },
};

// IDX:8 — "마) 침출수" (매체접촉형 R6/R7 관련 가능성)
M[8] = {
  answer: {
    applicable: '{침출수처리시설}을 설치·운영하여 침출수를 처리하겠음. 폐기물을 토양 등에 접촉시켜 성토재 등으로 재활용하는 경우에는 시험·분석을 통해 침출수의 오염물질 함유 여부를 확인한 후 고화·고형화·안정화 등의 방법으로 처리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '침출수발생',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'], facilityVars: { 침출수처리시설: [] } },
};

// IDX:9 — "바) 토양오염물질" (매체접촉형 한정)
M[9] = {
  answer: {
    applicable: '{토양오염방지시설}을 설치·운영하여 토양오염물질을 처리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '토양오염물질발생',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'], facilityVars: { 토양오염방지시설: [] } },
};

// IDX:10 — "사) 그 밖에 환경부장관 인정 방법"
M[10] = {
  answer: '그 밖에 기후에너지환경부장관이 폐기물 재활용에 따른 오염예방 및 저감을 위하여 필요하다고 인정하는 방법이 있을 경우 해당 방법으로 처리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:11 — "2) 시·도지사 등의 추가조치 명령"
M[11] = {
  answer: '상수원보호구역 수질 악화, 환경기준·토양오염 우려기준 준수 곤란 등의 사유로 시·도지사, 시장·군수·구청장 또는 지방환경관서의 장이 추가 오염예방·저감조치를 명할 경우 해당 조치를 이행하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:12 — "나. 오염예방 및 저감의 정도" (서브섹션 헤더)
M[12] = { answer: '', tags: null };

// IDX:13 — "1) 대기오염물질 배출허용기준"
M[13] = {
  answer: {
    applicable: '{대기오염방지시설}을 설치·운영하여 대기오염물질이 배출허용기준 이내로 배출되도록 관리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '대기오염물질발생',
  tags: { ...RCY_BASE, facilityVars: { 대기오염방지시설: [] } },
};

// IDX:14 — "2) 소음ㆍ진동 배출허용기준"
M[14] = {
  answer: {
    applicable: '{소음진동방지시설}을 설치·운영하여 소음·진동이 공장소음·진동 배출허용기준 및 생활소음·진동 규제기준 이내로 관리되도록 하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '소음진동발생',
  tags: { ...RCY_BASE, facilityVars: { 소음진동방지시설: [] } },
};

// IDX:15 — "3) 수질오염물질 배출허용기준"
M[15] = {
  answer: {
    applicable: '{수질오염방지시설}을 설치·운영하여 수질오염물질이 배출허용기준 이내로 배출되도록 관리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '수질오염물질발생',
  tags: { ...RCY_BASE, facilityVars: { 수질오염방지시설: [] } },
};

// IDX:16 — "4) 악취 배출허용기준"
M[16] = {
  answer: {
    applicable: '{악취방지시설}을 설치·운영하여 악취가 배출허용기준 이내로 관리되도록 하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '악취발생',
  tags: { ...RCY_BASE, facilityVars: { 악취방지시설: [] } },
};

// IDX:17 — "5) 침출수 배출허용기준"
M[17] = {
  answer: {
    applicable: '{침출수처리시설}을 설치·운영하여 침출수가 배출허용기준 이내로 처리·배출되도록 관리하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '침출수발생',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'], facilityVars: { 침출수처리시설: [] } },
};

// IDX:18 — "6) 토양오염물질 우려기준"
M[18] = {
  answer: {
    applicable: '{토양오염방지시설}을 설치·운영하여 토양오염물질이 지역별 토양오염우려기준 이내로 관리되도록 하겠음.',
    notApplicable: '해당사항 없음.',
  },
  applicabilityFlag: '토양오염물질발생',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'], facilityVars: { 토양오염방지시설: [] } },
};

// IDX:19 — "2. 폐기물 재활용에 따른 취급기준과 방법" (섹션 헤더)
M[19] = { answer: '', tags: null };

// IDX:20 — "가. 공통사항" (서브섹션 헤더)
M[20] = { answer: '', tags: null };

// IDX:21 — "1) 유해폐기물 보관·저장·취급 장소 바닥 포장, 유출방지장치 설치"
M[21] = {
  answer: '영 별표 4의2 제3호에 따라 기후에너지환경부장관이 정하여 고시하는 폐기물의 유해특성 허용기준을 초과하는 폐기물(유해폐기물)을 재활용하는 경우, 보관·저장·취급 또는 사용 장소에 바닥 포장 및 유출방지장치를 설치하여 폐기물이 지하 침투하거나 주변 지역으로 유출·누출되지 않도록 하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:22 — "2) 분말·미립자 형태 / 액체 폐기물은 적절한 용기에 보관"
M[22] = {
  answer: '분말·미립자 형태의 고상 또는 액체상태인 폐기물은 비산되거나 외부로 유출·누출되지 않도록 적절한 용기, 탱크 또는 상자(벌크백 포함)에 넣어 보관하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:23 — "3) 유해폐기물 탱크/용기 재질·두께·유지관리"
M[23] = {
  answer: '재활용 대상 유해폐기물을 탱크나 용기에 보관하는 경우 폐기물 성상에 적합한 재질·두께·구조의 탱크·용기를 사용하고, 부식·손상·노후화되지 않도록 유지·관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:24 — "4) 유해폐기물 분리보관 + 표지판"
M[24] = {
  answer: '재활용 대상 유해폐기물은 유해특성별로 구분하여 별도의 분리된 장소에 보관하고, 폐기물의 종류·유해특성·취급 시 주의사항을 기재한 표지판을 보관장소에 설치하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:25 — "5) 유해폐기물 화재·폭발·유해가스 사고예방"
M[25] = {
  answer: '유해폐기물은 보관 및 재활용 과정에서 화재·폭발, 유해가스 발생 등의 사고를 예방하기 위해 화기·물 등과 접촉되지 않도록 관리하고, 유해가스가 발생할 경우 이를 중화·배출할 수 있는 시설·장치를 갖추겠음.',
  tags: { ...RCY_BASE },
};

// IDX:26 — "6) 사전분석·확인 결과 배출자 통보"
M[26] = {
  answer: '별표 4의3 비고 제3호에 따라 별표 5의3에 따른 폐기물의 구체적 재활용 기준에 따라 재활용 가능 여부를 사전 분석·확인하는 경우, 그 결과를 배출자(생활폐기물배출자 제외)에게 통보하여 배출자가 재활용 기준 준수 여부를 확인할 수 있도록 하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:27 — "나. 개별사항" (서브섹션 헤더)
M[27] = { answer: '', tags: null };

// IDX:28 — "1) 폭발성"
M[28] = {
  answer: '폭발성이 있는 폐기물은 소량으로 분리·보관하고 다른 폐기물이나 산화제와 혼합·접촉되지 않도록 하겠으며, 불티·불꽃·정전기·고온체와의 접근이나 충격·마찰을 피하고 보관·취급·사용 장소가 폭발 유발 온도 이상으로 과열되지 않도록 관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:29 — "2) 인화성"
M[29] = {
  answer: '인화성이 있는 폐기물은 불티·불꽃·정전기·고온체와의 접근이나 충격·마찰을 피하고, 보관·취급·사용 장소가 화재 유발 온도 이상으로 과열되지 않도록 관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:30 — "3) 자연발화성"
M[30] = {
  answer: '자연발화성이 있는 폐기물은 불티·불꽃·정전기·고온체 등 발화유발 가능 물질 및 공기와의 접촉을 피하고, 직사광선에 직접 노출되지 않도록 보관·관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:31 — "4) 금수성"
M[31] = {
  answer: '금수성이 있는 폐기물은 밀폐된 용기에 보관하는 등 물이나 증기와 접촉되지 않도록 관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:32 — "5) 산화성"
M[32] = {
  answer: '산화성이 있는 폐기물은 가연물 또는 분해를 촉진하는 물질과 접촉·혼합되지 않도록 하고, 과열·충격·마찰 등이 발생되지 않도록 관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:33 — "6) 용출독성/생태독성"
M[33] = {
  answer: '용출독성 또는 생태독성이 있는 폐기물은 유해물질이 누출·유출 또는 비산되지 않도록 별도의 용기 등에 담아 보관하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:34 — "7) 부식성"
M[34] = {
  answer: '부식성이 있는 폐기물은 내부식성을 갖는 용기에 보관하고, 누출·유출 또는 비산되지 않도록 관리하겠음.',
  tags: { ...RCY_BASE },
};

// IDX:35 — "8) 매체접촉형 재활용 ... 다음의 사항을 준수" (가)~바) 부모)
M[35] = {
  answer: '매체접촉형 재활용(R6 토질개선·R7 토목재활용)의 경우 아래의 사항을 준수하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:36 — "가) 이물질 분리·제거 후 반입"
M[36] = {
  answer: '대상폐기물과 재활용할 수 없는 다른 폐기물이나 이물질 등을 혼합하여 재활용 대상 부지에 반입하지 않겠으며, 재활용 전에 이물질 등을 최대한 분리·제거하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:37 — "나) 일반 토사 혼합 시 안전 장소"
M[37] = {
  answer: '혼합이 필요한 경우에는 지형 여건, 환경 위해성, 공사 안전성 등을 종합적으로 고려하여 일반 토사류 등과 혼합 사용하겠으며, 폐기물 비산이나 유·누출 등 오염·피해가 발생하지 않는 장소에서 혼합하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:38 — "다) 침출수 2차오염 방지 + 지반 안정성"
M[38] = {
  answer: '재활용 과정 또는 재활용 후 침출수로 인한 2차 환경오염이 발생하지 않도록 하고, 재활용 이후 지반의 안정성이 유지되며 재활용 대상 폐기물 또는 폐기물·토양 혼합물이 유실되지 않도록 관리하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:39 — "라) 사업부지 보관 시 비산·누유출 방지"
M[39] = {
  answer: '재활용 대상 폐기물을 사업 부지 등에 보관할 경우 비산, 누·유출 등이 발생하지 않는 장소를 선정하여 보관하겠으며, 바닥포장·덮개설치 등을 통해 폐기물의 비산·누·유출 등을 방지하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:40 — "마) 중성수준 조정 시 부산물 영향 검토"
M[40] = {
  answer: '수소이온농도를 중성수준으로 낮추기 위한 선별·파쇄·혼합·중화 등의 재활용과정에서 새로운 부산물이 생성되는 경우, 대상 폐기물과 부산물이 환경에 미치는 영향 등을 검토하여 오염 영향이 없도록 혼합·중화하여 사용하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:41 — "바) 고화처리물 양생기간"
M[41] = {
  answer: '고화제 등을 혼합하여 처리한 고화처리물을 사용하는 경우, 혼합된 고화처리물의 건조·양생 등 안정화 기간을 거친 후 사용하겠음.',
  tags: { ...RCY_BASE, rCode: ['R6', 'R7'] },
};

// IDX:42 — "3. 환경부장관 추가 고시 가능"
M[42] = {
  answer: '기후에너지환경부장관이 폐기물 재활용과정에서 오염예방 및 방지를 위하여 별도로 고시하는 구체적 준수사항이 있을 경우 해당 사항을 준수하겠음.',
  tags: { ...RCY_BASE },
};

// 적용
let applied = 0;
let conditional = 0;
items.forEach((it, i) => {
  const m = M[i];
  if (!m) {
    console.warn(`경고: IDX:${i} 매핑 없음 — 빈 answer/null tags 적용`);
    it.answer = '';
    it.tags = null;
    return;
  }
  it.answer = m.answer;
  it.tags = m.tags;
  if (m.noWord) it.noWord = true;
  if (m.applicabilityFlag) {
    it.applicabilityFlag = m.applicabilityFlag;
    conditional++;
  }
  applied++;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`적용 완료: ${applied}/${items.length}개 항목`);
console.log(`섹션 헤더: ${items.filter(it => it.tags === null && !it.noWord).length}`);
console.log(`내용 항목: ${items.filter(it => it.tags && typeof it.tags === 'object').length}`);
console.log(`조건부 답변(applicabilityFlag): ${conditional}`);
