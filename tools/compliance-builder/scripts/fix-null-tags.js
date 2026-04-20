/**
 * tags=null 이면서 의미 있는 조건 항목에 tags + answer 보완
 * - ~경우 로 끝나는 조건 서술 항목
 * - 폐기물명 명시 → wasteVars + answer
 * - 폐기물명 없음  → tags만 부여, 간결한 answer
 *
 * node scripts/fix-null-tags.js
 */
const fs = require('fs');

const B5_PATH  = 'd:/dev/tools/tools/compliance-builder/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json';
const MAP_PATH = 'd:/dev/tools/tools/compliance-builder/data/wasteVarMap.json';

const data   = JSON.parse(fs.readFileSync(B5_PATH, 'utf8'));
const varMap = JSON.parse(fs.readFileSync(MAP_PATH, 'utf8')).map;
const items  = data['별표내용'];

const NAMES = Object.keys(varMap).sort((a, b) => b.length - a.length);

// ─── 섹션 컨텍스트 추적 ──────────────────────────────────
let wasteClass = null;
let action     = null;
let bizType    = null;

const SKIP_TEXT = ['삭제'];
const HEADERS   = ['공통사항','수집·운반의 경우','보관의 경우','처리의 경우','공통기준',
  '생활폐기물의 기준 및 방법','음식물류 폐기물의 기준 및 방법',
  '사업장일반폐기물의 기준 및 방법','지정폐기물(의료폐기물은 제외한다)의 기준 및 방법',
  '지정폐기물 중 의료폐기물의 기준 및 방법','폐기물수집·운반증',
  '의료폐기물 전용용기 사용의 경우','사업장일반폐기물의 종류별 처리기준 및 방법'];

function isSkipOrHeader(item) {
  if (item.type === 'title') return true;
  const t = item.text.trim();
  if (t.length < 8) return true;
  if (SKIP_TEXT.some(s => t.startsWith(s))) return true;
  if (HEADERS.includes(t)) return true;
  if (t.endsWith('의 기준 및 방법') && t.length < 35) return true;
  return false;
}

function updateContext(item) {
  const t = item.text;
  if (item.depth === 0) {
    if (t.includes('생활폐기물의 기준 및 방법'))            { wasteClass = 'L'; action = null; bizType = null; }
    else if (t.includes('음식물류 폐기물의 기준 및 방법'))  { wasteClass = 'G'; action = null; bizType = null; }
    else if (t.includes('사업장일반폐기물의 기준 및 방법')) { wasteClass = 'G'; action = null; bizType = null; }
    else if (t.includes('지정폐기물 중 의료폐기물'))        { wasteClass = 'D'; action = null; bizType = null; }
    else if (t.includes('지정폐기물(의료폐기물은 제외한다)')) { wasteClass = 'D'; action = null; bizType = null; }
    else if (t.includes('폐기물수집·운반증'))               { action = ['CT']; bizType = ['TR','RTR']; }
  }
  if (item.depth === 1) {
    if (t === '수집·운반의 경우' || t.endsWith('수집·운반의 경우')) { action = ['CT']; bizType = ['TR','RTR']; }
    else if (t === '보관의 경우')                     { action = ['ST']; bizType = null; }
    else if (t === '처리의 경우' || t === '마. 처리의 경우') { action = ['MI','FI','RCY']; bizType = null; }
    else if (t === '공통사항')                        { action = null; bizType = null; }
    else if (t.includes('전용용기 사용의 경우'))       { action = null; bizType = null; }
    else if (t === '라. 수집·운반의 경우')             { action = ['CT']; bizType = ['TR','RTR']; }
  }
}

// 폐기물명 감지 + {} 래핑 + wasteVars 반환
function extractWasteVars(text, wc) {
  const wasteVars = {};
  let newText = text;

  NAMES.forEach(name => {
    if (newText.includes(`{${name}}`)) return;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(
      `(?<=[,·、\\s]|^)(${escaped})(?=[,·、\\s]|$|은|는|이|가|을|를|과|와|및|등)`, 'g'
    );
    if (re.test(newText)) {
      newText = newText.replace(re, `{${name}}`);
      const entry = varMap[name];
      if (entry) {
        wasteVars[name] = (wc && entry[wc]) ? entry[wc] : Object.values(entry)[0];
      }
    }
  });

  return { newText, wasteVars: Object.keys(wasteVars).length ? wasteVars : null };
}

// 조건 항목(~경우) → answer 생성
function conditionAnswer(text, wasteVars) {
  let t = text.trim();

  // "경우에는", "경우" 제거
  t = t.replace(/경우에는\s*$/, '').replace(/경우\s*$/, '').trim();

  // 문장 동사 마무리 (끝이 "운반" 등 명사형이면 "하는" 추가)
  if (t.endsWith('운반')) t += '하는';

  // wasteVars 있으면 {} 래핑 버전 사용
  // 짧게 만들기
  if (t.length > 80) t = t.slice(0, 78) + '...';

  return `${t} 경우 해당 기준에 따라 처리하겠음.`;
}

// ─── 메인 ────────────────────────────────────────────────
let fixed = 0;

items.forEach((item) => {
  updateContext(item);

  // tags가 이미 있으면 건너뜀
  if (item.tags !== null && item.tags !== undefined) return;
  // 스킵/헤더이면 그대로 둠
  if (isSkipOrHeader(item)) return;

  const t = item.text.trim();
  const wc = wasteClass;

  // wasteVars 처리
  const { newText, wasteVars } = extractWasteVars(item.answer || t, wc);
  const templateAnswer = wasteVars ? newText : null;

  // answer 생성
  let answer;
  if (t.endsWith('경우') || t.endsWith('경우에는') || t.match(/경우[.。]*$/)) {
    // 조건 서술형
    answer = conditionAnswer(templateAnswer || t, wasteVars);
  } else {
    // 일반 의무/서술 (끝이 "경우"가 아닌 경우)
    answer = templateAnswer || item.answer || `${t.slice(0,60)}를 준수하겠음.`;
  }

  // tags 설정
  item.answer = answer;
  item.tags = {
    category:     null,
    bizType:      bizType ? [...bizType] : null,
    wasteClass:   wc ? [wc] : null,
    action:       action ? [...action] : null,
    rCode:        null,
    facilityType: null,
    ...(wasteVars ? { wasteVars } : {}),
  };

  fixed++;
});

fs.writeFileSync(B5_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`보완 완료: ${fixed}개 항목`);

// 샘플 출력
const samples = items.filter(i => i.tags && i.tags.wasteClass).slice(0, 6);
console.log('\n--- 샘플 ---');
samples.forEach(i => {
  console.log(`[d${i.depth} ${i.marker}] ${i.answer.slice(0,80)}`);
  if (i.tags.wasteVars) console.log('  wasteVars:', JSON.stringify(i.tags.wasteVars));
});
