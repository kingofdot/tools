// === NUMBERING ===
// 내부 시스템 번호: 1, 1.1, 1.1.1 ... (parser.js에서 부여)
// 표시 번호: depth별 다른 마커
//   depth 0 → 로마자 대문자  (I, II, III)
//   depth 1 → 아라비아 숫자   (1, 2, 3)
//   depth 2 → 반괄호 숫자     (1), 2), 3))
//   depth 3 → 원형 숫자       (①, ②, ③)
//   depth 4+ → 한글 (가, 나, 다)

function toRoman(n) {
  const map = [
    ['M', 1000], ['CM', 900], ['D', 500], ['CD', 400],
    ['C', 100], ['XC', 90], ['L', 50], ['XL', 40],
    ['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1],
  ];
  let r = '';
  for (const [s, v] of map) {
    while (n >= v) { r += s; n -= v; }
  }
  return r;
}

function toCircled(n) {
  // ① ~ ⑳ : U+2460~U+2473 (1~20)
  // 그 이후는 (n) 형태 fallback
  if (n >= 1 && n <= 20) return String.fromCharCode(0x2460 + n - 1);
  return `(${n})`;
}

function toKorean(n) {
  const ko = ['가', '나', '다', '라', '마', '바', '사', '아', '자', '차', '카', '타', '파', '하'];
  if (n >= 1 && n <= ko.length) return ko[n - 1];
  return String(n);
}

// depth, sibling-index(1-based) → 마커 문자열 (구분자 포함)
function formatMarker(depth, idx) {
  switch (depth) {
    case 0: return toRoman(idx) + '.';
    case 1: return idx + '.';
    case 2: return idx + ')';
    case 3: return toCircled(idx);
    default: return toKorean(idx) + '.';
  }
}
