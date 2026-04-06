// === TODO LIST ===

let todoItems = [];
let editingTodoId = null;

const TODO_STATUS_LABEL = { todo: '📌 할 일', doing: '🔄 진행중', done: '✅ 완료' };
const TODO_STATUS_COLOR = { todo: 'var(--warning)', doing: 'var(--accent)', done: 'var(--accent3)' };
const TODO_PRIORITY_LABEL = { low: '🟢 낮음', mid: '🟡 보통', high: '🔴 높음' };
const TODO_PRIORITY_COLOR = { low: 'var(--accent3)', mid: 'var(--warning)', high: 'var(--danger)' };

function renderTodoList() {
  const wrap = document.getElementById('todoListWrap');
  const filter = document.getElementById('todoFilterSel')?.value || 'all';
  const items = filter === 'all' ? todoItems : todoItems.filter(t => t.status === filter);

  if (!items.length) {
    wrap.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);font-size:14px">${filter === 'all' ? '아직 할 일이 없습니다. + 항목 추가를 눌러보세요!' : '해당 상태의 항목이 없습니다.'}</div>`;
    return;
  }

  const total = todoItems.length;
  const done = todoItems.filter(t => t.status === 'done').length;
  const doing = todoItems.filter(t => t.status === 'doing').length;

  let html = `<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap">
    <div style="padding:10px 18px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;font-size:12px;font-weight:600">
      전체 <span style="color:var(--accent);font-size:16px;margin-left:6px">${total}</span>
    </div>
    <div style="padding:10px 18px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;font-size:12px;font-weight:600">
      진행중 <span style="color:var(--accent);font-size:16px;margin-left:6px">${doing}</span>
    </div>
    <div style="padding:10px 18px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:10px;font-size:12px;font-weight:600">
      완료 <span style="color:var(--accent3);font-size:16px;margin-left:6px">${done}</span>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:10px">`;

  items.forEach(t => {
    html += `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-left:4px solid ${TODO_PRIORITY_COLOR[t.priority]};border-radius:10px;padding:14px 16px;cursor:pointer;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shadow-lg)'" onmouseleave="this.style.boxShadow=''" onclick="openTodoModal('${t.id}')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;flex:1">${t.title}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:5px;background:${TODO_STATUS_COLOR[t.status]}22;color:${TODO_STATUS_COLOR[t.status]};font-weight:600">${TODO_STATUS_LABEL[t.status]}</span>
        <span style="font-size:11px;padding:2px 8px;border-radius:5px;border:1px solid ${TODO_PRIORITY_COLOR[t.priority]};color:${TODO_PRIORITY_COLOR[t.priority]};font-weight:600">${TODO_PRIORITY_LABEL[t.priority]}</span>
      </div>
      ${t.body ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;white-space:pre-wrap">${t.body}</div>` : ''}
      <div style="display:flex;gap:10px;font-size:11px;color:var(--text-muted)">
        <span>🕐 ${t.createdAt}</span>
        ${t.model ? `<span>📦 ${t.model}</span>` : ''}
      </div>
    </div>`;
  });
  html += '</div>';
  wrap.innerHTML = html;
}

function openTodoModal(id = null) {
  editingTodoId = id;
  const item = id ? todoItems.find(t => t.id === id) : null;
  document.getElementById('todoModalTitle').textContent = item ? '할 일 편집' : '할 일 추가';
  document.getElementById('todoDeleteBtn').style.display = item ? '' : 'none';
  document.getElementById('todoTitleInput').value = item?.title || '';
  document.getElementById('todoBodyInput').value = item?.body || '';
  document.getElementById('todoPriorityInput').value = item?.priority || 'mid';
  document.getElementById('todoStatusInput').value = item?.status || 'todo';

  const sel = document.getElementById('todoModelInput');
  sel.innerHTML = '<option value="">— 없음 —</option>';
  schema.models.forEach(m => {
    const o = document.createElement('option');
    o.value = m.name; o.textContent = m.name;
    if (item?.model === m.name) o.selected = true;
    sel.appendChild(o);
  });

  document.getElementById('todoModal').classList.add('show');
  setTimeout(() => document.getElementById('todoTitleInput').focus(), 100);
}

function closeTodoModal() {
  document.getElementById('todoModal').classList.remove('show');
  editingTodoId = null;
}

function saveTodoItem() {
  const title = document.getElementById('todoTitleInput').value.trim();
  if (!title) { toast('제목을 입력하세요', 'error'); return; }
  if (editingTodoId) {
    const t = todoItems.find(x => x.id === editingTodoId);
    if (t) {
      t.title = title;
      t.body = document.getElementById('todoBodyInput').value.trim();
      t.priority = document.getElementById('todoPriorityInput').value;
      t.status = document.getElementById('todoStatusInput').value;
      t.model = document.getElementById('todoModelInput').value;
    }
  } else {
    todoItems.unshift({
      id: 't' + Date.now(),
      title,
      body: document.getElementById('todoBodyInput').value.trim(),
      priority: document.getElementById('todoPriorityInput').value,
      status: document.getElementById('todoStatusInput').value,
      model: document.getElementById('todoModelInput').value,
      createdAt: new Date().toLocaleDateString('ko-KR')
    });
  }
  closeTodoModal();
  renderTodoList();
  toast('저장되었습니다', 'success');
}

function deleteTodoItem() {
  if (!editingTodoId) return;
  todoItems = todoItems.filter(t => t.id !== editingTodoId);
  closeTodoModal();
  renderTodoList();
  toast('삭제되었습니다', 'info');
}
