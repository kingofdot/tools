# waste / law_reference

폐기물 도메인 법령 데이터 작업 영역. 세 가지 버킷으로 정리:

| 폴더 | 용도 | 누가 읽음 |
|---|---|---|
| [`쓸자료/`](쓸자료/) | 시스템·LLM·프롬프트가 직접 소비하는 운영 데이터 | 코드 / 자동 워크플로 |
| [`검토자료/`](검토자료/) | API 대조 결과·작업중 데이터·도구 스크립트·원본 참조 | 사람 (검토·갱신) |
| [`md자료/`](md자료/) | 사람이 읽는 정의/분류 정리 문서 | 사람 (이해·합의) |

---

## 쓸자료/ — 시스템이 읽는 데이터

```
쓸자료/
├── definitions.json          ← 폐기물법 핵심 정의·분류 통합 매핑 (build_definitions.py 산출물)
├── 별표/
│   ├── 시행령/               ← 별표1·2·3·4의2 + 제7의2조 (5개)
│   └── 시행규칙/             ← 별표1·2·3·4·4의2·4의3·14·16 (8개)
├── 상황코드_코드표.json      ← 매핑 dimensions (category, bizType, wasteClass, action, rCode, facilityType …)
├── wasteInformation.json/.js ← 폐기물 마스터 (코드, 명칭, 재활용 코드)
├── facilityInformation.js    ← 시설 마스터
├── wasteVarMap.json / facilityVarMap.json
├── 분석시스템_입력변수_정리.json
├── 준수사항_법령별표_정리.json
└── 준수사항_적용범위.json
```

별표 13개는 국가법령정보 OPEN API 와 일치 검증 완료 (검토자료/_API검토_참고자료.md 참고).

## 검토자료/ — 사람이 작업·검토

```
검토자료/
├── 검토사항/                 ← law_active 로 승격할 WIP 조문·별표 (answer/condition/위임 가공)
│   ├── 법/                  (제13조, 제13조의2)
│   ├── 시행령/              (제7조)
│   └── 시행규칙/            (별표5/5의3/5의4/6/7/8/9/17/17의2 + _원본백업)
├── 보완자료_원본/            ← 다른 포맷에서 복사한 별표·법령 원문 (대조용)
├── 운영문서/                 ← 적합성확인 가이드라인, 업무처리지침
├── 도구/                     ← 자동화 스크립트
│   ├── compare_chamgo.py    (쓸자료/별표 ↔ API 대조)
│   ├── compare_waste.py     (검토사항 ↔ API 대조)
│   └── build_definitions.py (md자료 + 쓸자료/definitions.json 빌드)
├── _API검토_참고자료.md      ← 쓸자료/별표 ↔ API 대조 결과
├── _API검토_검토사항.md      ← 검토사항 ↔ API 대조 결과
├── _원본정리_적용내역.md     ← parser 개선·데이터 정정 이력
├── 파싱오류_수정결과.txt
└── 파싱오류_스캔결과.txt
```

## md자료/ — 정의·분류 정리 문서

```
md자료/
├── _README.md
├── 01_법령용어정의.md       ← 법 제2조 등 정의 조문 verbatim
├── 02_폐기물종류_분류체계.md ← 1차분류 + 지정·의료·세부분류 + wasteClass 매핑
├── 03_처리시설_종류.md      ← 시행령 별표3 트리 + facilityType 매핑
├── 04_처리업_종류.md        ← 법 제25/29/46조 + category·bizType 매핑
└── 05_처리방법_분류.md      ← 처리/처분/재활용 정의 + action·rCode·physicalState 매핑
```

`build_definitions.py` 가 자동 생성. 직접 편집 금지 — 출처(`쓸자료/별표/`, `쓸자료/상황코드_코드표.json`) 수정 후 재빌드.

---

## 데이터 갱신 흐름

```
국가법령정보 API
   ↓ (law_api.py fetch)
d:/tmp/law_*.json
   ↓ (compare_chamgo.py / compare_waste.py)
검토자료/_API검토_*.md (대조 결과)
   ↓ (사용자 검토 → 수정 지시)
쓸자료/별표/, 검토자료/검토사항/ 갱신
   ↓ (build_definitions.py)
md자료/*.md + 쓸자료/definitions.json 재생성
```

운영 코드는 `data/waste/law_active/` 만 읽음 (이 폴더 외부). `law_reference/` 는 모두 사람·도구가 다루는 가공·검토 영역.
