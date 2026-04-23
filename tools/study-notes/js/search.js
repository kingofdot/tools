// === SEARCH ===

function filterOne(n, q) {
  if (!q) return true;
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [n.subject || '', n.topic || '', n.mnemonic || '', n.body || ''].join('\n').toLowerCase();
  return hay.includes(needle);
}

function bindSearch() {
  const $s = document.getElementById('searchInput');
  $s.addEventListener('input', () => {
    searchQuery = $s.value;
    refreshChips();
    renderPreview();
  });
}
