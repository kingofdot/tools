// === RENDER ===
// 트리 → HTML

function renderTree(nodes) {
  if (!nodes.length) {
    return '<div class="preview-empty">📖 편집 모드(✏ 편집)에서 내용을 작성하면 여기에 표시됩니다.<br>Tab/Shift+Tab으로 들여쓰기 단계 조절.</div>';
  }
  return nodes.map(renderNode).join('');
}

function renderNode(node) {
  const nameHtml = highlightInline(node.name);
  const childrenHtml = node.children.length
    ? `<div class="children">${node.children.map(renderNode).join('')}</div>`
    : '';
  return `
    <div class="item depth-${Math.min(node.depth, 4)}">
      <div class="item-title">
        <span class="item-num">${node.marker}</span>
        <span class="item-name">${nameHtml}</span>
      </div>
      ${childrenHtml}
    </div>
  `;
}

function buildPreviewHtml(noteOrNull) {
  const raw = document.getElementById('bodyInput').value;
  const tree = numberTree(parseBody(raw));
  let inner = renderTree(tree);

  // 보기 모드에서만 헤더(주제·두문자) 표시
  let header = '';
  if (viewMode === 'study' && noteOrNull) {
    const t = noteOrNull.topic || '';
    const m = noteOrNull.mnemonic || '';
    if (t || m) {
      header = `<header class="doc-header">
        ${t ? `<div class="doc-title">${esc(t)}</div>` : ''}
        ${m ? `<div class="doc-mnemonic">${esc(m)}</div>` : ''}
      </header>`;
    }
  }

  let html = header + inner;
  if (searchQuery) html = highlightSearch(html, searchQuery);
  return html;
}

function renderPreview() {
  const note = currentId ? findNote(currentId) : null;
  const html = buildPreviewHtml(note);
  document.getElementById('preview').innerHTML = html;
  // 편집 모드의 라이브 미리보기도 같은 트리 (헤더 제외)
  const $ep = document.getElementById('editPreview');
  if ($ep) {
    const treeOnly = renderTree(numberTree(parseBody(document.getElementById('bodyInput').value)));
    $ep.innerHTML = `<div class="preview">${searchQuery ? highlightSearch(treeOnly, searchQuery) : treeOnly}</div>`;
  }
}
