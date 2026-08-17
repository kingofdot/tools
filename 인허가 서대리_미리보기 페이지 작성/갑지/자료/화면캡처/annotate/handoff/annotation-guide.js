/* annotation-guide.js — 데이터(JSON) → 주석 패널 HTML 렌더러. 의존성 없음.
   사용: renderGuideSection(sectionData) → HTML 문자열
   좌표계: 모든 박스 b=[x,y,w,h]는 "섹션 원본 스크린샷" 좌표(cw × ch) 기준.
           패널 이미지는 섹션 스크린샷을 crop=[x,y,w,h]로 잘라낸 것.
*/
(function (global) {
  const LAYOUT = {
    side: { IW: 600, GAP: 22, CW: 326, IX: 18, CPL: 34 }, // 세로로 나열된 항목 → 콜아웃 우측
    below: { IW: 940, CW: 226, LANE: 24, CPL: 22 },       // 가로로 나열된 항목 → 콜아웃 아래
  };
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const estH = (text, cpl) => 34 + Math.max(1, Math.ceil(text.length / cpl)) * 19; // 콜아웃 높이 추정

  function toRows(sec, group, k) {
    return group.f.map((idx) => {
      const f = sec.f[idx], b = f.b;
      return {
        n: idx + 1, f,
        x: Math.round((b[0] - group.crop[0]) * k),
        y: Math.round((b[1] - group.crop[1]) * k),
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
    rows.forEach((r) => { // 콜아웃은 박스 세로 중심에 맞추고, 겹치면 아래로 밀어냄
      r.ch = estH(r.f.desc, CPL);
      const c = r.y + r.h / 2;
      r.ct = Math.max(cy, Math.round(c - r.ch / 2));
      cy = r.ct + r.ch + 10;
    });
    const boxes = rows.map((r) => `<div class="ag-box" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`).join('');
    const nums = rows.map((r) => `<div class="ag-num" style="left:${IX + r.x - 13}px;top:${Math.round(r.y + r.h / 2)}px">${r.n}</div>`).join('');
    const wires = rows.map((r) => {
      const c = Math.round(r.y + r.h / 2), sx = Math.min(IX + r.x + r.w, MID - 12), cc = r.ct + 18;
      return `<div class="ag-tip-l" style="left:${sx + 2}px;top:${c}px"></div>`
        + `<div class="ag-seg" style="left:${sx + 11}px;top:${c}px;height:1.5px;width:${MID - sx - 11}px"></div>`
        + (Math.abs(c - cc) > 2 ? `<div class="ag-seg" style="left:${MID}px;top:${Math.min(c, cc)}px;width:1.5px;height:${Math.abs(c - cc)}px"></div>` : '')
        + `<div class="ag-seg" style="left:${MID}px;top:${cc}px;height:1.5px;width:11px"></div>`;
    }).join('');
    const cos = rows.map((r) => `<div class="ag-co" style="left:${CX}px;top:${r.ct}px;width:${CW}px"><h3>${r.n}. ${esc(r.f.title)}</h3><p>${esc(r.f.desc)}</p></div>`).join('');
    return panelShell(sec, group, gi, Math.max(IH, cy), CX + CW, IX, IW, boxes, nums, wires, cos);
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
    const boxes = rows.map((r) => `<div class="ag-box" style="left:${r.x}px;top:${r.y}px;width:${r.w}px;height:${r.h}px"></div>`).join('');
    const nums = rows.map((r) => `<div class="ag-num" style="left:${Math.round(r.x + r.w / 2)}px;top:${r.y - 12}px">${r.n}</div>`).join('');
    const wires = rows.map((r) => {
      const bx = Math.round(r.x + r.w / 2), by = r.y + r.h, cx = r.cx + CW / 2, elbow = r.ct - 10;
      return `<div class="ag-tip-u" style="left:${bx}px;top:${by + 2}px"></div>`
        + `<div class="ag-seg" style="left:${bx}px;top:${by + 10}px;width:1.5px;height:${Math.max(0, elbow - by - 10)}px"></div>`
        + (Math.abs(bx - cx) > 2 ? `<div class="ag-seg" style="left:${Math.min(bx, cx)}px;top:${elbow}px;height:1.5px;width:${Math.abs(bx - cx)}px"></div>` : '')
        + `<div class="ag-seg" style="left:${cx}px;top:${elbow}px;width:1.5px;height:10px"></div>`;
    }).join('');
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
      + `<div class="ag-panels">${panels}</div></div>`;
  }

  global.renderGuideSection = renderGuideSection;
  global.AG_LAYOUT = LAYOUT;
})(typeof window !== 'undefined' ? window : globalThis);
