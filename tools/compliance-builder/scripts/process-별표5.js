/**
 * 별표5 전체 항목에 answer + tags 자동 처리
 * node scripts/process-별표5.js
 */
const fs = require('fs');
const PATH = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const data = JSON.parse(fs.readFileSync(PATH, 'utf8'));
const items = data['별표내용'];

// ─── 섹션 컨텍스트 추적용 ──────────────────────────────
let wasteClass = null;   // L | G | D
let action = null;       // CT | ST | [MI,FI,RCY]
let bizType = null;      // null | [TR,RTR] | etc.

// ─── 헬퍼 ────────────────────────────────────────────────
function isSkip(item) {
  const t = item.text.trim();
  if (item.type === 'title') return true;
  if (t.startsWith('삭제')) return true;
  // 극단적으로 짧거나 순수 계산식(비고)
  if (t.length < 8) return true;
  return false;
}

function isHeader(item) {
  const t = item.text.trim();
  const headers = [
    '공통사항','수집·운반의 경우','보관의 경우','처리의 경우','공통기준',
    '생활폐기물의 기준 및 방법','음식물류 폐기물의 기준 및 방법',
    '사업장일반폐기물의 기준 및 방법','지정폐기물(의료폐기물은 제외한다)의 기준 및 방법',
    '지정폐기물 중 의료폐기물의 기준 및 방법','폐기물수집·운반증',
    '의료폐기물 전용용기 사용의 경우','사업장일반폐기물의 종류별 처리기준 및 방법',
  ];
  if (headers.includes(t)) return true;
  if (t.endsWith('의 기준 및 방법') && t.length < 35) return true;
  return false;
}

// 의무문구 → 답변 변환
function toAnswer(text) {
  // 삭제된 항목
  if (text.startsWith('삭제')) return '';
  // 시행일/비고/계산식
  if (text.match(/^[0-9]+\./)) return '';

  let t = text;
  // "~ 하여야 한다" / "~ 아니 된다" / "~ 안 된다" / "~ 아니하여야 한다"
  // → 핵심 의무 동사구 추출
  t = t
    .replace(/[ㄱ-ㅎ가-힣\w\s]*의 경우에는\s*/g, '') // "~의 경우에는" 전처리 제거
    .replace(/다만,.*$/s, '')         // 단서 이하 제거
    .replace(/이 경우.*$/s, '')       // "이 경우" 이하 제거
    .replace(/비고.*$/s, '');         // 비고 이하 제거

  // 핵심 의무 패턴 매칭
  const mandatoryPattern = /([^.。]+(?:하여야|않아야|아니하여야|안 된다|아니 된다|하여야 한다|않아야 한다|하지 않아야)[^.。]*)/;
  const match = t.match(mandatoryPattern);

  let core = match ? match[1].trim() : t.trim();
  // 너무 길면 원문 첫 60자 요약
  if (core.length > 120) core = text.slice(0, 100).trim();

  // 동사 변환
  core = core
    .replace(/하여야 한다\.?$/, '하겠음.')
    .replace(/하여야한다\.?$/, '하겠음.')
    .replace(/아니하여야 한다\.?$/, '않겠음.')
    .replace(/아니 된다\.?$/, '않겠음.')
    .replace(/안 된다\.?$/, '않겠음.')
    .replace(/해야 한다\.?$/, '하겠음.')
    .replace(/해야한다\.?$/, '하겠음.')
    .replace(/하여야 하며\.?/, '하고,')
    .replace(/하여야 한다$/, '하겠음.')
    .replace(/해야 한다$/, '하겠음.')
    .replace(/한다\.$/, '하겠음.');

  if (!core.endsWith('겠음.') && !core.endsWith('겠습니다.')) {
    core = core.replace(/[.。]*$/, '') + '를 준수하겠음.';
  }
  return core;
}

// ─── 섹션 감지 및 상태 업데이트 ──────────────────────────
function updateContext(item) {
  const t = item.text;
  if (item.depth === 0) {
    if (t.includes('생활폐기물의 기준 및 방법')) { wasteClass = 'L'; action = null; bizType = null; }
    else if (t.includes('음식물류 폐기물의 기준 및 방법')) { wasteClass = 'G'; action = null; bizType = null; }
    else if (t.includes('사업장일반폐기물의 기준 및 방법')) { wasteClass = 'G'; action = null; bizType = null; }
    else if (t.includes('지정폐기물 중 의료폐기물')) { wasteClass = 'D'; action = null; bizType = null; }
    else if (t.includes('지정폐기물(의료폐기물은 제외한다)')) { wasteClass = 'D'; action = null; bizType = null; }
    else if (t.includes('폐기물수집·운반증')) { action = ['CT']; bizType = ['TR', 'RTR']; }
  }
  if (item.depth === 1) {
    if (t === '수집·운반의 경우' || t === '가. 수집·운반의 경우') { action = ['CT']; bizType = ['TR', 'RTR']; }
    else if (t === '보관의 경우') { action = ['ST']; bizType = null; }
    else if (t === '처리의 경우') { action = ['MI', 'FI', 'RCY']; bizType = null; }
    else if (t === '공통사항') { action = null; bizType = null; }
    else if (t.includes('전용용기 사용의 경우')) { action = null; bizType = null; }
    else if (t === '라. 수집·운반의 경우') { action = ['CT']; bizType = ['TR', 'RTR']; } // 의료폐기물
    else if (t === '마. 처리의 경우') { action = ['MI', 'FI', 'RCY']; bizType = null; }
  }
}

// ─── 메인 처리 ────────────────────────────────────────────
let count = 0;
items.forEach((item, idx) => {
  // 이미 처리된 항목(0~25) 및 tags가 있는 것은 건너뜀
  if (item.tags !== undefined && item.answer !== undefined) {
    updateContext(item); // 상태 업데이트는 계속
    return;
  }

  updateContext(item);

  // 스킵 또는 헤더
  if (isSkip(item) || isHeader(item)) {
    item.answer = '';
    item.tags = null;
    count++;
    return;
  }

  // answer 생성
  if (item.answer === undefined || item.answer === '') {
    item.answer = toAnswer(item.text);
  }

  // tags 설정
  item.tags = {
    category: null,
    bizType: bizType ? [...bizType] : null,
    wasteClass: wasteClass ? [wasteClass] : null,
    action: action ? [...action] : null,
    rCode: null,
    facilityType: null,
  };

  count++;
});

fs.writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`처리 완료: ${count}개 항목`);

// 샘플 출력
const samples = items.filter(i => i.tags && i.tags.wasteClass && i.answer).slice(0, 10);
samples.forEach(i => {
  console.log(`[${i.marker}] wC:${i.tags.wasteClass} ac:${JSON.stringify(i.tags.action)}`);
  console.log(`  → ${i.answer.slice(0, 70)}`);
});
