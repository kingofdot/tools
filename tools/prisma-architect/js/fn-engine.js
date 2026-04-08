// fn-engine.js
// ─────────────────────────────────────────────────────────
// 함수 실행 엔진.
// CellGrid onCommit → runFunctions() 호출.
//
// 동작 순서:
//   1. 같은 모델의 calculation 필드 전체 스캔
//   2. 각 필드의 fnInputParams에 changedField 포함 여부 확인
//   3. 포함되면 → fnName으로 함수 조회
//      - 미등록 함수면 셀에 ⚠ 에러 표시
//   4. fnInputParams 필드들의 현재 값 수집 → params 객체 생성
//   5. fn(params) 실행 → 셀 값/display 갱신
//   6. 결과 필드가 바뀌었으니 체인 재실행 (Area→volume→storageAmount)
// ─────────────────────────────────────────────────────────

function runFunctions(modelName, changedField, rowIndex) {
  const meta = metaStore[modelName] || {};

  Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
    if (fieldMeta.systemType !== 'calculation') return;

    // fnInputParams = watch 목록 + 파라미터 수집 경로
    const inputParams = (fieldMeta.fnInputParams || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!inputParams.includes(changedField)) return;

    const fnNames = (fieldMeta.fnName || '')
      .split(',').map(s => s.trim()).filter(Boolean);
    if (!fnNames.length) return;

    fnNames.forEach(fnName => {
      _executeFunction(modelName, fieldName, fnName, inputParams, rowIndex);
    });
  });
}

function _executeFunction(modelName, fieldName, fnName, inputParams, rowIndex) {
  const def = FunctionRegistry.get(fnName);

  // fnName이 등록되지 않은 경우 → 에러 표시
  if (!def) {
    _setCellError(modelName, fieldName, rowIndex, `함수 없음: ${fnName}`);
    return;
  }

  // fnInputParams 필드들의 현재 값 수집
  const params = {};
  inputParams.forEach(f => {
    const el = document.querySelector(`[data-mockfield="${modelName}.${f}.${rowIndex}"]`);
    params[f] = el?.value ?? '';
  });

  let result;
  try {
    result = String(def.fn(params) ?? '');
  } catch (e) {
    _setCellError(modelName, fieldName, rowIndex, `실행 오류: ${e.message}`);
    return;
  }

  // 셀 값 + display 갱신
  _updateCell(modelName, fieldName, rowIndex, result);

  // 체인 실행 — 이 필드가 바뀌었으니 이 필드를 watch하는 계산 필드도 실행
  runFunctions(modelName, fieldName, rowIndex);
}

function _updateCell(modelName, fieldName, rowIndex, value) {
  const input = document.querySelector(`[data-mockfield="${modelName}.${fieldName}.${rowIndex}"]`);
  if (!input) return;

  input.value = value;

  const td = input.closest('[data-cell-type]');
  if (!td) return;
  const display = td.querySelector('.cell-display');
  if (!display) return;

  const type = td.dataset.cellType;
  const comp = CellComponents[type];
  display.innerHTML = comp?.renderDisplay ? comp.renderDisplay(value, {}) : value;
}

function _setCellError(modelName, fieldName, rowIndex, msg) {
  const input = document.querySelector(`[data-mockfield="${modelName}.${fieldName}.${rowIndex}"]`);
  if (!input) return;

  input.value = '';

  const td = input.closest('[data-cell-type]');
  if (!td) return;
  const display = td.querySelector('.cell-display');
  if (display) {
    display.innerHTML = `<span style="color:var(--error,#e53e3e);font-size:11px">⚠ ${msg}</span>`;
  }
}
