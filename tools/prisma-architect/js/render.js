// === RENDER ===

function renderDiagram() {
  const canvas = document.getElementById('canvas'); canvas.innerHTML = '';

  window.recentChangesMap = {};
  for (let i = changeLog.length - 1; i >= 0; i--) {
    const e = changeLog[i];
    if (!e || e.isUndone) continue;
    const key = getLogTarget(e);
    if (key && window.recentChangesMap[key] === undefined) window.recentChangesMap[key] = i;
  }

  const all = [...schema.models.map(m => ({ ...m, kind: 'model' })), ...schema.enums.map(e => ({ ...e, kind: 'enum' }))];
  all.forEach((item, i) => { if (!modelPositions[item.name]) { const c = Math.ceil(Math.sqrt(all.length)); modelPositions[item.name] = { x: 60 + (i % c) * 360, y: 60 + Math.floor(i / c) * 420 }; } });

  all.forEach(item => {
    const card = document.createElement('div');
    card.className = 'model-card'; card.dataset.name = item.name;
    const p = modelPositions[item.name]; card.style.left = p.x + 'px'; card.style.top = p.y + 'px';
    if (item.kind === 'enum' && !showEnumLines) { card.style.display = 'none'; }

    const hdr = document.createElement('div'); hdr.className = `mc-header ${item.kind}`;

    let modelMarker = '';
    const mKey = 'model:' + item.name;
    if (window.recentChangesMap[mKey] !== undefined) {
      modelMarker = `<div class="change-marker" style="margin-right:6px;" onclick="scrollToLog(event, ${window.recentChangesMap[mKey]})" title="변경 로그 포커스"></div>`;
    }
    hdr.innerHTML = `<span>${item.name}</span><div style="display:flex;align-items:center">${modelMarker}<span class="badge">${item.kind.toUpperCase()}</span></div>`;
    card.appendChild(hdr);

    const body = document.createElement('div'); body.className = 'mc-body';
    if (item.kind === 'model') {
      item.fields.forEach(f => {
        const row = document.createElement('div'); row.className = 'field-row';
        const ic = f.isId ? '<span class="fi pk">🔑</span>' : f.hasRelation || schema.models.some(m => m.name === f.type) ? '<span class="fi rel">🔗</span>' : '<span class="fi em"></span>';

        let fieldMarker = '';
        const fKey = 'field:' + item.name + '.' + f.name;
        if (window.recentChangesMap[fKey] !== undefined) {
          fieldMarker = `<div class="change-marker" style="margin-right:6px; width:8px; height:8px;" onclick="scrollToLog(event, ${window.recentChangesMap[fKey]})" title="변경 로그 포커스"></div>`;
        }

        row.innerHTML = `${fieldMarker}${ic}<span class="field-name">${f.name}</span><span class="field-type">${f.type + (f.isArray ? '[]' : '') + (f.isOptional ? '?' : '')}</span>`;
        row.addEventListener('dblclick', e => { e.stopPropagation(); openFieldEditor(item.name, f.name); });
        body.appendChild(row);
      });
    } else {
      item.values.forEach(v => { const d = document.createElement('div'); d.className = 'enum-val'; d.textContent = v; body.appendChild(d); });
    }
    card.appendChild(body);

    hdr.addEventListener('mousedown', e => { if (e.button !== 0) return; e.preventDefault(); draggingCard = card; card.classList.add('dragging'); dragOffsetX = (e.clientX - card.getBoundingClientRect().left) / zoom; dragOffsetY = (e.clientY - card.getBoundingClientRect().top) / zoom; });
    card.addEventListener('contextmenu', e => { e.preventDefault(); ctxTarget = item.name; const m = document.getElementById('contextMenu'); m.style.left = e.clientX + 'px'; m.style.top = e.clientY + 'px'; m.classList.add('show'); });
    canvas.appendChild(card);
  });

  requestAnimationFrame(() => {
    document.querySelectorAll('.model-card').forEach(c => { cardSizes[c.dataset.name] = { w: c.offsetWidth, h: c.offsetHeight }; });
    drawRels();
  });
  renderAnnotations();
  updateStats(); updateTransform();
}

function renderAnnotations() {
  document.querySelectorAll('.anno-card').forEach(el => el.remove());
  const canvas = document.getElementById('canvas');
  annotations.forEach(anno => {
    const el = document.createElement('div');
    el.className = 'anno-card';
    el.dataset.id = anno.id;
    el.style.left = anno.x + 'px';
    el.style.top = anno.y + 'px';
    el.innerHTML = `<div class="anno-text">${esc(anno.text || '메모')}</div><button class="anno-del" onclick="deleteAnnotation('${anno.id}')">✕</button>`;
    el.querySelector('.anno-text').addEventListener('dblclick', e => { e.stopPropagation(); editAnnotation(anno.id); });
    el.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      e.stopPropagation();
      draggingAnnotation = { el, id: anno.id, offX: (e.clientX - el.getBoundingClientRect().left) / zoom, offY: (e.clientY - el.getBoundingClientRect().top) / zoom };
      el.classList.add('dragging');
    });
    canvas.appendChild(el);
  });
}

function editAnnotation(id) {
  const anno = annotations.find(a => a.id === id);
  if (!anno) return;
  const text = prompt('메모 수정:', anno.text);
  if (text === null) return;
  anno.text = text;
  renderAnnotations();
}

function deleteAnnotation(id) {
  annotations = annotations.filter(a => a.id !== id);
  renderAnnotations();
}

// === DRAW RELATIONS ===
function drawRels() {
  const svg = document.getElementById('svgOverlay'); svg.innerHTML = '';
  getRels().forEach(rel => {
    if (rel.isEnum && !showEnumLines) return;
    const fp = modelPositions[rel.from], tp = modelPositions[rel.to];
    const fs = cardSizes[rel.from], ts = cardSizes[rel.to];
    if (!fp || !tp || !fs || !ts) return;

    const fRect = { l: fp.x, t: fp.y, r: fp.x + fs.w, b: fp.y + fs.h };
    const tRect = { l: tp.x, t: tp.y, r: tp.x + ts.w, b: tp.y + ts.h };

    const fcx = (fRect.l + fRect.r) / 2, fcy = (fRect.t + fRect.b) / 2;
    const tcx = (tRect.l + tRect.r) / 2, tcy = (tRect.t + tRect.b) / 2;

    const fromPt = getEdgePoint(fRect, tcx, tcy);
    const toPt = getEdgePoint(tRect, fcx, fcy);

    const x1 = fromPt.x, y1 = fromPt.y, x2 = toPt.x, y2 = toPt.y;

    let cp1x, cp1y, cp2x, cp2y;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    const tension = Math.min(dist * 0.4, 120);

    if (fromPt.side === 'left' || fromPt.side === 'right') {
      cp1x = x1 + (fromPt.side === 'right' ? tension : -tension); cp1y = y1;
    } else {
      cp1x = x1; cp1y = y1 + (fromPt.side === 'bottom' ? tension : -tension);
    }
    if (toPt.side === 'left' || toPt.side === 'right') {
      cp2x = x2 + (toPt.side === 'right' ? tension : -tension); cp2y = y2;
    } else {
      cp2x = x2; cp2y = y2 + (toPt.side === 'bottom' ? tension : -tension);
    }

    const d = `M${x1},${y1} C${cp1x},${cp1y} ${cp2x},${cp2y} ${x2},${y2}`;
    const col = rel.isEnum ? '#8b5cf6' : '#94a3b8';
    const colAccent = rel.isEnum ? '#7c3aed' : '#64748b';

    svg.appendChild(mkSVG('path', { d, fill: 'none', stroke: col, 'stroke-width': '6', opacity: '0.08' }));
    svg.appendChild(mkSVG('path', { d, fill: 'none', stroke: col, 'stroke-width': '2', 'stroke-dasharray': rel.isEnum ? '6,4' : 'none', opacity: '0.6' }));

    [{ x: x1, y: y1 }, { x: x2, y: y2 }].forEach(pt => {
      svg.appendChild(mkSVG('circle', { cx: pt.x, cy: pt.y, r: '4', fill: colAccent, opacity: '0.8' }));
    });

    const bmx = 0.125 * x1 + 0.375 * cp1x + 0.375 * cp2x + 0.125 * x2;
    const bmy = 0.125 * y1 + 0.375 * cp1y + 0.375 * cp2y + 0.125 * y2;

    const bw = rel.isEnum ? 48 : 44, bh = 24;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', 'card-box');
    if (!rel.isEnum) { g.style.cursor = 'pointer'; g.addEventListener('click', () => cycleCard(rel.from, rel.to, rel.key)); }

    g.appendChild(mkSVG('rect', { x: bmx - bw / 2, y: bmy - bh / 2, width: bw, height: bh, rx: '7', fill: '#ffffff', stroke: colAccent, 'stroke-width': '1.5' }));
    g.appendChild(mkSVG('text', { x: bmx, y: bmy + 1, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: colAccent, 'font-size': '11', 'font-weight': '700', 'font-family': 'JetBrains Mono, monospace' }, rel.isEnum ? 'enum' : rel.cardinality));
    if (!rel.isEnum) { const ti = document.createElementNS('http://www.w3.org/2000/svg', 'title'); ti.textContent = '클릭: 1:1 → 1:N → M:N'; g.appendChild(ti); }
    svg.appendChild(g);

    const delX = bmx + bw / 2 + 14, delY = bmy;
    const delBtn = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    delBtn.style.cursor = 'pointer';
    delBtn.style.pointerEvents = 'all';
    delBtn.addEventListener('mouseenter', () => delBtn.firstChild.setAttribute('fill', '#fecaca'));
    delBtn.addEventListener('mouseleave', () => delBtn.firstChild.setAttribute('fill', '#fee2e2'));
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(`[${rel.from} ↔ ${rel.to}] 연결을 완전히 끊으시겠습니까?\n(스키마에서도 관련 필드가 삭제됩니다)`)) {
        deleteRelation(rel.from, rel.to, rel.isEnum);
      }
    });
    delBtn.appendChild(mkSVG('circle', { cx: delX, cy: delY, r: '8', fill: '#fee2e2', stroke: '#dc2626', 'stroke-width': '1.2' }));
    delBtn.appendChild(mkSVG('line', { x1: delX - 3, y1: delY - 3, x2: delX + 3, y2: delY + 3, stroke: '#dc2626', 'stroke-width': '2', 'stroke-linecap': 'round' }));
    delBtn.appendChild(mkSVG('line', { x1: delX + 3, y1: delY - 3, x2: delX - 3, y2: delY + 3, stroke: '#dc2626', 'stroke-width': '2', 'stroke-linecap': 'round' }));
    const delTi = document.createElementNS('http://www.w3.org/2000/svg', 'title');
    delTi.textContent = '연결 완전히 끊기';
    delBtn.appendChild(delTi);
    svg.appendChild(delBtn);

    // 관계 변경 마커
    const rKey = 'relation:' + rel.key;
    if (window.recentChangesMap && window.recentChangesMap[rKey] !== undefined) {
      const idx = window.recentChangesMap[rKey];
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      marker.setAttribute('cx', bmx - bw / 2 + 2);
      marker.setAttribute('cy', bmy - bh / 2 + 2);
      marker.setAttribute('r', '5');
      marker.setAttribute('fill', 'var(--success)');
      marker.setAttribute('stroke', '#fff');
      marker.setAttribute('stroke-width', '1.5');
      marker.style.cursor = 'pointer';
      marker.innerHTML = `<animate attributeName="r" values="4;7;4" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="1;0.4;1" dur="1.5s" repeatCount="indefinite" />`;
      marker.addEventListener('click', (e) => { e.stopPropagation(); scrollToLog(e, idx); });
      const mTi = document.createElementNS('http://www.w3.org/2000/svg', 'title');
      mTi.textContent = '클릭하여 변경 로그 확인';
      marker.appendChild(mTi);
      g.appendChild(marker);
    }
  });
}

function getEdgePoint(rect, tx, ty) {
  const cx = (rect.l + rect.r) / 2, cy = (rect.t + rect.b) / 2;
  const dx = tx - cx, dy = ty - cy;
  const hw = (rect.r - rect.l) / 2, hh = (rect.b - rect.t) / 2;

  if (dx === 0 && dy === 0) return { x: rect.r, y: cy, side: 'right' };

  const absDx = Math.abs(dx), absDy = Math.abs(dy);
  if (absDx * hh > absDy * hw) {
    if (dx > 0) return { x: rect.r, y: cy + (dy / dx) * hw, side: 'right' };
    else return { x: rect.l, y: cy - (dy / dx) * hw, side: 'left' };
  } else {
    if (dy > 0) return { x: cx + (dx / dy) * hh, y: rect.b, side: 'bottom' };
    else return { x: cx - (dx / dy) * hh, y: rect.t, side: 'top' };
  }
}

function mkSVG(tag, attrs, text) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, String(v)));
  if (text) el.textContent = text;
  return el;
}

function updateTransform() {
  const t = `translate(${panX}px,${panY}px) scale(${zoom})`;
  document.getElementById('canvasRoot').style.transform = t;
  document.getElementById('zoomLevel').textContent = Math.round(zoom * 100) + '%';
}

function updateStats() {
  document.getElementById('statsModels').textContent = `Models: ${schema.models.length}`;
  document.getElementById('statsEnums').textContent = `Enums: ${schema.enums.length}`;
  document.getElementById('statsRelations').textContent = `Relations: ${getRels().filter(r => !r.isEnum).length}`;
}
