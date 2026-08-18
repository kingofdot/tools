/* annotation-guide.js — 데이터(JSON) → 주석 패널 HTML 렌더러. 의존성 없음.
   사용: renderGuideSection(sectionData) → HTML 문자열
   좌표계: 모든 박스 b=[x,y,w,h]는 "섹션 원본 스크린샷" 좌표(cw × ch) 기준.
           패널 이미지는 섹션 스크린샷을 crop=[x,y,w,h]로 잘라낸 것.
*/
(function (global) {
  const LAYOUT = {
    // IX(이미지 왼쪽 들여쓰기)가 18 이면 스테이지 폭이 18+600+22+326=966 이 되어
    // 카드 안쪽 948 을 넘고, .ag{overflow:hidden} 에 콜아웃 오른쪽이 잘렸다.
    // 번호가 작은 정원으로 바뀌어 왼쪽 여백이 더는 필요 없으므로 IX 를 0 으로 둔다.
    side: { IW: 600, GAP: 22, CW: 326, IX: 0, CPL: 34 },  // 세로로 나열된 항목 → 콜아웃 우측
    below: { IW: 940, CW: 226, LANE: 24, CPL: 22 },       // 가로로 나열된 항목 → 콜아웃 아래
  };
  const BP = 2;   // 박스를 대상 바깥으로 띄우는 여백(px). 사면 동일.
  const IB = 1;   // .ag-img img 의 1px 테두리 — 스크린샷 원점이 그만큼 밀린다.
  // 번호 위치: 'corner' = 박스 왼쪽 위 모서리 중심, 'outside' = 박스 왼쪽 바깥(위 정렬)
  const NUM = { place: 'corner', gap: 6, w: 22 };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  /* 연결선 한 획. mode='bottom' 은 박스 **아래 변**에서 빠져나가 콜아웃으로 올라간다.
     오른쪽 변에서 곧장 나가면 옆 박스를 가로지르는 경우에 쓴다. */
  function wirePath(sx, sy, ex, ey, mode) {
    if (mode === 'bottom') {
      return `M${sx} ${sy} C ${sx} ${sy + 46}, ${ex - 96} ${ey}, ${ex} ${ey}`;
    }
    const k = Math.max(30, (ex - sx) * 0.45);
    return `M${sx} ${sy} C ${sx + k} ${sy}, ${ex - k} ${ey}, ${ex} ${ey}`;
  }
  const estH = (text, cpl) => 34 + Math.max(1, Math.ceil(text.length / cpl)) * 19; // 콜아웃 높이 추정

  function toRows(sec, group, k) {
    return group.f.map((idx) => {
      const f = sec.f[idx], b = f.b;
      return {
        n: idx + 1, f,
        x: Math.round((b[0] - group.crop[0]) * k) + IB,
        y: Math.round((b[1] - group.crop[1]) * k) + IB,
        w: Math.round(b[2] * k),
        h: Math.round(b[3] * k),
      };
    });
  }

  function sidePanel(sec, group, gi) {
    const { IW, GAP, CW, IX, CPL } = LAYOUT.side;
    const k = IW / group.crop[2], IH = Math.round(group.crop[3] * k);
    const MID = IX + IW + 11, CX = IX + IW + GAP;
    const rows = toRows(sec, group, k);
    let cy = 0;
    // 콜아웃 쌓는 순서. 기본은 번호순이지만 f.co 로 뒤집을 수 있다.
    // 나란히 놓인 박스에서 왼쪽 것이 위 콜아웃에 붙으면 지시선이 오른쪽 박스를 가로지른다.
    // 그때 왼쪽을 아래(co 큰 값)로 내리면 선이 서로 안 겹친다.
    rows.slice().sort((a, b) => (a.f.co === undefined ? a.n : a.f.co)
                              - (b.f.co === undefined ? b.n : b.f.co))
      .forEach((r) => { // 콜아웃은 박스 세로 중심에 맞추고, 겹치면 아래로 밀어냄
        r.ch = estH(r.f.desc, CPL);
        const c = r.y + r.h / 2;
        r.ct = Math.max(cy, Math.round(c - r.ch / 2));
        cy = r.ct + r.ch + 10;
      });
    // 항목별 여백(f.pad). 위아래로 맞붙은 박스는 0 을 주어 서로 겹치지 않게 한다.
    const P = (r) => (r.f.pad === undefined ? BP : r.f.pad);
    const boxes = rows.map((r) => `<div class="ag-box" data-n="${r.n}" style="left:${r.x - P(r)}px;top:${r.y - P(r)}px;width:${r.w + P(r) * 2}px;height:${r.h + P(r) * 2}px"></div>`).join('');
    // 번호 위치는 f.np 로 항목별 재정의(맞붙은 박스는 'mid' 로 빼야 위 박스와 안 부딪친다).
    const nums = rows.map((r) => {
      const bx = IX + r.x - P(r), by = r.y - P(r);
      const place = r.f.np || NUM.place;
      const p = place === 'outside' ? { x: bx - NUM.gap - NUM.w / 2, y: by + NUM.w / 2 }
        : place === 'mid' ? { x: bx, y: r.y + r.h / 2 }        // 왼쪽 변 세로 중심
        : { x: bx, y: by };                                    // 왼쪽 위 모서리 중심
      return `<div class="ag-num" style="left:${Math.round(p.x)}px;top:${Math.round(p.y)}px">${r.n}</div>`;
    }).join('');
    // f.dots = [[x,y], ...] — 한 박스 안에서 '여기 여기 여기' 를 짚어 주는 점.
    // 선택지가 여럿인 컨트롤은 칸마다 박스를 치는 대신 박스 하나 + 점으로 두는 게 덜 시끄럽다.
    const dots = rows.flatMap((r) => (r.f.dots || []).map((d) => {
      const dx = Math.round((d[0] - group.crop[0]) * k) + IB + IX;
      const dy = Math.round((d[1] - group.crop[1]) * k) + IB;
      return `<div class="ag-dot" style="left:${dx}px;top:${dy}px"></div>`;
    })).join('');
    // 연결선: 박스 오른쪽 바깥 변 → 콜아웃 왼쪽 변. 양끝이 수평으로 붙는 S자 곡선.
    const stageH = Math.max(IH, cy), stageW = CX + CW;
    // 끝점 y 는 콜아웃의 '실제' 세로 중심이라야 한다. 여기서는 추정 높이로 한 번 그리고,
    // DOM 에 올라간 뒤 fixWires() 가 실측값으로 다시 그린다(estH 는 한글에서 잘 틀린다).
    const paths = rows.map((r, i) => {
      const m = r.f.wire || 'right';
      const sx = m === 'bottom' ? Math.round(IX + r.x + r.w / 2)
        : Math.min(IX + r.x + r.w + P(r), MID - 12);
      const sy = m === 'bottom' ? Math.round(r.y + r.h + P(r)) : Math.round(r.y + r.h / 2);
      const cc = Math.round(r.ct + r.ch / 2);
      return `<path data-i="${i}" data-sx="${sx}" data-c="${sy}" data-ex="${CX}" data-m="${m}"`
        + ` d="${wirePath(sx, sy, CX, cc, m)}"/>`;
    }).join('');
    const wires = `<svg class="ag-wire" width="${stageW}" height="${stageH}" viewBox="0 0 ${stageW} ${stageH}">${paths}</svg>`;
    const cos = rows.map((r) => `<div class="ag-co" style="left:${CX}px;top:${r.ct}px;width:${CW}px"><h3>${r.n}. ${esc(r.f.title)}</h3><p>${esc(r.f.desc)}</p></div>`).join('');
    return panelShell(sec, group, gi, stageH, stageW, IX, IW, boxes + dots, nums, wires, cos);
  }

  function belowPanel(sec, group, gi) {
    const { IW, CW, LANE, CPL } = LAYOUT.below;
    const k = IW / group.crop[2], IH = Math.round(group.crop[3] * k);
    const rows = toRows(sec, group, k).sort((a, b) => a.x - b.x);
    const lanes = [];
    rows.forEach((r) => { // 가로로 늘어선 박스 → 아래쪽 레인에 좌→우로 배치, 겹치면 새 레인
      const want = Math.max(0, Math.min(IW - CW, Math.round(r.x + r.w / 2 - CW / 2)));
      r.ch = estH(r.f.desc, CPL);
      let li = 0;
      for (;; li++) { const l = lanes[li] || (lanes[li] = { right: -12, h: 0 }); if (want >= l.right + 12) break; }
      const l = lanes[li];
      r.cx = Math.max(want, l.right + 12); l.right = r.cx + CW; l.h = Math.max(l.h, r.ch); r.lane = li;
    });
    let ly = IH + LANE;
    lanes.forEach((l) => { l.top = ly; ly += l.h + 14; });
    rows.forEach((r) => { r.ct = lanes[r.lane].top; });
    const boxes = rows.map((r) => `<div class="ag-box" style="left:${r.x - BP}px;top:${r.y - BP}px;width:${r.w + BP * 2}px;height:${r.h + BP * 2}px"></div>`).join('');
    const nums = rows.map((r) => `<div class="ag-num" style="left:${r.x - BP}px;top:${r.y - BP}px">${r.n}</div>`).join('');
    const paths = rows.map((r) => {
      const bx = Math.round(r.x + r.w / 2), by = r.y + r.h + BP, cx = r.cx + CW / 2, ct = r.ct;
      const k = Math.max(24, (ct - by) * 0.5);
      return `<path d="M${bx} ${by} C ${bx} ${by + k}, ${cx} ${ct - k}, ${cx} ${ct}"/>`;
    }).join('');
    const wires = `<svg class="ag-wire" width="${IW}" height="${ly}" viewBox="0 0 ${IW} ${ly}">${paths}</svg>`;
    const cos = rows.map((r) => `<div class="ag-co" style="left:${r.cx}px;top:${r.ct}px;width:${CW}px"><h3>${r.n}. ${esc(r.f.title)}</h3><p>${esc(r.f.desc)}</p></div>`).join('');
    return panelShell(sec, group, gi, ly, IW, 0, IW, boxes, nums, wires, cos);
  }

  function panelShell(sec, group, gi, h, stageW, ix, iw, boxes, nums, wires, cos) {
    return `<div class="ag-panel" data-panel="${sec.key}-${gi + 1}">`
      + `<div class="ag-plabel"><span class="ag-pno">${sec.step.slice(-2)}-${gi + 1}</span>${esc(group.label)}</div>`
      + `<div class="ag-stage" style="height:${h}px;width:${stageW}px">`
      + `<div class="ag-img" style="left:${ix}px;width:${iw}px"><img src="${sec.imgBase || ''}${group.img}" alt="">${boxes}</div>`
      + `${nums}${wires}${cos}</div></div>`;
  }

  function renderGuideSection(sec) {
    const panels = sec.g.map((g, gi) => (g.mode === 'below' ? belowPanel(sec, g, gi) : sidePanel(sec, g, gi))).join('');
    return `<div class="ag" data-section="${sec.key}">`
      + `<div class="ag-head"><span class="ag-step">${sec.step}</span><h2>${esc(sec.title)}</h2><p>${esc(sec.sub)}</p></div>`
      + `<div class="ag-panels">${panels}`
      + (sec.flow && sec.flow.length ? `<svg class="ag-flow"></svg>` : '')
      + `</div></div>`;
  }

  /* 렌더 직후 한 번 호출한다. 콜아웃의 실제 높이를 재서 연결선 끝점을
     '왼쪽 변 세로 중심'에 정확히 맞춘다. side 모드에만 적용(데이터 속성이 있는 path). */
  function fixWires(root) {
    (root || document).querySelectorAll('.ag-panel').forEach((p) => {
      const cos = p.querySelectorAll('.ag-co');
      p.querySelectorAll('.ag-wire path').forEach((path) => {
        if (!path.dataset.sx) return;
        const co = cos[+path.dataset.i];
        if (!co) return;
        const sx = +path.dataset.sx, c = +path.dataset.c, ex = +path.dataset.ex;
        const ey = Math.round(co.offsetTop + co.offsetHeight / 2);
        path.setAttribute('d', wirePath(sx, c, ex, ey, path.dataset.m));
      });
    });
  }

  /* 패널을 가로지르는 흐름 화살표. sec.flow = [{from, to, text}] (from·to 는 박스 번호).
     "여기서 체크하면 → 저기에 담긴다" 처럼 서로 다른 패널의 두 박스를 잇는다.
     콜아웃 지시선과 달리 실선 + 화살촉이라 '이동'으로 읽힌다. */
  function fixFlows(root, sec) {
    if (!sec || !sec.flow || !sec.flow.length) return;
    const wrap = (root || document).querySelector('.ag-panels');
    const svg = wrap && wrap.querySelector('.ag-flow');
    if (!svg) return;
    const W = wrap.offsetWidth, H = wrap.offsetHeight;
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const base = wrap.getBoundingClientRect();
    const at = (n) => {
      const el = wrap.querySelector(`.ag-box[data-n="${n}"]`);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { l: b.left - base.left, t: b.top - base.top, w: b.width, h: b.height };
    };
    let out = '';
    wrap.querySelectorAll('.ag-flowlab').forEach((e) => e.remove());
    sec.flow.forEach((f) => {
      const a = at(f.from), z = at(f.to);
      if (!a || !z) return;
      // 시작: 위 박스 아래 변에서 오른쪽으로 치우친 지점. 끝: 아래 박스 위 변 가운데.
      const sx = Math.round(a.l + a.w * (f.fx === undefined ? 0.72 : f.fx));
      const sy = Math.round(a.t + a.h + 4);
      const ex = Math.round(z.l + z.w / 2), ey = Math.round(z.t - 12);
      const k = Math.max(40, (ey - sy) * 0.45);
      out += `<path d="M${sx} ${sy} C ${sx} ${sy + k}, ${ex} ${ey - k}, ${ex} ${ey}"/>`;
      out += `<polygon points="${ex},${ey + 7} ${ex - 3.6},${ey - 2} ${ex + 3.6},${ey - 2}"/>`;
      if (f.text) {
        const d = document.createElement('div');
        d.className = 'ag-flowlab';
        d.textContent = f.text;
        d.style.left = Math.round((sx + ex) / 2) + 'px';
        d.style.top = Math.round((sy + ey) / 2) + 'px';
        wrap.appendChild(d);
      }
    });
    svg.innerHTML = out;
  }

  global.AG_fixFlows = fixFlows;
  global.renderGuideSection = renderGuideSection;
  global.AG_fixWires = fixWires;
  global.AG_LAYOUT = LAYOUT;
  global.AG_NUM = NUM;
})(typeof window !== 'undefined' ? window : globalThis);
