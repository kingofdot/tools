# 쓸자료 — 시스템·LLM 이 직접 소비하는 운영 데이터

이 폴더의 모든 JSON/JS 는 시스템 로직 또는 LLM 프롬프트에서 import·참조 대상. 직접 편집은 가능하나, `definitions.json` 과 `별표/` 는 도구로 자동 갱신되므로 출처를 통해 수정.

## 핵심 파일

### definitions.json
폐기물법 정의·분류 + 매핑 dimensions 통합. `검토자료/도구/build_definitions.py` 가 자동 생성. 직접 편집 금지.

```jsonc
{
  "_meta": { "version": "2026-05-09", "기준_법령": {...} },
  "법령용어": { "폐기물": {...}, "지정폐기물": {...}, ... },  // 법 제2조 verbatim
  "폐기물_종류": { "법상_분류", "wasteClass_매핑", "wasteCode_대분류", ... },
  "처리시설_종류": { "분류_트리", "facilityType_매핑_근거", ... },
  "처리업_종류": { "법상_업종_제25조5항", "category_매핑", "bizType_매핑" },
  "처리방법_분류": { "법상_정의", "action_매핑", "rCode_매핑", ... }
}
```

### 별표/
국가법령정보 API 와 일치 검증된 별표 데이터 (parser 정리본). `검토자료/도구/compare_chamgo.py` 가 검증.

- `별표/시행령/` — 별표1(지정폐기물 종류), 별표2(의료폐기물 종류), 별표3(처리시설 종류), 별표4의2(재활용 준수사항), 제7의2조
- `별표/시행규칙/` — 별표1(지정폐기물 유해물질), 별표2(폐유기용제), 별표3(의료폐기물 발생기관), 별표4(폐기물 세부분류 코드), 별표4의2(R코드), 별표4의3(재활용 가능 유형), 별표14(기술관리인 자격), 별표16(재활용 신고대상자)

### 상황코드_코드표.json
매핑 차원 정의. `category`, `bizType`, `docType`, `wasteClass`, `wasteCode`, `physicalState`, `action`, `rCode`, `facilityType`, `facilityApproval`. 코드 의미·근거 조문 포함.

### 마스터 데이터
- `wasteInformation.json` / `wasteInformation.js` / `wasteVarMap.json` — 폐기물코드 마스터
- `facilityInformation.js` / `facilityVarMap.json` — 시설코드 마스터
- `분석시스템_입력변수_정리.json` — 분석 시스템 입력 변수
- `준수사항_법령별표_정리.json` — 준수사항 별표 정리
- `준수사항_적용범위.json` — 준수사항별 적용 조건 (법령매핑)

## 이 폴더 데이터 갱신 흐름

```
법령 개정 / 데이터 보완 필요
  ├─ 별표/* 수정 → API 대조 (검토자료/도구/compare_chamgo.py)
  ├─ 상황코드_코드표.json 수정 (직접 편집)
  └─ 위 둘 변경 시 build_definitions.py 재실행 → definitions.json + md자료/* 재생성
```
