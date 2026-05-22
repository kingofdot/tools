// 고체연료 환산계수 (대기환경보전법 시행규칙 별표3 비고 2)
// 출처: 별표3 비고 2 — "연료사용량"이란 연료별 사용량에 무연탄을 기준으로 한
//       고체연료환산계수를 곱하여 산정한 양을 말한다.
//
// 사용 예:
//   환산된 연료사용량(kg/h, 무연탄 기준) = 실제 연료사용량 × factor
//
// 주의 사항:
//   - 표에 없는 연료의 환산계수는 사업자가 국가공인기관에서 발급받은 증명서에
//     적힌 해당 연료 발열량을 무연탄 발열량으로 나누어 산정.
//   - 무연탄 기준 발열량: 4,600 kcal/kg
//
// 필드:
//   fuel    : 연료 또는 원료명
//   unit    : 단위 (kg, L, S㎥, kW)
//   factor  : 무연탄 기준 환산계수 (factor=1.00 인 무연탄 대비)
//   category: "고체" / "액체" / "기체" / "전기"

var FuelConversionFactor = [
  // ─── 고체연료 ───
  { "fuel": "무연탄",        "unit": "kg",  "factor": 1.00, "category": "고체", "isReference": true },
  { "fuel": "유연탄",        "unit": "kg",  "factor": 1.34, "category": "고체" },
  { "fuel": "코크스",        "unit": "kg",  "factor": 1.32, "category": "고체" },
  { "fuel": "갈탄",          "unit": "kg",  "factor": 0.90, "category": "고체" },
  { "fuel": "이탄",          "unit": "kg",  "factor": 0.80, "category": "고체" },
  { "fuel": "목탄",          "unit": "kg",  "factor": 1.42, "category": "고체" },
  { "fuel": "목재",          "unit": "kg",  "factor": 0.70, "category": "고체" },
  { "fuel": "유황",          "unit": "kg",  "factor": 0.46, "category": "고체" },

  // ─── 액체연료 ───
  { "fuel": "중유(C)",       "unit": "L",   "factor": 2.00, "category": "액체" },
  { "fuel": "중유(A, B)",    "unit": "L",   "factor": 1.86, "category": "액체" },
  { "fuel": "원유",          "unit": "L",   "factor": 1.90, "category": "액체" },
  { "fuel": "경유",          "unit": "L",   "factor": 1.92, "category": "액체" },
  { "fuel": "등유",          "unit": "L",   "factor": 1.80, "category": "액체" },
  { "fuel": "휘발유",        "unit": "L",   "factor": 1.68, "category": "액체" },
  { "fuel": "나프타",        "unit": "L",   "factor": 1.80, "category": "액체" },
  { "fuel": "엘피지",        "unit": "kg",  "factor": 2.40, "category": "액체" },
  { "fuel": "석탄타르",      "unit": "kg",  "factor": 1.88, "category": "액체" },
  { "fuel": "메탄올",        "unit": "kg",  "factor": 1.08, "category": "액체" },
  { "fuel": "에탄올",        "unit": "kg",  "factor": 1.44, "category": "액체" },
  { "fuel": "벤젠",          "unit": "kg",  "factor": 2.02, "category": "액체" },
  { "fuel": "톨루엔",        "unit": "kg",  "factor": 2.06, "category": "액체" },

  // ─── 기체연료 ───
  { "fuel": "액화 천연가스",  "unit": "S㎥", "factor": 1.56, "category": "기체" },
  { "fuel": "수소",          "unit": "S㎥", "factor": 0.62, "category": "기체" },
  { "fuel": "메탄",          "unit": "S㎥", "factor": 1.86, "category": "기체" },
  { "fuel": "에탄",          "unit": "S㎥", "factor": 3.36, "category": "기체" },
  { "fuel": "아세틸렌",      "unit": "S㎥", "factor": 2.80, "category": "기체" },
  { "fuel": "일산화탄소",    "unit": "S㎥", "factor": 0.62, "category": "기체" },
  { "fuel": "석탄가스",      "unit": "S㎥", "factor": 0.80, "category": "기체" },
  { "fuel": "발생로가스",    "unit": "S㎥", "factor": 0.20, "category": "기체" },
  { "fuel": "수성가스",      "unit": "S㎥", "factor": 0.54, "category": "기체" },
  { "fuel": "혼성가스",      "unit": "S㎥", "factor": 0.60, "category": "기체" },
  { "fuel": "도시가스",      "unit": "S㎥", "factor": 1.42, "category": "기체" },

  // ─── 전기 ───
  { "fuel": "전기",          "unit": "kW",  "factor": 0.17, "category": "전기" }
];

// 메타정보
var FuelConversionFactorMeta = {
  "title": "고체연료 환산계수",
  "source": "대기환경보전법 시행규칙 별표3 비고 2",
  "referenceFuel": "무연탄",
  "referenceCalorificValue_kcal_per_kg": 4600,
  "formula": "환산 연료사용량(kg/h, 무연탄 기준) = 실제 연료사용량 × factor",
  "fallbackRule": "표에 없는 연료는 사업자가 국가공인기관 발급 증명서의 발열량을 4,600 kcal/kg로 나누어 산정한다.",
  "totalEntries": 33
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FuelConversionFactor, FuelConversionFactorMeta };
}
