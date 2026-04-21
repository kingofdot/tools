# -*- coding: utf-8 -*-
"""
별표5 A-3 불일치 항목 수동 판정 반영.

원칙:
  - 사업장 섹션(3.)과 생활 섹션(1., 2.)은 절대 혼재 금지
  - 지정폐기물 섹션(4.)은 wasteClass=['D'] 강제 (51-08 등 지정 편입 코드 허용)
  - 각 항목 본문·부모 섹션·별표4 세부분류코드를 인간이 직접 대조하여 결정

FIXES 딕셔너리는 (idx, op) 형태의 명시적 판정 결과.
  op.wasteCode: 새 wasteCode 리스트 (None=키 제거)
  op.wasteClass: 새 wasteClass 리스트 (None=키 제거)
"""

import json
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
TARGET = BASE / "data" / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"
doc = json.loads(TARGET.read_text(encoding="utf-8"))
items = doc["별표내용"]

REMOVE = object()  # 센티넬: 키 제거

# 각 인덱스별 수정안 (판정 근거는 docs/audit_b5_수정근거.md 참조)
FIXES = {
    # [10] 생활폐기물 수집·운반 일반 예외: 51-18은 사업장 코드. 품목 미지정 규정 → wasteCode 제거.
    10:  {"wasteCode": REMOVE, "wasteClass": ["L"]},

    # [31] 생활폐기물 처리: 폐의약품·폐농약 소각 (생활 맥락에서는 별표4 생활 목록에 전용코드 없음, EPR/회수 대상) → wasteCode 제거.
    31:  {"wasteCode": REMOVE, "wasteClass": ["L"]},

    # [36]~[54] 2. 음식물류 폐기물 섹션: wasteClass=L 강제.
    36:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    37:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    38:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    39:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    40:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    42:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    43:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    47:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    50:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    51:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},
    54:  {"wasteCode": ["91-02-00"], "wasteClass": ["L"]},

    # [107]~[112] 3. 사업장일반 > 라.처리 > 나) 오니 > (1) 유기성 오니: 01-02(지정)→51-01(유기성오니류) 교정.
    107: {"wasteCode": ["51-01"], "wasteClass": ["GO", "GN"]},
    108: {"wasteCode": ["51-01"], "wasteClass": ["GO", "GN"]},
    109: {"wasteCode": ["51-01"], "wasteClass": ["GO", "GN"]},
    110: {"wasteCode": ["51-01"], "wasteClass": ["GO", "GN"]},
    111: {"wasteCode": ["51-01"], "wasteClass": ["GO", "GN"]},
    112: {"wasteCode": ["51-01"], "wasteClass": ["GO", "GN"]},

    # [118]~[119] 사업장일반 > 라) 동물성 잔재물 및 동물의 사체: 01-02→51-17 교정.
    118: {"wasteCode": ["51-17"], "wasteClass": ["GO", "GN"]},
    119: {"wasteCode": ["51-17"], "wasteClass": ["GO", "GN"]},

    # [140] 사업장일반 > 카) 석면해체에 사용된 비닐시트(바닥용 아닌 것): 재질 상 폐합성수지(51-03-01), 섹션상 사업장일반.
    140: {"wasteCode": ["51-03-01"], "wasteClass": ["GO", "GN"]},

    # [151]~[162] 사업장일반 > 거) 음식물류 폐기물 처리 잔재물: 51-38-03(음식물류 처리잔재물 액상)로 교정.
    151: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    152: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    153: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    154: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    155: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    156: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    157: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    158: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    159: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    160: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    161: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},
    162: {"wasteCode": ["51-38-03"], "wasteClass": ["GO", "GN"]},

    # [164] 사업장일반 > 더) 수은폐기물이 아닌 수은함유폐기물 처리잔재물: 51-30-05.
    164: {"wasteCode": ["51-30-05"], "wasteClass": ["GO", "GN"]},

    # [167] 4. 지정폐기물 > 가.수집·운반 > 1) 분진·폐농약·폐석면: 지정 분진(03-02), 폐농약(01-03), 폐석면(07-01).
    167: {"wasteCode": ["03-02-00", "01-03", "07-01"], "wasteClass": ["D"]},

    # [207] 4. 지정폐기물 > 나.보관 > 6) 지정폐기물배출자 보관 품목 전체: 폐산·폐알칼리·폐유·폐유기용제·폐촉매·폐흡착제·폐흡수제·폐농약·PCB·폐수처리오니.
    207: {"wasteCode": ["02-01", "02-02", "06", "04", "03-07", "03-08", "01-03", "01-02"],
          "wasteClass": ["D"]},

    # [284]~[285] 4. 지정폐기물 > 다.처리 > 바) 폐석면 > (1)(2): 07-02(석면 부스러기·분진) / 07-01(해체제거 석면).
    284: {"wasteCode": ["07-02-00"], "wasteClass": ["D"]},
    285: {"wasteCode": ["07-01"], "wasteClass": ["D"]},

    # [290] 4. 지정폐기물 > 사) 광재·폐주물사·폐사·폐내화물·도자기조각·폐촉매: 지정 03-01(광재), 03-03(폐주물사·폐사), 03-07(폐촉매).
    290: {"wasteCode": ["03-01", "03-03", "03-07"], "wasteClass": ["D"]},

    # [303]~[306] 4. 지정폐기물 > 차) 소각재 > (1) 천연방사성 아닌 소각재: 소각재는 51-08(지정 편입).
    303: {"wasteCode": ["51-08"], "wasteClass": ["D"]},
    304: {"wasteCode": ["51-08"], "wasteClass": ["D"]},
    305: {"wasteCode": ["51-08"], "wasteClass": ["D"]},
    306: {"wasteCode": ["51-08"], "wasteClass": ["D"]},

    # [307]~[310] 4. 지정폐기물 > 차) 소각재 > (2) 천연방사성제품폐기물 소각재: 12-00-00 + 51-08 병기.
    307: {"wasteCode": ["12-00-00", "51-08"], "wasteClass": ["D"]},
    308: {"wasteCode": ["12-00-00", "51-08"], "wasteClass": ["D"]},
    309: {"wasteCode": ["12-00-00", "51-08"], "wasteClass": ["D"]},
    310: {"wasteCode": ["12-00-00", "51-08"], "wasteClass": ["D"]},

    # [311] 4. 지정폐기물 > 카) 폐농약: 01-03.
    311: {"wasteCode": ["01-03"], "wasteClass": ["D"]},

    # [312] 4. 지정폐기물 > 타) PCB(폴리클로리네이티드비페닐) 함유폐기물: 별표4 세부코드 없음 → wasteCode 제거.
    312: {"wasteCode": REMOVE, "wasteClass": ["D"]},

    # [313]~[317] 4. 지정폐기물 > 파) 오니: 01-02(지정 오니류).
    313: {"wasteCode": ["01-02"], "wasteClass": ["D"]},
    314: {"wasteCode": ["01-02"], "wasteClass": ["D"]},
    315: {"wasteCode": ["01-02"], "wasteClass": ["D"]},
    316: {"wasteCode": ["01-02"], "wasteClass": ["D"]},
    317: {"wasteCode": ["01-02"], "wasteClass": ["D"]},
    # [318]~[319] 파) 오니 (5)(6) 유기성 오니 지정 처분 (51-08 잘못) → 01-02.
    318: {"wasteCode": ["01-02"], "wasteClass": ["D"]},
    319: {"wasteCode": ["01-02"], "wasteClass": ["D"]},

    # [320]~[322] 4. 지정폐기물 > 하) 안정화·고형화·고화처리물: 51-09 (지정 편입).
    320: {"wasteCode": ["51-09"], "wasteClass": ["D"]},
    321: {"wasteCode": ["51-09"], "wasteClass": ["D"]},
    322: {"wasteCode": ["51-09"], "wasteClass": ["D"]},

    # [326]~[330] 4. 지정폐기물 > 거) 폐유독물질: 별표4 세부코드 없음 (법령상 지정) → wasteCode 제거.
    326: {"wasteCode": REMOVE, "wasteClass": ["D"]},
    327: {"wasteCode": REMOVE, "wasteClass": ["D"]},
    328: {"wasteCode": REMOVE, "wasteClass": ["D"]},
    329: {"wasteCode": REMOVE, "wasteClass": ["D"]},
    330: {"wasteCode": REMOVE, "wasteClass": ["D"]},

    # [331]~[334] 4. 지정폐기물 > 너) 폐오일 필터: 06-01-05.
    331: {"wasteCode": ["06-01-05"], "wasteClass": ["D"]},
    332: {"wasteCode": ["06-01-05"], "wasteClass": ["D"]},
    333: {"wasteCode": ["06-01-05"], "wasteClass": ["D"]},
    334: {"wasteCode": ["06-01-05"], "wasteClass": ["D"]},

    # [335]~[338] 4. 지정폐기물 > 더) 수은폐기물: 11(수은폐기물 전체).
    335: {"wasteCode": ["11"], "wasteClass": ["D"]},
    336: {"wasteCode": ["11-01"], "wasteClass": ["D"]},        # 수은함유폐기물
    337: {"wasteCode": ["11-02-00"], "wasteClass": ["D"]},     # 수은구성폐기물
    338: {"wasteCode": ["11-03-00"], "wasteClass": ["D"]},     # 수은함유폐기물 처리잔재물

    # [339]~[345] 4. 지정폐기물 > 러) 천연방사성제품폐기물: 12-00-00.
    339: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},
    340: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},
    341: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},
    342: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},
    343: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},
    344: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},
    345: {"wasteCode": ["12-00-00"], "wasteClass": ["D"]},

    # [426]~[427] 6. 폐기물수집·운반증 > 가. 2)3) 사업장 음식물류 수집운반: 51-38 정확, wasteClass 교정.
    426: {"wasteCode": ["51-38"], "wasteClass": ["GO", "GN"]},
    427: {"wasteCode": ["51-38"], "wasteClass": ["GO", "GN"]},

    # [438] 6장 > 나. 3) 폐전기전자제품(생활) 회수·재활용: 91-09, wasteClass=L.
    438: {"wasteCode": ["91-09-00"], "wasteClass": ["L"]},

    # [449] 6장 > 다. 가) 폐목재류: 51-20 사업장일반.
    449: {"wasteCode": ["51-20"], "wasteClass": ["GO", "GN"]},
}


def apply_fix(tags, fix):
    for key, val in fix.items():
        if val is REMOVE:
            tags.pop(key, None)
        else:
            tags[key] = val


applied = 0
missing = []

for idx, fix in FIXES.items():
    if idx >= len(items):
        missing.append(idx)
        continue
    it = items[idx]
    tags = it.get("tags")
    if not isinstance(tags, dict):
        missing.append(idx)
        continue
    apply_fix(tags, fix)
    applied += 1

TARGET.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

print("=" * 60)
print(f"별표5 wasteClass/wasteCode 교정")
print("=" * 60)
print(f"적용: {applied}건 / 계획: {len(FIXES)}건")
if missing:
    print(f"  [누락]: {missing}")
