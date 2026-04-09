// cell.js
// ─────────────────────────────────────────────────────────
// 셀 컴포넌트 시스템 — 최소 정의 + 재조립 가능 설계
//
// 구조
//   CellComponents  — 타입별 최소 컴포넌트 정의 (atomic spec)
//   buildCell()     — 컴포넌트 → <td> 조립 (CellGrid 없이도 단독 사용 가능)
//   CellGrid        — 키보드 네비게이션 / 상태 관리 (behavioral layer)
//
// 컴포넌트 최소 인터페이스
//   {
//     renderInput(value, meta)   → HTML string  // 편집 상태 위젯
//     renderDisplay(value, meta) → HTML string  // 표시 상태 텍스트
//     editable: boolean
//     readonly?: boolean   // editable=false + 시각적 잠금
//     hidden?:  boolean    // 렌더 자체 스킵
//   }
// ─────────────────────────────────────────────────────────

// ── 내부 헬퍼 ─────────────────────────────────────────────
function _esc(v) {
  return String(v ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

const _iBase = `class="cell-input" style="display:none;width:100%;box-sizing:border-box;font-family:inherit;font-size:inherit"`;

// ── CellComponents 레지스트리 ──────────────────────────────
const CellComponents = {

  // ── 외부 주입 ──────────────────────────────────────────
  // 옵션 리졸버: select/combobox 의 선택지를 외부에서 공급
  // 실제 서비스: CellComponents.configure({ optionsResolver: g => zustandStore.getCombo(g) })
  _resolver: () => [],

  configure({ optionsResolver } = {}) {
    if (optionsResolver) this._resolver = optionsResolver;
  },

  // 타입 추가 / 교체
  register(type, spec) {
    this[type] = spec;
  },

  // ── Atomic Components ──────────────────────────────────

  text: {
    editable: true,
    renderInput(val, meta) {
      return `<input type="text" ${_iBase} placeholder="${_esc(meta.commentary)}" value="${_esc(val)}">`;
    },
    renderDisplay(val, meta) {
      return _esc(val) || `<span class="cell-ph">${_esc(meta.commentary)}</span>`;
    },
  },

  number: {
    editable: true,
    renderInput(val, meta) {
      return `<input type="number" ${_iBase} placeholder="${_esc(meta.commentary)}" value="${_esc(val)}" style="display:none;width:100%;box-sizing:border-box;font-family:inherit;text-align:right">`;
    },
    renderDisplay(val) {
      return _esc(val);
    },
  },

  date: {
    editable: true,
    renderInput(val) {
      return `<input type="date" ${_iBase} value="${_esc(val)}">`;
    },
    renderDisplay(val) { return _esc(val); },
  },

  datetime: {
    editable: true,
    renderInput(val) {
      return `<input type="datetime-local" ${_iBase} value="${_esc(val)}">`;
    },
    renderDisplay(val) { return _esc(val); },
  },

  select: {
    editable: true,
    renderInput(val, meta) {
      const opts = CellComponents._resolver(meta.comboboxName || '')
        .map(o => `<option value="${_esc(o)}" ${val === o ? 'selected' : ''}>${_esc(o)}</option>`)
        .join('');
      return `<select ${_iBase}><option value="">—</option>${opts}</select>`;
    },
    renderDisplay(val) { return _esc(val); },
  },

  combobox: {
    editable: true,
    renderInput(val, meta) {
      return CellComponents.select.renderInput(val, meta); // select와 동일 렌더
    },
    renderDisplay(val) { return _esc(val); },
  },

  boolean: {
    editable: true,
    renderInput(val) {
      return `<select ${_iBase}>
        <option value="">—</option>
        <option value="true"  ${val === 'true'  ? 'selected' : ''}>true</option>
        <option value="false" ${val === 'false' ? 'selected' : ''}>false</option>
      </select>`;
    },
    renderDisplay(val) {
      if (val === 'true')  return '<span style="color:var(--success,#38a169);font-weight:600">true</span>';
      if (val === 'false') return '<span style="color:var(--error,#e53e3e);font-weight:600">false</span>';
      return '';
    },
  },

  calculation: {
    editable: false,
    readonly: true,
    renderInput(val) {
      return `<input type="text" ${_iBase} value="${_esc(val)}" readonly>`;
    },
    renderDisplay(val) { return _esc(val); },
  },

  lookup_readonly: {
    editable: false,
    readonly: true,
    renderInput(val, meta) {
      return `<input type="text" ${_iBase} value="${_esc(val)}" readonly placeholder="${_esc(meta.dataSource)}">`;
    },
    renderDisplay(val) { return _esc(val); },
  },

  lookup_editable: {
    editable: true,
    renderInput(val, meta) {
      if (meta.dataSource) {
        return `<select ${_iBase}><option value="">— ${_esc(meta.dataSource)} —</option></select>`;
      }
      return CellComponents.text.renderInput(val, meta);
    },
    renderDisplay(val) { return _esc(val); },
  },

  json: {
    editable: true,
    renderInput(val, meta) {
      return `<textarea ${_iBase} placeholder="${_esc(meta.commentary)}" style="display:none;width:100%;box-sizing:border-box;font-family:monospace;font-size:11px;resize:vertical">${_esc(val)}</textarea>`;
    },
    renderDisplay(val) {
      return val ? `<code style="font-size:10px;opacity:.8">${_esc(val)}</code>` : '';
    },
  },

  hidden: {
    editable: false,
    hidden: true,
    renderInput()   { return ''; },
    renderDisplay() { return ''; },
  },
};

// ── buildCell ─────────────────────────────────────────────
// 컴포넌트 스펙으로 <td> 하나를 조립한다.
// CellGrid 없이도 단독 사용 가능 — 조립 단위.
//
// params:
//   type       — CellComponents 키 (예: 'text', 'select')
//   value      — 현재 값 (string)
//   meta       — 필드 메타 { commentary, comboboxName, dataSource, ... }
//   row, col   — 그리드 좌표
//   mockField  — data-mockfield 속성값 (선택, 없으면 생략)
//   extraClass — td에 추가할 CSS 클래스 (선택, 예: 'cell--fn-input')
function buildCell({ type, value = '', meta = {}, row, col, mockField = '', extraClass = '' }) {
  const comp = CellComponents[type] || CellComponents.text;
  if (comp.hidden) return '';

  const roAttr    = comp.readonly ? ' data-readonly="true"' : '';
  const mockAttr  = mockField ? ` data-mockfield="${mockField}"` : '';
  const clsExtra  = extraClass ? ` ${extraClass}` : '';

  // renderInput 결과에 mockField 주입
  const rawInput  = comp.renderInput(value, meta);
  const inputHtml = mockField
    ? rawInput.replace('class="cell-input"', `class="cell-input"${mockAttr}`)
    : rawInput;

  const displayHtml = comp.renderDisplay(value, meta);

  return `<td class="cell${clsExtra}" data-row="${row}" data-col="${col}" data-cell-type="${type}" tabindex="0"${roAttr}>
  <span class="cell-display">${displayHtml}</span>
  ${inputHtml}
</td>`;
}

// ── CellGrid ──────────────────────────────────────────────
// 키보드 네비게이션 + Selected/Editing 두 단계 상태 관리.
// HTML 구조에만 의존 (data-row, data-col, .cell-input, .cell-display).
//
// 두 단계 상태:
//   Selected — 셀 포커스만. 방향키로 셀 이동.
//   Editing  — 인풋 안에 커서. 텍스트 끝/처음에서만 셀 이동.
class CellGrid {
  constructor(container, options = {}) {
    this.el  = container;
    this.opt = {
      cellSel:     '[data-row][data-col]',
      inputSel:    '.cell-input',
      displaySel:  '.cell-display',
      clsSelected: 'cell--selected',
      clsEditing:  'cell--editing',
      onCommit: null,  // (row, col, value) => void
      onSelect: null,  // (row, col) => void
      ...options,
    };
    this._active  = null;  // { row, col }
    this._editing = null;  // { row, col, origValue }
    this._bind();
  }

  // ── Public API ─────────────────────────────────────────

  select(row, col) {
    const cell = this._cell(row, col);
    if (!cell) return;
    if (this._editing) this.commit();
    this._clearActive();
    this._active = { row, col };
    cell.classList.add(this.opt.clsSelected);
    cell.focus();
    this.opt.onSelect?.(row, col);
  }

  // clear=true: 타이핑 시작 (기존값 지움), false: F2/클릭 (커서 끝)
  startEdit(row, col, clear = false) {
    const cell = this._cell(row, col);
    if (!cell || cell.dataset.readonly === 'true') return;

    if (!this._active || this._active.row !== row || this._active.col !== col) {
      this._clearActive();
      this._active = { row, col };
      cell.classList.add(this.opt.clsSelected);
    }

    const input   = cell.querySelector(this.opt.inputSel);
    const display = cell.querySelector(this.opt.displaySel);
    if (!input) return;

    const origValue = input.value;
    if (clear) input.value = '';

    if (display) display.style.display = 'none';
    input.style.display = '';
    cell.classList.add(this.opt.clsEditing);
    input.focus();

    if (input.type === 'text' || input.type === 'number' || input.type === '') {
      try { const n = input.value.length; input.setSelectionRange(n, n); } catch (_) {}
    }
    if (input.type === 'date') {
      try { input.showPicker?.(); } catch (_) {}
    }

    this._editing = { row, col, origValue };
  }

  commit() {
    if (!this._editing) return;
    const { row, col } = this._editing;
    const cell = this._cell(row, col);
    if (cell) {
      const input   = cell.querySelector(this.opt.inputSel);
      const display = cell.querySelector(this.opt.displaySel);
      const val     = input?.value ?? '';

      // 컴포넌트의 renderDisplay로 표시 갱신 (boolean 등 rich display 지원)
      if (display) {
        const type = cell.dataset.cellType;
        const comp = CellComponents[type];
        display.innerHTML = comp?.renderDisplay ? comp.renderDisplay(val, {}) : _esc(val);
        display.style.display = '';
      }
      if (input) input.style.display = 'none';
      cell.classList.remove(this.opt.clsEditing);
      this.opt.onCommit?.(row, col, val);
    }
    this._editing = null;
  }

  revert() {
    if (!this._editing) return;
    const { row, col, origValue } = this._editing;
    const cell = this._cell(row, col);
    if (cell) {
      const input   = cell.querySelector(this.opt.inputSel);
      const display = cell.querySelector(this.opt.displaySel);
      if (input) input.value = origValue;
      if (display) {
        const type = cell.dataset.cellType;
        const comp = CellComponents[type];
        display.innerHTML = comp?.renderDisplay ? comp.renderDisplay(origValue, {}) : _esc(origValue);
        display.style.display = '';
      }
      if (input) input.style.display = 'none';
      cell.classList.remove(this.opt.clsEditing);
    }
    this._editing = null;
    this._cell(row, col)?.focus();
  }

  destroy() {
    this.el.removeEventListener('keydown',   this._kh);
    this.el.removeEventListener('mousedown', this._mh);
    this.el.removeEventListener('dblclick',  this._dh);
    this.el.removeEventListener('focusout',  this._fh);
  }

  // ── Private ────────────────────────────────────────────

  _bind() {
    this._kh = e => this._onKeydown(e);
    this._mh = e => this._onMousedown(e);
    this._dh = e => this._onDblclick(e);
    this._fh = e => this._onFocusout(e);
    this.el.addEventListener('keydown',   this._kh);
    this.el.addEventListener('mousedown', this._mh);
    this.el.addEventListener('dblclick',  this._dh);
    this.el.addEventListener('focusout',  this._fh);
  }

  _onKeydown(e) {
    const cell = e.target.closest(this.opt.cellSel);
    if (!cell) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    const isEditing = this._editing?.row === row && this._editing?.col === col;
    isEditing ? this._editKey(e, row, col) : this._navKey(e, row, col);
  }

  _navKey(e, row, col) {
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); this.select(row, col + 1); break;
      case 'ArrowLeft':  e.preventDefault(); this.select(row, col - 1); break;
      case 'ArrowDown':  e.preventDefault(); this.select(row + 1, col); break;
      case 'ArrowUp':    e.preventDefault(); this.select(row - 1, col); break;
      case 'Tab':
        e.preventDefault(); this.select(row, col + (e.shiftKey ? -1 : 1)); break;
      case 'Enter': case 'F2':
        e.preventDefault(); this.startEdit(row, col, false); break;
      case 'Delete': case 'Backspace': {
        const cell = this._cell(row, col);
        if (cell?.dataset.readonly === 'true') break;
        const input   = cell?.querySelector(this.opt.inputSel);
        const display = cell?.querySelector(this.opt.displaySel);
        if (input)   input.value = '';
        if (display) display.innerHTML = '';
        this.opt.onCommit?.(row, col, '');
        break;
      }
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.startEdit(row, col, true);
        }
    }
  }

  _editKey(e, row, col) {
    const el       = e.target;
    const isText   = el.tagName === 'INPUT' && (el.type === 'text' || el.type === '');
    const isNum    = el.tagName === 'INPUT' && el.type === 'number';
    const isSelect = el.tagName === 'SELECT';

    switch (e.key) {
      case 'Escape': e.preventDefault(); this.revert(); break;
      case 'Enter':
        if (!isSelect) { e.preventDefault(); this.commit(); this.select(row + 1, col); }
        break;
      case 'Tab':
        e.preventDefault(); this.commit(); this.select(row, col + (e.shiftKey ? -1 : 1)); break;
      case 'ArrowDown':
        if (!isSelect) { e.preventDefault(); this.commit(); this.select(row + 1, col); }
        break;
      case 'ArrowUp':
        if (!isSelect) { e.preventDefault(); this.commit(); this.select(row - 1, col); }
        break;
      case 'ArrowLeft':
        if ((isText || isNum) && el.selectionStart === 0 && el.selectionEnd === 0) {
          e.preventDefault(); this.commit(); this.select(row, col - 1);
        }
        break;
      case 'ArrowRight':
        if ((isText || isNum) && el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
          e.preventDefault(); this.commit(); this.select(row, col + 1);
        }
        break;
    }
  }

  _onMousedown(e) {
    const cell = e.target.closest(this.opt.cellSel);
    if (!cell) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;

    if (e.target.closest(this.opt.inputSel)) return; // 편집 중 인풋 클릭 → 무시

    if (this._editing && (this._editing.row !== row || this._editing.col !== col)) {
      this.commit();
    }
    if (this._active?.row === row && this._active?.col === col && !this._editing) {
      e.preventDefault(); this.startEdit(row, col, false); // 재클릭 → 편집
    } else if (!this._editing) {
      e.preventDefault(); this.select(row, col);
    }
  }

  _onDblclick(e) {
    const cell = e.target.closest(this.opt.cellSel);
    if (!cell || this._editing) return;
    this.startEdit(+cell.dataset.row, +cell.dataset.col, false);
  }

  // 포커스가 그리드 바깥으로 나가면 선택/편집 상태 해제
  _onFocusout(e) {
    // relatedTarget이 그리드 내부이면 무시 (셀 → 셀 이동)
    if (this.el.contains(e.relatedTarget)) return;
    if (this._editing) this.commit();
    this._clearActive();
  }

  _cell(row, col) {
    return this.el.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  _clearActive() {
    if (!this._active) return;
    this._cell(this._active.row, this._active.col)
      ?.classList.remove(this.opt.clsSelected);
    this._active = null;
  }
}
