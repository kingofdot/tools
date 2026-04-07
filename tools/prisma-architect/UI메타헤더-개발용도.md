# UI 메타헤더 개발 용도 정의

> prisma-architect UI관리 탭에서 정의하는 metaStore 컬럼들이
> 실제 서대리 웹 서비스의 각 계층에서 어떻게 소비되는지 정리한 참조 문서.

---

## 전체 데이터 흐름

```
Prisma 스키마 (fieldName 원본)
        ↓
prisma-architect UI관리 탭
  → metaStore[Model][field] = { label, variableType, fnName, ... }
        ↓
JSON으로 export (schema-data.json)
        ↓
pageLoader.js(DynamicTable)가 읽어서 UI를 동적 렌더
        ↓
사용자 입력 → fnTriggerEvent 발동 → 세부함수.js 호출 → Zustand store 갱신
```

---

## 서대리 웹 서비스 전체 시스템

```
📦 서대리 웹 서비스 전체 시스템
 ┃
 ┣ 🗄️ 1. 데이터베이스 계층 (Database Layer) ─ "절대 변하지 않는 원본"
 ┃ ┣ 🐘 PostgreSQL DB       # 실제 데이터가 저장되는 영구 저장소 (SSOT)
 ┃ ┗ 🔗 Prisma ORM          # DB와 백엔드를 이어주는 다리 (스키마 및 엄격한 타입 관리)
 ┃
 ┣ ⚙️ 2. 백엔드/API 계층 (Backend Layer) ─ "문지기"
 ┃ ┗ 🚀 Next.js API 라우트  # 프론트엔드의 요청을 받아 Prisma를 통해 DB 조회/수정
 ┃
 ┣ 🏪 3. 프론트엔드 스토어 계층 (State Management Layer) ─ "임시 작업장 (Draft)"
 ┃ ┣ 📥 Server State        # (TanStack Query) 백엔드에서 가져온 원본 데이터 (캐싱)
 ┃ ┗ 🗂️ Client Store        # (Zustand) 사용자가 화면에서 수정 중인 임시 데이터(Draft)
 ┃                          # ├─ originalData: 취소(Undo)를 대비해 보관 중인 원본
 ┃                          # ├─ draftData: 편집 중인 데이터 (시설과 폐기물은 ID로만 연결)
 ┃                          # └─ Actions: updateCell(), saveToDB() 등의 상태 변경 함수들
 ┃
 ┣ 🧠 4. 로직 계층 (Logic Layer) ─ "계산기 & 두뇌"
 ┃ ┣ 📜 대함수.js           # [공통 코어 로직] 사칙연산, 포맷팅, 빈 값 검증 등 (재사용률 100%)
 ┃ ┗ 📜 세부함수.js         # [페이지별 맞춤 로직] 특정 스키마(업종별) 전용 계산
 ┃                          # └─ 사용자가 값 입력 → Store의 draftData를 읽어 대함수로 계산 → 다시 Store에 꽂음
 ┃
 ┗ 💻 5. 뷰 & 렌더링 계층 (View Layer) ─ "사용자의 눈과 손"
   ┣ 📜 data.js (Fetcher)   # 백엔드 API와 통신 전담 (데이터 가져오기 / 저장 시 DB로 전송)
   ┣ 📜 pageLoader.js       # (DynamicTable 컴포넌트) JSON 스키마를 읽어 표와 폼을 동적으로 그림
   ┃                        # └─ Store의 draftData를 바라보다가 값이 바뀌면 즉시 리렌더링
   ┗ 📄 Next.js 페이지      # 사용자가 접속하는 실제 주소 (예: /permit/transport)
                            # └─ "<DynamicTable targetGroup='VEHICLE' />" 한 줄로 화면 완성
```

---

## 헤더별 소속 계층과 개발 용도

### 🟦 View Layer — pageLoader.js(DynamicTable)가 직접 소비

| 헤더명 | 개발 용도 | 사용 예시 |
|---|---|---|
| `label` | 필드 옆 표시 텍스트 | `사업자등록번호` |
| `commentary` | input의 placeholder | `000-00-00000 형식으로 입력` |
| `variableType` | 렌더할 컴포넌트 종류 결정 | `text`→`<input>`, `combo`→`<select>`, `date`→datepicker |
| `width` | 컴포넌트 CSS 너비 | `200px`, `100%` |
| `comboboxName` | combo일 때 옵션 데이터 그룹 키 | `INDUSTRY_TYPE` → 코드 테이블에서 options 조회 |
| `dataSource` | 다른 모델을 참조하는 드롭다운 | `User` → User 모델 목록을 API로 가져와 `<select>` |
| `isRequired` | 라벨에 `*` 표시 + 저장 전 필수값 검증 | `true` |

### 🟩 View Layer — 뷰 모드별 노출 조건 필터링

| 헤더명 | 연결 뷰 모드 | 개발 용도 |
|---|---|---|
| `initialCreation` | 생성폼 | `true`인 필드만 최초 생성 화면에 렌더 |
| `showNode` | 목록뷰(테이블/카드) | `true`인 필드만 목록 컬럼으로 표시 |
| `showNodeDetail` | 상세뷰 | `true`인 필드만 상세 화면에 표시 |
| `creationConditions` | 조건부 노출 | `"otherField === 'A'"` 식을 eval해서 동적 show/hide |

### 🟨 Client Store — Zustand draftData와 연결

| 헤더명 | 개발 용도 |
|---|---|
| `defaultValue` | 화면 진입 시 Zustand draftData에 꽂히는 초기값 |
| `fnOutputTarget` | 함수 실행 결과를 꽂을 draftData 경로 (`draftData.calculatedTax`) |

### 🟥 Logic Layer — 세부함수.js 연결 (핵심 브릿지)

| 헤더명 | 개발 용도 |
|---|---|
| `fnTriggerEvent` | 어떤 이벤트에 함수를 실행할지 (`onChange` / `onBlur` / `onSubmit` / `onLoad`) |
| `fnName` | 호출할 함수명 — `세부함수.js`에 export된 함수명과 1:1 매칭 |
| `fnInputParams` | 함수에 넘길 인자 — store 경로로 기술 (`draftData.bizNum,draftData.ownerName`) |
| `fnOutputTarget` | 함수 리턴값을 꽂을 store 경로 (`draftData.calculatedTax`) |
| `fnSyncCondition` | 함수 실행 전제 조건 (`draftData.useAutoCalc === true`일 때만 실행) |

---

## 함수 연결 실행 흐름

```
사용자가 businessRegNumber 입력
        ↓
onChange 이벤트 발생
        ↓
pageLoader.js: 해당 field의 meta 조회
  → fnTriggerEvent === 'onChange' ✓
  → fnName === 'calcTaxBase'
  → fnInputParams === 'draftData.businessRegNumber,draftData.ownerName'
        ↓
세부함수.js의 calcTaxBase(param1, param2) 호출
  → 내부에서 대함수.js의 formatBizNum(), validateLength() 등 사용
        ↓
리턴값을 fnOutputTarget('draftData.taxBase')에 꽂음
  → Zustand store.updateCell('taxBase', result)
        ↓
taxBase 필드를 바라보던 컴포넌트가 자동 리렌더
```

### fnTriggerEvent 값 정의

| 값 | 발동 시점 |
|---|---|
| `onChange` | 사용자가 값을 바꿀 때마다 (실시간) |
| `onBlur` | 필드에서 포커스를 벗어날 때 (1회) |
| `onSubmit` | 저장 버튼 클릭 시 전체 일괄 실행 |
| `onLoad` | 화면 진입 시 자동 실행 (초기값 계산) |

---

## 계층별 헤더 소속 한눈에 보기

```
┌──────────────────────────────────────────────────────────┐
│  DB / Prisma 계층                                         │
│  fieldName (원본 식별자, metaStore의 행 키)               │
├──────────────────────────────────────────────────────────┤
│  Client Store (Zustand draftData)                         │
│  defaultValue · fnOutputTarget                            │
├──────────────────────────────────────────────────────────┤
│  Logic Layer (세부함수.js + 대함수.js)                     │
│  fnName · fnInputParams · fnOutputTarget                  │
│  fnTriggerEvent · fnSyncCondition · creationConditions    │
├──────────────────────────────────────────────────────────┤
│  View Layer (pageLoader.js / DynamicTable)                │
│  label · commentary · variableType · width                │
│  isRequired · defaultValue · comboboxName · dataSource    │
│  initialCreation · showNode · showNodeDetail              │
└──────────────────────────────────────────────────────────┘
```

---

## 헤더 추가 시 체크리스트

새 헤더를 추가할 때마다 확인:

1. **어느 계층**이 이 값을 소비하는가? (View / Store / Logic)
2. **타입** — `text` (자유입력) / `combo` (선택지 고정) / `model` (모델 참조)
3. **uiRole** — 현재 정의된 UI_ROLES 중 어디에 해당하는가, 아니면 `none`인가
4. **pageLoader.js에서 어떻게 읽을 것인가** — 단순 속성값 / 조건식(eval) / 함수 호출
