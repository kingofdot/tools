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

// ── db_select / db_combobox 자동 동기 ────────────────────────────────────
// 선택된 값으로 dbTable 레코드를 찾아,
// 같은 모델에서 동일 dbTable을 참조하는 모든 필드에 해당 컬럼 값을 자동 세팅
function runAutoDbSync(modelName, changedField, rowIndex) {
  const fieldMeta = (metaStore[modelName] || {})[changedField] || {};
  const dbTable  = fieldMeta.dbTable;
  const dbColumn = fieldMeta.dbColumn;
  if (!dbTable || !dbColumn) return;

  const el = document.querySelector(_mockfieldSelector(modelName, changedField, rowIndex));
  const selectedVal = el?.value ?? '';
  if (!selectedVal) return;

  const registry = (typeof masterDataRegistry !== 'undefined') ? masterDataRegistry : [];
  const entry = registry.find(m => m.name === dbTable);
  if (!entry) return;
  const raw = (typeof window !== 'undefined') ? window[entry.globalVar] : null;
  if (!Array.isArray(raw)) return;

  const record = raw.find(r => String(r[dbColumn] ?? '') === selectedVal);
  if (!record) return;

  // 같은 dbTable을 참조하는 다른 필드에 값 세팅
  Object.entries(metaStore[modelName] || {}).forEach(([fieldName, fMeta]) => {
    if (fieldName === changedField) return;
    if (fMeta.dbTable !== dbTable) return;
    const col = fMeta.dbColumn;
    if (!col || !(col in record)) return;
    const value = String(record[col] ?? '');
    _updateCell(modelName, fieldName, rowIndex, value);
    if (typeof _autoStoreSet === 'function') _autoStoreSet(modelName, fieldName, rowIndex, value);
  });
}

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
  const explicit  = (fieldMeta.onChange || '').trim()
    .split(',').map(s => s.trim()).filter(Boolean);

  // watch 기반 자동 트리거
  //   - Calculation(outputField): 현재 모델 메타에 outputField가 있을 때만 (cross-model 오염 방지)
  //   - HeaderControl: DOM 가시성만 건드리므로 루프 위험 없음 — 무조건 허용
  //   - Lookup(outputFields)/Options(optionsOutput): 값을 건드려 루프 가능 → 제외 (명시 onChange 필요)
  const modelMeta = metaStore[modelName] || {};
  const auto = FunctionRegistry.findByWatch(changedField).filter(fnName => {
    if (explicit.includes(fnName)) return false;
    const def = FunctionRegistry.get(fnName);
    if (!def) return false;
    if (def.headerControl) return true;
    if (def.outputField && (def.outputField in modelMeta)) return true;
    return false;
  });

  const toRun = [...explicit, ...auto];
  if (!toRun.length) return;
  toRun.forEach(fnName => _executeByTrigger(modelName, fnName, rowIndex, calcOnly));
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

  if (def.headerControl) {
    // HeaderControl: 컬럼 show/hide (re-render 없이 DOM 직접 조작)
    if (!calcOnly) _executeHeaderControl(modelName, fnName, rowIndex);
  } else if (def.optionsOutput) {
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
  // hidden/미렌더 필드라도 스토어엔 반영해야 함 (예: 숨긴 calculation 결과)
  if (typeof _autoStoreSet === 'function') _autoStoreSet(modelName, fieldName, rowIndex, value);

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
  if ((type === 'calculation_readonly' || type === 'calculation_editable') &&
      typeof _calcDisplayVal === 'function') {
    displayVal = _calcDisplayVal(modelName, fieldName, value);
  }

  display.innerHTML = comp?.renderDisplay ? comp.renderDisplay(displayVal, {}) : displayVal;
}

// ── HeaderControl: 컬럼 동적 show/hide ───────────────────
//
// 함수 정의 형식:
//   FunctionRegistry.register({
//     name: 'shapeControl',
//     watch: ['Shape'],
//     headerControl: {
//       targets: ['직경', '너비', '높이'],   // 이 함수가 제어하는 헤더 목록
//       rules: {
//         '원형':    ['직경'],              // 해당 값일 때 보여줄 헤더
//         '사각형':  ['너비', '높이'],
//         '원통형':  ['직경', '높이'],
//       }
//       // rules에 없는 값 → targets 전부 숨김
//     }
//   });
//
// Shape 필드 UI모델의 onChange: 'shapeControl' 로 연결
function _executeHeaderControl(modelName, fnName, rowIndex) {
  const def = FunctionRegistry.get(fnName);
  if (!def?.headerControl) return;

  const { targets = [], rules = {} } = def.headerControl;
  const watchField = (def.watch || [])[0];

  // 엑셀 뷰: 여러 행이 각자 값을 가지므로 전체 행을 훑어 "합집합(OR)" 으로 visible 결정
  //   어떤 행이든 해당 컬럼을 필요로 하면 컬럼 표시 (최대 조건)
  // 1:1 폼: 행이 하나뿐이니 그 값 하나만 보면 동일하게 동작
  const allEls = document.querySelectorAll(`[data-mockfield^="${modelName}.${watchField}"]`);
  const visible = new Set();
  const seenValues = [];
  if (allEls.length === 0) {
    // DOM에 없으면 현재 rowIndex만 확인 (fallback)
    const el = document.querySelector(_mockfieldSelector(modelName, watchField, rowIndex));
    const v = el?.value ?? '';
    seenValues.push(v);
    (rules[v] || []).forEach(h => visible.add(h));
  } else {
    allEls.forEach(el => {
      // data-mockfield 가 정확히 watchField 자체이거나 watchField.{rowIndex} 인 것만
      const key = el.getAttribute('data-mockfield') || '';
      const expectForm = `${modelName}.${watchField}`;
      const expectRow  = `${modelName}.${watchField}.`;
      if (key !== expectForm && !key.startsWith(expectRow)) return;
      const v = el.value ?? '';
      seenValues.push(v);
      (rules[v] || []).forEach(h => visible.add(h));
    });
  }
  // 진단 로그 — devtools 콘솔에서 확인
  if (typeof console !== 'undefined' && console.debug) {
    console.debug('[shapeControl]', { modelName, fnName, watchField, seenValues, visible: [...visible], rulesKeys: Object.keys(rules), allElsCount: allEls.length });
  }

  if (!headerVisibilityStore[modelName]) headerVisibilityStore[modelName] = {};
  targets.forEach(h => { headerVisibilityStore[modelName][h] = !visible.has(h); });

  _applyHeaderVisibility(modelName);
}

// 현재 headerVisibilityStore 기준으로 DOM에 즉시 적용 (re-render 없음)
function _applyHeaderVisibility(modelName) {
  const hidden = (headerVisibilityStore || {})[modelName] || {};
  Object.entries(hidden).forEach(([fieldName, isHidden]) => {
    document.querySelectorAll(`[data-col-key="${modelName}.${fieldName}"]`).forEach(el => {
      el.style.display = isHidden ? 'none' : '';
    });
  });
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
