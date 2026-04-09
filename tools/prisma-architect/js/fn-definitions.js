// fn-definitions.js
// ─────────────────────────────────────────────────────────
// 함수 정의 — 두 가지 타입:
//
//   [계산 함수 Calculation]
//   FunctionRegistry.register(name, { watch, fn, desc, outputType })
//     watch      — 감시 필드 목록 (바뀌면 fn 실행)
//     fn(params) — 단일 값 반환 (string | '')
//     출력 대상  — metaStore에서 systemType=calculation + fnName 으로 선언
//
//   [조회 함수 Lookup]
//   FunctionRegistry.register(name, { watch, outputFields, fn, desc })
//     watch        — 감시 필드 목록
//     outputFields — 결과를 쓸 필드명 배열 (metaStore 선언 불필요)
//     fn(params)   — { fieldName: value, ... } 객체 반환 | null
// ─────────────────────────────────────────────────────────

// ── FunctionRegistry ──────────────────────────────────────
const FunctionRegistry = {
  _store: {},

  register(name, { watch, outputFields, fn, desc = '', outputType = 'float' }) {
    this._store[name] = { watch, outputFields: outputFields || null, fn, desc, outputType };
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

// ── 조회 함수 (Lookup) ────────────────────────────────────

// 폐기물코드 선택 → wasteName, recyclingCodeNone, recyclingCodeCorrespond 동시 세팅
FunctionRegistry.register('lookupWaste', {
  desc: '폐기물코드(wasteCode)로 마스터 데이터 조회 → 관련 필드 자동 세팅',
  watch: ['wasteCode'],
  outputFields: ['wasteName', 'recyclingCodeNone', 'recyclingCodeCorrespond'],
  fn(params) {
    const code = (params.wasteCode || '').trim();
    if (!code) return null;
    const record = WasteMasterDB.find(r => r.wasteCode === code);
    if (!record) return null;
    return {
      wasteName:              record.wasteName,
      recyclingCodeNone:      record.recyclingCodeNone,
      recyclingCodeCorrespond: record.recyclingCodeCorrespond,
    };
  },
});

// ── 마스터 DB 초기화 ──────────────────────────────────────
// WasteMasterDB는 data/wasteInformation.js에서 전역 선언됨 (script 태그 로드)
// comboboxStore에 WasteCode / WasteName 목록 등록
(function initWasteMaster() {
  if (!Array.isArray(WasteMasterDB) || !WasteMasterDB.length) {
    console.warn('WasteMasterDB가 로드되지 않았습니다. data/wasteInformation.js 확인 필요');
    return;
  }
  comboboxStore['WasteCode'] = WasteMasterDB.map(r => r.wasteCode);
  comboboxStore['WasteName'] = WasteMasterDB.map(r => r.wasteName);
})();

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
