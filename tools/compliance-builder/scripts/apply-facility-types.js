/**
 * 별표5 항목의 텍스트에서 처리시설 유형을 감지해 tags.facilityType 배열을 설정
 *
 * 적용 대상: action에 MI / FI / RCY 중 하나라도 포함된 항목
 * (CT·ST는 수집운반·보관 규정으로 facilityType 불필요)
 *
 * 핵심 판단 기준:
 *   - 기계적 조작(파쇄·압축 등)이 "매립/소각/처분" 목적이면 → 기처분_*
 *   - 기계적 조작이 "재활용/퇴비화/사료화/부숙/연료화" 목적이면 → 기재활_*
 *   - 텍스트에 재활용 문맥 없으면 처분 시설로만 태그
 *
 * node scripts/apply-facility-types.js
 */
const fs = require('fs');

const B5_PATH = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const data  = JSON.parse(fs.readFileSync(B5_PATH, 'utf8'));
const items = data['별표내용'];

// ─── facilityType 감지 ────────────────────────────────────────────
function detectFacilityTypes(text, action) {
  if (!action || !action.length) return null;

  const hasDisposal = action.some(a => ['MI', 'FI'].includes(a));
  const hasRecycle  = action.includes('RCY');
  if (!hasDisposal && !hasRecycle) return null;

  const t = text;
  const codes = new Set();

  // 텍스트 문맥 판별
  // 재활용 문맥: "재활용" 또는 생물학적 재활용 방법 명시
  const hasRecycleCtx  = /재활용|퇴비화|사료화|부숙|연료화/.test(t);
  // 처분 문맥: 매립·소각·처분 키워드 (기계적 조작의 목적이 처분임을 나타냄)
  const hasDisposalCtx = /매립|소각|처분하여야|처분해야/.test(t);

  // 기계적 조작이 처분 목적인지: 처분 문맥이 있거나, 재활용 문맥이 전혀 없을 때
  const mechAsDisposal = hasDisposal && (!hasRecycleCtx || hasDisposalCtx);
  // 기계적 조작이 재활용 목적인지: 재활용 문맥이 있을 때
  const mechAsRecycle  = hasRecycle  && hasRecycleCtx;

  // ── 소각 계열 ────────────────────────────────────────────────
  if (/열분해\s*소각/.test(t))                                    codes.add('소각_열분해소각');
  if (/고온\s*용융/.test(t))                                      codes.add('소각_고온용융');
  if (/고온\s*소각/.test(t))                                      codes.add('소각_고온');
  if (/소각열\s*회수|에너지를\s*회수/.test(t))                    codes.add('소각_열회수');
  if (/소각/.test(t) && !codes.has('소각_고온') && !codes.has('소각_열분해소각'))
                                                                  codes.add('소각_일반');

  // ── 매립 ─────────────────────────────────────────────────────
  if (/차단형\s*매립/.test(t))                                    codes.add('매립_차단형');
  if (/관리형\s*매립|매립시설에\s*매립|매립하여야|매립해야|매립할\s*수/.test(t))
                                                                  codes.add('매립_관리형');

  // ── 기계적 처분 ──────────────────────────────────────────────
  if (mechAsDisposal) {
    if (/파쇄|분쇄/.test(t))                                      codes.add('기처분_파쇄분쇄');
    if (/압축/.test(t))                                           codes.add('기처분_압축');
    if (/절단/.test(t))                                           codes.add('기처분_절단');
    if (/용융/.test(t) && !codes.has('소각_고온용융'))            codes.add('기처분_용융');
    if (/탈수|건조/.test(t))                                      codes.add('기처분_탈수건조');
    if (/증발|농축/.test(t))                                      codes.add('기처분_증발농축');
    if (/유수\s*분리/.test(t))                                    codes.add('기처분_유수분리');
    if (/정제|증류|추출|여과/.test(t))                            codes.add('기처분_정제');
  }
  if (/멸균분쇄/.test(t))                                         codes.add('기처분_멸균분쇄');

  // ── 화학적 처분 ──────────────────────────────────────────────
  if (hasDisposal) {
    if (/고형화|고화|안정화처분/.test(t))                         codes.add('화처분_고형화');
    if (/중화|산화·환원|환원|산화·환원 등/.test(t))               codes.add('화처분_반응');
    if (/응집|침전/.test(t))                                      codes.add('화처분_응집침전');
  }

  // ── 기계적 재활용 ────────────────────────────────────────────
  if (mechAsRecycle) {
    if (/파쇄|분쇄|탈피/.test(t))                                 codes.add('기재활_파쇄분쇄');
    if (/압축|성형|주조|압출/.test(t))                            codes.add('기재활_압축성형');
    if (/절단/.test(t))                                           codes.add('기재활_절단');
    if (/용융|용해/.test(t))                                      codes.add('기재활_용융용해');
    if (/연료화/.test(t))                                         codes.add('기재활_연료화');
    if (/탈수|건조/.test(t))                                      codes.add('기재활_탈수건조');
    if (/선별/.test(t))                                           codes.add('기재활_선별');
    if (/정제|증류|추출|여과/.test(t))                            codes.add('기재활_정제');
    if (/증발|농축/.test(t))                                      codes.add('기재활_증발농축');
  }

  // ── 화학적 재활용 ────────────────────────────────────────────
  if (hasRecycle && hasRecycleCtx) {
    if (/고형화|고화/.test(t))                                    codes.add('화재활_고형화');
    if (/중화|산화·환원|환원/.test(t))                            codes.add('화재활_반응');
    if (/응집|침전/.test(t))                                      codes.add('화재활_응집침전');
    if (/열분해|가스화/.test(t))                                  codes.add('화재활_열분해');
  }

  // ── 생물학적 재활용 (문맥 무관, 키워드 자체가 재활용 방법) ──
  if (/퇴비화/.test(t))                                           codes.add('생재활_퇴비화');
  if (/사료화/.test(t))                                           codes.add('생재활_사료화');
  if (/부숙/.test(t))                                             codes.add('생재활_부숙');
  if (/동애등에/.test(t))                                         codes.add('생재활_동애등에');
  if (/버섯\s*재배/.test(t))                                      codes.add('생재활_버섯');

  // ── 기타 재활용 시설 ─────────────────────────────────────────
  if (/시멘트\s*소성로|소성로/.test(t))                          codes.add('시멘트소성로');
  if (/골재/.test(t))                                            codes.add('골재가공');
  if (/수은\s*회수/.test(t))                                     codes.add('수은회수');

  const result = [...codes];
  return result.length > 0 ? result : null;
}

// ─── 기존 facilityType 초기화 후 재적용 ──────────────────────────
let processed = 0;

items.forEach(item => {
  if (!item.tags) return;

  const detected = detectFacilityTypes(item.text, item.tags.action);
  if (detected) {
    item.tags.facilityType = detected;
    processed++;
  } else {
    item.tags.facilityType = null;
  }
});

fs.writeFileSync(B5_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`완료: ${processed}개 항목 facilityType 적용`);

// ── 샘플 출력 ─────────────────────────────────────────────────────
const samples = items.filter(i => i.tags && i.tags.facilityType);
console.log(`\n--- 샘플 (전체 ${samples.length}개 중 12개) ---`);
samples.slice(0, 12).forEach(i => {
  console.log(`[d${i.depth} ${i.marker}] ${i.text.slice(0, 70)}`);
  console.log(`  → ${JSON.stringify(i.tags.facilityType)}`);
});
