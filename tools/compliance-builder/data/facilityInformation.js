// 폐기물관리법 시행령 [별표 3] 폐기물 처리시설의 종류 (제5조 관련)
// <개정 2025. 10. 1.>
//
// facilityCode 체계:
//   대분류: ID (중간처분) / FD (최종처분) / RCY (재활용)
//   중분류: ID-T (소각·열) / ID-M (기계) / ID-C (화학) / ID-B (생물) / ID-X (기타)
//            FD-L (매립) / FD-X (기타)
//            RCY-M (기계) / RCY-C (화학) / RCY-B (생물) / RCY-K (시멘트소성로)
//            RCY-S (용해로) / RCY-P (소성·탄화) / RCY-G (골재) / RCY-PH (의약품)
//            RCY-H (소각열회수) / RCY-HG (수은회수) / RCY-SE (선별)
//   세부:   코드 + 두 자리 번호 (01, 02, ...)
//
// facilityMethod 값:
//   "thermal" / "mechanical" / "chemical" / "biological" / "landfill"
//   "heatRecovery" / "kiln" / "smelting" / "sintering"
//   "aggregate" / "pharmaceutical" / "mercuryRecovery" / "sorting" / null
//
// bizType 값: "ID" (중간처분업) / "FD" (최종처분업) / "RCY" (재활용업)
//   별표7 bizType 태깅 기준과 동일.

var FacilityMasterDB = [

  // ══════════════════════════════════════════════════════════
  // 1. 중간처분시설 (ID)
  // ══════════════════════════════════════════════════════════
  {
    "facilityCode": "ID",
    "facilityName": "중간처분시설",
    "facilityClass": "ID",
    "facilityMethod": null,
    "bizType": ["ID"],
    "parentCode": null,
    "capacityNote": null
  },

  // ── 가. 소각시설 ──────────────────────────────────────────
  {
    "facilityCode": "ID-T",
    "facilityName": "소각시설",
    "facilityClass": "ID",
    "facilityMethod": "thermal",
    "bizType": ["ID"],
    "parentCode": "ID",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-T-01",
    "facilityName": "일반 소각시설",
    "facilityClass": "ID",
    "facilityMethod": "thermal",
    "bizType": ["ID"],
    "parentCode": "ID-T",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-T-02",
    "facilityName": "고온 소각시설",
    "facilityClass": "ID",
    "facilityMethod": "thermal",
    "bizType": ["ID"],
    "parentCode": "ID-T",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-T-03",
    "facilityName": "열분해 소각시설",
    "facilityClass": "ID",
    "facilityMethod": "thermal",
    "bizType": ["ID"],
    "parentCode": "ID-T",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-T-04",
    "facilityName": "고온 용융시설",
    "facilityClass": "ID",
    "facilityMethod": "thermal",
    "bizType": ["ID"],
    "parentCode": "ID-T",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-T-05",
    "facilityName": "열처리 조합시설",
    "facilityClass": "ID",
    "facilityMethod": "thermal",
    "bizType": ["ID"],
    "parentCode": "ID-T",
    "capacityNote": "ID-T-01~04 중 둘 이상 조합"
  },

  // ── 나. 기계적 처분시설 ───────────────────────────────────
  {
    "facilityCode": "ID-M",
    "facilityName": "기계적 처분시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-M-01",
    "facilityName": "압축시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": "동력 7.5kW 이상"
  },
  {
    "facilityCode": "ID-M-02",
    "facilityName": "파쇄·분쇄 시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": "동력 15kW 이상"
  },
  {
    "facilityCode": "ID-M-03",
    "facilityName": "절단시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": "동력 7.5kW 이상"
  },
  {
    "facilityCode": "ID-M-04",
    "facilityName": "용융시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": "동력 7.5kW 이상"
  },
  {
    "facilityCode": "ID-M-05",
    "facilityName": "증발·농축 시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-M-06",
    "facilityName": "정제시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": "분리·증류·추출·여과 등 단위시설 포함"
  },
  {
    "facilityCode": "ID-M-07",
    "facilityName": "유수 분리시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-M-08",
    "facilityName": "탈수·건조 시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-M-09",
    "facilityName": "멸균분쇄 시설",
    "facilityClass": "ID",
    "facilityMethod": "mechanical",
    "bizType": ["ID"],
    "parentCode": "ID-M",
    "capacityNote": null
  },

  // ── 다. 화학적 처분시설 ───────────────────────────────────
  {
    "facilityCode": "ID-C",
    "facilityName": "화학적 처분시설",
    "facilityClass": "ID",
    "facilityMethod": "chemical",
    "bizType": ["ID"],
    "parentCode": "ID",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-C-01",
    "facilityName": "고형화·고화·안정화 시설",
    "facilityClass": "ID",
    "facilityMethod": "chemical",
    "bizType": ["ID"],
    "parentCode": "ID-C",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-C-02",
    "facilityName": "반응시설",
    "facilityClass": "ID",
    "facilityMethod": "chemical",
    "bizType": ["ID"],
    "parentCode": "ID-C",
    "capacityNote": "중화·산화·환원·중합·축합·치환 등 단위시설 포함"
  },
  {
    "facilityCode": "ID-C-03",
    "facilityName": "응집·침전 시설",
    "facilityClass": "ID",
    "facilityMethod": "chemical",
    "bizType": ["ID"],
    "parentCode": "ID-C",
    "capacityNote": null
  },

  // ── 라. 생물학적 처분시설 ─────────────────────────────────
  {
    "facilityCode": "ID-B",
    "facilityName": "생물학적 처분시설",
    "facilityClass": "ID",
    "facilityMethod": "biological",
    "bizType": ["ID"],
    "parentCode": "ID",
    "capacityNote": null
  },
  {
    "facilityCode": "ID-B-01",
    "facilityName": "소멸화 시설",
    "facilityClass": "ID",
    "facilityMethod": "biological",
    "bizType": ["ID"],
    "parentCode": "ID-B",
    "capacityNote": "1일 처분능력 100kg 이상"
  },
  {
    "facilityCode": "ID-B-02",
    "facilityName": "호기성·혐기성 분해시설",
    "facilityClass": "ID",
    "facilityMethod": "biological",
    "bizType": ["ID"],
    "parentCode": "ID-B",
    "capacityNote": null
  },

  // ── 마. 기타 중간처분시설 (장관 고시) ────────────────────
  {
    "facilityCode": "ID-X",
    "facilityName": "그 밖에 장관 고시 중간처분시설",
    "facilityClass": "ID",
    "facilityMethod": null,
    "bizType": ["ID"],
    "parentCode": "ID",
    "capacityNote": null
  },

  // ══════════════════════════════════════════════════════════
  // 2. 최종처분시설 (FD)
  // ══════════════════════════════════════════════════════════
  {
    "facilityCode": "FD",
    "facilityName": "최종처분시설",
    "facilityClass": "FD",
    "facilityMethod": null,
    "bizType": ["FD"],
    "parentCode": null,
    "capacityNote": null
  },

  // ── 가. 매립시설 ──────────────────────────────────────────
  {
    "facilityCode": "FD-L",
    "facilityName": "매립시설",
    "facilityClass": "FD",
    "facilityMethod": "landfill",
    "bizType": ["FD"],
    "parentCode": "FD",
    "capacityNote": null
  },
  {
    "facilityCode": "FD-L-01",
    "facilityName": "차단형 매립시설",
    "facilityClass": "FD",
    "facilityMethod": "landfill",
    "bizType": ["FD"],
    "parentCode": "FD-L",
    "capacityNote": null
  },
  {
    "facilityCode": "FD-L-02",
    "facilityName": "관리형 매립시설",
    "facilityClass": "FD",
    "facilityMethod": "landfill",
    "bizType": ["FD"],
    "parentCode": "FD-L",
    "capacityNote": "침출수 처리시설·가스 소각·발전·연료화 시설 등 부대시설 포함"
  },

  // ── 나. 기타 최종처분시설 (장관 고시) ────────────────────
  {
    "facilityCode": "FD-X",
    "facilityName": "그 밖에 장관 고시 최종처분시설",
    "facilityClass": "FD",
    "facilityMethod": null,
    "bizType": ["FD"],
    "parentCode": "FD",
    "capacityNote": null
  },

  // ══════════════════════════════════════════════════════════
  // 3. 재활용시설 (RCY)
  // ══════════════════════════════════════════════════════════
  {
    "facilityCode": "RCY",
    "facilityName": "재활용시설",
    "facilityClass": "RCY",
    "facilityMethod": null,
    "bizType": ["RCY"],
    "parentCode": null,
    "capacityNote": null
  },

  // ── 가. 기계적 재활용시설 ─────────────────────────────────
  {
    "facilityCode": "RCY-M",
    "facilityName": "기계적 재활용시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-M-01",
    "facilityName": "압축·압출·성형·주조시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": "동력 7.5kW 이상"
  },
  {
    "facilityCode": "RCY-M-02",
    "facilityName": "파쇄·분쇄·탈피 시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": "동력 15kW 이상"
  },
  {
    "facilityCode": "RCY-M-03",
    "facilityName": "절단시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": "동력 7.5kW 이상"
  },
  {
    "facilityCode": "RCY-M-04",
    "facilityName": "용융·용해시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": "동력 7.5kW 이상"
  },
  {
    "facilityCode": "RCY-M-05",
    "facilityName": "연료화시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-M-06",
    "facilityName": "증발·농축 시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-M-07",
    "facilityName": "정제시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": "분리·증류·추출·여과 등 단위시설 포함"
  },
  {
    "facilityCode": "RCY-M-08",
    "facilityName": "유수 분리 시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-M-09",
    "facilityName": "탈수·건조 시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-M-10",
    "facilityName": "세척시설",
    "facilityClass": "RCY",
    "facilityMethod": "mechanical",
    "bizType": ["RCY"],
    "parentCode": "RCY-M",
    "capacityNote": "철도용 폐목재 받침목 재활용 한정"
  },

  // ── 나. 화학적 재활용시설 ─────────────────────────────────
  {
    "facilityCode": "RCY-C",
    "facilityName": "화학적 재활용시설",
    "facilityClass": "RCY",
    "facilityMethod": "chemical",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-C-01",
    "facilityName": "고형화·고화 시설",
    "facilityClass": "RCY",
    "facilityMethod": "chemical",
    "bizType": ["RCY"],
    "parentCode": "RCY-C",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-C-02",
    "facilityName": "반응시설",
    "facilityClass": "RCY",
    "facilityMethod": "chemical",
    "bizType": ["RCY"],
    "parentCode": "RCY-C",
    "capacityNote": "중화·산화·환원·중합·축합·치환 등 단위시설 포함"
  },
  {
    "facilityCode": "RCY-C-03",
    "facilityName": "응집·침전 시설",
    "facilityClass": "RCY",
    "facilityMethod": "chemical",
    "bizType": ["RCY"],
    "parentCode": "RCY-C",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-C-04",
    "facilityName": "열분해시설",
    "facilityClass": "RCY",
    "facilityMethod": "chemical",
    "bizType": ["RCY"],
    "parentCode": "RCY-C",
    "capacityNote": "가스화시설 포함"
  },

  // ── 다. 생물학적 재활용시설 ───────────────────────────────
  {
    "facilityCode": "RCY-B",
    "facilityName": "생물학적 재활용시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-B-01",
    "facilityName": "1일 재활용능력 100kg 이상 시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B",
    "capacityNote": "1일 재활용능력 100kg 이상"
  },
  {
    "facilityCode": "RCY-B-01A",
    "facilityName": "부숙 시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B-01",
    "capacityNote": "1일 100kg 이상 (100kg~200kg 음식물류 폐기물 부숙시설 제외)"
  },
  {
    "facilityCode": "RCY-B-01B",
    "facilityName": "사료화 시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B-01",
    "capacityNote": "건조에 의한 사료화 시설 포함"
  },
  {
    "facilityCode": "RCY-B-01C",
    "facilityName": "퇴비화 시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B-01",
    "capacityNote": "건조 퇴비화·지렁이분변토·생석회 처리시설 포함"
  },
  {
    "facilityCode": "RCY-B-01D",
    "facilityName": "동애등에분변토 생산시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B-01",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-B-01E",
    "facilityName": "부숙토 생산시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B-01",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-B-02",
    "facilityName": "호기성·혐기성 분해시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-B-03",
    "facilityName": "버섯재배시설",
    "facilityClass": "RCY",
    "facilityMethod": "biological",
    "bizType": ["RCY"],
    "parentCode": "RCY-B",
    "capacityNote": null
  },

  // ── 라~카. 기타 재활용시설 ────────────────────────────────
  {
    "facilityCode": "RCY-K",
    "facilityName": "시멘트 소성로",
    "facilityClass": "RCY",
    "facilityMethod": "kiln",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-S",
    "facilityName": "용해로",
    "facilityClass": "RCY",
    "facilityMethod": "smelting",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": "폐기물에서 비철금속 추출 한정"
  },
  {
    "facilityCode": "RCY-P",
    "facilityName": "소성·탄화 시설",
    "facilityClass": "RCY",
    "facilityMethod": "sintering",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": "시멘트 소성로 제외"
  },
  {
    "facilityCode": "RCY-G",
    "facilityName": "골재가공시설",
    "facilityClass": "RCY",
    "facilityMethod": "aggregate",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-PH",
    "facilityName": "의약품 제조시설",
    "facilityClass": "RCY",
    "facilityMethod": "pharmaceutical",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-H",
    "facilityName": "소각열회수시설",
    "facilityClass": "RCY",
    "facilityMethod": "heatRecovery",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": "시간당 재활용능력 200kg 이상 (법 제13조의2제1항제5호 에너지회수 시설)"
  },
  {
    "facilityCode": "RCY-HG",
    "facilityName": "수은회수시설",
    "facilityClass": "RCY",
    "facilityMethod": "mercuryRecovery",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": null
  },
  {
    "facilityCode": "RCY-SE",
    "facilityName": "선별시설",
    "facilityClass": "RCY",
    "facilityMethod": "sorting",
    "bizType": ["RCY"],
    "parentCode": "RCY",
    "capacityNote": "재활용 가능 폐기물 선별 시설"
  }

];
