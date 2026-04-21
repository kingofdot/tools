// 별표9 placeholder를 실제 표 객체로 교체 + 표의 비고 1./2./3. 항목 제거
const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'data', '검토사항', '시행규칙', '별표9_처리시설설치기준.json');
const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));
const items = data['별표내용'];

const phIdx = items.findIndex(it => it.type === 'table-placeholder' && it.title === '고밀도폴리에틸렌라이너의 기준');
if (phIdx < 0) {
  console.error('placeholder 못 찾음');
  process.exit(1);
}

const tableObj = {
  depth: items[phIdx].depth,
  type: 'table',
  title: '고밀도폴리에틸렌라이너의 기준',
  headers: ['항목', '단위', '기준', '비고'],
  rows: [
    { 항목: '용융지수', 단위: 'g/10min', 기준: '1.0 미만', 비고: '' },
    { 항목: '밀도', 단위: 'g/㎤', 기준: '0.940 이상', 비고: '' },
    { 항목: '카본블랙함량', 단위: '%', 기준: '2.0~3.0', 비고: '' },
    { 항목: '카본블랙분산도', 단위: '급', 기준: '모두 1급·2급 또는 3급에 해당되고, 그 중 80% 이상이 1급 이나 2급에 해당되어야 함', 비고: '' },
    {
      항목: '인장성능',
      subRows: [
        { 세부항목: '항복인장강도', 단위: 'kgf/㎠', 기준: '150 이상', 비고: '' },
        { 세부항목: '파단인장강도', 단위: 'kgf/㎠', 기준: '270 이상', 비고: '' },
        { 세부항목: '항복인장변형률', 단위: '%', 기준: '12 이상', 비고: '' },
        { 세부항목: '파단인장변형률', 단위: '%', 기준: '700 이상', 비고: '' },
      ],
    },
    { 항목: '인열강도', 단위: 'kgf/cm', 기준: '130 이상', 비고: '' },
    { 항목: '꿰뚫림강도', 단위: 'kgf/cm', 기준: '320 이상', 비고: '' },
    { 항목: '저온취약성', 단위: '-', 기준: '-40℃에서 파괴되지 않음', 비고: '' },
    { 항목: '치수안정성', 단위: '%', 기준: '각 방향 ±2 이하', 비고: '' },
    { 항목: '내환경응력균열성', 단위: 'hr', 기준: '1,500 이상', 비고: '' },
    {
      항목: '산화유도시간(OIT)',
      비고: '표준·가압조건 중 택일',
      subRows: [
        { 세부항목: '표준조건', 단위: 'min', 기준: '100 이상' },
        { 세부항목: '가압조건', 단위: 'min', 기준: '400 이상' },
      ],
    },
    {
      항목: '열노화후OIT유지율',
      비고: '표준·가압조건 중 택일',
      subRows: [
        { 세부항목: '표준조건', 단위: '%', 기준: '55 이상' },
        { 세부항목: '가압조건', 단위: '%', 기준: '80 이상' },
      ],
    },
    {
      항목: '자외선처리후OIT유지율',
      subRows: [
        { 세부항목: '가압조건', 단위: '%', 기준: '60 이상' },
      ],
    },
    {
      항목: '접합부강도',
      subRows: [
        { 세부항목: '전단강도', 단위: 'kgf/㎠', 기준: '135 이상', 비고: '' },
        { 세부항목: '박리강도', 단위: 'kgf/㎠', 기준: '97 이상', 비고: '' },
      ],
    },
  ],
  notes: [
    '이 기준은 매끄러운 고밀도폴리에틸렌라이너에 적용한다.',
    '고밀도폴리에틸렌라이너의 시험은 고밀도폴리에틸렌차수막 단체표준(KPS M6000)의 시험방법에 따른다.',
    '내환경응력균열성은 내하중응력균열성 시험으로 대신할 수 있으며, 이 때 기준은 시험편 5개 중 4개 이상이 200시간 내에 파단(破斷)되지 아니하여야 한다.',
  ],
};

// placeholder 다음 3개(표 비고 1./2./3.) 항목이 number 1./2./3. d1 인지 검증 후 제거
const removeIdx = [];
for (let k = 1; k <= 3; k++) {
  const it = items[phIdx + k];
  if (it && it.type === 'number' && it.marker === `${k}.`) {
    removeIdx.push(phIdx + k);
  } else {
    console.warn(`경고: IDX:${phIdx + k} 가 표 비고 ${k}. 형식이 아님 — 자동 제거 건너뜀`);
  }
}

// 교체: placeholder → tableObj, 그리고 표 비고 1./2./3. 제거
const newItems = [];
items.forEach((it, i) => {
  if (i === phIdx) {
    newItems.push(tableObj);
  } else if (removeIdx.includes(i)) {
    // skip
  } else {
    newItems.push(it);
  }
});

data['별표내용'] = newItems;
fs.writeFileSync(JSON_PATH, JSON.stringify(data, null, 2), 'utf8');

console.log(`교체 완료: IDX:${phIdx} placeholder → table 객체`);
console.log(`제거: ${removeIdx.length}개 항목 (표 비고 1./2./3.)`);
console.log(`최종 항목 수: ${newItems.length}`);
