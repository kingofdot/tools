// 별표5 depth=0 진짜 섹션 헤더에 isHeader + tags 적용
// 다른 depth=0 항목은 본문 속 번호라서 제외
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표5_처리구체적기준및방법.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

// 의료폐기물 코드 (별표5 의료 제외 섹션에서 배제할 코드)
const MED_CODES = ['10'];

// ─── 섹션 헤더 매핑 ──────────────────────────────────────
// IDX → tags (category/bizType/action 등은 null=공통, 필요한 것만 지정)
const SECTIONS = {
  3:   { tag: 'L_WASTE',   tags: { wasteClass: ['L'] },                                    note: '생활폐기물' },
  34:  { tag: 'FOOD',      tags: { wasteCode: ['51-19'] },                                 note: '음식물류 폐기물' },
  55:  { tag: 'G_WASTE',   tags: { wasteClass: ['GO', 'GN'] },                             note: '사업장일반폐기물 (배출시설계+비배출시설계)' },
  165: { tag: 'D_NOMED',   tags: { wasteClass: ['D'], wasteCodeExclude: MED_CODES },       note: '지정폐기물(의료 제외)' },
  346: { tag: 'MED',       tags: { wasteCode: MED_CODES },                                 note: '의료폐기물' },
  423: { tag: 'CT',        tags: { action: ['CT'] },                                       note: '폐기물수집·운반증' },
};

let applied = 0;
for (const [idxStr, cfg] of Object.entries(SECTIONS)) {
  const idx = +idxStr;
  const item = items[idx];
  if (!item) { console.warn(`IDX:${idx} 없음`); continue; }
  if (item.depth !== 0) { console.warn(`IDX:${idx} depth=${item.depth} — skip`); continue; }

  // 기본 tag 구조에 null 키 보완
  const fullTags = {
    category: null, bizType: null, docType: null,
    wasteClass: null, wasteCode: null,
    action: null, rCode: null, facilityType: null,
    ...cfg.tags,
  };

  item.isHeader = true;
  item.tags = fullTags;
  console.log(`IDX:${idx} [${item.marker} ${item.text}] → ${cfg.note} (${JSON.stringify(cfg.tags)})`);
  applied++;
}

fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');
console.log(`\n완료: ${applied}/${Object.keys(SECTIONS).length}개 섹션 헤더에 isHeader + tags 적용`);
