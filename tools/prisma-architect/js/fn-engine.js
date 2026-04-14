// fn-engine.js
// ─────────────────────────────────────────────────────────
// 함수 실행 엔진 — UI모델 트리거 기반
//
// UI모델에서 선언한 트리거에 따라 함수를 실행한다.
//
//   onChange  → runOnChange(modelName, changedField, rowIndex)
//   onClick   → runOnClick(modelName, fieldName, rowIndex)
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

// ── onChange 트리거 ───────────────────────────────────────
// UI모델의 changedField.onChange 에 등록된 함수 실행
// calcOnly=true: Lookup 체인 시 다른 Lookup 재실행 방지 (무한루프 방지)
function runOnChange(modelName, changedField, rowIndex, { calcOnly = false } = {}) {
  const fieldMeta = (metaStore[modelName] || {})[changedField] || {};
  const fnNamesRaw = (fieldMeta.onChange || '').trim();
  if (!fnNamesRaw) return;
  fnNamesRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(fnName => {
    _executeByTrigger(modelName, fnName, rowIndex, calcOnly);
  });
}

// ── onClick 트리거 ────────────────────────────────────────
// UI모델의 fieldName.onClick 에 등록된 함수 실행
function runOnClick(modelName, fieldName, rowIndex) {
  const fieldMeta = (metaStore[modelName] || {})[fieldName] || {};
  const fnNamesRaw = (fieldMeta.onClick || '').trim();
  if (!fnNamesRaw) return;
  fnNamesRaw.split(',').map(s => s.trim()).filter(Boolean).forEach(fnName => {
    _executeByTrigger(modelName, fnName, rowIndex, false);
  });
}

// ── 함수 타입별 실행 분기 ─────────────────────────────────
function _executeByTrigger(modelName, fnName, rowIndex, calcOnly) {
  const def = FunctionRegistry.get(fnName);
  if (!def) return;

  if (def.optionsOutput) {
    // Options: 드롭다운 선택지 교체
    if (!calcOnly) _executeOptions(modelName, fnName, rowIndex);
  } else if (def.outputFields) {
    // Lookup: 여러 필드에 값 세팅
    if (!calcOnly) _executeLookup(modelName, fnName, rowIndex);
  } else if (def.outputField) {
    // Calculation: 지정된 outputField에 결과 세팅
    _executeFunction(modelName, def.outputField, fnName, rowIndex);
  }
}

function _executeLookup(modelName, fnName, rowIndex) {
  const def = FunctionRegistry.get(fnName);
  if (!def) return;

  const params = {};
  def.watch.forEach(f => {
    const el = document.querySelector(_mockfieldSelector(modelName, f, rowIndex));
    params[f] = el?.value ?? '';
  });

  let result;
  try { result = def.fn(params); } catch (e) { return; }
  if (!result) return;

  Object.entries(result).forEach(([fieldName, value]) => {
    const v = String(value ?? '');
    _updateCell(modelName, fieldName, rowIndex, v);
    if (typeof _autoStoreSet === 'function') _autoStoreSet(modelName, fieldName, rowIndex, v);
    // calcOnly=true: Lookup끼리 체인 금지 (wasteCode↔wasteName 무한루프 방지)
    runOnChange(modelName, fieldName, rowIndex, { calcOnly: true });
  });
}

function _executeOptions(modelName, fnName, rowIndex) {
  const def = FunctionRegistry.get(fnName);
  if (!def || !def.optionsOutput) return;

  const params = {};
  def.watch.forEach(f => {
    const el = document.querySelector(_mockfieldSelector(modelName, f, rowIndex));
    params[f] = el?.value ?? '';
  });

  let options;
  try { options = def.fn(params); } catch (e) { return; }
  if (!Array.isArray(options)) return;

  _updateCellOptions(modelName, def.optionsOutput, rowIndex, options);
}

function _updateCellOptions(modelName, fieldName, rowIndex, options) {
  const input = document.querySelector(_mockfieldSelector(modelName, fieldName, rowIndex));
  if (!input) return;

  if (input.tagName === 'SELECT') {
    const currentVal = input.value;
    input.innerHTML = `<option value="">— 선택 —</option>`
      + options.map(o => `<option value="${o}"${o === currentVal ? ' selected' : ''}>${o}</option>`).join('');
  } else if (input.tagName === 'INPUT' && input.list) {
    input.list.innerHTML = options.map(o => `<option value="${o}">`).join('');
  }
}

function _executeFunction(modelName, fieldName, fnName, rowIndex) {
  const def = FunctionRegistry.get(fnName);

  if (!def) {
    _setCellError(modelName, fieldName, rowIndex, `함수 없음: ${fnName}`);
    return;
  }

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

  // 체인: 이 필드(계산 결과)를 onChange로 등록한 함수가 있으면 연쇄 실행
  runOnChange(modelName, fieldName, rowIndex);
}

function _updateCell(modelName, fieldName, rowIndex, value) {
  const input = document.querySelector(_mockfieldSelector(modelName, fieldName, rowIndex));
  if (!input) return;

  input.value = value;

  const td = input.closest('[data-cell-type]');
  if (!td) return;
  const display = td.querySelector('.cell-display');
  if (!display) return;

  const type = td.dataset.cellType;
  const comp = CellComponents[type];

  // calculation 계열: display만 포매팅 (store/input은 raw 유지)
  let displayVal = value;
  if ((type === 'calculation' || type === 'calculation_editable') &&
      typeof _calcDisplayVal === 'function') {
    displayVal = _calcDisplayVal(modelName, fieldName, value);
  }

  display.innerHTML = comp?.renderDisplay ? comp.renderDisplay(displayVal, {}) : displayVal;

  if (typeof _autoStoreSet === 'function') _autoStoreSet(modelName, fieldName, rowIndex, value);
}

function _setCellError(modelName, fieldName, rowIndex, msg) {
  const input = document.querySelector(_mockfieldSelector(modelName, fieldName, rowIndex));
  if (!input) return;

  input.value = '';

  const td = input.closest('[data-cell-type]');
  if (!td) return;
  const display = td.querySelector('.cell-display');
  if (display) {
    display.innerHTML = `<span style="color:var(--error,#e53e3e);font-size:11px">⚠ ${msg}</span>`;
  }
}
