// cell.js — 셀 그리드 동작 모듈
// 재사용 가능 (ui-test, 실제 서비스 공통)
//
// 사용법:
//   const grid = new CellGrid(containerEl, options);
//   grid.select(0, 0);   // 프로그래매틱 선택
//   grid.destroy();      // 이벤트 해제
//
// 셀 마크업 (data-row, data-col 필수):
//   <td data-row="0" data-col="1" tabindex="0">
//     <span class="cell-display">값</span>
//     <input class="cell-input" style="display:none" value="값">
//   </td>
//
// 읽기전용 셀: data-readonly="true" 추가
//
// 두 단계 상태:
//   Selected  — 셀 포커스만. 방향키로 네비게이션.
//   Editing   — 인풋 안에 커서. 커서 끝/처음에서 셀 이동.

class CellGrid {
  constructor(container, options = {}) {
    this.el  = container;
    this.opt = {
      cellSel:    '[data-row][data-col]',   // 셀 쿼리
      inputSel:   '.cell-input',             // 편집 인풋
      displaySel: '.cell-display',           // 표시 span
      clsSelected: 'cell--selected',
      clsEditing:  'cell--editing',
      onCommit:    null, // (row, col, value) => void
      onSelect:    null, // (row, col) => void
      ...options,
    };
    this._active  = null;  // { row, col }
    this._editing = null;  // { row, col, origValue }
    this._bind();
  }

  // ── Public API ────────────────────────────────────────────

  /** 셀 선택 (Selected 상태) */
  select(row, col) {
    const cell = this._cell(row, col);
    if (!cell) return;

    if (this._editing) this.commit(); // 기존 편집 확정
    this._clearActive();

    this._active = { row, col };
    cell.classList.add(this.opt.clsSelected);
    cell.focus();
    this.opt.onSelect?.(row, col);
  }

  /** 편집 모드 진입 (Editing 상태)
   * @param clear true → 기존값 지우고 시작 (타이핑 시작), false → 커서를 끝에 위치
   */
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

    // 텍스트/숫자 계열: 커서를 끝에 배치
    if (input.type === 'text' || input.type === 'number' || input.type === '') {
      try {
        const len = input.value.length;
        input.setSelectionRange(len, len);
      } catch (_) {}
    }
    // date input: showPicker 시도
    if (input.type === 'date') {
      try { input.showPicker?.(); } catch (_) {}
    }

    this._editing = { row, col, origValue };
  }

  /** 편집 확정 (값 유지, Selected 상태로 복귀) */
  commit() {
    if (!this._editing) return;
    const { row, col } = this._editing;
    const cell = this._cell(row, col);
    if (cell) {
      const input   = cell.querySelector(this.opt.inputSel);
      const display = cell.querySelector(this.opt.displaySel);
      const val = input?.value ?? '';
      if (display) {
        display.textContent = val;
        display.style.display = '';
      }
      if (input) input.style.display = 'none';
      cell.classList.remove(this.opt.clsEditing);
      this.opt.onCommit?.(row, col, val);
    }
    this._editing = null;
  }

  /** 편집 취소 (원래값 복원, Selected 상태로 복귀) */
  revert() {
    if (!this._editing) return;
    const { row, col, origValue } = this._editing;
    const cell = this._cell(row, col);
    if (cell) {
      const input   = cell.querySelector(this.opt.inputSel);
      const display = cell.querySelector(this.opt.displaySel);
      if (input)   input.value = origValue;
      if (display) { display.textContent = origValue; display.style.display = ''; }
      if (input)   input.style.display = 'none';
      cell.classList.remove(this.opt.clsEditing);
    }
    this._editing = null;
    this._cell(row, col)?.focus();
  }

  /** 이벤트 해제 (리렌더 전 반드시 호출) */
  destroy() {
    this.el.removeEventListener('keydown',   this._kh);
    this.el.removeEventListener('mousedown', this._mh);
    this.el.removeEventListener('dblclick',  this._dh);
  }

  // ── Private ───────────────────────────────────────────────

  _bind() {
    this._kh = e => this._onKeydown(e);
    this._mh = e => this._onMousedown(e);
    this._dh = e => this._onDblclick(e);
    this.el.addEventListener('keydown',   this._kh);
    this.el.addEventListener('mousedown', this._mh);
    this.el.addEventListener('dblclick',  this._dh);
  }

  _onKeydown(e) {
    const cell = e.target.closest(this.opt.cellSel);
    if (!cell) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;
    const isEditing = this._editing?.row === row && this._editing?.col === col;

    isEditing
      ? this._editKey(e, row, col)
      : this._navKey(e, row, col);
  }

  // Selected 상태 키 처리
  _navKey(e, row, col) {
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); this.select(row, col + 1); break;
      case 'ArrowLeft':  e.preventDefault(); this.select(row, col - 1); break;
      case 'ArrowDown':  e.preventDefault(); this.select(row + 1, col); break;
      case 'ArrowUp':    e.preventDefault(); this.select(row - 1, col); break;
      case 'Tab':
        e.preventDefault();
        this.select(row, col + (e.shiftKey ? -1 : 1));
        break;
      case 'Enter':
      case 'F2':
        e.preventDefault();
        this.startEdit(row, col, false);
        break;
      case 'Delete':
      case 'Backspace': {
        const cell = this._cell(row, col);
        if (cell?.dataset.readonly === 'true') break;
        const input   = cell?.querySelector(this.opt.inputSel);
        const display = cell?.querySelector(this.opt.displaySel);
        if (input)   input.value = '';
        if (display) display.textContent = '';
        this.opt.onCommit?.(row, col, '');
        break;
      }
      default:
        // 출력 가능 문자 → 기존값 지우고 편집 시작
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          this.startEdit(row, col, true);
        }
    }
  }

  // Editing 상태 키 처리
  _editKey(e, row, col) {
    const el       = e.target;
    const isText   = el.tagName === 'INPUT' && (el.type === 'text' || el.type === '');
    const isNum    = el.tagName === 'INPUT' && el.type === 'number';
    const isSelect = el.tagName === 'SELECT';

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        this.revert();
        break;

      case 'Enter':
        if (!isSelect) {
          e.preventDefault();
          this.commit();
          this.select(row + 1, col);
        }
        break;

      case 'Tab':
        e.preventDefault();
        this.commit();
        this.select(row, col + (e.shiftKey ? -1 : 1));
        break;

      case 'ArrowDown':
        if (!isSelect) {
          e.preventDefault();
          this.commit();
          this.select(row + 1, col);
        }
        break;

      case 'ArrowUp':
        if (!isSelect) {
          e.preventDefault();
          this.commit();
          this.select(row - 1, col);
        }
        break;

      // 텍스트: 커서가 맨 앞일 때만 왼쪽 셀로
      case 'ArrowLeft':
        if ((isText || isNum) && el.selectionStart === 0 && el.selectionEnd === 0) {
          e.preventDefault();
          this.commit();
          this.select(row, col - 1);
        }
        break;

      // 텍스트: 커서가 맨 끝일 때만 오른쪽 셀로
      case 'ArrowRight':
        if ((isText || isNum) && el.selectionStart === el.value.length && el.selectionEnd === el.value.length) {
          e.preventDefault();
          this.commit();
          this.select(row, col + 1);
        }
        break;
    }
  }

  _onMousedown(e) {
    const cell = e.target.closest(this.opt.cellSel);
    if (!cell) return;
    const row = +cell.dataset.row;
    const col = +cell.dataset.col;

    // 편집 중인 인풋 자체 클릭 → 그냥 둠
    if (e.target.closest(this.opt.inputSel)) return;

    // 다른 셀 클릭 → 기존 편집 확정
    if (this._editing && (this._editing.row !== row || this._editing.col !== col)) {
      this.commit();
    }

    if (this._active?.row === row && this._active?.col === col && !this._editing) {
      // 이미 선택된 셀 재클릭 → 편집 모드
      e.preventDefault();
      this.startEdit(row, col, false);
    } else if (!this._editing) {
      e.preventDefault();
      this.select(row, col);
    }
  }

  _onDblclick(e) {
    const cell = e.target.closest(this.opt.cellSel);
    if (!cell) return;
    if (!this._editing) {
      this.startEdit(+cell.dataset.row, +cell.dataset.col, false);
    }
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
