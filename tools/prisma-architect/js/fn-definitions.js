// fn-definitions.js
// ─────────────────────────────────────────────────────────
// 함수 정의 — 세 가지 타입:
//
//   [계산 함수 Calculation]
//   register(name, { watch, fn, desc, outputType })
//     fn(params) → string | ''
//     출력 대상 → metaStore systemType=calculation + fnName
//
//   [조회 함수 Lookup]
//   register(name, { watch, outputFields, fn, desc })
//     fn(params) → { fieldName: value, ... } | null
//     outputFields 에 직접 값 세팅
//     ※ Lookup 결과가 다시 Lookup을 트리거하지 않음 (무한루프 방지)
//
//   [옵션 함수 Options]
//   register(name, { watch, optionsOutput, fn, desc })
//     fn(params) → string[] | null
//     optionsOutput 필드의 드롭다운 선택지를 동적으로 교체
// ─────────────────────────────────────────────────────────

// ── FunctionRegistry ──────────────────────────────────────
const FunctionRegistry = {
  _store: {},

  register(name, { watch, outputField, outputFields, optionsOutput, fn, desc = '', outputType = 'float' }) {
    this._store[name] = { watch, outputField: outputField || null, outputFields: outputFields || null, optionsOutput: optionsOutput || null, fn, desc, outputType };
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

// 텍스트 합치기 — 각 값을 괄호로 감싸 이어 붙임.
//   concat('A','B')            → '(A)B'
//   concat('A','B','(','[')    → '(A)[B]'
//   concat('A','B','','')      → 'AB'
// wrapA/wrapB 에 여는 괄호 한 글자( ( [ { < )를 주면 자동으로 닫는 괄호 짝을 붙임.
// 빈 문자열이면 감싸지 않음. 그 외 문자는 접두사로만 붙임.
const _PAIRS = { '(':')', '[':']', '{':'}', '<':'>' };
function concat(A, B, wrapA = '(', wrapB = '') {
  const wrap = (v, w) => {
    if (w === '') return String(v ?? '');
    const close = _PAIRS[w] ?? '';
    return `${w}${v ?? ''}${close}`;
  };
  return wrap(A, wrapA) + wrap(B, wrapB);
}

// ── 함수 정의 ─────────────────────────────────────────────

// 바닥 면적 계산 (WasteStorageFacility.Area)
FunctionRegistry.register('calcArea', {
  desc: '바닥 형태(bottomShape)와 치수로 면적을 계산합니다',
  outputField: 'Area',
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
  outputField: 'volume',
  outputType: 'float',
  watch: ['Area', 'height'],
  fn(params) {
    const area   = _p(params.Area);
    const height = _p(params.height);
    if (!area || !height) return '';
    return (area * height).toFixed(4);
  },
});

// 폐기물 병합명 — wasteCode/wasteName 을 괄호로 묶어 wasteMergeName 에 출력
// 예: wasteCode="51-01-01", wasteName="폐유" → "(51-01-01)폐유"
FunctionRegistry.register('mergeWasteName', {
  desc: '폐기물코드·명칭을 합쳐 wasteMergeName 생성 — (코드)명칭 형식',
  outputField: 'wasteMergeName',
  outputType: 'string',
  watch: ['wasteCode', 'wasteName'],
  fn(params) {
    const code = (params.wasteCode || '').trim();
    const name = (params.wasteName || '').trim();
    if (!code && !name) return '';
    return concat(code, name, '(', '');
  },
});

// 저장용량 계산 (WasteStorageFacility.storageAmount)
FunctionRegistry.register('calcStorageAmount', {
  desc: '부피(volume)와 개수(quantity)로 저장용량을 계산합니다',
  outputField: 'storageAmount',
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

// wasteCode 선택 → wasteName 자동 세팅
FunctionRegistry.register('lookupWaste', {
  desc: '폐기물코드(wasteCode) → wasteName 자동 세팅',
  watch: ['wasteCode'],
  outputFields: ['wasteName'],
  fn(params) {
    const code = (params.wasteCode || '').trim();
    if (!code) return null;
    const record = WasteMasterDB.find(r => r.wasteCode === code);
    if (!record) return null;
    return { wasteName: record.wasteName };
  },
});

// wasteName 선택 → wasteCode 자동 세팅 (역방향)
// 단, wasteCode 변경 후 wasteName을 수정해도 wasteCode는 바뀌지 않음
// (드롭다운 선택 시에만 이 함수가 트리거됨 — 직접 입력은 change 이벤트 없음)
FunctionRegistry.register('lookupWasteByName', {
  desc: '폐기물명칭(wasteName) 선택 → wasteCode 자동 세팅',
  watch: ['wasteName'],
  outputFields: ['wasteCode'],
  fn(params) {
    const name = (params.wasteName || '').trim();
    if (!name) return null;
    const record = WasteMasterDB.find(r => r.wasteName === name);
    if (!record) return null;
    return { wasteCode: record.wasteCode };
  },
});

// ── 옵션 함수 (Options) ───────────────────────────────────

// WasteTargetItem 행 → targetWaste 드롭다운 선택지
// 각 행의 wasteMergeName을 우선 사용, 비어있으면 (wasteCode)wasteName 즉석 합성
FunctionRegistry.register('optionsTargetWaste', {
  desc: 'WasteTargetItem 행들을 targetWaste 드롭다운 옵션으로 — wasteMergeName 우선, 없으면 (코드)명칭 합성',
  watch: [],
  optionsOutput: 'targetWaste',
  fn() {
    const rows = (typeof mockStore !== 'undefined' && Array.isArray(mockStore.WasteTargetItem))
      ? mockStore.WasteTargetItem : [];
    const out = [];
    rows.forEach(r => {
      const merged = (r?.wasteMergeName || '').trim();
      if (merged) { out.push(merged); return; }
      const code = (r?.wasteCode || '').trim();
      const name = (r?.wasteName || '').trim();
      if (!code && !name) return;
      out.push(concat(code, name, '(', ''));
    });
    return [...new Set(out)];
  },
});

// preAnalysisRequired(해당/해당없음) + wasteCode → recyclingCode 선택지 동적 교체
FunctionRegistry.register('optionsRecyclingCode', {
  desc: '재활용분석 결과에 따라 recyclingCode 드롭다운 선택지 교체',
  watch: ['preAnalysisRequired', 'wasteCode'],
  optionsOutput: 'recyclingCode',
  fn(params) {
    const code       = (params.wasteCode || '').trim();
    const applicable = params.preAnalysisRequired === '해당' || params.preAnalysisRequired === 'true';
    if (!code) return null;
    const record = WasteMasterDB.find(r => r.wasteCode === code);
    if (!record) return null;
    const raw = applicable ? record.recyclingCodeCorrespond : record.recyclingCodeNone;
    if (!raw || raw.trim() === '-') return [];
    return raw.split(',').map(s => s.trim()).filter(Boolean);
  },
});

// ── 마스터 DB 초기화 ──────────────────────────────────────
// WasteMasterDB는 data/wasteInformation.js에서 전역 선언됨 (script 태그 로드)
// comboboxStore에 WasteCode / WasteName 목록 등록.
// GitHub 불러오기 후 comboboxStore가 덮어씌워지므로 전역 함수로 두고 재호출 가능하게 함.
function initWasteMaster() {
  if (!Array.isArray(WasteMasterDB) || !WasteMasterDB.length) {
    console.warn('WasteMasterDB가 로드되지 않았습니다. data/wasteInformation.js 확인 필요');
    return;
  }
  comboboxStore['WasteCode'] = WasteMasterDB.map(r => r.wasteCode);
  comboboxStore['WasteName'] = WasteMasterDB.map(r => r.wasteName);
}
initWasteMaster();

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
