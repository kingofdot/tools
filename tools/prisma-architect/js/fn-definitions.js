// fn-definitions.js
// ─────────────────────────────────────────────────────────
// 실제 계산 함수 정의.
// fn-engine.js가 fnName으로 여기서 함수를 찾아 실행한다.
//
// FunctionRegistry.register(name, { watch, fn })
//   watch — 감시할 필드명 목록 (이 필드가 바뀌면 이 함수 실행)
//   fn    — (params: { [fieldName]: string }) => string | number
//           MANUAL이나 계산 불가 시 '' 반환
// ─────────────────────────────────────────────────────────

// ── FunctionRegistry ──────────────────────────────────────
const FunctionRegistry = {
  _store: {},

  register(name, { watch, fn, desc = '', outputType = 'float' }) {
    this._store[name] = { watch, fn, desc, outputType };
  },

  get(name) {
    return this._store[name] || null;
  },

  // 변경된 필드를 감시하는 함수명 목록 반환
  findByWatch(changedField) {
    return Object.entries(this._store)
      .filter(([, def]) => def.watch.includes(changedField))
      .map(([name]) => name);
  },
};

// ── WasteStorageFacility 계산 함수 ───────────────────────

// 바닥 면적 계산
FunctionRegistry.register('calcArea', {
  desc: '바닥 형태(bottomShape)와 치수로 면적을 계산합니다',
  outputType: 'float',
  watch: ['bottomShape', 'diameter', 'width', 'length', 'topSide', 'bottomSide', 'verticalSide'],
  fn(params) {
    const shape = params.bottomShape || '';
    const d  = parseFloat(params.diameter)    || 0;
    const w  = parseFloat(params.width)       || 0;
    const l  = parseFloat(params.length)      || 0;
    const tS = parseFloat(params.topSide)     || 0;
    const bS = parseFloat(params.bottomSide)  || 0;
    const vS = parseFloat(params.verticalSide)|| 0;

    switch (shape) {
      case 'CIRCLE':    return ((d / 2) ** 2 * Math.PI).toFixed(4);
      case 'RECT':      return (w * l).toFixed(4);
      case 'TRIANGLE':  return (bS * vS / 2).toFixed(4);
      case 'TRAPEZOID': return ((tS + bS) / 2 * vS).toFixed(4);
      case 'MANUAL':    return ''; // 직접 입력 — 계산 안 함
      default:          return '';
    }
  },
});

// 부피 계산 (면적 × 높이)
FunctionRegistry.register('calcVolume', {
  desc: '면적(Area)과 높이(height)로 부피를 계산합니다',
  outputType: 'float',
  watch: ['Area', 'height'],
  fn(params) {
    const area   = parseFloat(params.Area)   || 0;
    const height = parseFloat(params.height) || 0;
    if (!area || !height) return '';
    return (area * height).toFixed(4);
  },
});

// 저장용량 계산 (부피 × 개수)
FunctionRegistry.register('calcStorageAmount', {
  desc: '부피(volume)와 개수(quantity)로 저장용량을 계산합니다',
  outputType: 'float',
  watch: ['volume', 'quantity'],
  fn(params) {
    const volume   = parseFloat(params.volume)   || 0;
    const quantity = parseFloat(params.quantity) || 0;
    if (!volume || !quantity) return '';
    return (volume * quantity).toFixed(4);
  },
});

// ── functionStore 동기화 ───────────────────────────────────
// fn-definitions.js 로드 시 FunctionRegistry → functionStore 자동 반영
// (functionStore는 ui-panel.js에서 먼저 정의됨)
Object.entries(FunctionRegistry._store).forEach(([name, def]) => {
  if (functionStore.find(f => f.name === name)) return; // 이미 있으면 스킵
  functionStore.push({
    name,
    desc:       def.desc       || '',
    params:     (def.watch || []).map(p => ({ name: p, desc: '' })),
    outputType: def.outputType || 'float',
    outputDesc: '',
  });
});
