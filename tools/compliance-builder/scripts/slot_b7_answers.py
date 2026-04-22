# -*- coding: utf-8 -*-
"""
별표7 answer 필드를 {{placeholder}} 슬롯으로 전환.

- 이미 완성된 문장(~겠음. 으로 끝나는 것)은 그대로 보존
- 나머지 실내용 항목은 분류에 따라 {{차량번호}} / {{연락장소}} / {{기술인력}} /
  {{시설명세}} / {{장비명세}} 슬롯으로 교체
- 헤더(isHeader) 및 tags=null 항목은 건드리지 않음
"""

import json, sys, io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
B7_PATH = BASE / "data" / "검토사항" / "시행규칙" / "별표7_처리업시설장비기술능력기준.json"

b7 = json.loads(B7_PATH.read_text(encoding="utf-8"))
items = b7["별표내용"]

# ── 슬롯 템플릿 ────────────────────────────────────────────────────────
SLOT_DEFS = {
    "vehicle": {
        "answer": "{{차량번호}}",
        "slots": [{"key": "차량번호", "label": "차량번호", "type": "text",
                   "hint": "예: 12가2131, 34나1231"}],
    },
    "contact": {
        "answer": "{{연락장소}}",
        "slots": [{"key": "연락장소", "label": "연락장소(사무실) 주소", "type": "text",
                   "hint": "예: 서울시 강남구 ○○로 123"}],
    },
    "tech": {
        "answer": "{{기술인력}}",
        "slots": [{"key": "기술인력", "label": "기술인력 성명·자격번호", "type": "text",
                   "hint": "예: 홍길동 (폐기물처리산업기사 제XXXX호)"}],
    },
    "equipment": {
        "answer": "{{장비명세}}",
        "slots": [{"key": "장비명세", "label": "장비 명세", "type": "text",
                   "hint": "예: ○○ 계량기 1식, 제조번호 XXXX"}],
    },
    "facility": {
        "answer": "{{시설명세}}",
        "slots": [{"key": "시설명세", "label": "시설 위치·규모", "type": "text",
                   "hint": "예: 부지 내 제○동 1층 (면적: ○○㎡)"}],
    },
}

# ── 분류 규칙 ──────────────────────────────────────────────────────────
TECH_KW    = ["기술능력:"]
# 자격증 나열 항목 ("~기사", "위생사", "임상병리사" 등)
QUAL_KW    = ["산업기사", "환경기사", "공업화학기사", "위생사", "임상병리사",
              "토목기사", "전기기사", "그린전동자동차기사",
              "폐기물처리기사", "화공기사", "환경기능사", "기능사"]
EQUIP_KW   = ["실험기기", "측정기기", "소독장비", "계량시설",
              "파쇄시설", "분리시설", "선별시설", "증류시설", "응축시설",
              "여과(정제)시설", "혼합시설", "유수분리시설", "수은회수시설",
              "압축시설", "유량계측시설", "유량계측설비",
              "측정·기록 장치", "표척"]
# 주차장·세차시설은 facility
PARKING_PAT = ["주차장", "세차시설"]


def classify(text: str) -> str:
    # 주차장·세차시설은 facility
    if any(k in text for k in PARKING_PAT):
        return "facility"
    # 연락장소
    if text.startswith("연락장소"):
        return "contact"
    # 기술능력: 레이블 있는 항목
    if any(k in text for k in TECH_KW):
        return "tech"
    # 기술능력 레이블 없이 자격증 나열만 있는 항목 (시설·장비 언급 없음)
    if any(k in text for k in QUAL_KW) and "시설" not in text and "장비" not in text:
        return "tech"
    # "계량시설"이 있으면 equipment (수집·운반차량의 계량시설 등)
    if "계량시설" in text:
        return "equipment"
    # 차량 항목: "차량" 포함 + 대수 표기(N대) 또는 명확한 차량 종류
    if "차량" in text and ("1대" in text or "2대" in text or "3대" in text or
                           "탱크로리" in text or "암롤" in text or
                           "수집·운반차량" in text or "수집운반차량" in text):
        return "vehicle"
    # 탱크로리·굴착기는 차량
    if "탱크로리" in text or "굴착기" in text:
        return "vehicle"
    # 장비
    if any(k in text for k in EQUIP_KW):
        return "equipment"
    return "facility"


def already_sentence(answer: str) -> bool:
    """이미 완성된 준수계획 문장인지 확인."""
    return answer.endswith("겠음") or answer.endswith("겠음.")


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
    tpl  = SLOT_DEFS[kind]
    it["answer"] = tpl["answer"]
    it["slots"]  = tpl["slots"]
    changed += 1
    print(f"[{kind:8s}] {it['marker']:6s} {it['text'][:60]}")

B7_PATH.write_text(json.dumps(b7, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n총 {changed}건 슬롯 전환 완료 → {B7_PATH.relative_to(BASE)}")
