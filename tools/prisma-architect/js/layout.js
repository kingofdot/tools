// === GRID AUTO LAYOUT ===

function autoLayout() {
  const CX = 5000, CY = 5000;
  const CARD_W = 290, CARD_H = 330;
  const GX = 110, GY = 90;

  const USER_AXIS = 'User';
  const USER_ROW1 = ['Session', 'Account', 'DocumentRequest'];
  const USER_ROW2 = ['Post', 'DocumentPayload'];
  const USER_ROW3 = ['Tag'];
  const USER_SIDE = ['Verification', 'VerifiedEmail'];

  const BIZ_AXIS = 'Business';
  const BIZ_ROW1 = ['BusinessDocumentProfile', 'ProcessFlow', 'WasteDocumentation'];
  const BIZ_ROW2 = ['ControlFacility', 'ProductionFacility', 'WasteTargetItem', 'WasteStorageFacility'];
  const BIZ_ROW3 = ['WasteFacility'];
  const BIZ_SIDE = ['ExecutiveOfficer', 'Vehicle', 'Office'];

  const ENUM_USER = ['UserRole', 'UserType', 'Provider', 'DocumentType', 'DocumentRequestStatus'];
  const ENUM_BIZ = ['WasteIndustryType', 'ProfileScope', 'ChangeType', 'BottomShape'];

  const modelNames = new Set(schema.models.map(m => m.name));
  const enumNames = new Set(schema.enums.map(e => e.name));
  const f = (arr, set) => arr.filter(n => set.has(n));
  const fm = arr => f(arr, modelNames);
  const fe = arr => f(arr, enumNames);

  function placeRow(items, centerX, centerY) {
    if (!items.length) return;
    const totalW = items.length * (CARD_W + GX) - GX;
    items.forEach((name, i) => {
      const x = centerX - totalW / 2 + i * (CARD_W + GX);
      modelPositions[name] = { x: Math.round(x), y: Math.round(centerY) };
    });
  }

  function placeCol(items, centerX, centerY) {
    if (!items.length) return;
    const totalH = items.length * (CARD_H + GY) - GY;
    items.forEach((name, i) => {
      const y = centerY - totalH / 2 + i * (CARD_H + GY);
      modelPositions[name] = { x: Math.round(centerX), y: Math.round(y) };
    });
  }

  const SW = CARD_W + GX;
  const SH = CARD_H + GY;

  const userY = CY - SH * 1.2;
  const bizY = CY + SH * 1.2;

  if (modelNames.has('User')) modelPositions['User'] = { x: CX, y: Math.round(userY) };
  if (modelNames.has('Business')) modelPositions['Business'] = { x: CX, y: Math.round(bizY) };

  const uRow1 = fm(USER_ROW1), uRow2 = fm(USER_ROW2), uRow3 = fm(USER_ROW3);
  placeRow(uRow1, CX, userY - SH * 1.1);
  placeRow(uRow2, CX, userY - SH * 2.2);
  placeRow(uRow3, CX, userY - SH * 3.3);

  const uSide = fm(USER_SIDE);
  placeCol(uSide, CX - SW * (Math.max(uRow1.length, 1) / 2 + 1.5), userY - SH * 0.5);

  const bRow1 = fm(BIZ_ROW1), bRow2 = fm(BIZ_ROW2), bRow3 = fm(BIZ_ROW3);
  placeRow(bRow1, CX, bizY + SH * 1.1);
  placeRow(bRow2, CX, bizY + SH * 2.2);
  placeRow(bRow3, CX, bizY + SH * 3.3);

  const bSide = fm(BIZ_SIDE);
  placeCol(bSide, CX + SW * (Math.max(bRow1.length, 1) / 2 + 1.5), bizY + SH * 0.5);

  const placed = new Set(Object.keys(modelPositions));
  const unplaced = schema.models.filter(m => !placed.has(m.name));
  if (unplaced.length) placeRow(unplaced.map(m => m.name), CX, bizY + SH * 4.5);

  const euList = fe(ENUM_USER), ebList = fe(ENUM_BIZ);
  const allEnumPlaced = new Set([...euList, ...ebList]);
  const euExtra = schema.enums.filter(e => !allEnumPlaced.has(e.name)).map(e => e.name);

  const euX = CX + SW * (Math.max(uRow1.length, 1) / 2 + 1.8);
  placeCol([...euList, ...euExtra], euX, userY - SH * 0.3);

  const ebX = CX - SW * (Math.max(bRow1.length, 1) / 2 + 1.8);
  placeCol(ebList, ebX, bizY + SH * 0.5);

  // 겹침 해소 (nudge)
  const allNames = [...schema.models.map(m => m.name), ...schema.enums.map(e => e.name)];
  for (let iter = 0; iter < 50; iter++) {
    let moved = false;
    for (let i = 0; i < allNames.length; i++) {
      for (let j = i + 1; j < allNames.length; j++) {
        const a = modelPositions[allNames[i]], b = modelPositions[allNames[j]];
        if (!a || !b) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = (CARD_W + GX * 0.8) - Math.abs(dx), oy = (CARD_H + GY * 0.8) - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          if (ox < oy) {
            const p = ox / 2 + 6;
            if (dx >= 0) { a.x -= p; b.x += p; } else { a.x += p; b.x -= p; }
          } else {
            const p = oy / 2 + 6;
            if (dy >= 0) { a.y -= p; b.y += p; } else { a.y += p; b.y -= p; }
          }
          moved = true;
        }
      }
    }
    if (!moved) break;
  }

  allNames.forEach(n => {
    if (modelPositions[n]) {
      modelPositions[n].x = Math.round(modelPositions[n].x);
      modelPositions[n].y = Math.round(modelPositions[n].y);
    }
  });

  renderDiagram();
  setTimeout(zoomFit, 150);
  addLog('schema', '✨ User·Business 중심축 방사형 배치');
  toast('배치 완료', 'success');
}
