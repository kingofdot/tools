// 환경 분야별 별표 JSON에서 마스터 테이블을 추출 → data/envMasterData.js 생성
// 사용: node scripts/build-env-master.js
//
// arrayKey: 그 파일의 메인 배열 키 (별표내용 / pollutants / substances / 산정방법 / 자격기준 등 — 파일마다 다름)
// fields: 명시 시 그 키만 추려 출력. 비우면 원본 필드 전체 보존.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const SOURCES = [
  // ── 대기 (대기환경보전법 / 배출계수 고시 / EPA AP-42 참고) ──────────────────
  { domain:'대기', var:'AirPollutantsDB',                label:'대기오염물질',                     arrayKey:'별표내용',                                       file:'data/air/law_active/docs/annex1_airPollutants.json' },
  { domain:'대기', var:'AirMonitoredSubstancesDB',       label:'유해성대기감시물질',               arrayKey:'별표내용',                                       file:'data/air/law_active/docs/annex1-2_hazardousAirMonitoredSubstances.json' },
  { domain:'대기', var:'AirBusinessClassificationDB',    label:'대기 사업장 분류기준',             arrayKey:'별표내용',                                       file:'data/air/law_active/docs/annex1-3_businessClassification.json' },
  { domain:'대기', var:'AirHazardousPollutantsDB',       label:'특정대기유해물질',                 arrayKey:'별표내용',                                       file:'data/air/law_active/docs/annex2_specificHazardousAirPollutants.json' },
  { domain:'대기', var:'AirPreventionFacilitiesDB',      label:'대기오염방지시설',                 arrayKey:'별표내용',                                       file:'data/air/law_active/docs/annex4_airPollutionPreventionFacilities.json' },
  { domain:'대기', var:'AirHazardousFacilityCriteriaDB', label:'특정대기유해 시설 적용기준',       arrayKey:'별표내용',                                       file:'data/air/law_active/docs/annex8-2_specificHazardousFacilityCriteria.json' },
  { domain:'대기', var:'AirHourlyEmissionMethodDB',      label:'시간당 대기오염물질 발생량 산정',  arrayKey:'산정방법',                                       file:'data/air/law_active/docs/annex10_hourlyEmissionCalculation.json' },
  { domain:'대기', var:'AirDustBusinessesDB',            label:'비산먼지 발생 사업',               arrayKey:'별표내용',  fields:['depth','type','marker','text'], file:'data/air/law_active/docs/annex13_dustEmissionBusinesses.json' },
  { domain:'대기', var:'AirDustControlStandardsDB',      label:'비산먼지 시설·조치 기준',           arrayKey:'별표내용',  fields:['depth','type','marker','text'], file:'data/air/law_active/docs/annex14_dustControlStandards.json' },
  { domain:'대기', var:'AirDustStrictStandardsDB',       label:'비산먼지 엄격기준',                arrayKey:'별표내용',  fields:['depth','type','marker','text'], file:'data/air/law_active/docs/annex15_dustControlStrictStandards.json' },
  { domain:'대기', var:'AirEFFueledFacilitiesDB',        label:'배출계수 — 연료 사용 시설',         arrayKey:'entries',                                        file:'data/air/law_active/docs/emissionFactors/annex1_fueledFacilities.json' },
  { domain:'대기', var:'AirEFNonFueledFacilitiesDB',     label:'배출계수 — 연료 미사용 시설',       arrayKey:'entries',                                        file:'data/air/law_active/docs/emissionFactors/annex2_nonFueledFacilities.json' },
  { domain:'대기', var:'AirEFOtherFuelsDB',              label:'배출계수 — 기타연료',               arrayKey:'entries',                                        file:'data/air/law_active/docs/emissionFactors/annex3_otherFuels.json' },
  { domain:'대기', var:'AirEFEpaAP42DB',                 label:'배출계수 — EPA AP-42 참고',         arrayKey:'entries',                                        file:'data/air/law_active/docs/emissionFactors/reference_epaAP42.json' },

  // ── 폐수 (물환경보전법) ──────────────────────────────────────────────────
  { domain:'폐수', var:'WaterPollutantsDB',                  label:'수질오염물질',                arrayKey:'pollutants',                                  file:'data/wastewater/law_active/docs/annex2_waterPollutants.json' },
  { domain:'폐수', var:'WaterHazardousPollutantsDB',         label:'특정수질유해물질',            arrayKey:'pollutants',                                  file:'data/wastewater/law_active/docs/annex3_specificHazardousWaterPollutants.json' },
  { domain:'폐수', var:'WaterOtherPollutionSourcesDB',       label:'기타수질오염원',              arrayKey:'기타수질오염원',                              file:'data/wastewater/law_active/docs/annex1_otherWaterPollutionSources.json' },
  { domain:'폐수', var:'WastewaterEmissionFacilitiesDB',     label:'폐수배출시설',                arrayKey:'폐수배출시설_분류',                           file:'data/wastewater/law_active/docs/annex4_wastewaterEmissionFacilities.json' },
  { domain:'폐수', var:'WaterPreventionFacilitiesDB',        label:'수질오염방지시설',            arrayKey:'categories',                                  file:'data/wastewater/law_active/docs/annex5_waterPollutionPreventionFacilities.json' },
  { domain:'폐수', var:'WaterFinalDischargeMethodDB',        label:'최종방류구 배출량 산정',      arrayKey:'산정방법',                                    file:'data/wastewater/law_active/docs/annex8_finalDischargeOutletEmissionCalculation.json' },
  { domain:'폐수', var:'WaterHazardousFacilityCriteriaDB',   label:'특정수질유해 시설 적용기준',  arrayKey:'별표내용',                                    file:'data/wastewater/law_active/docs/annex13-2_specificHazardousWastewaterFacilityCriteria.json' },
  { domain:'폐수', var:'WaterQualityWarningTypesDB',         label:'수질오염경보 종류',           arrayKey:'경보_종류',                                   file:'data/wastewater/law_active/docs/decreeAnnex2_waterQualityWarningTypes.json' },
  { domain:'폐수', var:'WaterEnvTechnicianDB',               label:'환경기술인 자격기준 (수질)',  arrayKey:'자격기준',                                    file:'data/wastewater/law_active/docs/decreeAnnex17_environmentalTechnicianQualification.json' },

  // ── 악취 (악취방지법) ───────────────────────────────────────────────────
  { domain:'악취', var:'OdorSubstancesDB',                   label:'지정악취물질',                arrayKey:'substances',                                  file:'data/odor/law_active/docs/annex1_designatedOdorSubstances.json' },
  { domain:'악취', var:'OdorEmissionFacilitiesDB',           label:'악취배출시설',                arrayKey:'악취배출시설',                                file:'data/odor/law_active/docs/annex2_odorEmissionFacilities.json' },
  { domain:'악취', var:'OdorPreventionPlanRequirementsDB',   label:'악취방지계획 포함사항',       arrayKey:'options',                                     file:'data/odor/law_active/docs/annex4_odorPreventionPlanRequirements.json' },
  { domain:'악취', var:'OdorTechnicalDiagnosisContentDB',    label:'기술진단 내용·방법',          arrayKey:'기술진단_내용',                               file:'data/odor/law_active/docs/annex5_technicalDiagnosisContentAndMethod.json' },
  { domain:'악취', var:'OdorTechnicalDiagnosisTargetsDB',    label:'기술진단 대상시설',           arrayKey:'대상시설',                                    file:'data/odor/law_active/docs/annex6_technicalDiagnosisTargetFacilities.json' },

  // ── 소음진동 (소음·진동관리법) ───────────────────────────────────────────
  { domain:'소음진동', var:'NoiseConstructionMachineryDB',   label:'소음발생건설기계',            arrayKey:'machinery',                                   file:'data/noise_vibration/law_active/docs/annex4_noiseGeneratingConstructionMachinery.json' },
  { domain:'소음진동', var:'NoiseEnvTechnicianDB',           label:'환경기술인 자격기준 (소음진동)', arrayKey:'자격기준',                                file:'data/noise_vibration/law_active/docs/annex7_environmentalTechnicianQualification.json' },
];

const lines = [
  '// === Auto-generated by scripts/build-env-master.js — do not edit manually ===',
  '// 환경 분야별(대기·폐수·악취·소음진동) 마스터 테이블.',
  '// 각 레코드는 원본 별표/배열의 필드를 보존(또는 fields 로 명시한 키만 추출).',
  '',
];
const meta = [];

for (const s of SOURCES) {
  const full = path.join(ROOT, s.file);
  if (!fs.existsSync(full)) {
    console.warn(`! 없음: ${s.file} — 건너뜀`);
    continue;
  }
  let json;
  try { json = JSON.parse(fs.readFileSync(full, 'utf8')); }
  catch (e) { console.warn(`! 파싱 실패: ${s.file} — 건너뜀 (${e.message})`); continue; }
  const items = Array.isArray(json[s.arrayKey]) ? json[s.arrayKey] : [];
  if (!items.length) {
    console.warn(`! ${s.file} — ${s.arrayKey} 배열이 비었거나 없음 (건너뜀)`);
    continue;
  }
  const rows = s.fields
    ? items.map(it => Object.fromEntries(s.fields.map(k => [k, it[k]])))
    : items;
  lines.push(`var ${s.var} = ${JSON.stringify(rows, null, 2)};`);
  lines.push('');
  meta.push({
    var:       s.var,
    label:     s.label,
    domain:    s.domain,
    title:     json['별표제목'] || '',
    law:       json['법령명']   || '',
    count:     rows.length,
  });
}

lines.push('// 메타 — initEnvMaster() 가 masterDataRegistry/comboboxStore 등록에 사용');
lines.push(`var EnvMasterMeta = ${JSON.stringify(meta, null, 2)};`);
lines.push('');

const outPath = path.join(ROOT, 'data/envMasterData.js');
fs.writeFileSync(outPath, lines.join('\n'), 'utf8');
console.log(`✓ ${path.relative(ROOT, outPath)} 생성 (${meta.length}개 테이블)`);
const byDomain = meta.reduce((a, m) => { (a[m.domain] = a[m.domain] || 0); a[m.domain]++; return a; }, {});
console.log('  분야별:', byDomain);
meta.forEach(m => console.log(`  [${m.domain}] ${m.var}: ${m.count} (${m.label})`));
