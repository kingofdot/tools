# 함수 연결 시스템 — 개발 노트

> DB 모델 → UI 모델 → UI 테스트(실제 웹 개발) 3단계에서 함수가 어떻게 붙는가

---

## 전체 흐름 한 줄 요약

> **"UI 모델이 선언하고, 코드가 구현하고, 렌더가 연결한다"**

---

## 3계층 역할 분리

### 1단계 — DB 모델 (Prisma schema)
필드가 **존재**한다는 것만 선언한다.

```prisma
model WasteStorageFacility {
  bottomShape   String?
  width         Float?
  length        Float?
  Area          Float?   // 계산 결과를 담을 필드
  volume        Float?
}
```

이 단계에서는 함수와의 연결 정보가 없다.  
"면적을 어떻게 계산하는가"는 DB가 알 바가 아니다.

---

### 2단계 — UI 모델 (metaStore)
prisma-architect의 UI 관리 탭에서 각 필드에 메타를 붙인다.

| 필드 | systemType | fnName |
|---|---|---|
| bottomShape | combobox | _(없음)_ |
| width | text | _(없음)_ |
| Area | **calculation** | **calcArea** |
| volume | **calculation** | **calcVolume** |

핵심 선언 2가지:
- `systemType = calculation` → "이 필드는 사용자가 직접 입력하지 않고, 함수가 채운다"
- `fnName = calcArea` → "채울 함수의 이름은 calcArea다"

이 단계에서 "무엇을(Area) 어떤 함수로(calcArea)" 가 결정된다.  
함수의 실제 계산 로직은 여기에 없다. 이름만 선언한다.

---

### 3단계 — UI 테스트 / 실제 웹 (fn-definitions.js + fn-engine.js)
함수의 실제 구현이 있고, 렌더 시점에 연결이 완성된다.

#### fn-definitions.js — 함수 구현 (코드)
```js
FunctionRegistry.register('calcArea', {
  watch: ['bottomShape', 'width', 'length', ...],  // 어떤 필드가 바뀌면 실행할지
  fn(params) {
    // 실제 계산 로직
    switch (params.bottomShape) {
      case '사각': return (params.width * params.length).toFixed(4);
      case '원':   return ((params.diameter / 2) ** 2 * Math.PI).toFixed(4);
      ...
    }
  }
});
```

여기서 결정되는 것:
- `watch` → "어떤 입력 필드가 바뀌면 이 함수를 트리거할지"
- `fn()` → "계산 로직"

#### fn-engine.js — 실행기
```
사용자가 bottomShape 셀 값 변경
  ↓
runFunctions('WasteStorageFacility', 'bottomShape', rowIndex)
  ↓
FunctionRegistry.findByWatch('bottomShape')  →  ['calcArea']
  ↓
metaStore에서 systemType=calculation AND fnName='calcArea'인 필드 탐색  →  'Area'
  ↓
_executeFunction('WasteStorageFacility', 'Area', 'calcArea', rowIndex)
  ↓
DOM에서 watch 필드들 값 수집 (bottomShape, width, length ...)
  ↓
fn(params) 실행  →  결과값
  ↓
Area 셀 DOM 업데이트
  ↓
runFunctions(..., 'Area', ...)  ← 체인: Area가 바뀌었으니 Area를 watch하는 함수도 실행
  ↓
calcVolume 실행 ...
```

---

## 핵심 원리 — 두 방향의 탐색

함수 실행을 위해 두 방향으로 탐색한다:

```
[트리거 방향]  변경된 필드명 → FunctionRegistry.findByWatch → 함수명 목록
[출력 방향]   함수명 목록   → metaStore(calculation 필드) → 결과 필드명
```

- **FunctionRegistry (코드)** 가 "어떤 입력이 이 함수를 트리거하는가"를 안다
- **metaStore (데이터)** 가 "이 함수의 결과가 어느 필드로 가는가"를 안다

이 둘이 만나야 비로소 실행이 완성된다.

---

## 렌더 시 자동 연결 (_buildFnRoles)

UI 테스트에서 화면을 렌더할 때, 자동으로 각 필드의 역할을 판별한다:

```js
function _buildFnRoles(modelName) {
  // output: metaStore에서 systemType=calculation인 필드
  // input:  FunctionRegistry.watch 목록에 포함된 필드
}
```

이 정보로:
- **엑셀 뷰**: 초록(인자) / 붉은(결과) 컬럼 색상 표시
- **1:1 폼**: 초록/붉은 배경으로 필드 구분
- **입력 필드**: onchange 이벤트에 `runFunctions()` 자동 연결

→ 개발자가 별도로 이벤트를 붙이지 않아도, **렌더 시점에 UI 모델을 읽어서 자동 완성**된다.

---

## data-mockfield — 엑셀/폼 공통 연결 키

DOM 요소를 찾는 유일한 키는 `data-mockfield` 속성이다.

| 모드 | 형식 | 예시 |
|---|---|---|
| 엑셀 뷰 | `ModelName.fieldName.rowIndex` | `WasteStorageFacility.bottomShape.0` |
| 1:1 폼 | `ModelName.fieldName` | `WasteStorageFacility.bottomShape` |

`runFunctions(modelName, changedField, rowIndex)`에서  
`rowIndex = null` 이면 1:1 폼, 숫자이면 엑셀 행.  
fn-engine.js가 이 두 패턴을 자동으로 분기해서 처리한다.

---

## 실제 웹 개발로 치환하면

| prisma-architect | 실제 웹 서비스 |
|---|---|
| fn-definitions.js | 세부함수.js (별도 파일로 관리) |
| FunctionRegistry | 함수 export 모음 |
| metaStore.fnName | 컴포넌트가 import해서 연결 |
| onCommit / onchange | Zustand store 구독 / useEffect |
| data-mockfield | draftData 필드 경로 |
| runFunctions() | onChange 핸들러 내부 함수 호출 |

---

## 미결 과제

- **cross-row 연산**: 한 행의 합계를 다른 행에서 참조하는 연산. 현재 `data-mockfield`는 단일 행 기준 → `storeAction` 개념 별도 설계 필요
- **fnTriggerEvent**: onChange 외에 onBlur / onSubmit / onLoad 구분은 아직 미구현
- **fnSyncCondition**: 조건부 실행 (`draftData.useAuto === 'true'`일 때만) 미구현
