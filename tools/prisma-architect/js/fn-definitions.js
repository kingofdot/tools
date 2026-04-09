// fn-definitions.js
// ─────────────────────────────────────────────────────────
// 계산 함수 정의.
// "어떤 필드를 감시할지(watch)"와 "계산 로직(fn)" 모두 여기서 관리.
// UI관리 탭에서는 fnName 하나만 입력하면 된다.
//
// FunctionRegistry.register(name, { watch, fn, desc, outputType })
//   watch   — 감시할 필드명 목록 (이 필드가 바뀌면 fn 실행)
//   fn(params) — params 키 = watch 필드명들, 계산 불가 시 '' 반환
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

// ── 공통 헬퍼 ─────────────────────────────────────────────
const _p = v => parseFloat(v) || 0;

// ── 함수 정의 ─────────────────────────────────────────────

// 바닥 면적 계산 (WasteStorageFacility.Area)
FunctionRegistry.register('calcArea', {
  desc: '바닥 형태(bottomShape)와 치수로 면적을 계산합니다',
  outputType: 'float',
  watch: ['bottomShape', 'diameter', 'width', 'length', 'topSide', 'bottomSide', 'verticalSide'],
  fn(params) {
    const shape = params.bottomShape || '';
    const d  = _p(params.diameter);
    const w  = _p(params.width);
    const l  = _p(params.length);
    const tS = _p(params.topSide);
    const bS = _p(params.bottomSide);
    const vS = _p(params.verticalSide);

    switch (shape) {
      case '원':
      case 'CIRCLE':    return ((d / 2) ** 2 * Math.PI).toFixed(4);
      case '사각':
      case 'RECT':      return (w * l).toFixed(4);
      case '삼각형':
      case 'TRIANGLE':  return (bS * vS / 2).toFixed(4);
      case '사다리꼴':
      case 'TRAPEZOID': return ((tS + bS) / 2 * vS).toFixed(4);
      case 'MANUAL':    return ''; // 직접 입력
      default:          return '';
    }
  },
});

// 부피 계산 (WasteStorageFacility.volume)
FunctionRegistry.register('calcVolume', {
  desc: '면적(Area)과 높이(height)로 부피를 계산합니다',
  outputType: 'float',
  watch: ['Area', 'height'],
  fn(params) {
    const area   = _p(params.Area);
    const height = _p(params.height);
    if (!area || !height) return '';
    return (area * height).toFixed(4);
  },
});

// 저장용량 계산 (WasteStorageFacility.storageAmount)
FunctionRegistry.register('calcStorageAmount', {
  desc: '부피(volume)와 개수(quantity)로 저장용량을 계산합니다',
  outputType: 'float',
  watch: ['volume', 'quantity'],
  fn(params) {
    const volume   = _p(params.volume);
    const quantity = _p(params.quantity);
    if (!volume || !quantity) return '';
    return (volume * quantity).toFixed(4);
  },
});

// ── functionStore 동기화 ───────────────────────────────────
// 로드 시 FunctionRegistry → functionStore 자동 반영
Object.entries(FunctionRegistry._store).forEach(([name, def]) => {
  if (functionStore.find(f => f.name === name)) return;
  functionStore.push({
    name,
    desc:       def.desc       || '',
    params:     (def.watch || []).map(p => ({ name: p, desc: '' })),
    outputType: def.outputType || 'float',
    outputDesc: '',
  });
});
