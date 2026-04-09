// fn-engine.js
// ─────────────────────────────────────────────────────────
// 함수 실행 엔진.
// CellGrid onCommit → runFunctions(modelName, changedField, rowIndex) 호출.
// 1:1 폼에서는 rowIndex = null 로 호출.
//
// 동작 순서:
//   1. changedField를 watch하는 함수 목록 조회 (FunctionRegistry.findByWatch)
//   2. 같은 모델의 calculation 필드 중 해당 fnName 찾기
//   3. fnName이 FunctionRegistry에 없으면 셀에 ⚠ 에러 표시
//   4. watch 필드들의 현재 값 수집 → fn(params) 실행
//   5. 셀 값/display 갱신 → 체인 재실행 (Area→volume→storageAmount)
//
// data-mockfield 패턴:
//   엑셀 뷰  → "ModelName.fieldName.{rowIndex}"
//   1:1 폼  → "ModelName.fieldName"  (rowIndex = null)
// ─────────────────────────────────────────────────────────

function _mockfieldSelector(modelName, fieldName, rowIndex) {
  return rowIndex === null || rowIndex === undefined
    ? `[data-mockfield="${modelName}.${fieldName}"]`
    : `[data-mockfield="${modelName}.${fieldName}.${rowIndex}"]`;
}

function runFunctions(modelName, changedField, rowIndex) {
  const meta = metaStore[modelName] || {};

  // changedField를 watch하는 함수명 목록
  const triggeredFnNames = FunctionRegistry.findByWatch(changedField);
  if (!triggeredFnNames.length) return;

  triggeredFnNames.forEach(fnName => {
    const def = FunctionRegistry.get(fnName);
    if (!def) return;

    if (def.outputFields) {
      // ── Lookup 타입: outputFields에 직접 씀 ──────────────
      _executeLookup(modelName, fnName, rowIndex);
    } else {
      // ── Calculation 타입: metaStore의 calculation 필드 탐색 ─
      Object.entries(meta).forEach(([fieldName, fieldMeta]) => {
        if (fieldMeta.systemType !== 'calculation') return;
        const fn = (fieldMeta.fnName || '').trim();
        if (fn === fnName) _executeFunction(modelName, fieldName, fnName, rowIndex);
      });
    }
  });
}

function _executeLookup(modelName, fnName, rowIndex) {
  const def = FunctionRegistry.get(fnName);
  if (!def) return;

  // watch 필드 값 수집
  const params = {};
  def.watch.forEach(f => {
    const el = document.querySelector(_mockfieldSelector(modelName, f, rowIndex));
    params[f] = el?.value ?? '';
  });

  let result;
  try { result = def.fn(params); } catch (e) { return; }
  if (!result) return;

  // outputFields 각각에 결과 세팅
  Object.entries(result).forEach(([fieldName, value]) => {
    const v = String(value ?? '');
    _updateCell(modelName, fieldName, rowIndex, v);
    if (typeof _autoStoreSet === 'function') _autoStoreSet(modelName, fieldName, rowIndex, v);
    runFunctions(modelName, fieldName, rowIndex); // 체인
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
    const el = document.querySelector(_mockfieldSelector(modelName, f, rowIndex));
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
  const input = document.querySelector(_mockfieldSelector(modelName, fieldName, rowIndex));
  if (!input) return;

  input.value = value;

  // 엑셀 뷰: cell-display도 갱신
  const td = input.closest('[data-cell-type]');
  if (!td) return;
  const display = td.querySelector('.cell-display');
  if (!display) return;

  const type = td.dataset.cellType;
  const comp = CellComponents[type];
  display.innerHTML = comp?.renderDisplay ? comp.renderDisplay(value, {}) : value;

  // 함수 결과도 스토어 자동 반영
  if (typeof _autoStoreSet === 'function') _autoStoreSet(modelName, fieldName, rowIndex, value);
}

function _setCellError(modelName, fieldName, rowIndex, msg) {
  const input = document.querySelector(_mockfieldSelector(modelName, fieldName, rowIndex));
  if (!input) return;

  input.value = '';

  // 엑셀 뷰: cell-display에 에러 표시
  const td = input.closest('[data-cell-type]');
  if (!td) return;
  const display = td.querySelector('.cell-display');
  if (display) {
    display.innerHTML = `<span style="color:var(--error,#e53e3e);font-size:11px">⚠ ${msg}</span>`;
  }
}
