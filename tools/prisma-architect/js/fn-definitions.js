// fn-definitions.js
// ─────────────────────────────────────────────────────────
// 계산 함수 정의. 함수는 순수하게 계산 로직만 담당.
//
// "어떤 필드를 감시할지(watch)"는 여기 없다.
// → UI관리 탭의 fnInputParams에서 모델/필드마다 개별 설정.
//
// FunctionRegistry.register(name, { fn, desc, outputType })
//   fn(params)  — params 키 = fnInputParams에 적힌 필드명들
//                 계산 불가 시 '' 반환
// ─────────────────────────────────────────────────────────

// ── FunctionRegistry ──────────────────────────────────────
const FunctionRegistry = {
  _store: {},

  register(name, { fn, desc = '', outputType = 'float' }) {
    this._store[name] = { fn, desc, outputType };
  },

  get(name) {
    return this._store[name] || null;
  },
};

// ── 공통 헬퍼 ─────────────────────────────────────────────
const _p = v => parseFloat(v) || 0;

// ── 범용 함수 ─────────────────────────────────────────────
// 어떤 모델/필드에서든 fnInputParams만 지정하면 재활용 가능

FunctionRegistry.register('sum', {
  desc: '입력 필드들의 합계를 구합니다 (fnInputParams 순서 무관)',
  outputType: 'float',
  fn(params) {
    const result = Object.values(params).reduce((acc, v) => acc + _p(v), 0);
    return result ? result.toFixed(4) : '';
  },
});

FunctionRegistry.register('multiply', {
  desc: '입력 필드들의 곱을 구합니다 (fnInputParams 순서 무관)',
  outputType: 'float',
  fn(params) {
    const vals = Object.values(params).map(_p);
    if (vals.some(v => !v)) return '';
    return vals.reduce((acc, v) => acc * v, 1).toFixed(4);
  },
});

// ── 도메인 함수 ───────────────────────────────────────────
// 특정 필드명에 의존하는 도메인 전용 함수.
// fnInputParams에 적힌 필드명이 params 키로 들어온다.

// 바닥 면적 계산 (WasteStorageFacility.Area)
// fnInputParams: bottomShape,diameter,width,length,topSide,bottomSide,verticalSide
FunctionRegistry.register('calcArea', {
  desc: '바닥 형태(bottomShape)와 치수로 면적을 계산합니다',
  outputType: 'float',
  fn(params) {
    const shape = params.bottomShape || '';
    const d  = _p(params.diameter);
    const w  = _p(params.width);
    const l  = _p(params.length);
    const tS = _p(params.topSide);
    const bS = _p(params.bottomSide);
    const vS = _p(params.verticalSide);

    switch (shape) {
      case 'CIRCLE':    return ((d / 2) ** 2 * Math.PI).toFixed(4);
      case 'RECT':      return (w * l).toFixed(4);
      case 'TRIANGLE':  return (bS * vS / 2).toFixed(4);
      case 'TRAPEZOID': return ((tS + bS) / 2 * vS).toFixed(4);
      case 'MANUAL':    return ''; // 직접 입력
      default:          return '';
    }
  },
});

// 부피 계산 (WasteStorageFacility.volume)
// fnInputParams: Area,height
FunctionRegistry.register('calcVolume', {
  desc: '면적(Area)과 높이(height)로 부피를 계산합니다',
  outputType: 'float',
  fn(params) {
    const area   = _p(params.Area);
    const height = _p(params.height);
    if (!area || !height) return '';
    return (area * height).toFixed(4);
  },
});

// 저장용량 계산 (WasteStorageFacility.storageAmount)
// fnInputParams: volume,quantity
FunctionRegistry.register('calcStorageAmount', {
  desc: '부피(volume)와 개수(quantity)로 저장용량을 계산합니다',
  outputType: 'float',
  fn(params) {
    const volume   = _p(params.volume);
    const quantity = _p(params.quantity);
    if (!volume || !quantity) return '';
    return (volume * quantity).toFixed(4);
  },
});

// ── functionStore 동기화 ───────────────────────────────────
// 로드 시 FunctionRegistry → functionStore 자동 반영
// (functionStore는 ui-panel.js에서 먼저 정의됨)
Object.entries(FunctionRegistry._store).forEach(([name, def]) => {
  if (functionStore.find(f => f.name === name)) return;
  functionStore.push({
    name,
    desc:       def.desc       || '',
    params:     [],             // watch 없음 — fnInputParams로 관리
    outputType: def.outputType || 'float',
    outputDesc: '',
  });
});
