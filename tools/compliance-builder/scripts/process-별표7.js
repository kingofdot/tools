// 별표7 (폐기물처리업의 시설·장비·기술능력의 기준) — answer + tags 일괄 적용
// 업종(수집운반/중간처분/최종처분/종합처분/재활용) × 폐기물대분류(L/GN/GO/D-의료/D-비의료) × 세부분류(폐오일필터/폐유/폐가전 등)별 세분 태깅
// 답변은 시설/장비 spec 그대로 (서술 없이)
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표7_처리업시설장비기술능력기준.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

// ===== 기본 베이스 (W01 처리업 한정) =====
const COMMON = { category: ['W01'], wasteClass: null, wasteCode: null, action: null, rCode: null, facilityType: null };

// 수집운반업
const TR  = { ...COMMON, bizType: ['TR'], action: ['CT'] };
// 중간처분업
const ID  = { ...COMMON, bizType: ['ID'], action: ['MI'] };
// 최종처분업
const FD  = { ...COMMON, bizType: ['FD'], action: ['FI'] };
// 종합처분업 = 중간 + 최종
const CD  = { ...COMMON, bizType: ['ID', 'FD'], action: ['MI', 'FI'] };
// 재활용업 (중간/최종/종합)
const RCY = { ...COMMON, bizType: ['IR', 'CR', 'FR'], action: ['RCY'] };
// 처리업 전체 (비고용)
const ALL = { ...COMMON, bizType: ['TR', 'ID', 'FD', 'IR', 'CR', 'FR'], action: ['CT', 'MI', 'FI', 'RCY'] };

// 지정폐기물 코드 (의료 10 제외)
const D_NOMED = ['01','02','03','04','05','06','07','08','09','11'];

// ===== 업종 × 폐기물 분류 =====
// 1. 수집·운반업
const TR_LGN     = { ...TR, wasteClass: ['L', 'GN'] };                            // 1.가. 생활/사업장비배출시설계
const TR_GO      = { ...TR, wasteClass: ['GO'] };                                  // 1.나. 사업장배출시설계
const TR_D_NOMED = { ...TR, wasteClass: ['D'], wasteCode: D_NOMED };               // 1.다. 지정(의료 제외)
const TR_MED     = { ...TR, wasteClass: ['D'], wasteCode: ['10'] };                // 1.라. 의료폐기물

// 2. 중간처분업
const ID_NOTD    = { ...ID, wasteClass: ['L', 'GN', 'GO'] };                       // 2.가. 지정 외(건설 제외)
const ID_D_NOMED = { ...ID, wasteClass: ['D'], wasteCode: D_NOMED };               // 2.나. 지정(의료 제외)
const ID_MED     = { ...ID, wasteClass: ['D'], wasteCode: ['10'] };                // 2.다. 의료

// 3. 최종처분업
const FD_NOTD    = { ...FD, wasteClass: ['L', 'GN', 'GO'] };                       // 3.가. 지정 외
const FD_D       = { ...FD, wasteClass: ['D'] };                                    // 3.나. 지정

// 4. 종합처분업 → 모든 폐기물 + 모든 처분
const CD_ALL     = { ...CD, wasteClass: ['L', 'GN', 'GO', 'D'] };

// 5. 재활용업
const RCY_NOTD     = { ...RCY, wasteClass: ['L', 'GN', 'GO'] };                    // 5.가. 지정 외(건설 제외)
const RCY_D_NOMED  = { ...RCY, wasteClass: ['D'], wasteCode: D_NOMED };            // 5.나. 지정(의료 제외)
const RCY_MED      = { ...RCY, wasteClass: ['D'], wasteCode: ['10'] };             // 5.다. 의료

// 5.가.2) 세부 재활용 대상별
const RCY_ANIMAL    = { ...RCY_NOTD, wasteCode: ['51-17', '91-16'] };              // 동물성 잔재물
const RCY_APPLIANCE = { ...RCY_NOTD, wasteCode: ['51-18', '91-09'] };              // 폐가전제품
const RCY_ENERGY    = { ...RCY_NOTD, rCode: ['R8'] };                              // 소각열회수 → R8
const RCY_EVBAT     = { ...RCY_NOTD, wasteCode: ['51-41'] };                       // 전기차 폐이차전지

// 5.나.2) 지정폐기물 세부 재활용 대상별
const RCY_OILFILTER = { ...RCY_D_NOMED, wasteCode: ['06'] };                       // 폐오일필터 → 06 폐유 계열
const RCY_OIL       = { ...RCY_D_NOMED, wasteCode: ['06'] };                       // 폐유
const RCY_SOLVENT   = { ...RCY_D_NOMED, wasteCode: ['04'] };                       // 폐유기용제
const RCY_MERCURY   = { ...RCY_D_NOMED, wasteCode: ['11'] };                       // 수은폐기물

const M = {};

// ===== IDX:0 — 별표 제목 =====
M[0] = { answer: '', tags: null, noWord: true };

// ===== 1. 폐기물수집·운반업의 기준 =====
M[1] = { answer: '', tags: null }; // 1. 헤더

// 1.가. 생활/사업장비배출시설계
M[2] = { answer: '', tags: null };
M[3] = { answer: '', tags: null }; // 1) 장비
M[4] = { answer: '밀폐형 압축·압착차량 1대(특별시·광역시는 2대) 이상', tags: { ...TR_LGN } };
M[5] = { answer: '밀폐형 차량 또는 밀폐형 덮개 설치차량 1대 이상(적재능력 합계 4.5톤 이상)', tags: { ...TR_LGN } };
M[6] = { answer: '섭씨 4도 이하의 냉장 적재함이 설치된 차량 1대 이상', tags: { ...TR_LGN, wasteCode: ['51-46'] } }; // 의료기관 일회용기저귀
M[7] = { answer: '연락장소 또는 사무실', tags: { ...TR_LGN } };

// 1.나. 사업장배출시설계
M[8] = { answer: '', tags: null };
M[9] = { answer: '', tags: null };
M[10] = { answer: '액체상태 폐기물: 탱크로리 1대 이상, 밀폐형 차량 1대 이상', tags: { ...TR_GO, physicalState: ['L'] } };
M[11] = { answer: '고체상태 폐기물: 밀폐형 차량 또는 밀폐형 덮개 설치차량 2대 이상', tags: { ...TR_GO, physicalState: ['S'] } };
M[12] = { answer: '연락장소 또는 사무실', tags: { ...TR_GO } };

// 1.다. 지정폐기물(의료 제외)
M[13] = { answer: '', tags: null };
M[14] = { answer: '', tags: null };
M[15] = { answer: '액체상태 폐기물: 탱크로리 1대 이상, 밀폐형 차량 1대 이상(적재능력 합계 9톤 이상)', tags: { ...TR_D_NOMED, physicalState: ['L'] } };
M[16] = { answer: '고체상태 폐기물: 밀폐형 차량 2대 이상, 밀폐형 덮개 설치차량 1대 이상(적재능력 합계 13.5톤 이상)', tags: { ...TR_D_NOMED, physicalState: ['S'] } };
M[17] = { answer: '', tags: null };
M[18] = { answer: '주차장: 모든 차량을 주차할 수 있는 규모', tags: { ...TR_D_NOMED } };
M[19] = { answer: '세차시설: 20제곱미터 이상', tags: { ...TR_D_NOMED } };
M[20] = { answer: '기술능력: 폐기물처리산업기사·대기환경산업기사·수질환경산업기사 또는 공업화학산업기사 중 1명 이상', tags: { ...TR_D_NOMED } };
M[21] = { answer: '연락장소 또는 사무실', tags: { ...TR_D_NOMED } };

// 1.라. 의료폐기물
M[22] = { answer: '', tags: null };
M[23] = { answer: '', tags: null };
M[24] = { answer: '적재능력 0.45톤 이상의 냉장차량(섭씨 4도 이하) 3대 이상', tags: { ...TR_MED } };
M[25] = { answer: '약물소독장비 1식 이상', tags: { ...TR_MED } };
M[26] = { answer: '주차장: 모든 차량을 주차할 수 있는 규모', tags: { ...TR_MED } };
M[27] = { answer: '연락장소 또는 사무실', tags: { ...TR_MED } };

// ===== 2. 폐기물 중간처분업의 기준 =====
M[28] = { answer: '', tags: null };

// 2.가. 지정 외(건설 제외)
M[29] = { answer: '', tags: null };

// 2.가.1) 소각전문
M[30] = { answer: '', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };
M[31] = { answer: '실험실', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };
M[32] = { answer: '', tags: null };
M[33] = { answer: '소각시설: 시간당 처분능력 2톤 이상', tags: { ...ID_NOTD, facilityType: ['INC_G'] } };
M[34] = { answer: '보관시설: 1일 처분능력의 10일분 이상 30일분 이하', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };
M[35] = { answer: '계량시설 1식 이상', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };
M[36] = { answer: '배출가스 오염물질(아황산가스·염화수소·질소산화물·일산화탄소·분진) 측정·분석 실험기기', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };
M[37] = { answer: '수집·운반차량(밀폐형 또는 밀폐형 덮개 설치차량) 1대 이상(자체 수집·운반 시)', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };
M[38] = { answer: '기술능력: 폐기물처리산업기사 또는 대기환경산업기사 중 1명 이상', tags: { ...ID_NOTD, facilityType: ['INC_G', 'INC_H', 'INC_P', 'INC_F', 'INC_C', 'INC_R'] } };

// 2.가.2) 기계적 처분전문
M[39] = { answer: '', tags: { ...ID_NOTD, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'MCD_EVP', 'MCD_PUR', 'MCD_OWS', 'MCD_DRY'] } };
M[40] = { answer: '', tags: null };
M[41] = { answer: '처분시설: 시간당 처분능력 200킬로그램 이상', tags: { ...ID_NOTD, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'MCD_EVP', 'MCD_PUR', 'MCD_OWS', 'MCD_DRY'] } };
M[42] = { answer: '보관시설: 1일 처분능력의 10일분 이상 30일분 이하', tags: { ...ID_NOTD, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'MCD_EVP', 'MCD_PUR', 'MCD_OWS', 'MCD_DRY'] } };
M[43] = { answer: '계량시설 1식 이상', tags: { ...ID_NOTD, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'MCD_EVP', 'MCD_PUR', 'MCD_OWS', 'MCD_DRY'] } };
M[44] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...ID_NOTD, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'MCD_EVP', 'MCD_PUR', 'MCD_OWS', 'MCD_DRY'] } };
M[45] = { answer: '기술능력: 폐기물처리산업기사·대기환경산업기사·수질환경산업기사·소음진동산업기사 또는 환경기능사 중 1명 이상', tags: { ...ID_NOTD, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'MCD_EVP', 'MCD_PUR', 'MCD_OWS', 'MCD_DRY'] } };

// 2.가.3) 화학적 또는 생물학적 처분전문
M[46] = { answer: '', tags: { ...ID_NOTD, facilityType: ['CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };
M[47] = { answer: '', tags: null };
M[48] = { answer: '처분시설: 1일 처분능력 5톤 이상', tags: { ...ID_NOTD, facilityType: ['CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };
M[49] = { answer: '보관시설: 1일 처분능력의 10일분 이상 30일분 이하(즉시 처분하는 생물학적 처분시설은 면제 가능)', tags: { ...ID_NOTD, facilityType: ['CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };
M[50] = { answer: '계량시설 1식 이상', tags: { ...ID_NOTD, facilityType: ['CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };
M[51] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...ID_NOTD, facilityType: ['CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };
M[52] = { answer: '기술능력: 폐기물처리산업기사·대기환경산업기사·수질환경산업기사 또는 공업화학산업기사 중 1명 이상', tags: { ...ID_NOTD, facilityType: ['CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };

// 2.나. 지정폐기물(의료 제외) 중간처분
M[53] = { answer: '', tags: null };
M[54] = { answer: '', tags: null };
M[55] = { answer: '', tags: null };
M[56] = { answer: '실험실', tags: { ...ID_D_NOMED } };
M[57] = { answer: '실험기기: 수소이온농도·BOD·COD·SS 및 별표1 유해물질(용출시험) 측정·분석 가능', tags: { ...ID_D_NOMED } };
M[58] = { answer: '보관시설: 1일 처분능력의 10일분 이상 30일분 이하의 보관창고', tags: { ...ID_D_NOMED } };
M[59] = { answer: '주차장: 모든 차량을 주차할 수 있는 규모(자체 수집·운반 시)', tags: { ...ID_D_NOMED } };
M[60] = { answer: '세차시설: 20제곱미터 이상', tags: { ...ID_D_NOMED } };
M[61] = { answer: '계량시설 1식 이상', tags: { ...ID_D_NOMED } };
M[62] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...ID_D_NOMED } };
M[63] = { answer: '', tags: null };
M[64] = { answer: '고온소각·고온용융 처분대상폐기물: 시간당 처분능력 200킬로그램 이상의 고온소각시설 또는 고온용융시설', tags: { ...ID_D_NOMED, facilityType: ['INC_H', 'INC_F'] } };
M[65] = { answer: '일반소각대상폐기물: 시간당 처분능력 2톤 이상의 소각시설', tags: { ...ID_D_NOMED, facilityType: ['INC_G'] } };
M[66] = { answer: '기계적·화학적·생물학적 처분대상폐기물: 1일 처분능력 5톤 이상의 시설', tags: { ...ID_D_NOMED, facilityType: ['MCD_CMP', 'MCD_SHR', 'MCD_CUT', 'MCD_MLT', 'CCD_SOL', 'CCD_RXN', 'CCD_CGP', 'BCD_SMZ', 'BCD_BIO'] } };
M[67] = { answer: '기술능력: 폐기물처리기사·대기환경기사·수질환경기사 또는 화공기사 중 1명 이상', tags: { ...ID_D_NOMED } };

// 2.다. 의료폐기물 중간처분
M[68] = { answer: '', tags: null };
M[69] = { answer: '', tags: null };
M[70] = { answer: '', tags: null };
M[71] = { answer: '보관창고 및 냉장시설: 1일 처분능력의 3일분 이상 5일분 이하의 보관창고 및 냉장시설', tags: { ...ID_MED } };
M[72] = { answer: '주차장: 모든 차량을 주차할 수 있는 규모(자체 수집·운반 시)', tags: { ...ID_MED } };
M[73] = { answer: '소독시설', tags: { ...ID_MED } };
M[74] = { answer: '수집·운반차량: 적재능력 0.45톤 이상의 냉장차량 1대 이상(자체 수집·운반 시)', tags: { ...ID_MED } };
M[75] = { answer: '개별시설: 시간당 처분능력 2톤 이상의 소각시설', tags: { ...ID_MED, facilityType: ['INC_G'] } };
M[76] = { answer: '기술능력: 폐기물처리산업기사·임상병리사 또는 위생사 중 1명 이상', tags: { ...ID_MED } };

// ===== 3. 폐기물 최종처분업의 기준 =====
M[77] = { answer: '', tags: null };

// 3.가. 지정 외
M[78] = { answer: '', tags: null };
M[79] = { answer: '실험실', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[80] = { answer: '', tags: null };
M[81] = { answer: '면적 3천3백제곱미터 이상 또는 매립가능용적 1만세제곱미터 이상의 매립시설', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[82] = { answer: '별표 11에 따른 침출수배출허용기준 항목 측정·분석 실험기기', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[83] = { answer: '바켓용량 0.6세제곱미터 이상으로서 다짐작업이 가능한 굴착기 1대 이상', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[84] = { answer: '세차시설: 30제곱미터 이상', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[85] = { answer: '수집·운반차량의 계량시설 1식 이상', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[86] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...FD_NOTD, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[87] = { answer: '', tags: null };
M[88] = { answer: '폐기물처리산업기사 또는 수질환경산업기사 중 1명 이상', tags: { ...FD_NOTD } };
M[89] = { answer: '토목산업기사 또는 폐기물처리산업기사 중 1명 이상', tags: { ...FD_NOTD } };

// 3.나. 지정폐기물 최종처분
M[90] = { answer: '', tags: null };
M[91] = { answer: '실험실', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[92] = { answer: '실험기기·기구: 별표 11에 따른 침출수 배출허용기준 항목 측정·분석 실험기기', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[93] = { answer: '', tags: null };
M[94] = { answer: '면적 1만제곱미터 이상 또는 매립가능용적 3만세제곱미터 이상의 매립시설', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[95] = { answer: '주차장: 모든 차량을 주차할 수 있는 규모(자체 수집·운반 시)', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[96] = { answer: '세차시설: 30제곱미터 이상', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[97] = { answer: '수집·운반차량의 계량시설 1식 이상', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[98] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[99] = { answer: '바켓용량 0.6세제곱미터 이상으로서 다짐작업이 가능한 굴착기 1대 이상', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[100] = { answer: '레벨·표척 등 매립고 측정기기 1식 이상', tags: { ...FD_D, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[101] = { answer: '', tags: null };
M[102] = { answer: '폐기물처리산업기사·수질환경산업기사 또는 화공기사 중 1명 이상', tags: { ...FD_D } };
M[103] = { answer: '폐기물처리기사 1명 이상', tags: { ...FD_D } };

// ===== 4. 폐기물 종합처분업의 기준 =====
M[104] = { answer: '', tags: null };
M[105] = { answer: '실험실', tags: { ...CD_ALL } };
M[106] = { answer: '실험기기·기구: 중간처분 및 최종처분 시 갖추어야 할 실험기기 및 기구', tags: { ...CD_ALL } };
M[107] = { answer: '', tags: null };
M[108] = { answer: '바켓용량 0.6세제곱미터 이상으로서 다짐작업이 가능한 굴착기 1대 이상', tags: { ...CD_ALL, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[109] = { answer: '레벨·표척 등 매립고 측정기기 1식 이상', tags: { ...CD_ALL, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[110] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...CD_ALL } };
M[111] = { answer: '', tags: null };
M[112] = { answer: '보관시설: 1일 처분능력 10일분 이상 30일분 이하의 폐기물 보관 규모', tags: { ...CD_ALL } };
M[113] = { answer: '주차장: 모든 차량을 주차할 수 있는 규모(자체 수집·운반 시)', tags: { ...CD_ALL } };
M[114] = { answer: '세차시설: 30제곱미터 이상', tags: { ...CD_ALL } };
M[115] = { answer: '수집·운반차량의 계량시설 1식 이상', tags: { ...CD_ALL } };
M[116] = { answer: '1일 처분능력 500톤 이상인 파쇄시설(건설폐기물·불연성 폐기물) 또는 압축시설', tags: { ...CD_ALL, facilityType: ['MCD_SHR', 'MCD_CMP'] } };
M[117] = { answer: '시간당 처분능력 2톤 이상인 소각시설', tags: { ...CD_ALL, facilityType: ['INC_G'] } };
M[118] = { answer: '1일 처분능력 5톤 이상인 고형화·고화 또는 안정화 시설', tags: { ...CD_ALL, facilityType: ['CCD_SOL'] } };
M[119] = { answer: '1일 처분능력 5톤 이상인 반응·증발·농축·응집·침전시설 등의 화학적 처분시설', tags: { ...CD_ALL, facilityType: ['CCD_RXN', 'CCD_CGP', 'MCD_EVP'] } };
M[120] = { answer: '면적 1만제곱미터 이상 또는 매립가능용적 3만세제곱미터 이상의 매립시설', tags: { ...CD_ALL, facilityType: ['LF_MGD', 'LF_BLK'] } };
M[121] = { answer: '', tags: null };
M[122] = { answer: '폐기물처리기사·대기환경기사·수질환경기사 또는 토목기사 중 1명 이상', tags: { ...CD_ALL } };
M[123] = { answer: '폐기물처리산업기사·대기환경산업기사·수질환경산업기사 또는 공업화학산업기사 중 2명 이상', tags: { ...CD_ALL } };

// ===== 5. 재활용업의 기준 =====
M[124] = { answer: '', tags: null };

// 5.가. 지정 외(건설 제외) 재활용
M[125] = { answer: '', tags: null };

// 5.가.1) 공통기준
M[126] = { answer: '', tags: null };
M[127] = { answer: '', tags: null };
M[128] = { answer: '', tags: null }; // (1) 보관시설 (헤더)
M[129] = { answer: '음식물류 폐기물 및 동물성 잔재물: 1일 재활용능력의 1일분 이상 30일분 이하 보관시설', tags: { ...RCY_NOTD, wasteCode: ['51-17', '51-38', '91-02', '91-16'] } };
M[130] = { answer: '제31조제1항제3호 폐기물(폐목재·폐촉매·합성수지재질 폐김발장 제외): 1일 재활용능력의 10일분 이상 60일분 이하 보관시설', tags: { ...RCY_NOTD } };
M[131] = { answer: '폐목재·폐촉매·합성수지재질 폐김발장·석탄재·리튬이차전지·전기자동차 폐이차전지·태양광 폐패널 또는 수입 폐기물(별표4의2 제2호 가목1)·2)·나목1)·2) 유형): 1일 재활용능력의 10일분 이상 180일분 이하 보관시설', tags: { ...RCY_NOTD, wasteCode: ['51-20', '51-10', '51-41'] } };
M[132] = { answer: '그 밖의 경우: 1일 재활용능력의 10일분 이상 30일분 이하 보관시설', tags: { ...RCY_NOTD } };
M[133] = { answer: '재활용시설 1식 이상', tags: { ...RCY_NOTD } };
M[134] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시. 동일 법인·개인의 둘 이상 사업장에서 동일 폐기물 재활용 시 사업장별 1대 외에는 공동 사용 가능)', tags: { ...RCY_NOTD } };
M[135] = { answer: '', tags: null };
M[136] = { answer: '폐기물처리산업기사·대기환경산업기사·수질환경산업기사·공업화학산업기사 또는 환경기능사 중 1명 이상(소각열회수시설로 에너지 회수 시: 폐기물처리산업기사 또는 대기환경산업기사 중 1명 이상)', tags: { ...RCY_NOTD } };
M[137] = { answer: '아래 (가)~(다) 중 해당하는 경우 사업장 재활용업무 종사 기술요원 임명자 1명 이상으로 대체 가능함을 숙지하겠음.', tags: { ...RCY_NOTD } };
M[138] = { answer: '기계적 재활용시설(압축·압출·성형·주조·파쇄·분쇄·탈피·절단·탈수·건조 시설 또는 폐합성수지 용융시설) 1일 재활용 용량 50톤 미만(폐목재는 100톤 미만)', tags: { ...RCY_NOTD, facilityType: ['MCR_CMP', 'MCR_SHR', 'MCR_CUT', 'MCR_MLT', 'MCR_DRY'] } };
M[139] = { answer: '생물학적 재활용시설(사료화·퇴비화·부숙·부숙토·분변토 생산시설) 1일 재활용 용량 10톤 미만', tags: { ...RCY_NOTD, facilityType: ['BCR_DIG', 'BCR_FED', 'BCR_CPT', 'BCR_BSF', 'BCR_HMF'] } };
M[140] = { answer: '소성시설 또는 용해로 1일 재활용 용량 10톤 미만', tags: { ...RCY_NOTD, facilityType: ['CAL', 'SMT'] } };
M[141] = { answer: '전기자동차 폐이차전지 재활용 시: 그린전동자동차기사·전기기사·전기공사기사 또는 전기 관련 학사 후 해당분야 1년 이상 종사자 1명 이상', tags: { ...RCY_EVBAT } };

// 5.가.2) 재활용 대상 폐기물 및 방법에 따른 구체적 기준
M[142] = { answer: '', tags: null };

// 가) 동물성 잔재물
M[143] = { answer: '', tags: null };
M[144] = { answer: '', tags: null };
M[145] = { answer: '보관시설: 옥외 설치 시 폐기물전용 밀폐보관시설', tags: { ...RCY_ANIMAL } };
M[146] = { answer: '세차시설: 20제곱미터 이상', tags: { ...RCY_ANIMAL } };
M[147] = { answer: '', tags: null };
M[148] = { answer: '사료원료 재활용: 사료화시설 1식 이상', tags: { ...RCY_ANIMAL, rCode: ['R5'], facilityType: ['BCR_FED'] } };
M[149] = { answer: '', tags: null }; // (나) 유지로 재활용 (헤더, 표 다음)
M[150] = { answer: '', tags: { ...RCY_ANIMAL, rCode: ['R3', 'R4'], facilityType: ['SMT', 'MCR_PUR'] } }; // 표 (용해/분리/원심분리)

// 나) 폐가전제품
M[151] = { answer: '', tags: null };
M[152] = { answer: '', tags: null };
M[153] = { answer: '보관시설: 파쇄·분리 등 재활용 과정에서 발생되는 폐기물 보관 가능 시설(법 제13조 보관기준)', tags: { ...RCY_APPLIANCE } };
M[154] = { answer: '계량시설 1식 이상', tags: { ...RCY_APPLIANCE } };
M[155] = { answer: '', tags: null };

// (가) 냉장고/에어컨
M[156] = { answer: '', tags: { ...RCY_APPLIANCE, wasteCode: ['51-18'] } };
M[157] = { answer: '분리시설: 냉매물질과 폐유를 분리할 수 있는 시설(냉매물질 회수량 확인 장치 포함)', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_PUR'] } };
M[158] = { answer: '파쇄시설: 50밀리미터 이하로 파쇄 가능 시설', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_SHR'] } };
M[159] = { answer: '선별시설: 철과 비철을 90퍼센트 이상 선별 가능 시설', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_SRT'] } };
M[160] = { answer: '냉매물질 보관시설: 보관량 확인 장치 포함(냉장고·에어컨 함께 시 각각 보관)', tags: { ...RCY_APPLIANCE } };

// (나) 세탁기
M[161] = { answer: '', tags: { ...RCY_APPLIANCE } };
M[162] = { answer: '파쇄시설: 50밀리미터 이하로 파쇄 가능 시설', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_SHR'] } };

// (다) TV/모니터
M[163] = { answer: '', tags: { ...RCY_APPLIANCE } };
M[164] = { answer: '분리시설: 앞면·뒷면 유리 분리 시설(형광물질 회수 집진시설을 갖춘 밀폐시설)', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_PUR'] } };
M[165] = { answer: '형광물질 보관시설: 외부 유출 방지 밀폐용기', tags: { ...RCY_APPLIANCE } };

// (라) 휴대폰
M[166] = { answer: '', tags: { ...RCY_APPLIANCE } };
M[167] = { answer: '파쇄시설: 휴대폰·인쇄회로기판 등 재사용 불가 파쇄 시설', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_SHR'] } };

// (마) 프린터·복사기·팩시밀리
M[168] = { answer: '', tags: { ...RCY_APPLIANCE } };
M[169] = { answer: '분리시설: 카트리지 해체 시 토너물질 회수 집진설비 시설', tags: { ...RCY_APPLIANCE, facilityType: ['MCR_PUR'] } };

// 다) 소각열회수시설로 가연성 고형폐기물 에너지회수
M[170] = { answer: '', tags: null };
M[171] = { answer: '실험실(시간당 재활용능력 2톤 이상 소각열회수시설만)', tags: { ...RCY_ENERGY, facilityType: ['INC_R'] } };
M[172] = { answer: '', tags: null };
M[173] = { answer: '시간당 재활용능력 2톤 이상 소각열회수시설(종이류·섬유류·접착제 등 미오염 순수 목재류만 시 200kg 이상)', tags: { ...RCY_ENERGY, facilityType: ['INC_R'] } };
M[174] = { answer: '계량시설 1식 이상', tags: { ...RCY_ENERGY, facilityType: ['INC_R'] } };
M[175] = { answer: '배출가스 오염물질(아황산가스·염화수소·질소산화물·일산화탄소·분진) 측정·분석 실험기기(시간당 재활용능력 2톤 이상 소각열회수시설만)', tags: { ...RCY_ENERGY, facilityType: ['INC_R'] } };

// 라) 전기자동차 폐이차전지
M[176] = { answer: '', tags: null };
M[177] = { answer: '재사용 제품 제조용(팩/모듈/셀 단위 재구성): 잔존용량(SOC)·잔존수명(SOH) 측정 장비(정격출력 30kW 이상) 1식 이상', tags: { ...RCY_EVBAT, rCode: ['R1', 'R2'] } };
M[178] = { answer: '유가성 자원(코발트·리튬 등) 재활용: 폐이차전지 방전 장비 1식 이상(방전 완료된 전지만 처리 시 제외)', tags: { ...RCY_EVBAT, rCode: ['R3'] } };

// 5.나. 지정폐기물(의료 제외) 재활용
M[179] = { answer: '', tags: null };

// 5.나.1) 공통기준
M[180] = { answer: '', tags: null };
M[181] = { answer: '', tags: null };
M[182] = { answer: '', tags: null };
M[183] = { answer: '1일 재활용능력의 10일분 이상 30일분 이하의 보관시설(폐촉매·리튬이차전지 재활용은 10일분 이상 180일분 이하)', tags: { ...RCY_D_NOMED } };
M[184] = { answer: '폐오일필터 재활용: 새는 폐유 수거 가능 구조의 시설', tags: { ...RCY_OILFILTER } };
M[185] = { answer: '재활용시설 1식 이상', tags: { ...RCY_D_NOMED } };
M[186] = { answer: '수집·운반차량 1대 이상(자체 수집·운반 시)', tags: { ...RCY_D_NOMED } };
M[187] = { answer: '기술능력: 폐기물처리산업기사·대기환경산업기사·수질환경산업기사·공업화학산업기사 또는 환경기능사 중 1명 이상', tags: { ...RCY_D_NOMED } };

// 5.나.2) 구체적 기준
M[188] = { answer: '', tags: null };

// 가) 폐오일필터
M[189] = { answer: '', tags: null };
M[190] = { answer: '', tags: null };
M[191] = { answer: '파쇄시설: 시간당 재활용능력 200킬로그램 이상 1식 이상', tags: { ...RCY_OILFILTER, facilityType: ['MCR_SHR'] } };
M[192] = { answer: '압축시설: 폐종이를 11.25kW 이상으로 압축하여 폐유 분리 가능 시설 1식 이상', tags: { ...RCY_OILFILTER, facilityType: ['MCR_CMP'] } };
M[193] = { answer: '', tags: null };
M[194] = { answer: '증류시설: 내부용적 5.0세제곱미터 이상 시설 1식 이상', tags: { ...RCY_OILFILTER, facilityType: ['MCR_PUR'] } };
M[195] = { answer: '응축시설: 내부용적 합계 3.0제곱미터 이상', tags: { ...RCY_OILFILTER, facilityType: ['MCR_PUR'] } };

// 나) 폐유를 정제연료유로 재활용
M[196] = { answer: '', tags: null };
M[197] = { answer: '', tags: null };
M[198] = { answer: '유량계측시설: 보관시설별 각 1식 이상', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['CCR_PYR', 'MCR_PUR'] } };
M[199] = { answer: '폐유를 1일 20킬로리터 이상 재활용 가능 시설', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['CCR_PYR', 'MCR_PUR'] } };
M[200] = { answer: '', tags: null };
M[201] = { answer: '유량계측시설: 보관시설별 각 1식 이상', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['CCR_RXN'] } };
M[202] = { answer: '폐유 1일 20킬로리터 이상 재활용 시설(아래 표 기준 적합)', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['CCR_RXN'] } };
M[203] = { answer: '', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['CCR_RXN'] } }; // 표
M[204] = { answer: '', tags: null };
M[205] = { answer: '유량계측시설: 보관시설별 각 1식 이상', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['MCR_PUR'] } };
M[206] = { answer: '폐유 1일 20킬로리터 이상 재활용 시설(약품정제·감압증류·열분해 그 밖의 방법에 따른 유화정제연료유 시 혼합장치·폐유이송장치·부속시설만 설치)', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['MCR_PUR'] } };
M[207] = { answer: '', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['MCR_PUR'] } }; // 표

// 다) 폐유기용제 정제유기용제 재활용
M[208] = { answer: '', tags: null };
M[209] = { answer: '', tags: null };
M[210] = { answer: '실험기기: 수소이온농도(pH)', tags: { ...RCY_SOLVENT, rCode: ['R3'] } };
M[211] = { answer: '실험기기: 화학적산소요구량(COD)', tags: { ...RCY_SOLVENT, rCode: ['R3'] } };
M[212] = { answer: '실험기기: 부유물질(SS)', tags: { ...RCY_SOLVENT, rCode: ['R3'] } };
M[213] = { answer: '실험기기: 폐유기용제에 함유된 특정수질유해물질', tags: { ...RCY_SOLVENT, rCode: ['R3'] } };
M[214] = { answer: '보관시설별 유량계측설비 각 1식 이상', tags: { ...RCY_SOLVENT, rCode: ['R3'] } };

// 라) 폐유 등을 재생연료유로 재활용
M[215] = { answer: '', tags: null };
M[216] = { answer: '', tags: null };
M[217] = { answer: '유량 계측시설: 보관시설별 각 1식 이상', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['MCR_PUR'] } };
M[218] = { answer: '여과(정제)시설: 시간당 재활용능력 7.5세제곱미터 이상 1식 이상', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['MCR_PUR'] } };
M[219] = { answer: '', tags: null };
M[220] = { answer: '혼합시설: 혼합장치가 설치된 내부용적 30세제곱미터 이상 1식 이상(폐유와 다른 폐기물 혼합 시)', tags: { ...RCY_OIL, rCode: ['R9'] } };
M[221] = { answer: '유수분리시설: 폐수이동장치·부속시설 포함 시간당 재활용능력 3세제곱미터 이상 1식 이상(증류 통한 유수분리 필요 시)', tags: { ...RCY_OIL, rCode: ['R9'], facilityType: ['MCR_OWS'] } };

// 마) 수은회수시설로 수은폐기물 재활용
M[222] = { answer: '', tags: null };
M[223] = { answer: '계량시설 1식 이상', tags: { ...RCY_MERCURY, facilityType: ['MRC'] } };
M[224] = { answer: '파쇄·분쇄·절단시설: 수은이 외부로 휘발·유출되지 않는 상태에서 수은과 그 외 유리 등을 분리 가능 시설', tags: { ...RCY_MERCURY, facilityType: ['MRC', 'MCR_SHR', 'MCR_CUT'] } };
M[225] = { answer: '수은회수시설: 수은함유폐기물에서 수은·화합물 회수 가능(가열장치·응축장치·온도·압력 측정·기록 장치 포함)', tags: { ...RCY_MERCURY, facilityType: ['MRC'] } };

// 5.다. 의료폐기물 재활용
M[226] = { answer: '', tags: null };
M[227] = { answer: '', tags: null };
M[228] = { answer: '보관시설: 1일 재활용능력의 3일분 이상 7일분 이하의 폐기물 보관 냉동시설', tags: { ...RCY_MED } };
M[229] = { answer: '재활용시설 1식 이상', tags: { ...RCY_MED } };
M[230] = { answer: '수집운반차량 1대 이상(자체 수집·운반 시)', tags: { ...RCY_MED } };
M[231] = { answer: '기술능력: 폐기물처리산업기사·임상병리사 또는 위생사 중 1명 이상', tags: { ...RCY_MED } };

// 5.라. 그 밖
M[232] = { answer: '그 밖에 재활용대상 폐기물 종류(의료 제외) 및 방법에 따라 기후에너지환경부장관 고시 기준에 따른 시설·장비·기술능력을 갖추겠음.', tags: { ...RCY } };

// ===== 비고 =====
M[233] = { answer: '', tags: null }; // 비고 헤더

M[234] = { answer: '동일 법인·개인이 둘 이상의 다른 종류 처리업 또는 동일 처리업의 둘 이상 분야 허가 시 사무실·실험실·시설·장비·기술능력 중복 면제 가능함을 숙지하겠음(단, 수집운반업 장비·기술능력 및 의료폐기물 대상 처리업의 사무실·실험실·시설·장비·기술능력은 제외).', tags: { ...ALL } };
M[235] = { answer: '기사는 동종 산업기사 자격 + 해당분야 2년 이상 종사자, 산업기사는 환경기능사 자격 + 해당분야 2년 이상 종사자로 대체 가능함을 숙지하겠음.', tags: { ...ALL } };
M[236] = { answer: '시·도지사 또는 지방환경관서장이 해당 업종·영업대상폐기물 고려 시 실험기기·기구 일부 면제 가능함을 숙지하겠음.', tags: { ...ALL } };
M[237] = { answer: '수집·운반차량 외 장비·세차시설·사업장 부지는 임차(3년 이상 공증) 사용 가능, 측정대행업자·국가공인시험기관과 대행계약 시 해당 항목 실험기기·기구·장비 면제 가능, 전체 항목 대행 시 실험실 자체 면제 가능함을 숙지하겠음.', tags: { ...ALL } };
M[238] = { answer: '1일 처리능력 산정: 연속식 24시간, 준연속식 16시간, 비연속식 8시간(파쇄시설은 8시간)을 기준으로 함을 숙지하겠음.', tags: { ...ALL } };
M[239] = { answer: '폐기물배출사업장에서 밀폐 배관으로 처리시설 이송 또는 시·도지사·지방환경관서장 인정 시 보관 없이 곧바로 재활용시설 운반 시 보관시설 면제 가능함을 숙지하겠음.', tags: { ...ALL } };
M[240] = { answer: '고온소각시설을 갖춘 자는 그 시설로 일반소각 처분대상폐기물도 처분 가능함을 숙지하겠음.', tags: { ...ID, facilityType: ['INC_H'] } };
M[241] = { answer: '운반차량 요건은 허가권자가 아래 가.~라. 기준에 따라 다른 차량으로 대체하거나 일부 면제 가능함을 숙지하겠음.', tags: { ...TR } };
M[242] = { answer: '폐기물 수집·운반업 차량은 영업대상·운반방법 고려 전용차량 수량의 1/2 범위 내에서 다른 종류 차량으로 대체 가능함을 숙지하겠음.', tags: { ...TR } };
M[243] = { answer: '생활폐기물 수집·운반 시 밀폐형 압축·압착차량 외 차량 면제 가능함을 숙지하겠음.', tags: { ...TR_LGN } };
M[244] = { answer: '생활폐기물·사업장비배출시설계 폐기물 중 폐목재류(미오염)·대형폐기물·음식물류만 수집·운반 시 밀폐형 압축·압착차량을 밀폐형 차량 또는 밀폐형 덮개 설치차량으로 대체 가능함을 숙지하겠음.', tags: { ...TR_LGN, wasteCode: ['51-20', '51-38', '91-02', '91-10'] } };
M[245] = { answer: '사업장비배출시설계 폐기물 중 의료기관 일회용기저귀만 수집·운반 시 밀폐형 압축·압착차량 및 밀폐형(덮개) 차량 면제 가능함을 숙지하겠음.', tags: { ...TR, wasteClass: ['GN'], wasteCode: ['51-46'] } };
M[246] = { answer: '「건설폐기물의 재활용촉진법 시행규칙」 별표2 기준 시설·장비를 갖춘 자는 비고 1호 단서에도 불구하고 공사장생활폐기물 처리 시설·장비를 갖춘 자로 봄을 숙지하겠음.', tags: { ...ALL } };
M[247] = { answer: '영 제2조 사업장에서 발생하는 사업장비배출시설계 폐기물로서 생활폐기물과 성질·상태가 비슷하여 생활폐기물 기준·방법으로 수집·운반 가능한 경우, 지자체 조례에 따라 생활폐기물수집·운반업자가 수집·운반 가능함을 숙지하겠음.', tags: { ...TR_LGN } };
M[248] = { answer: '별표 5 제2호가목5)에 해당하는 경우 장비 및 사무실(연락장소) 기준은 제1호가목 기준을 적용함을 숙지하겠음.', tags: { ...TR_LGN } };
M[249] = { answer: '제10조에 따라 재활용시설이 필요하지 아니하다고 시·도지사가 인정하는 경우 재활용시설·기술능력 전부 또는 일부 면제 가능함을 숙지하겠음.', tags: { ...RCY } };

// ===== 적용 =====
let applied = 0;
let warnings = 0;
items.forEach((it, i) => {
  const m = M[i];
  if (!m) {
    console.warn(`경고: IDX:${i} 매핑 없음 (type=${it.type}, marker=${it.marker || ''}, text="${(it.text || '').slice(0, 40)}")`);
    warnings++;
    return;
  }
  it.answer = m.answer;
  it.tags = m.tags;
  if (m.noWord) it.noWord = true;
  applied++;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`적용 완료: ${applied}/${items.length}개 항목, 경고 ${warnings}건`);
console.log(`태그 있음: ${items.filter(it => it.tags && typeof it.tags === 'object').length}개`);
console.log(`섹션 헤더(tags=null): ${items.filter(it => it.tags === null && !it.noWord).length}개`);
console.log(`noWord(생략): ${items.filter(it => it.noWord).length}개`);
