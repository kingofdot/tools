// === INIT ===
// 유틸 함수 + 초기화

function dl(c, n, t) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([c], { type: t }));
  a.download = n; a.click();
}

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `${{ success: '✓', error: '✕', info: 'ℹ' }[type] || 'ℹ'} ${msg}`;
  c.appendChild(el);
  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity .3s';
    setTimeout(() => el.remove(), 300);
  }, 2500);
}

// === 임포트 / 익스포트 / Diff ===
function showImportModal() {
  document.getElementById('importModal').classList.add('show');
  document.getElementById('importText').value = '';
}

function closeImportModal() {
  document.getElementById('importModal').classList.remove('show');
}

function doImport() {
  const t = document.getElementById('importText').value;
  if (!t.trim()) { toast('입력 필요', 'error'); return; }
  try {
    schema = parse(t);
    modelPositions = {}; cardSizes = {}; cardinalityMap = {};
    snapshot = gen(schema);

    historyStack = [{ schemaStr: gen(schema), positions: JSON.stringify(modelPositions), cardinalities: JSON.stringify(cardinalityMap) }];
    historyIndex = 0; changeLog = [];

    addLog('schema', `임포트: ${schema.models.length}모델, ${schema.enums.length}Enum`);
    closeImportModal();
    renderDiagram();
    syncEditor();
    setTimeout(autoLayout, 100);
    toast('임포트 완료', 'success');
  } catch (e) {
    toast('오류', 'error');
  }
}

function exportSchema() {
  dl(gen(schema), 'schema.prisma', 'text/plain');
  addLog('schema', '익스포트');
  toast('다운로드', 'success');
}

function snapshotSchema() {
  snapshot = gen(schema);
  addLog('schema', '📸 스냅샷 저장');
  toast('스냅샷 저장', 'success');
}

function runDiff() {
  if (!snapshot) { toast('스냅샷 먼저', 'error'); return; }
  const cur = gen(schema), bL = snapshot.split('\n'), aL = cur.split('\n'), diff = computeDiff(bL, aL);
  const bEl = document.getElementById('diffBefore'), aEl = document.getElementById('diffAfter');

  let bHtml = '', aHtml = '';
  let bn = 0, an = 0;
  const tLen = diff.length;

  diff.forEach((op, i) => {
    if (op.type === 'equal') {
      bn++; an++;
      bHtml += `<div class="diff-line unchanged"><span class="ln">${bn}</span>${esc(op.value)}</div>`;
      aHtml += `<div class="diff-line unchanged"><span class="ln">${an}</span>${esc(op.value)}</div>`;
    } else if (op.type === 'remove') {
      bn++;
      bHtml += `<div class="diff-line removed"><span class="ln">${bn}</span>${esc(op.value)}</div>`;
      aHtml += `<div class="diff-line" style="opacity:.15"><span class="ln"></span></div>`;
    } else {
      an++;
      bHtml += `<div class="diff-line" style="opacity:.15"><span class="ln"></span></div>`;
      aHtml += `<div class="diff-line added"><span class="ln">${an}</span>${esc(op.value)}</div>`;
    }
  });

  bEl.innerHTML = bHtml;
  aEl.innerHTML = aHtml;
  toast('비교 완료', 'info');
}

function computeDiff(a, b) {
  const n = a.length, m = b.length, mx = n + m, v = new Array(2 * mx + 1).fill(0), tr = [];
  v[mx + 1] = 0;
  for (let d = 0; d <= mx; d++) {
    const nv = [...v];
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[k - 1 + mx] < v[k + 1 + mx])) x = v[k + 1 + mx];
      else x = v[k - 1 + mx] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      nv[k + mx] = x;
      if (x >= n && y >= m) { tr.push([...nv]); return bt(tr, a, b, mx); }
    }
    tr.push([...nv]);
    for (let i = 0; i < nv.length; i++) v[i] = nv[i];
  }
  return [];
}

function bt(tr, a, b, mx) {
  let x = a.length, y = b.length;
  const ops = [];
  for (let d = tr.length - 1; d >= 0; d--) {
    const v = tr[d], k = x - y;
    let pk;
    if (k === -d || (k !== d && (d === 0 || tr[d - 1][k - 1 + mx] < tr[d - 1][k + 1 + mx]))) pk = k + 1;
    else pk = k - 1;
    const px = d > 0 ? tr[d - 1][pk + mx] : 0, py = px - pk;
    while (x > px && y > py && x > 0 && y > 0) { x--; y--; ops.unshift({ type: 'equal', value: a[x] }); }
    if (d === 0) break;
    if (x === px && y > 0) { y--; ops.unshift({ type: 'add', value: b[y] }); }
    else if (x > 0) { x--; ops.unshift({ type: 'remove', value: a[x] }); }
  }
  return ops;
}

// === 초기 스키마 데이터 ===
const INIT = `datasource db { provider = "postgresql" }
generator client { provider = "prisma-client-js" }
model User { id String @id @default(cuid()) username String? displayUsername String? email String @unique emailVerified Boolean @default(false) phoneNumber String? name String role UserRole @default(USER) userType UserType? isProfileComplete Boolean @default(false) sessions Session[] accounts Account[] posts Post[] businesses Business[] documentRequests DocumentRequest[] createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("users") }
enum UserRole { USER ADMIN }
enum UserType { INHOUSE AGENCY }
model Session { id String @id @default(cuid()) userId String token String @unique ipAddress String? userAgent String? user User @relation(fields: [userId], references: [id], onDelete: Cascade) expiresAt DateTime createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("sessions") }
model Account { id String @id @default(cuid()) userId String accountId String providerId Provider accessToken String? refreshToken String? accessTokenExpiresAt DateTime? refreshTokenExpiresAt DateTime? scope String? idToken String? password String? user User @relation(fields: [userId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("accounts") }
enum Provider { credential google kakao naver }
model Verification { id String @id @default(cuid()) identifier String value String expiresAt DateTime createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("verifications") }
model VerifiedEmail { id String @id @default(cuid()) email String @unique expiresAt DateTime createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("verified_emails") }
model Post { id String @id @default(cuid()) authorId String slug String @unique title String content String published Boolean @default(false) excerpt String? isFeatured Boolean @default(false) author User @relation(fields: [authorId], references: [id], onDelete: Cascade) tags Tag[] createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("posts") }
model Tag { id String @id @default(cuid()) name String @unique slug String @unique posts Post[] createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("tags") }
model Business { id String @id @default(cuid()) businessName String ownerName String? ownerBirthdate DateTime? businessRegNumber String corporationRegNumber String? businessAddress String? businessPhone String? mobilePhone String? mainProduct String? industryTypeCode String? industryTypeName String? wasteIndustryType WasteIndustryType? userId String user User @relation(fields: [userId], references: [id], onDelete: Cascade) documentProfiles BusinessDocumentProfile[] processFlows ProcessFlow[] wasteDocumentations WasteDocumentation[] createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("businesses") }
enum WasteIndustryType { INTERMEDIATE_RECYCLING COMPREHENSIVE_RECYCLING FINAL_RECYCLING INTERMEDIATE_DISPOSAL FINAL_DISPOSAL TRANSPORT }
enum ProfileScope { BUSINESS CATEGORY DOCUMENT }
model BusinessDocumentProfile { id String @id @default(cuid()) businessId String profileScope ProfileScope @default(DOCUMENT) documentCategoryCode String? documentSubCategoryCode String? documentCode String? submissionOffice String? mainProcess String? specificData Json? business Business @relation(fields: [businessId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("business_document_profiles") }
model DocumentRequest { id String @id @default(cuid()) documentType DocumentType status DocumentRequestStatus @default(PENDING) memo String? payload DocumentPayload? completedAt DateTime? s3Key String? userId String user User @relation(fields: [userId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("document_requests") }
enum DocumentType { EMISSION_AIR_DOC EMISSION_WATER_DOC EMISSION_NOISE_DOC EMISSION_SMELL_DOC WASTE_PERMIT_DOC WASTE_REPORT_TRANSPORT_DOC WASTE_REPORT_RECYCLE_DOC WASTE_REPORT_DISPOSAL_DOC WASTE_APPROVAL_DISPOSAL_DOC WASTE_REPORT_EMITTER_DOC WASTE_STARTUP_DOC LOGS_AIR LOGS_WATER GAPZI }
enum DocumentRequestStatus { PENDING IN_PROGRESS COMPLETED CANCELLED FAILED }
model DocumentPayload { id String @id @default(cuid()) requestId String @unique request DocumentRequest @relation(fields: [requestId], references: [id], onDelete: Cascade) data Json createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("document_payloads") }
model ProcessFlow { id String @id @default(cuid()) businessId String layoutData Json? productionFacilities ProductionFacility[] controlFacilities ControlFacility[] business Business @relation(fields: [businessId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("process_flows") }
enum ChangeType { NEW UPDATE EXPANSION CLOSE }
model ControlFacility { id String @id @default(cuid()) processFlowId String facilityNumber String facilityName String size String? specification String? facilityPrice String? installedBuilding String? manufacturer String? phoneNumber String? changeType ChangeType @default(NEW) memo String? processFlow ProcessFlow @relation(fields: [processFlowId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("control_facilities") }
model ProductionFacility { id String @id @default(cuid()) processFlowId String facilityNumber String facilityName String process String? size String? specification String? quantity Int? facilityPrice String? installedBuilding String? manufacturer String? phoneNumber String? changeType ChangeType @default(NEW) memo String? asWasteFacility WasteFacility? processFlow ProcessFlow @relation(fields: [processFlowId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("production_facilities") }
model WasteDocumentation { id String @id @default(cuid()) businessId String wasteTargetItems WasteTargetItem[] wasteFacilities WasteFacility[] wasteStorageFacilities WasteStorageFacility[] business Business @relation(fields: [businessId], references: [id], onDelete: Cascade) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("waste_documentations") }
model WasteTargetItem { id String @id @default(cuid()) wasteDocumentationId String wasteCode String? wasteName String? preAnalysisRequired Boolean @default(false) recyclingCode String? recycledProduct String? throughput Float? changeType ChangeType @default(NEW) wasteDocumentation WasteDocumentation @relation(fields: [wasteDocumentationId], references: [id], onDelete: Cascade) storedIn WasteStorageFacility[] @@map("waste_target_items") }
model WasteFacility { id String @id @default(cuid()) wasteDocumentationId String productionFacilityId String @unique capacityPerHour Float? dailyOperatingHours Float? dailyThroughput Float? productionFacility ProductionFacility @relation(fields: [productionFacilityId], references: [id], onDelete: Cascade) wasteDocumentation WasteDocumentation @relation(fields: [wasteDocumentationId], references: [id], onDelete: Cascade) @@map("waste_facilities") }
enum BottomShape { CIRCLE RECT TRIANGLE TRAPEZOID MANUAL }
model WasteStorageFacility { id String @id @default(cuid()) wasteDocumentationId String targetWasteId String? targetWaste WasteTargetItem? @relation(fields: [targetWasteId], references: [id]) specificGravity String? bottomShape BottomShape? diameter Float? width Float? length Float? topSide Float? bottomSide Float? verticalSide Float? height Float? quantity Int? volume Float? storageAmount Float? storageDays Float? changeType ChangeType @default(NEW) wasteDocumentation WasteDocumentation @relation(fields: [wasteDocumentationId], references: [id], onDelete: Cascade) @@map("waste_storage_facilities") }
model ExecutiveOfficer { id String @id @default(cuid()) name String? residentIdNumber String? registrationAddress String? phoneNumber String? position String? changeType ChangeType @default(NEW) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("executive_officers") }
model Vehicle { id String @id @default(cuid()) vehicleName String? vehicleType String? vehicleRegistrationNumber String? maxPayload String? ownerRegistrationNumber String? manufacturer String? modelApprovalNumber String? changeType ChangeType @default(NEW) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("vehicles") }
model Office { id String @id @default(cuid()) officeAddress String? officeArea String? contactNumber String? changeType ChangeType @default(NEW) createdAt DateTime @default(now()) updatedAt DateTime @updatedAt @@map("offices") }`;

// 초기화 실행
schema = parse(INIT);
snapshot = gen(schema);
syncEditor();

historyStack = [{ schemaStr: gen(schema), positions: JSON.stringify(modelPositions), cardinalities: JSON.stringify(cardinalityMap) }];
historyIndex = 0;
changeLog = [];

setTimeout(() => {
  autoLayout();
  addLog('schema', '초기 로드', `${schema.models.length}모델, ${schema.enums.length}Enum`);
}, 100);

initGithubUI();
