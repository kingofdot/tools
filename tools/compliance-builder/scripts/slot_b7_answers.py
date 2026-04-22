# -*- coding: utf-8 -*-
"""
별표7 answer 필드를 {{placeholder}} 슬롯으로 전환 + 업종별 MD 목록 생성.

슬롯 키 (영문):
  vehicleNo     - 차량번호 (label은 차종 명시)
  contactAddr   - 연락장소·사무실 주소
  techStaff     - 기술인력 성명·자격번호
  facilitySpec  - 시설 위치·규모
  equipmentSpec - 장비 명세

실행:
  python scripts/slot_b7_answers.py
"""

import json, sys, io, re
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE     = Path(__file__).resolve().parent.parent
B7_PATH  = BASE / "data" / "검토사항" / "시행규칙" / "별표7_처리업시설장비기술능력기준.json"
MD_PATH  = BASE / "docs" / "별표7_슬롯목록.md"

b7    = json.loads(B7_PATH.read_text(encoding="utf-8"))
items = b7["별표내용"]

# ── 차종 추출 ──────────────────────────────────────────────────────────
# 텍스트에서 차종 키워드를 뽑아 vehicleNo slot label에 포함시킨다.
VTYPE_KW = [
    ("탱크로리",          "탱크로리"),
    ("냉장차량",          "냉장차량"),
    ("암롤",              "암롤차량"),
    ("굴착기",            "굴착기"),
    ("밀폐형 압축·압착",  "밀폐형 압축·압착차량"),
    ("밀폐형 덮개 설치",  "밀폐형 덮개 설치차량"),
    ("밀폐형 차량",       "밀폐형 차량"),
    ("수집·운반차량",     "수집·운반차량"),
    ("수집운반차량",      "수집운반차량"),
]


def extract_vtype(text: str) -> str:
    found = []
    for kw, label in VTYPE_KW:
        if kw in text and label not in found:
            found.append(label)
    return " / ".join(found) if found else "차량"


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
PARKING_PAT = ["주차장", "세차시설"]


def classify(text: str) -> str:
    if any(k in text for k in PARKING_PAT):
        return "facility"
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


def make_slot(kind: str, text: str) -> dict:
    if kind == "vehicle":
        vtype = extract_vtype(text)
        return {
            "answer": "{{vehicleNo}}",
            "slots": [{"key": "vehicleNo", "label": f"Vehicle Registration No. ({vtype})",
                       "type": "text", "hint": "예: 12가2131, 34나1231"}],
        }
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
    # facility
    return {
        "answer": "{{facilitySpec}}",
        "slots": [{"key": "facilitySpec", "label": "Facility Location & Scale",
                   "type": "text", "hint": "예: 부지 내 제○동 1층 (면적: ○○㎡)"}],
    }


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

    kind = classify(it.get("text", ""))
    tpl  = make_slot(kind, it.get("text", ""))
    it["answer"] = tpl["answer"]
    it["slots"]  = tpl["slots"]
    changed += 1
    print(f"[{kind:8s}] {it['marker']:6s} {it['slots'][0]['label'][:50]}")

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
SLOT_KO = {
    "vehicleNo":    "`{{vehicleNo}}`",
    "contactAddr":  "`{{contactAddr}}`",
    "techStaff":    "`{{techStaff}}`",
    "facilitySpec": "`{{facilitySpec}}`",
    "equipmentSpec":"`{{equipmentSpec}}`",
}

# bizType별로 슬롯이 있는 항목 수집
from collections import defaultdict
biz_rows = defaultdict(list)  # biz_code -> list of (section_title, marker, text_short, slot_key, slot_label)

# section header stack
section_stack = []   # (depth, text)

for it in items:
    # isHeader 항목은 section stack 갱신
    if it.get("isHeader"):
        d = it.get("depth", 0)
        # 같은 depth 이상의 헤더는 꺼내기
        section_stack = [(sd, st) for sd, st in section_stack if sd < d]
        section_stack.append((d, it.get("text", "")))
        continue

    if not it.get("slots"):
        continue

    tags = it.get("tags") or {}
    biz_types = tags.get("bizType") or []
    slot_key   = it["slots"][0]["key"]
    slot_label = it["slots"][0]["label"]
    text_short = (it.get("text") or "")[:60]
    marker     = it.get("marker", "")

    # 직상위 isHeader 섹션 제목 (depth 가장 큰 것)
    sec_title = section_stack[-1][1][:50] if section_stack else ""

    for biz in biz_types:
        biz_rows[biz].append((sec_title, marker, text_short, slot_key, slot_label))

# 업종 순서
BIZ_ORDER = ["TR", "RTR", "ID", "FD", "RCY"]

md_lines = []
md_lines.append("# 별표7 플레이스홀더 목록 (업종별)")
md_lines.append("")
md_lines.append("> `slot_b7_answers.py`가 생성하는 모든 `{{}}` 슬롯을 업종별로 정리.")
md_lines.append("")
md_lines.append("## 슬롯 키 목록")
md_lines.append("")
md_lines.append("| 키 | 입력 내용 | 예시 |")
md_lines.append("|---|---|---|")
md_lines.append("| `{{vehicleNo}}` | 차종·차량번호 | 12가2131, 34나1231 |")
md_lines.append("| `{{contactAddr}}` | 연락장소(사무실) 주소 | 서울시 강남구 ○○로 123 |")
md_lines.append("| `{{techStaff}}` | 기술인력 성명·자격번호 | 홍길동 (폐기물처리산업기사 제XXXX호) |")
md_lines.append("| `{{facilitySpec}}` | 시설 위치·규모 | 부지 내 제○동 1층 (면적: ○○㎡) |")
md_lines.append("| `{{equipmentSpec}}` | 장비 명세 | ○○ 계량기 1식, 제조번호 XXXX |")
md_lines.append("")

for biz in BIZ_ORDER:
    rows = biz_rows.get(biz, [])
    if not rows:
        continue
    md_lines.append(f"---")
    md_lines.append(f"")
    md_lines.append(f"## {BIZ_KO.get(biz, biz)}")
    md_lines.append(f"")
    md_lines.append(f"| 섹션 | 마커 | 법령 기준 (요약) | 슬롯 키 | 입력 내용 |")
    md_lines.append(f"|---|---|---|---|---|")
    prev_sec = None
    for sec_title, marker, text_short, slot_key, slot_label in rows:
        sec_disp = sec_title if sec_title != prev_sec else ""
        prev_sec = sec_title
        md_lines.append(
            f"| {sec_disp} | `{marker}` | {text_short} | `{{{{{slot_key}}}}}` | {slot_label} |"
        )
    md_lines.append("")

MD_PATH.write_text("\n".join(md_lines), encoding="utf-8")
print(f"MD 생성: {MD_PATH.relative_to(BASE)}")
