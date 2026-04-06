// === 건의함 ===

let suggestItems = [];
let editingSuggestId = null;

const SUGGEST_CAT_LABEL = { feature: '✨ 기능 요청', bug: '🐛 버그 신고', improve: '🔧 개선 제안', etc: '💬 기타' };
const SUGGEST_CAT_COLOR = { feature: 'var(--accent)', bug: 'var(--danger)', improve: 'var(--warning)', etc: 'var(--accent2)' };

function renderSuggestList() {
  const wrap = document.getElementById('suggestListWrap');
  if (!suggestItems.length) {
    wrap.innerHTML = `<div style="padding:60px;text-align:center;color:var(--text-muted);font-size:14px">아직 건의 내용이 없습니다. + 건의 작성을 눌러보세요!</div>`;
    return;
  }
  let html = `<div style="display:flex;flex-direction:column;gap:10px">`;
  suggestItems.forEach(s => {
    html += `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-left:4px solid ${SUGGEST_CAT_COLOR[s.category]};border-radius:10px;padding:14px 16px;cursor:pointer;transition:box-shadow .15s" onmouseenter="this.style.boxShadow='var(--shadow-lg)'" onmouseleave="this.style.boxShadow=''" onclick="openSuggestModal('${s.id}')">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:13px;font-weight:700;flex:1">${s.title}</span>
        <span style="font-size:11px;padding:2px 10px;border-radius:5px;background:${SUGGEST_CAT_COLOR[s.category]}22;color:${SUGGEST_CAT_COLOR[s.category]};font-weight:600">${SUGGEST_CAT_LABEL[s.category]}</span>
      </div>
      ${s.body ? `<div style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;white-space:pre-wrap">${s.body}</div>` : ''}
      <div style="display:flex;gap:10px;font-size:11px;color:var(--text-muted)">
        <span>🕐 ${s.createdAt}</span>
        ${s.author ? `<span>👤 ${s.author}</span>` : ''}
      </div>
    </div>`;
  });
  html += '</div>';
  wrap.innerHTML = html;
}

function openSuggestModal(id = null) {
  editingSuggestId = id;
  const item = id ? suggestItems.find(s => s.id === id) : null;
  document.getElementById('suggestModalTitle').textContent = item ? '건의 편집' : '건의 작성';
  document.getElementById('suggestDeleteBtn').style.display = item ? '' : 'none';
  document.getElementById('suggestTitleInput').value = item?.title || '';
  document.getElementById('suggestBodyInput').value = item?.body || '';
  document.getElementById('suggestCatInput').value = item?.category || 'feature';
  document.getElementById('suggestAuthorInput').value = item?.author || '';
  document.getElementById('suggestModal').classList.add('show');
  setTimeout(() => document.getElementById('suggestTitleInput').focus(), 100);
}

function closeSuggestModal() {
  document.getElementById('suggestModal').classList.remove('show');
  editingSuggestId = null;
}

function saveSuggestItem() {
  const title = document.getElementById('suggestTitleInput').value.trim();
  if (!title) { toast('제목을 입력하세요', 'error'); return; }
  if (editingSuggestId) {
    const s = suggestItems.find(x => x.id === editingSuggestId);
    if (s) {
      s.title = title;
      s.body = document.getElementById('suggestBodyInput').value.trim();
      s.category = document.getElementById('suggestCatInput').value;
      s.author = document.getElementById('suggestAuthorInput').value.trim();
    }
  } else {
    suggestItems.unshift({
      id: 's' + Date.now(),
      title,
      body: document.getElementById('suggestBodyInput').value.trim(),
      category: document.getElementById('suggestCatInput').value,
      author: document.getElementById('suggestAuthorInput').value.trim(),
      createdAt: new Date().toLocaleDateString('ko-KR')
    });
  }
  closeSuggestModal();
  renderSuggestList();
  toast('등록되었습니다', 'success');
}

function deleteSuggestItem() {
  if (!editingSuggestId) return;
  suggestItems = suggestItems.filter(s => s.id !== editingSuggestId);
  closeSuggestModal();
  renderSuggestList();
  toast('삭제되었습니다', 'info');
}
