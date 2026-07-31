# 폐기물처리업 변경사항 선택 — 웹 개발자 가이드

> 이 문서는 본 도구(`waste-change-selector`)를 실제 운영 웹 서비스로 구현할 때 필요한 모든 기능·데이터·로직을 정리한 것입니다.
> 현재 HTML 단일 파일 프로토타입은 디자인·로직 레퍼런스용입니다.

---

## 1. 개요

### 목적
폐기물처리업(수집·운반업, **TR** 전용)의 **변경허가·변경신고** 사항을 사용자가 체크하고, 신청서 작성에 필요한 정보를 입력받아 **구조화된 페이로드(JSON)** 로 출력하는 도구.

### 입력 → 출력 흐름
```
신청인 정보 입력           ┐
변경사항 항목 체크 + 폼 입력 ├─→ 검증 로직 적용 ─→ 페이로드 JSON 출력
자동 분류·동기화 동작        ┘
```

### 범위
- **현재**: 폐기물수집·운반업(TR) 만 지원
- **법령 근거**: 폐기물관리법 + 시행규칙 (시행 2026-03-26)
- **범위 외** (별도 페이지로 처리할 것):
  - 권리·의무 승계 케이스 (법 제33조 양수·합병·분할·상속) — N02 툴팁으로 안내만
  - 다른 처리업(중간처분·최종처분·재활용업 등) — 추후 확장

---

## 2. 핵심 파일

| 파일 | 역할 |
|---|---|
| `index.html` | 프로토타입 단일 페이지 (스타일·렌더 로직·인라인 DATA) |
| `폐기물처리업_절차옵션.json` | **마스터 스키마** (서비스 운영의 단일 진실 소스) |
| `payload-sample.json` | 변경허가 시나리오 페이로드 샘플 |
| `payload-sample-notify.json` | 변경신고 시나리오 페이로드 샘플 |

> **운영 시 권고**: 인라인 DATA 는 제거하고 `폐기물처리업_절차옵션.json` 을 API/static asset 으로 서빙.

---

## 3. 데이터 모델 — 스키마(`폐기물처리업_절차옵션.json`)

### 3.1 최상위 구조

```json
{
  "_meta": { 버전·법령·bizType 코드·공통 첨부서류 등 },
  "items": [ /* 변경사항 항목 배열 */ ]
}
```

### 3.2 항목(item) 스펙

```ts
type Item = {
  id:          string;           // 예: "P01", "V01", "N02"
  label:       string;           // 사용자에게 보이는 항목명
  description: string;           // 라벨 밑 안내문
  changeType:  string | string[]; // "변경허가" | "변경신고" | 둘 다 배열
  조항:        string | string[]; // 시행규칙 조항 (배열 시 다중)
  bizType:     string[];          // ["TR","ID","FD","IR","FR","CR"] 부분집합
  처리업종:    string;
  신고시점:    string | null;     // "사전" | "사후 30일 이내" | null
  조건:        string | null;
  비고:        string | null;

  // 선택적
  fields?:        FieldSpec[];   // 구조화 입력 폼 — 없으면 단순 before/after 텍스트
  tooltipInfo?:   TooltipInfo;   // ℹ 호버 팝오버 (법령 보충 안내)
  attachments?:   string[];      // 항목별 필요 첨부서류
}
```

### 3.3 필드 타입(FieldSpec.type)

| type | 동작 |
|---|---|
| `text` | 기본 텍스트 입력. `placeholder`, `dataList` 옵션 |
| `textarea` | 다행 텍스트 |
| `date` | `<input type="date">` |
| `number` | 숫자 입력 |
| `select` | 드롭다운. `options: string[]`, `defaultValue`, `onChangeAction` |
| `repeat` | 반복 행 그룹. `compact:true` 면 표 모드, `min` 으로 최소 행 수 강제 |
| `pairRepeat` | 좌우 분할 쌍 그룹 (사용 안 함, 레거시) |
| `derivedFrom` | 다른 필드(source)에서 filterCompute 일치 행을 파생 렌더 |
| `auto` | 사용자 입력 없음, `compute` 함수로 자동 계산값 표시 |

### 3.4 필드 옵션

| 속성 | 적용 type | 설명 |
|---|---|---|
| `placeholder` | text/textarea | HTML placeholder |
| `defaultValue` | select 등 | 새 행 추가 시 기본값 |
| `dataList` | text | `<datalist>` 자동완성 데이터 소스 키 (예: `"wastes"`) |
| `suffix` | text/number | 입력 옆에 단위 표시 (예: `"톤"`) |
| `options` | select | `["증차","감차","기존"]` |
| `onChangeAction` | select 등 | 값 변경 시 같은 행 다른 필드 갱신 (FIELD_ACTIONS 키) |
| `compute` | auto | AUTO_COMPUTERS 키 (예: `"classifyVehicleProcedure"`) |
| `hideFromUI` | 모든 type | UI 표·요약엔 숨기고 페이로드엔 포함 |
| `compact` | repeat | 표 모드 (헤더 + 셀) |
| `min` | repeat | 최소 행 수 (그 이하면 자동 채움) |
| `addLabel` | repeat | "+ 추가" 버튼 라벨 |

### 3.5 자동 계산(AUTO_COMPUTERS)

| 함수명 | 입력 | 출력 |
|---|---|---|
| `classifyChange` | row.before, row.after, row.change | "증차" / "감차" / "기존" |
| `classifyVehicleProcedure` | row.category, row.change | "변경허가" / "변경신고" / "변경 없음" |
| `lookupWasteName` | row.wasteCode | 폐기물 명칭 (WASTE_DATA에서 lookup) |

### 3.6 필드 액션(FIELD_ACTIONS)

| 함수명 | 트리거 | 효과 |
|---|---|---|
| `v01SyncBeforeAfter` | V01 변경사항 select 변경 시 | 증차→before 비움 / 감차→after 비움 / 기존→after=before 복사 |

---

## 4. 신청인 정보 (Applicant)

상단 카드, 9개 필드, **모든 폼 위에서 1회 입력**. 페이로드 템플릿 변수와 1:1 매핑.

| 필드 키 | 라벨 | 템플릿 변수 |
|---|---|---|
| `businessName` | 상호(명칭) | `{{businessName}}` |
| `businessRegNumber` | 사업자등록번호 | `{{businessRegNumber}}` |
| `ownerName` | 성명(대표자) | `{{ownerName}}` |
| `corporationRegNumber` | 주민/법인등록번호 | `{{corporationRegNumber}}` |
| `businessAddress` | 주소 | `{{businessAddress}}` |
| `businessPhone` | 전화번호 | `{{businessPhone}}` |
| `wasteIndustryType` | 업종 | `{{wasteIndustryType}}` |
| `date` | 신청일자 | `{{date}}` |
| `submissionOffice` | 제출청 | `{{submissionOffice}}` |

**페이로드 위치**: `payload.applicant.{필드키}`

**저장**: localStorage `waste-change-selector.v1` 에 영속.

---

## 5. TR 변경사항 항목 (8개)

| ID | 라벨 | changeType | 조항 |
|---|---|---|---|
| `P01` | 수집·운반대상 폐기물의 변경 | 변경허가 | 시행규칙 제29조①1.가. |
| `P02` | 영업구역의 변경 | 변경허가 | 시행규칙 제29조①1.나. |
| `P03` | 주차장 소재지의 변경 | 변경허가 | 시행규칙 제29조①1.다. (지정폐기물 한정) |
| `V01` | 차량 변경 | **변경허가 + 변경신고** | 시행규칙 제29조①1.라. / 제33조①4. |
| `N01` | 상호의 변경 | 변경신고 | 시행규칙 제33조①1. (사후 30일) |
| `N02` | 대표자의 변경 | 변경신고 | 시행규칙 제33조①2. (사후 30일) |
| `N03` | 연락장소나 사무실 소재지의 변경 | 변경신고 | 시행규칙 제33조①3. (사전) |
| `N09` | 별표 7에 따른 기술능력의 변경 | 변경신고 | 시행규칙 제33조①9. (사후 30일) |

---

## 6. V01 차량 변경 — 핵심 로직

### 6.1 입력 표(섹션 1: `changes` repeat compact)

| 컬럼 | 키 | 타입 | 옵션 |
|---|---|---|---|
| 구분 | `category` | select | 전용차량 / **임시차량** (기본값: 전용차량) |
| 변경 전 | `before` | text | 차량등록번호 |
| 변경사항 | `change` | select | 증차 / 감차 / 기존 |
| 변경 후 | `after` | text | 차량등록번호 |
| 절차 | `procedure` | auto (hideFromUI) | `classifyVehicleProcedure` 결과 |

### 6.2 자동 동작 (사용자가 `change` 선택 시 — `v01SyncBeforeAfter`)
- **증차** → `before` 자동 비움 (새 차량만 의미)
- **감차** → `after` 자동 비움 (사라지는 차량만 의미)
- **기존** → `after` = `before` 복사 + 이후 `before` 수정 시 `after` 실시간 미러

### 6.3 절차 자동 판정 (`classifyVehicleProcedure`)

| 구분 | 변경사항 | 절차 |
|---|---|---|
| 전용차량 | 증차 | **변경허가** (시행규칙 제29조①1.라.) |
| 전용차량 | 감차 | 변경신고 (제33조①4.) |
| 임시차량 | 증차 | 변경신고 (제33조①4.) |
| 임시차량 | 감차 | 변경신고 (제33조①4.) |
| (모두) | 기존 | 변경 없음 — 페이로드 제외 |

### 6.4 증차 차량 제원 (섹션 2: `additions` derivedFrom)

`changes` 행 중 `classifyChange` 결과 = "증차" 인 행마다 카드 자동 생성. 사용자가 신규 차량의 제원을 입력. `additions[*].specs` 에 저장.

**제원 필드 (12개)**:
- vehicleType, ownerName, ownerRrn, manufacturer, typeApproval, firstRegDate, maxLoad, note
- **frontImageUrl, rearImageUrl, leftImageUrl, rightImageUrl** ← `_devNote: "기존 스타일대로 수정바람"` (현재 text 입력, **실제 파일 업로드 UI로 교체 필요**)

---

## 7. N02 대표자 변경

### 입력
- **변경 전 대표자** (`beforeRepresentatives` repeat): `name`, `birthDate` — 식별만
- **변경 후 대표자** (`afterRepresentatives` repeat): `name`, `residentId`, `domicile`, `phone` — 신청서용 풀 정보
- 둘 다 행 추가 가능 (공동대표)

### 권리·의무 승계 (법 제33조)
ℹ 아이콘 호버 시 팝오버 표시 (`tooltipInfo`).
- ① 양수·인수 → 허가 (법 제33조①)
- ② 법인 합병·분할 → 허가 (법 제33조②)
- ③ 상속 → 신고 (법 제33조③)

> 위 케이스에 해당하는 사용자는 **이 도구 사용 범위 외** — 별도 페이지에서 처리. 단순 대표자 변경(법 제33조 승계 제외)만 N02 사용.

### 신청인 정보와의 관계
- 신청인 정보의 `ownerName` ≈ N02 의 `afterRepresentatives[0].name` (보통 같은 사람)
- 자동 동기화 기능은 미구현 — **추후 추가 권장**

---

## 8. P01 수집·운반대상 폐기물의 변경

### 입력 표(`wasteChanges` repeat compact)

| 컬럼 | 키 | 타입 |
|---|---|---|
| 코드 | `wasteCode` | text + datalist (WASTE_DATA 352종 자동완성) |
| 폐기물명칭 | `wasteName` | auto (`lookupWasteName` — 코드로 자동 조회) |
| 변경사항 | `change` | select [추가, 제거, 기존] (기본값: 추가) |

### WASTE_DATA
- 352개 폐기물 코드+명칭 (`[{wasteCode, wasteName}, ...]`)
- 마스터 소스: `prisma-architect/data/wasteInformation.json`
- 현재 인라인 (~27KB) — 운영 시 별도 API 또는 정적 파일 추천

---

## 9. N09 별표 7 기술능력의 변경

두 섹션 모두 repeat compact (인원 추가 가능):
- **변경 전 기술인** (`beforePersonnel`): name, cert, birthDate
- **변경 후 기술인** (`afterPersonnel`): name, cert, birthDate

---

## 10. 최종 절차 판정

전체 페이로드에서 단 하나의 절차를 결정.

### 규칙
1. V01: 행 단위로 `classifyVehicleProcedure` 결과 누적
2. 그 외 항목: `item.changeType` (배열일 수 있음) 누적
3. **변경허가 1건이라도 있으면 → 변경허가**
4. 전부 변경신고만 → **변경신고**
5. 절차 발동 없음 (전부 변경 없음 or 빈 선택) → 빈값

### 페이로드 위치
- `payload.summary.finalProcedure: "변경허가" | "변경신고" | ""`
- `payload.summary.proceduresInvoked: ["변경허가", "변경신고"]` (사용된 절차 종류 배열)

### UI 표시
요약 카드 헤더 우측에 큰 뱃지 (변경허가: 보라, 변경신고: 청록).

---

## 11. 첨부서류 (data only, UI 미구현)

스키마 `item.attachments: string[]` — 항목별 안내문 배열.
공통 첨부서류는 `_meta.공통_첨부서류` / `_meta.적합성확인_첨부서류` 참고.

### 항목별 (현재 정의된 것)
- **V01**: 운반차량 증차계획서 / 임시차량증 발급신청서 / 수집·운반증 반납 / 차량등록증 사본 / 별지 제68호 서식
- **N09**: 자격증 사본 / 경력증명서 / 의료보험 가입 서류 (현장 확인)

### 출처
- 폐기물처리업 허가 등에 관한 업무처리지침 (기후에너지환경부예규 제4호, 2025-11-05)
- 적합성확인 제도 운영 가이드라인 (2025.4)

---

## 12. 페이로드 구조

```ts
type Payload = {
  meta: {
    tool: "waste-change-selector";
    version: string;
    exportedAt: string;   // ISO timestamp
    bizType: "TR";
    bizTypeLabel: "폐기물수집운반업";
    law: { 법령: string[]; 시행일자: string };
  };
  applicant: {            // 신청인 정보 9개 필드 ↑
    businessName: string;
    businessRegNumber: string;
    ownerName: string;
    corporationRegNumber: string;
    businessAddress: string;
    businessPhone: string;
    wasteIndustryType: string;
    date: string;
    submissionOffice: string;
  };
  selections: Selection[];
  summary: {
    selectionCount: number;
    finalProcedure: "변경허가" | "변경신고" | "";
    proceduresInvoked: ("변경허가" | "변경신고")[];
    vehicleChangesProcedures?: { [proc: string]: number };
  };
}

type Selection = {
  id: string;
  label: string;
  description: string;
  changeType: string[];   // 항상 배열로 정규화
  조항: string[];
  신고시점: string | null;
  조건: string | null;
  비고: string | null;
  tooltipInfo?: TooltipInfo;
  attachments?: string[];
  data: { [fieldKey: string]: any };   // 폼 데이터
}
```

### 샘플
- `payload-sample.json` — V01 에 전용+증차 행 있어 finalProcedure="변경허가"
- `payload-sample-notify.json` — V01 행이 감차/임시증차만 → finalProcedure="변경신고"

### 자동 필터링 (페이로드 출력 시)
- **빈 행 제외**: 모든 사용자 입력 필드가 비어있으면 페이로드에서 제외 (기본값만 자동 채워진 행도 포함)
- **"기존" 행 제외**: V01 의 `change === "기존"` 행은 페이로드에서 제외 (변경 없음)
- **derivedFrom 자동 필터**: `additions` 는 source 의 `classifyChange === "증차"` 행만 자동 포함

---

## 13. 구현 시 주의사항

### 13.1 권한·역할 분리
- 사용자는 변경사항을 **선택만** — 실제 신청서 PDF/Word 생성·법령 검토는 다운스트림 시스템.

### 13.2 필수값 검증 (현재 미구현)
- 신청인 정보 9개 필드 — 빈 값 허용. 운영 시 필수 표시·검증 필요.
- 항목 선택했는데 form 데이터 비어있으면 — 현재 단순 제외. 경고 표시 권장.
- 사업자등록번호·주민등록번호·전화번호 format 검증 — 미구현.

### 13.3 차량 사진 4면
- 현재 `text` 입력 (URL 직접 입력) — `_devNote: "기존 스타일대로 수정바람"`
- **파일 업로드 UI(드래그 앤 드롭, 미리보기, S3/저장소 업로드 등) 로 교체 필요**

### 13.4 동기화
- 신청인 정보의 `ownerName` ↔ N02 `afterRepresentatives[0].name` — 보통 같은 사람
- 양방향 동기화 또는 한쪽 자동 채움 옵션 권장

### 13.5 데이터 저장
- 현재 localStorage 영속 (key: `waste-change-selector.v1`)
- 운영 시: 서버 세션·DB 저장 + 작성 중 자동저장 + 임시저장 목록

### 13.6 권리·의무 승계 분기
- N02 에 ℹ 툴팁으로 안내만 — 사용자가 해당 케이스면 **별도 페이지로 이동 안내** 필요
- 현재 도구는 단순 대표자 변경(승계 제외)만 다룸

### 13.7 모바일/반응형
- V01 5컬럼 표가 좁은 화면에서 입력칸 너무 좁아짐 — 모바일 친화 디자인 필요 (카드형 전환 등)

### 13.8 SW/PWA 캐시
- 프로토타입엔 미적용 — 운영 시 캐시 전략 결정

---

## 14. 추후 작업 / 미구현 항목

- [ ] 다른 처리업 지원 (ID/FD/IR/FR/CR) — `bizType` 셀렉터 부활 + 항목 노출 조건
- [ ] 신청인-N02 대표자 자동 동기화
- [ ] 폼 완성도 검증 + 시각 경고 (선택했지만 form 미입력)
- [ ] 차량 사진 4면 — 파일 업로드 UI
- [ ] 사업자등록번호·주민등록번호·전화번호 format 검증
- [ ] JSON 다운로드/페이로드 export 버튼
- [ ] 권리·의무 승계 케이스 별도 페이지
- [ ] 모바일 반응형
- [ ] 임시저장 다중 슬롯 + 작성 중 자동 저장 표시

---

## 15. 참고 파일

| 위치 | 내용 |
|---|---|
| `D:\dev\tools\법령API_사용법.md` | 국가법령정보 OPEN API 호출 방법 (OC=123) |
| `D:\dev\tools\tools\prisma-architect\data\waste\law_reference\` | 폐기물관리법 본법·시행규칙·운영 문서 원문 |
| `D:\dev\tools\tools\prisma-architect\data\wasteInformation.json` | 폐기물 코드 352종 마스터 |

---

## 부록 A — 법령 매트릭스 (차량 변경)

```
                ┌─ 변경사항 ─┐
구분            증차      감차      기존
─────────────────────────────────────
전용차량      변경허가  변경신고   없음     ← 시행규칙 제29조①1.라. / 제33조①4.
임시차량      변경신고  변경신고   없음     ← 시행규칙 제33조①4.
```

## 부록 B — 카드 번호

1. **신청인 정보** — 상호·대표자·주소 등 9개 필드
2. **변경사항 선택** — TR 8개 항목 체크 + 항목별 입력 폼
3. **선택 요약** — 선택한 항목 일람 + 최종 절차 뱃지 + 복사 버튼
