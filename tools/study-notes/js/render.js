// === RENDER ===
// 트리 → HTML (ol/li 기반)

function renderTree(nodes, depth = 0) {
  if (!nodes.length) return '';
  return `<ol>${nodes.map(n => renderNode(n, depth)).join('')}</ol>`;
}

function renderNode(node, depth) {
  const nameHtml = highlightInline(node.name);
  const childrenHtml = node.children.length ? renderTree(node.children, depth + 1) : '';

  if (node.noMarker) {
    return `<li data-depth="${depth}">
      <div class="item-line no-marker" data-depth="${Math.max(depth, 3)}">
        <span class="item-text">${nameHtml}</span>
      </div>
      ${childrenHtml}
    </li>`;
  }

  return `<li data-depth="${depth}">
    <div class="item-line" data-depth="${Math.min(depth, 4)}">
      <span class="item-marker">${node.marker || ''}</span>
      <span class="item-text">${nameHtml}</span>
    </div>
    ${childrenHtml}
  </li>`;
}

function buildPreviewHtml() {
  const raw = document.getElementById('bodyInput').value;
  const tree = numberTree(parseBody(raw));
  let html = renderTree(tree);
  if (!html) html = '<div class="note-list-empty" style="padding:60px 0">📖 내용을 입력하세요. Tab으로 들여쓰기.</div>';
  if (searchQuery) html = highlightSearch(html, searchQuery);
  return html;
}

function renderPreview() {
  const html = buildPreviewHtml();
  document.getElementById('preview').innerHTML = html;
  const $ep = document.getElementById('editPreview');
  if ($ep) $ep.innerHTML = html;

  // 표지(주제·두문자) + 빵부스러기 갱신
  if (currentId) {
    const n = findNote(currentId);
    if (n) {
      const $bcS = document.getElementById('breadcrumbSubject');
      const $bcT = document.getElementById('breadcrumbTopic');
      const $coverS = document.getElementById('paperSubject');
      const $date = document.getElementById('paperDate');
      if ($bcS) $bcS.textContent = n.subject || '미분류';
      if ($bcT) $bcT.textContent = n.topic || '(제목 없음)';
      if ($coverS) $coverS.textContent = n.subject || '';
      if ($date) $date.textContent = n.updatedAt ? '수정일 · ' + n.updatedAt.slice(0, 10).replace(/-/g, '.') : '';
    }
  }
}
