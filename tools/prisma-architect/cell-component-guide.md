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
└── CellGrid             — 키보드/상태 관리
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
| `select` | `<select>` | comboboxName → optionsResolver |
| `combobox` | `<select>` | select와 동일 (호환용) |
| `boolean` | `<select>` true/false | display에 색상 표시 |
| `calculation` | `<input readonly>` | editable: false |
| `lookup_readonly` | `<input readonly>` | editable: false |
| `lookup_editable` | `<select>` (dataSource 있을 때) | |
| `json` | `<textarea>` monospace | |
| `hidden` | 렌더 없음 | td 자체 생성 안 함 |

---

## buildCell() — 조립 함수

컴포넌트 스펙을 받아 `<td>` 하나를 만든다.  
CellGrid 없이도 단독으로 쓸 수 있다.

```javascript
buildCell({
  type:      'select',                  // CellComponents 키
  value:     '서울',                    // 현재 값
  meta:      { comboboxName: 'CITY' }, // 필드 메타
  row:       0,                         // 그리드 행 좌표
  col:       2,                         // 그리드 열 좌표
  mockField: 'Order.city.0',           // data-mockfield 값 (선택)
})
// → <td class="cell" data-row="0" data-col="2" data-cell-type="select" tabindex="0">
//     <span class="cell-display">서울</span>
//     <select class="cell-input" data-mockfield="Order.city.0" style="display:none">...</select>
//   </td>
```

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

또는 장기적으로는 컴포넌트별 React 구현체로 교체하되  
`renderInput` / `renderDisplay` 인터페이스는 유지한다.

---

## CSS 클래스 요약

| 클래스 | 의미 |
|---|---|
| `.cell` | 셀 기본 (td에 붙음) |
| `.cell--selected` | 선택됨 (파란 테두리) |
| `.cell--editing` | 편집 중 |
| `.cell-display` | 표시 레이어 (span) |
| `.cell-input` | 편집 위젯 (input/select/textarea) |
| `.cell-ph` | 플레이스홀더 텍스트 |
| `[data-readonly="true"]` | 읽기전용 셀 |
| `[data-cell-type]` | 컴포넌트 타입 식별 |

---

## 확장 로드맵 (미구현, 향후 검토)

- [ ] 범위 선택 (Shift+방향키) + 복사/붙여넣기
- [ ] 열 너비 조절 (resize handle)
- [ ] 셀 유효성 검사 (`validate(value, meta) → string | null`)
- [ ] `renderDisplay`에서 포매팅 (숫자 천단위, 날짜 로케일)
- [ ] 모바일: 터치 탭→Selected, 더블탭→Editing
