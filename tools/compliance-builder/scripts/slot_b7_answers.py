# -*- coding: utf-8 -*-
"""
별표7 answer 필드를 {{placeholder}} 슬롯으로 전환 + 업종별 MD 목록 생성.

차량 슬롯은 차종 × wasteClass context 조합으로 고유 키 생성:
  tankerNo_Haz / closedVehicleNo_Gen / compactVehicleNo_Gen 등
  "A 또는 B" → 첫 번째 차종 키 1개 (OR 선택)
  "A 이상, B 이상" → 각각 별도 슬롯 (AND 필수)

비차량 슬롯 키 (영문):
  contactAddr  / techStaff / facilitySpec / equipmentSpec

실행:
  python scripts/slot_b7_answers.py
"""

import json, sys, io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE    = Path(__file__).resolve().parent.parent
B7_PATH = BASE / "data" / "검토사항" / "시행규칙" / "별표7_처리업시설장비기술능력기준.json"
MD_PATH = BASE / "docs" / "별표7_슬롯목록.md"

b7    = json.loads(B7_PATH.read_text(encoding="utf-8"))
items = b7["별표내용"]


# ── Context 결정 (wasteClass / wasteCode 기반) ─────────────────────────
def make_ctx(tags: dict) -> str:
    """wasteClass·wasteCode → 짧은 context 코드 (Gen / Ind / Haz / Med)."""
    wclass = set(tags.get("wasteClass") or [])
    wcode  = set(str(c) for c in (tags.get("wasteCode") or []))
    if "10" in wcode or any(c.startswith("10") for c in wcode):
        return "Med"
    if "D" in wclass:
        return "Haz"
    if wclass == {"GO"}:
        return "Ind"
    return "Gen"


# ── 차량 슬롯 생성 ────────────────────────────────────────────────────
# (keyword, base_key, 한글명칭) — 우선순위 순서로 배열
VTYPE_DEFS = [
    ("탱크로리",         "tankerNo",        "탱크로리"),
    ("냉장 적재함",      "refrigVehicleNo", "냉장차량"),
    ("냉장차량",         "refrigVehicleNo", "냉장차량"),
    ("암롤",             "armrollVehicleNo","암롤차량"),
    ("굴착기",           "excavatorNo",     "굴착기"),
    ("밀폐형 압축·압착", "compactVehicleNo","밀폐형 압축·압착차량"),
    ("밀폐형 덮개 설치", "coveredVehicleNo","밀폐형 덮개 설치차량"),
    ("밀폐형 차량",      "closedVehicleNo", "밀폐형 차량"),
    ("수집·운반차량",    "ctVehicleNo",     "수집·운반차량"),
    ("수집운반차량",     "ctVehicleNo",     "수집운반차량"),
]


def vehicle_slots(text: str, tags: dict) -> list:
    """
    반환: [{"key":..., "label":..., "type":"text", "hint":...}, ...]
    AND 케이스 → 슬롯 여러 개 / OR 케이스 → 슬롯 1개
    """
    ctx = make_ctx(tags)
    hint = "예: 12가2131, 34나1231"

    # 텍스트 내 차종 검색 (위치 기록)
    found = []  # (pos, full_key, kr_name)
    seen_keys = set()
    for kw, base, kr in VTYPE_DEFS:
        pos = text.find(kw)
        if pos >= 0:
            key = f"{base}_{ctx}"
            if key not in seen_keys:
                seen_keys.add(key)
                found.append((pos, key, kr))

    found.sort(key=lambda x: x[0])

    if not found:
        key = f"vehicleNo_{ctx}"
        return [{"key": key, "label": f"Vehicle Registration No. ({ctx})",
                 "type": "text", "hint": hint}]

    # OR 판별: 여러 차종이 있고 텍스트에 "또는"이 포함된 경우
    is_or = len(found) > 1 and "또는" in text

    if is_or:
        # OR → 대표 키 1개, label에 선택지 나열
        _, key, _ = found[0]
        names = " / ".join(n for _, _, n in found)
        return [{"key": key, "label": f"Vehicle Registration No. ({names})",
                 "type": "text", "hint": hint}]

    # AND → 차종별 별도 슬롯
    # 구체 차종(tanker/refrig/compact/covered/closed 등)이 있으면 generic ctVehicleNo 제거
    specific = [x for x in found if not x[1].startswith("ctVehicleNo")]
    final    = specific if specific else found
    return [{"key": k, "label": f"Vehicle Registration No. ({n})",
             "type": "text", "hint": hint}
            for _, k, n in final]


# ── 시설 슬롯 생성 ────────────────────────────────────────────────────
# (keyword, base_key, needs_ctx, 한글명)
FTYPE_DEFS = [
    ("실험실",              "labSpec",          False, "실험실"),
    ("소각열회수시설",       "incineratorSpec",  True,  "소각열회수시설"),
    ("고온소각시설",         "incineratorSpec",  True,  "고온소각시설"),
    ("고온용융시설",         "incineratorSpec",  True,  "고온용융시설"),
    ("소각시설",             "incineratorSpec",  True,  "소각시설"),
    ("매립시설",             "landfillSpec",     True,  "매립시설"),
    ("냉동시설",             "coldStorageSpec",  False, "냉동시설"),
    ("냉장시설",             "coldStorageSpec",  False, "냉장시설"),
    ("소독시설",             "disinfectionSpec", False, "소독시설"),
    ("주차장",               "parkingSpec",      False, "주차장"),
    ("세차시설",             "carWashSpec",      False, "세차시설"),
    ("보관창고",             "storageSpec",      True,  "보관창고"),
    ("보관시설",             "storageSpec",      True,  "보관시설"),
    ("처분시설",             "treatmentSpec",    True,  "처분시설"),
    ("재활용시설",           "recyclingSpec",    True,  "재활용시설"),
    ("재활용할 수 있는",     "recyclingSpec",    True,  "재활용 가능 시설"),
    ("사료화시설",           "feedSpec",         False, "사료화시설"),
    ("냉매물질 보관",        "refrigerantSpec",  False, "냉매물질 보관시설"),
    ("형광물질 보관",        "fluorescSpec",     False, "형광물질 보관시설"),
    ("파쇄ㆍ분쇄",           "shreddingSpec",          False, "파쇄·분쇄·절단시설"),
    ("유수분리(油水分離)",   "separationSpec",         False, "유수분리시설"),
    # 미분류 해소용 — "일분"은 폐이차전지보다 반드시 앞에 있어야 (다) 항목 오분류 방지
    ("기계적·화학적",        "mechanicalTreatmentSpec", True, "기계적·화학적 처분시설"),
    ("고형화",               "solidificationSpec",      True, "고형화·안정화 시설"),
    ("일분",                 "storageSpec",             True, "보관시설 (용량 기준)"),
    ("폐이차전지",           "batteryRecyclingSpec",    False, "폐이차전지 재활용시설"),
    ("폐오일필터",           "oilFilterSpec",           True, "폐오일필터 재활용시설"),
]

# facility로 분류됐지만 실제로는 equipmentSpec인 항목 (측정 항목 단독 표기 등)
EQUIP_AS_FAC = ["(pH)", "(COD)", "(SS)", "특정수질유해물질", "유량 계측시설"]


def facility_slot(text: str, tags: dict) -> dict:
    """facility 종류별 고유 슬롯 반환."""
    ctx  = make_ctx(tags)
    hint = "예: 부지 내 제○동 1층 (면적: ○○㎡)"

    # 측정 항목 단독 표기 → equipmentSpec 으로 재분류
    if any(k in text for k in EQUIP_AS_FAC):
        return {"key": "equipmentSpec", "label": "Equipment Specification",
                "type": "text", "hint": "예: ○○ 실험기기 1식, 제조번호 XXXX"}

    for kw, base, needs_ctx, kr in FTYPE_DEFS:
        if kw in text:
            key   = f"{base}_{ctx}" if needs_ctx else base
            label = kr + (f" ({ctx})" if needs_ctx else "")
            return {"key": key, "label": label, "type": "text", "hint": hint}

    # 미분류 fallback
    return {"key": f"facilitySpec_{ctx}", "label": f"Facility Spec ({ctx})",
            "type": "text", "hint": hint}


# ── 분류 규칙 ──────────────────────────────────────────────────────────
TECH_KW     = ["기술능력:"]
QUAL_KW     = ["산업기사", "환경기사", "공업화학기사", "위생사", "임상병리사",
               "토목기사", "전기기사", "그린전동자동차기사",
               "폐기물처리기사", "화공기사", "환경기능사", "기능사"]
EQUIP_KW    = ["실험기기", "측정기기", "소독장비", "계량시설",
               "파쇄시설", "분리시설", "선별시설", "증류시설", "응축시설",
               "여과(정제)시설", "혼합시설", "유수분리시설", "수은회수시설",
               "압축시설", "유량계측시설", "유량계측설비",
               "측정·기록 장치", "표척"]


def classify(text: str) -> str:
    if text.startswith("연락장소"):
        return "contact"
    if any(k in text for k in TECH_KW):
        return "tech"
    if any(k in text for k in QUAL_KW) and "시설" not in text and "장비" not in text:
        return "tech"
    if "계량시설" in text:
        return "equipment"
    if "차량" in text and ("1대" in text or "2대" in text or "3대" in text or
                            "탱크로리" in text or "암롤" in text or
                            "수집·운반차량" in text or "수집운반차량" in text):
        return "vehicle"
    if "탱크로리" in text or "굴착기" in text:
        return "vehicle"
    if any(k in text for k in EQUIP_KW):
        return "equipment"
    return "facility"


def already_sentence(answer: str) -> bool:
    return answer.endswith("겠음") or answer.endswith("겠음.")


def make_slot(kind: str, text: str, tags: dict) -> dict:
    """Returns {"answer": "...", "slots": [...]}"""
    if kind == "vehicle":
        slots = vehicle_slots(text, tags)
        answer = ", ".join(f"{{{{{s['key']}}}}}" for s in slots)
        return {"answer": answer, "slots": slots}

    if kind == "contact":
        return {
            "answer": "{{contactAddr}}",
            "slots": [{"key": "contactAddr", "label": "Contact / Office Address",
                       "type": "text", "hint": "예: 서울시 강남구 ○○로 123"}],
        }
    if kind == "tech":
        return {
            "answer": "{{techStaff}}",
            "slots": [{"key": "techStaff", "label": "Technical Staff (Name & License No.)",
                       "type": "text", "hint": "예: 홍길동 (폐기물처리산업기사 제XXXX호)"}],
        }
    if kind == "equipment":
        return {
            "answer": "{{equipmentSpec}}",
            "slots": [{"key": "equipmentSpec", "label": "Equipment Specification",
                       "type": "text", "hint": "예: ○○ 계량기 1식, 제조번호 XXXX"}],
        }
    # facility — 시설 종류별 고유 키
    slot = facility_slot(text, tags)
    return {"answer": f"{{{{{slot['key']}}}}}", "slots": [slot]}


# ── 변환 ───────────────────────────────────────────────────────────────
changed = 0
for it in items:
    if it.get("isHeader") or it.get("tags") is None:
        continue
    ans = it.get("answer", "")
    if not ans:
        continue
    if already_sentence(ans):
        continue

    text = it.get("text", "")
    tags = it.get("tags") or {}
    kind = classify(text)
    tpl  = make_slot(kind, text, tags)

    it["answer"] = tpl["answer"]
    it["slots"]  = tpl["slots"]
    changed += 1

    slot_keys = ", ".join(s["key"] for s in tpl["slots"])
    print(f"[{kind:8s}] {it['marker']:6s} → {slot_keys}")

B7_PATH.write_text(json.dumps(b7, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n총 {changed}건 슬롯 전환 완료")


# ── 업종별 MD 목록 생성 ────────────────────────────────────────────────
BIZ_KO = {
    "TR":  "수집·운반업 (일반)",
    "RTR": "수집·운반업 (재활용)",
    "ID":  "중간처분업",
    "FD":  "최종처분업",
    "RCY": "재활용업",
}
BIZ_ORDER = ["TR", "RTR", "ID", "FD", "RCY"]

from collections import defaultdict
biz_rows = defaultdict(list)
section_stack = []

for it in items:
    if it.get("isHeader"):
        d = it.get("depth", 0)
        section_stack = [(sd, st) for sd, st in section_stack if sd < d]
        section_stack.append((d, it.get("text", "")))
        continue

    if not it.get("slots"):
        continue

    tags       = it.get("tags") or {}
    biz_types  = tags.get("bizType") or []
    slot_keys  = ", ".join(f"`{{{{{s['key']}}}}}`" for s in it["slots"])
    slot_label = " / ".join(s["label"] for s in it["slots"])
    text_short = (it.get("text") or "")[:55]
    marker     = it.get("marker", "")
    sec_title  = section_stack[-1][1][:45] if section_stack else ""

    for biz in biz_types:
        biz_rows[biz].append((sec_title, marker, text_short, slot_keys, slot_label))

md_lines = []
md_lines.append("# 별표7 플레이스홀더 목록 (업종별)")
md_lines.append("")
md_lines.append("> `slot_b7_answers.py` 생성. 모든 `{{}}` 슬롯을 업종별로 정리.")
md_lines.append("")
md_lines.append("## 슬롯 키 규칙")
md_lines.append("")
md_lines.append("### 차량")
md_lines.append("| 키 패턴 | 내용 |")
md_lines.append("|---|---|")
md_lines.append("| `{{compactVehicleNo_*}}` | 밀폐형 압축·압착차량 번호 |")
md_lines.append("| `{{closedVehicleNo_*}}` | 밀폐형 차량 번호 |")
md_lines.append("| `{{coveredVehicleNo_*}}` | 밀폐형 덮개 설치차량 번호 |")
md_lines.append("| `{{tankerNo_*}}` | 탱크로리 번호 |")
md_lines.append("| `{{refrigVehicleNo_*}}` | 냉장차량 번호 |")
md_lines.append("| `{{excavatorNo_*}}` | 굴착기 번호 |")
md_lines.append("| `{{ctVehicleNo_*}}` | 수집·운반차량 번호 (자체수집시) |")
md_lines.append("")
md_lines.append("### 시설")
md_lines.append("| 키 패턴 | 내용 |")
md_lines.append("|---|---|")
md_lines.append("| `{{labSpec}}` | 실험실 위치·규모 |")
md_lines.append("| `{{incineratorSpec_*}}` | 소각시설 위치·처분능력 |")
md_lines.append("| `{{landfillSpec_*}}` | 매립시설 위치·면적·용적 |")
md_lines.append("| `{{storageSpec_*}}` | 보관시설/보관창고 위치·규모 |")
md_lines.append("| `{{treatmentSpec_*}}` | 처분시설 위치·처분능력 |")
md_lines.append("| `{{recyclingSpec_*}}` | 재활용시설 위치·규모 |")
md_lines.append("| `{{coldStorageSpec}}` | 냉장·냉동시설 위치·규모 |")
md_lines.append("| `{{disinfectionSpec}}` | 소독시설 위치·규모 |")
md_lines.append("| `{{parkingSpec}}` | 주차장 위치·규모 |")
md_lines.append("| `{{carWashSpec}}` | 세차시설 위치·규모 |")
md_lines.append("| `{{feedSpec}}` | 사료화시설 위치·규모 |")
md_lines.append("| `{{refrigerantSpec}}` | 냉매물질 보관시설 위치·규모 |")
md_lines.append("| `{{fluorescSpec}}` | 형광물질 보관시설 위치·규모 |")
md_lines.append("| `{{shreddingSpec}}` | 파쇄·분쇄·절단시설 위치·규모 |")
md_lines.append("| `{{separationSpec}}` | 유수분리시설 위치·규모 |")
md_lines.append("| `{{mechanicalTreatmentSpec_*}}` | 기계적·화학적 처분시설 위치·처분능력 |")
md_lines.append("| `{{solidificationSpec_*}}` | 고형화·안정화 시설 위치·처분능력 |")
md_lines.append("| `{{batteryRecyclingSpec}}` | 폐이차전지 재활용시설 위치·규모 |")
md_lines.append("| `{{oilFilterSpec_*}}` | 폐오일필터 재활용시설 구조·규모 |")
md_lines.append("")
md_lines.append("### 기타")
md_lines.append("| 키 | 내용 |")
md_lines.append("|---|---|")
md_lines.append("| `{{contactAddr}}` | 연락장소·사무실 주소 |")
md_lines.append("| `{{techStaff}}` | 기술인력 성명·자격번호 |")
md_lines.append("| `{{equipmentSpec}}` | 장비 명세 |")
md_lines.append("")
md_lines.append("> Context suffix `_*`: `Gen`=생활·비배출시설계, `Ind`=배출시설계(GO), `Haz`=지정폐기물, `Med`=의료폐기물")
md_lines.append("> 차량 AND 항목(A 이상, B 이상)은 슬롯 2개 / OR 항목(A 또는 B)은 슬롯 1개. 시설 항목은 항목당 슬롯 1개.")
md_lines.append("")

for biz in BIZ_ORDER:
    rows = biz_rows.get(biz, [])
    if not rows:
        continue
    md_lines.append("---")
    md_lines.append("")
    md_lines.append(f"## {BIZ_KO.get(biz, biz)}")
    md_lines.append("")
    md_lines.append("| 섹션 | 마커 | 법령 기준 (요약) | 슬롯 키 |")
    md_lines.append("|---|---|---|---|")
    prev_sec = None
    for sec_title, marker, text_short, slot_keys, slot_label in rows:
        sec_disp = sec_title if sec_title != prev_sec else ""
        prev_sec = sec_title
        md_lines.append(f"| {sec_disp} | `{marker}` | {text_short} | {slot_keys} |")
    md_lines.append("")

MD_PATH.write_text("\n".join(md_lines), encoding="utf-8")
print(f"MD 생성: {MD_PATH.relative_to(BASE)}")
