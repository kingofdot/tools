# prisma-architect 설계 가이드

> 기획자가 DB스키마 → UI모델 → UI테스트 흐름으로 웹 화면을 프로토타이핑하는 도구.
> 실제 웹 개발자에게 넘기기 전 단계의 설계 플레이그라운드.

---

## 전체 아키텍처

```
DB 모델 (Prisma schema)
    ↓  필드 존재 선언
UI 모델 (metaStore)
    ↓  각 필드에 메타 + 트리거 선언
UI 테스트 (fn-engine + CellGrid)
    ↓  선언만으로 동작 시뮬레이션
조립모델 (미구현)
    ↓  화면 레이아웃 + 모델 간 데이터 흐름
실제 웹 서비스 이식
```

### 3계층 책임

| 계층 | 파일 | 역할 |
|---|---|---|
| 셀 | `cell.js` | 최소 렌더 단위. 타입별 위젯 정의 |
| UI모델 | `ui-panel.js` + `schema-data.json` | 필드별 메타 + 트리거 선언 |
| 엔진 | `fn-engine.js` + `fn-definitions.js` | 트리거 기반 함수 실행 |

---

## 셀 컴포넌트 시스템 (cell.js)

셀 하나 = **표시(display)** + **편집(input)** 두 레이어.

```html
<td class="cell" data-row="0" data-col="1" data-cell-type="text">
  <span class="cell-display">홍길동</span>       ← Selected 상태
  <input class="cell-input" style="display:none"> ← Editing 상태
</td>
```

### 등록된 타입

| type | 위젯 | 특이사항 |
|---|---|---|
| `text` | `<input type="text">` | 기본값 |
| `number` | `<input type="number">` | 우측 정렬 |
| `date` | `<input type="date">` | |
| `select` | `<select>` | 수정불가 드롭다운. comboboxName → optionsResolver |
| `combobox` | `<input list="datalist">` | 검색 + 직접 입력 가능 |
| `boolean` | `<select>` true/false | |
| `calculation` | `<input readonly>` | 함수 결과 자동 세팅. 수정불가 |
| `calculation_editable` | `<input>` | 함수 결과 자동 세팅. 수정 가능 |
| `lookup_readonly` | `<input readonly>` | |
| `lookup_editable` | `<select>` or `<input>` | dataSource 있으면 select |
| `hidden` | 없음 | 렌더 자체 스킵 |

### select vs combobox

| | `select` | `combobox` |
|---|---|---|
| 직접 입력 | 불가 | 가능 |
| 검색/필터 | 불가 | 브라우저 기본 필터 |
| 용도 | 코드 등 정해진 값 | 이름처럼 수정 여지 있는 값 |

### calculation vs calculation_editable

| | `calculation` | `calculation_editable` |
|---|---|---|
| 함수 타입 | Calculation | Lookup |
| 사용자 수정 | 불가 | 가능 |
| 예시 | Area = 너비×길이 | wasteName (코드 선택 후 수정 가능) |

### buildCell()

```javascript
buildCell({
  type:       'select',
  value:      '서울',
  meta:       { comboboxName: 'CITY' },
  row:        0,
  col:        2,
  mockField:  'Order.city.0',    // data-mockfield 값
  extraClass: 'cell--fn-input',  // 추가 CSS 클래스
})
```

### data-mockfield 패턴

| 맥락 | 패턴 | 예시 |
|---|---|---|
| 엑셀 뷰 | `ModelName.fieldName.rowIndex` | `WasteStorageFacility.Area.0` |
| 1:1 폼 | `ModelName.fieldName` | `Facility.name` |

### CellGrid 이벤트

| 이벤트 | 동작 |
|---|---|
| `onCommit` | 값 확정 시 → `_autoStoreSet` + `runOnChange` |
| `onSelect` | 셀 선택 시 → `runOnClick` |
| `focusout` | 그리드 밖 클릭 시 → Selected 해제 |
| `change` | select/combobox/boolean → 즉시 commit |

### CSS 클래스

| 클래스 | 의미 |
|---|---|
| `.cell--selected` | 선택됨 (파란 테두리) |
| `.cell--editing` | 편집 중 |
| `.cell--fn-input` | 함수 입력 파라미터 셀 (연초록) |
| `.cell--fn-output` | 함수 출력 결과 셀 (연붉은) |

---

## UI모델 헤더 정의

metaStore의 각 필드에 붙는 메타 컬럼 전체 목록.

### 기본 정보

| 헤더 | 타입 | 설명 |
|---|---|---|
| `label` | text | 필드 라벨 텍스트 |
| `commentary` | text | input placeholder |
| `isRequired` | combo | 필수값 여부 → `*` 표시 |
| `defaultValue` | text | 초기값 |

### 노출 조건

| 헤더 | 연결 뷰 | 설명 |
|---|---|---|
| `initialCreation` | 생성폼 | true인 필드만 최초 생성 화면에 표시 |
| `showNode` | 목록뷰 | true인 필드만 목록 컬럼 표시 |
| `showNodeDetail` | 상세뷰 | true인 필드만 상세 화면 표시 |
| `creationConditions` | 조건부 | 동적 show/hide 조건식 |

### 타입 & 위젯

| 헤더 | 설명 |
|---|---|
| `systemType` | 셀 위젯 타입 (cell.js 키와 1:1 대응) |
| `variableType` | DB 변수 타입 (text/integer/float/date/boolean/json) |
| `width` | 컬럼 너비 (px) |

### 데이터 연결

| 헤더 | 설명 |
|---|---|
| `comboboxName` | select/combobox용 옵션 그룹 키 → comboboxStore에서 목록 조회 |
| `dbTable` | DB 연결 타입(db_select/db_combobox)에서 참조할 데이터 테이블 |
| `dbColumn` | dbTable의 어느 컬럼을 목록으로 쓸지 |
| `syncGroup` | 같은 그룹명끼리 양방향 자동 연동 (wasteCode↔wasteName) |
| `dataSource` | 다른 모델에서 빌려온 필드 표시 (UI 조립용, 데이터 중복 방지) |

### 트리거 (함수 연결)

| 헤더 | 발동 시점 | 예시 |
|---|---|---|
| `onClick` | 셀 클릭/선택 시 | recyclingCode 클릭 → 선택지 갱신 |
| `onChange` | 값 확정 시 | wasteCode 변경 → lookupWaste |
| `focusOut` | 포커스 이탈 시 | 유효성 검사 |
| `realtime` | 타이핑 중 | 실시간 검색/미리보기 |

---

## 시스템 타입별 주요 헤더 (힌트)

| systemType | 필수 헤더 | 흐린 헤더 |
|---|---|---|
| `select` / `combobox` | comboboxName | dbTable, dbColumn, syncGroup |
| `db_select` / `db_combobox` | dbTable, dbColumn, syncGroup | comboboxName |
| `calculation` | onChange | comboboxName, dbTable, onClick, focusOut |
| `calculation_editable` | onChange | comboboxName, dbTable, onClick, focusOut |
| `lookup_readonly/editable` | dataSource | comboboxName, dbTable |
| `hidden` | (전부 흐림) | |

---

## 함수 시스템

### 함수 3가지 타입

#### Calculation — 단일 계산값

```javascript
FunctionRegistry.register('calcArea', {
  outputField: 'Area',     // 결과를 세팅할 필드명
  watch: ['bottomShape', 'diameter', 'width', 'length'],  // 파라미터 수집 필드
  outputType: 'float',
  fn(params) { return '123.4'; }
});
```

UI모델에서: 입력 필드들에 `onChange = calcArea` 선언.

#### Lookup — 여러 필드에 값 세팅

```javascript
FunctionRegistry.register('lookupWaste', {
  outputFields: ['wasteName'],  // 결과를 세팅할 필드들
  watch: ['wasteCode'],
  fn(params) {
    const r = WasteMasterDB.find(r => r.wasteCode === params.wasteCode);
    return r ? { wasteName: r.wasteName } : null;
  }
});
```

UI모델에서: 트리거 필드에 `onChange = lookupWaste` 선언.
- Lookup 결과가 다시 Lookup을 트리거하지 않음 (`calcOnly: true` — 무한루프 방지)

#### Options — 드롭다운 선택지 교체

```javascript
FunctionRegistry.register('optionsRecyclingCode', {
  optionsOutput: 'recyclingCode',  // 선택지를 바꿀 필드
  watch: ['preAnalysisRequired', 'wasteCode'],
  fn(params) { return ['R-1', 'R-2', ...]; }
});
```

UI모델에서: 대상 필드에 `onClick = optionsRecyclingCode` 선언.

### 트리거 실행 흐름

```
셀 값 확정 (onCommit)
  → _autoStoreSet(modelName, fieldName, rowIndex, value)  // store 갱신
  → runOnChange(modelName, fieldName, rowIndex)
      → metaStore[modelName][fieldName].onChange 읽기
      → _executeByTrigger(fnName)
          ├── Calculation → _executeFunction → 체인: runOnChange(outputField)
          ├── Lookup      → _executeLookup   → 체인: runOnChange(각 outputField, calcOnly)
          └── Options     → _executeOptions  → _updateCellOptions

셀 선택 (onSelect)
  → runOnClick(modelName, fieldName, rowIndex)
      → metaStore[modelName][fieldName].onClick 읽기
      → _executeByTrigger(fnName)
```

### 체인 실행 (Calculation)

```
bottomShape 변경
  → onChange=calcArea → Area 업데이트
    → onChange=calcVolume → volume 업데이트
      → onChange=calcStorageAmount → storageAmount 업데이트
```

### WasteTargetItem 트리거 현황

| 필드 | onClick | onChange |
|---|---|---|
| wasteCode | | lookupWaste |
| wasteName | | lookupWasteByName |
| recyclingCode | optionsRecyclingCode | |

### WasteStorageFacility 트리거 현황

| 필드 | onChange |
|---|---|
| bottomShape, diameter, width, length, topSide, bottomSide, verticalSide | calcArea |
| Area, height | calcVolume |
| volume, quantity | calcStorageAmount |

---

## Auto-store (mockStore)

셀 commit 시 자동으로 mockStore 갱신. 저장 버튼 없음.

```javascript
_autoStoreSet(modelName, fieldName, rowIndex, value)
// 엑셀: mockStore[modelName][rowIndex][fieldName] = value
// 폼:   mockStore[modelName][fieldName] = value
```

---

## 소수점 표시 (Calculation 컬럼)

- 헤더 위에 `−` / `+` 버튼으로 자릿수 조절 (기본 2자리)
- 컬럼 내 최대 유효 소수 자리 기준으로 전체 통일 표시
- 정수이면 소수점 없이 표시 (`4.00 → 4`)
- store는 항상 raw 숫자. display만 포매팅.

---

## WasteMasterDB

`data/wasteInformation.js` — 352개 폐기물 레코드 (script 태그 로드)

```javascript
WasteMasterDB = [
  { wasteCode, wasteName, recyclingCodeNone, recyclingCodeCorrespond },
  ...
]
```

`initWasteMaster()` — comboboxStore에 WasteCode/WasteName 목록 등록.
GitHub 불러오기 후에도 재호출 필요.

---

## 조립모델 (설계 완료, 미구현)

여러 UI모델을 조합해 화면을 구성하고 모델 간 데이터 흐름을 관리.

```javascript
assemblyStore = {
  'WasteManagementScreen': {
    layout: [
      { model: 'WasteTargetItem',      view: 'excel' },
      { model: 'WasteStorageFacility', view: 'excel' },
    ],
    flows: [
      {
        type:      'lookup',
        watch:     { model: 'WasteTargetItem', field: 'wasteCode' },
        fn:        'crossLookupWasteCode',
        output:    { model: 'WasteStorageFacility', field: 'wasteCode' },
        rowMap:    'same',  // 'same' | 'broadcast'
      }
    ]
  }
}
```

UI모델 함수(같은 모델 내) vs 조립모델 플로우(모델 간):

| | UI모델 트리거 | 조립모델 플로우 |
|---|---|---|
| 범위 | 같은 모델 내 | 다른 모델 간 |
| 선언 위치 | onClick/onChange 컬럼 | flows 배열 |
| 현황 | ✅ 구현 완료 | ❌ 미구현 |

---

## 실제 웹 이식 대응표

| prisma-architect | 실제 웹 서비스 |
|---|---|
| `metaStore` | pageLoader.js/DynamicTable이 읽는 JSON 스키마 |
| `fn-definitions.js` | `세부함수.js` (페이지별 맞춤 로직) |
| `FunctionRegistry` | 함수 export 모음 |
| `mockStore` | Zustand draftStore |
| `_autoStoreSet` | `useStore.getState().updateCell()` |
| `runOnChange` | onChange 핸들러 내 함수 호출 |
| `runOnClick` | onFocus 핸들러 |
| `data-mockfield` | draftData 필드 경로 |
| `CellGrid` | React 컴포넌트 (dangerouslySetInnerHTML 또는 직접 포팅) |
| `comboboxStore` | Zustand comboStore / API 응답 |

---

## 미결/예정 항목

- [ ] **조립모델 구현** — 화면 레이아웃 + 모델 간 데이터 흐름
- [ ] **db_select/db_combobox/syncGroup 엔진** — 선언만으로 양방향 연동
- [ ] **cross-row 연산** — N행 합산 등 `storeAction` 개념 설계 필요
- [ ] **focusOut / realtime 트리거** — 엔진 연결 미구현
- [ ] **creationConditions** — 조건부 표시 문법 정의
- [ ] **범위 선택 + 복사/붙여넣기** — CellGrid 확장
- [ ] **모바일 터치** — 탭→Selected, 더블탭→Editing
