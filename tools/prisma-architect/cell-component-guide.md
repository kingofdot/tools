# 셀 컴포넌트 시스템 개발 가이드

> `cell.js` 기반. UI생성테스트 → 실제 서비스로 이식할 때 이 파일을 기준으로 개발한다.

---

## 핵심 개념

셀 하나를 **표시(display)**와 **편집(input)** 두 레이어로 분리한다.

```
<td class="cell" data-row="0" data-col="1" data-cell-type="text">
  <span class="cell-display">홍길동</span>          ← 평소에 보임 (Selected 상태)
  <input class="cell-input" style="display:none">   ← 편집할 때만 보임 (Editing 상태)
</td>
```

이 구조 덕분에:
- 렌더(HTML)와 동작(JS)이 완전히 분리됨
- 컴포넌트를 교체해도 CellGrid는 건드릴 필요 없음

---

## 파일 구조

```
cell.js
├── CellComponents       — 타입별 최소 컴포넌트 정의
├── buildCell()          — 컴포넌트 → <td> 조립 함수
└── CellGrid             — 키보드/상태/이벤트 관리
```

---

## CellComponents — 컴포넌트 최소 인터페이스

컴포넌트는 이 3가지만 구현하면 된다.

```javascript
{
  renderInput(value, meta)   → HTML string   // 편집 상태 위젯 (display:none으로 시작)
  renderDisplay(value, meta) → HTML string   // 표시 상태 (텍스트, rich HTML 가능)
  editable: boolean                          // false면 편집 진입 안 함

  // 선택 옵션
  readonly?: boolean   // editable=false + 시각적 잠금 표시
  hidden?:  boolean    // 이 타입이면 렌더 자체 스킵
}
```

### 현재 등록된 타입

| type | 편집 위젯 | 특이사항 |
|---|---|---|
| `text` | `<input type="text">` | 기본값 |
| `number` | `<input type="number">` | 우측 정렬 |
| `date` | `<input type="date">` | showPicker() 시도 |
| `datetime` | `<input type="datetime-local">` | |
| `select` | `<select>` | 수정 불가 드롭다운. comboboxName → optionsResolver |
| `combobox` | `<input list="datalist">` | **검색 + 직접 입력 가능** 드롭다운. datalist로 구현 |
| `boolean` | `<select>` true/false | display에 색상 표시 |
| `calculation` | `<input readonly>` | editable: false. 함수 결과가 자동으로 채워짐 |
| `lookup_readonly` | `<input readonly>` | editable: false |
| `lookup_editable` | `<select>` (dataSource 있을 때) | |
| `json` | `<textarea>` monospace | |
| `hidden` | 렌더 없음 | td 자체 생성 안 함 |

#### select vs combobox

| | `select` | `combobox` |
|---|---|---|
| 편집 위젯 | `<select>` | `<input type="text" list="datalist-id">` + `<datalist>` |
| 직접 입력 | 불가 | 가능 (목록 외 값 입력 가능) |
| 검색/필터 | 불가 | 가능 (브라우저 기본 필터) |
| 용도 | 코드, 상태 등 정해진 값만 | 이름처럼 목록 참고하되 수정 여지 있는 값 |

---

## buildCell() — 조립 함수

컴포넌트 스펙을 받아 `<td>` 하나를 만든다.  
CellGrid 없이도 단독으로 쓸 수 있다.

```javascript
buildCell({
  type:       'select',                  // CellComponents 키
  value:      '서울',                    // 현재 값
  meta:       { comboboxName: 'CITY' }, // 필드 메타
  row:        0,                         // 그리드 행 좌표
  col:        2,                         // 그리드 열 좌표
  mockField:  'Order.city.0',           // data-mockfield 값 (선택)
  extraClass: 'cell--fn-input',         // 추가 CSS 클래스 (선택) ← NEW
})
// → <td class="cell cell--fn-input" data-row="0" data-col="2" data-cell-type="select" tabindex="0">
//     <span class="cell-display">서울</span>
//     <select class="cell-input" data-mockfield="Order.city.0" style="display:none">...</select>
//   </td>
```

### data-mockfield 패턴

셀 입력 요소에 붙는 식별자. fn-engine과 ui-test가 이 속성으로 DOM 조회.

| 맥락 | 패턴 | 예시 |
|---|---|---|
| 엑셀 뷰 (CellGrid) | `"ModelName.fieldName.{rowIndex}"` | `"WasteStorageFacility.Area.0"` |
| 1:1 폼 (buildInput) | `"ModelName.fieldName"` | `"Facility.name"` |

---

## CellGrid — 키보드/상태 관리

`buildCell`로 만든 td들이 들어있는 컨테이너에 붙인다.

```javascript
const grid = new CellGrid(containerEl, {
  onCommit: (row, col, value) => { /* store 업데이트 */ },
  onSelect: (row, col) => { /* 선택 위치 추적 */ },
});

// 프로그래매틱 조작
grid.select(0, 0);      // (0,0) 셀 선택
grid.startEdit(0, 0);   // 편집 모드 진입
grid.commit();          // 편집 확정
grid.revert();          // 편집 취소 (원래값 복원)
grid.destroy();         // 이벤트 해제 (리렌더 전 필수)
```

### 키보드 동작

| 상태 | 키 | 동작 |
|---|---|---|
| Selected | ↑↓←→ | 셀 이동 |
| Selected | Enter / F2 | 편집 진입 (값 유지, 커서 끝) |
| Selected | 타이핑 | 편집 진입 (기존값 지우고) |
| Selected | Del / Backspace | 값 삭제 |
| Editing | Esc | 편집 취소, 원래값 복원 |
| Editing | Enter / Tab | 편집 확정, 다음 셀 이동 |
| Editing | ↑↓ | 편집 확정, 위/아래 셀 이동 |
| Editing (text) | ← (커서 맨 앞) | 편집 확정, 왼쪽 셀 이동 |
| Editing (text) | → (커서 맨 끝) | 편집 확정, 오른쪽 셀 이동 |

### 추가 이벤트 처리 (NEW)

CellGrid는 키보드 외에 두 가지 DOM 이벤트를 추가로 처리한다.

| 이벤트 | 대상 | 동작 |
|---|---|---|
| `focusout` | 그리드 외부 클릭 | Selected 상태 해제 (파란 테두리 제거) |
| `change` | `select`, `combobox`, `boolean` | 드롭다운 선택 즉시 commit() 호출 |

`change` 이벤트 덕분에 드롭다운을 선택하는 순간 `onCommit`이 호출되어  
함수 연동(fn-engine)이 즉시 실행된다. 키보드 Enter 없이도 동작.

---

## 외부 데이터 주입 — optionsResolver

select/combobox 타입의 선택지는 외부에서 공급한다.  
환경(prisma-architect, 실제 서비스, 테스트)마다 다르게 주입.

```javascript
// prisma-architect (현재)
CellComponents.configure({
  optionsResolver: (groupName) => comboboxStore[groupName] || [],
});

// 실제 서비스 (Zustand)
CellComponents.configure({
  optionsResolver: (groupName) => useComboStore.getState().options[groupName] || [],
});

// 테스트
CellComponents.configure({
  optionsResolver: () => ['옵션A', '옵션B', '옵션C'],
});
```

---

## 커스텀 컴포넌트 추가 / 교체

기존 타입 교체나 새 타입 추가는 `register()`로.

```javascript
// 기존 text 타입을 rich text editor로 교체
CellComponents.register('text', {
  editable: true,
  renderInput(val, meta) {
    return `<div class="cell-input rich-editor" contenteditable style="display:none">${val}</div>`;
  },
  renderDisplay(val) {
    return val || `<span class="cell-ph">입력...</span>`;
  },
});

// 새 타입 추가: 파일 업로드 셀
CellComponents.register('file', {
  editable: true,
  renderInput(val) {
    return `<input type="file" class="cell-input" style="display:none">`;
  },
  renderDisplay(val) {
    return val ? `📎 ${val}` : '';
  },
});
```

---

## 함수 연동 시스템 (구현 완료)

UI관리 탭에서 정의한 `fnName` 메타를 fn-engine이 실행한다.

### 전체 흐름

```
사용자 입력 → CellGrid onCommit / buildInput onchange
  → _autoStoreSet(modelName, fieldName, rowIndex, value)   // mockStore 자동 갱신
  → runFunctions(modelName, changedField, rowIndex)          // fn-engine
       ↓
  FunctionRegistry.findByWatch(changedField)    // 이 필드를 watch하는 함수 목록
       ↓
  타입별 분기
  ├── Calculation  → _executeFunction()  → 결과를 calculation 셀에 세팅
  ├── Lookup       → _executeLookup()    → 결과를 outputFields 셀들에 세팅
  └── Options      → _executeOptions()   → 대상 셀의 드롭다운 선택지 교체
```

### 함수 3가지 타입 (fn-definitions.js)

#### 1. Calculation — 단일 값 계산

```javascript
FunctionRegistry.register('calcArea', {
  watch: ['bottomShape', 'diameter', 'width', 'length'],  // 이 필드가 바뀌면 실행
  outputType: 'float',
  fn(params) { /* params.bottomShape, params.diameter … */ return '123.4'; }
});
```

- `metaStore[modelName][fieldName].systemType === 'calculation'` 이고 `fnName === 'calcArea'` 인 셀에 결과 세팅
- 결과 셀이 바뀌면 그 셀을 watch하는 함수도 체인 실행 (Area → volume → storageAmount)

#### 2. Lookup — 여러 필드에 값 세팅

```javascript
FunctionRegistry.register('lookupWaste', {
  watch: ['wasteCode'],
  outputFields: ['wasteName'],           // 결과를 세팅할 필드 목록
  fn(params) {
    const record = WasteMasterDB.find(r => r.wasteCode === params.wasteCode);
    return record ? { wasteName: record.wasteName } : null;
  }
});
```

- `outputFields`에 나열된 필드들을 직접 갱신
- Lookup 결과가 다시 다른 Lookup을 트리거하지 않음 (`calcOnly: true` — 무한루프 방지)
- 결과가 바뀐 필드는 Calculation 트리거는 계속 체인

#### 3. Options — 드롭다운 선택지 동적 교체

```javascript
FunctionRegistry.register('optionsRecyclingCode', {
  watch: ['preAnalysisRequired', 'wasteCode'],
  optionsOutput: 'recyclingCode',        // 선택지를 바꿀 필드
  fn(params) {
    const applicable = params.preAnalysisRequired === '해당';
    const record = WasteMasterDB.find(r => r.wasteCode === params.wasteCode);
    if (!record) return null;
    const raw = applicable ? record.recyclingCodeCorrespond : record.recyclingCodeNone;
    return raw ? raw.split(',').map(s => s.trim()) : [];
  }
});
```

- `select` 타입: `<option>` 목록 교체
- `combobox` 타입: `<datalist>` 목록 교체

### 무한루프 방지

양방향 Lookup (wasteCode↔wasteName) 시 루프 발생 가능.  
`runFunctions`의 `calcOnly` 옵션으로 제어:

```
wasteCode 변경
  → lookupWaste 실행 → wasteName 갱신
    → runFunctions(wasteName, { calcOnly: true })  ← Lookup은 건너뜀
      → Calculation만 체인 실행
```

---

## Auto-Store — 자동 스토어 갱신

셀 commit 시마다 `_autoStoreSet`이 자동으로 mockStore를 갱신한다.  
저장 버튼 없음 — 항상 최신 상태.

```javascript
// ui-test.js
function _autoStoreSet(modelName, fieldName, rowIndex, value) {
  if (!mockStore[modelName]) mockStore[modelName] = {};
  if (rowIndex === null || rowIndex === undefined) {
    mockStore[modelName][fieldName] = value;
  } else {
    if (!mockStore[modelName][rowIndex]) mockStore[modelName][rowIndex] = {};
    mockStore[modelName][rowIndex][fieldName] = value;
  }
}

// CellGrid onCommit에서 호출
onCommit(row, col, val) {
  _autoStoreSet(modelName, fields[col].name, row, val);
  runFunctions(modelName, fields[col].name, row);
}
```

---

## 실제 서비스 이식 시나리오

### Vanilla JS (현재와 동일)

```javascript
// 1. HTML 생성
const html = fields.map((f, ci) =>
  buildCell({ type: resolveType(f), value: row[f.name], meta: f, row: 0, col: ci })
).join('');
tbody.innerHTML = `<tr>${html}</tr>`;

// 2. CellGrid 부착
const grid = new CellGrid(tableEl, {
  onCommit: (row, col, val) => draftStore.update(row, fields[col].name, val),
});
grid.select(0, 0);
```

### React 이식 시

`renderInput` / `renderDisplay`가 HTML string을 반환하므로,  
React 환경에서는 `dangerouslySetInnerHTML` 또는 직접 변환 래퍼를 쓴다.

```jsx
// CellComponent를 React 컴포넌트로 감싸는 래퍼 패턴
function CellWrapper({ type, value, meta, ...gridCoords }) {
  const comp = CellComponents[type];
  return (
    <td
      className="cell"
      data-row={gridCoords.row}
      data-col={gridCoords.col}
      data-cell-type={type}
      tabIndex={0}
    >
      <span
        className="cell-display"
        dangerouslySetInnerHTML={{ __html: comp.renderDisplay(value, meta) }}
      />
      <span
        className="cell-input"
        style={{ display: 'none' }}
        dangerouslySetInnerHTML={{ __html: comp.renderInput(value, meta) }}
      />
    </td>
  );
}
// CellGrid는 그대로 — DOM에만 의존하므로 React와 공존 가능
```

---

## CSS 클래스 요약

| 클래스 | 의미 |
|---|---|
| `.cell` | 셀 기본 (td에 붙음) |
| `.cell--selected` | 선택됨 (파란 테두리) |
| `.cell--editing` | 편집 중 |
| `.cell--fn-input` | 함수 입력 파라미터 셀 (연초록 배경) |
| `.cell--fn-output` | 함수 출력 결과 셀 (연붉은 배경) |
| `.cell-display` | 표시 레이어 (span) |
| `.cell-input` | 편집 위젯 (input/select/textarea) |
| `.cell-ph` | 플레이스홀더 텍스트 |
| `[data-readonly="true"]` | 읽기전용 셀 |
| `[data-cell-type]` | 컴포넌트 타입 식별 |

> `.cell--selected` / `.cell--editing` 상태는 fn 색상보다 우선순위가 높다 (CSS specificity).

---

## 확장 로드맵 (미구현, 향후 검토)

- [x] 함수 실행기 (Calculation / Lookup / Options 3-타입 체계, fn-engine.js)
- [x] select/combobox change 이벤트 즉시 commit
- [x] combobox datalist (검색 + 직접 입력)
- [x] Auto-store (_autoStoreSet — 저장 버튼 없이 자동 갱신)
- [ ] cross-row 연산 (N행 합산 등) → `storeAction` 개념 별도 설계 필요
- [ ] 범위 선택 (Shift+방향키) + 복사/붙여넣기
- [ ] 열 너비 조절 (resize handle)
- [ ] 셀 유효성 검사 (`validate(value, meta) → string | null`)
- [ ] `renderDisplay`에서 포매팅 (숫자 천단위, 날짜 로케일)
- [ ] 모바일: 터치 탭→Selected, 더블탭→Editing
