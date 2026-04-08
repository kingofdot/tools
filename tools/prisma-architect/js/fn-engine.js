// fn-engine.js
// ─────────────────────────────────────────────────────────
// 함수 실행 엔진.
// CellGrid onCommit → runFunctions() 호출.
//
// 동작 순서:
//   1. changedField를 watch하는 함수 목록 조회 (FunctionRegistry.findByWatch)
//   2. 같은 모델의 calculation 필드 중 해당 fnName 찾기
//   3. fnName이 FunctionRegistry에 없으면 셀에 ⚠ 에러 표시
//   4. watch 필드들의 현재 값 수집 → fn(params) 실행
//   5. 셀 값/display 갱신 → 체인 재실행 (Area→volume→storageAmount)
// ─────────────────────────────────────────────────────────

function runFunctions(modelName, changedField, rowIndex) {
  const meta = metaStore[modelName] || {};

  // changedField를 watch하는 함수명 목록
  const triggeredFnNames = FunctionRegistry.findByWatch(changedField);
  if (!triggeredFnNames.length) return;

  // 같은 모델의 calculation 필드 순회
  Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
    if (fieldMeta.systemType !== 'calculation') return;

    const fnName = (fieldMeta.fnName || '').trim();
    if (!fnName || !triggeredFnNames.includes(fnName)) return;
    _executeFunction(modelName, fieldName, fnName, rowIndex);
  });
}

function _executeFunction(modelName, fieldName, fnName, rowIndex) {
  const def = FunctionRegistry.get(fnName);

  if (!def) {
    _setCellError(modelName, fieldName, rowIndex, `함수 없음: ${fnName}`);
    return;
  }

  // watch 목록 기준으로 파라미터 수집
  const params = {};
  def.watch.forEach(f => {
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

  _updateCell(modelName, fieldName, rowIndex, result);

  // 체인 실행 — 이 필드가 바뀌었으니 이 필드를 watch하는 함수도 실행
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
