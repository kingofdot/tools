# -*- coding: utf-8 -*-
"""
별표5 정밀 검토 A (데이터 무결성) 자동 스캔.

A-1. tags 구조 불완전
  - 실 항목(tags=dict)인데 action·wasteClass 둘 다 없음 → 필터 누락 위험
  - phaseState 등 legacy/오타 키 잔존
  - 알 수 없는 키

A-2. wasteCode 정합성
  - wasteInformation.json 에 없는 코드 (천연방사성 12-/91-20 은 알려진 예외로 분리)
  - "+" / 쉼표 등 문자열로 남은 항목 (배열 아님)
  - 상위·하위 계층 동시 등장 (51-03 + 51-03-01)

A-3. wasteClass × wasteCode 교차검증
  - 10-xx 인데 D 가 아님
  - 01~11-xx(10 제외) 인데 D 가 아님
  - 51-xx 인데 GO/GN 이 아님
  - 91-xx 인데 L 이 아님
  - 12-xx, 91-20-xx 은 경고만
"""

import json
import sys
import io
from pathlib import Path
from collections import defaultdict

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
B5_PATH = BASE / "data" / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"
WINFO_PATH = BASE / "data" / "wasteInformation.json"
REPORT_PATH = BASE / "docs" / "audit_b5_리포트.md"

b5 = json.loads(B5_PATH.read_text(encoding="utf-8"))
winfo = json.loads(WINFO_PATH.read_text(encoding="utf-8"))
items = b5.get("별표내용") or []
canonical_codes = {it["wasteCode"] for it in winfo}


def code_is_known(code):
    """canonical에 정확히 있거나, 상위 또는 하위 코드로 존재하면 유효."""
    if code in canonical_codes:
        return True
    for c in canonical_codes:
        if c.startswith(code + "-") or code.startswith(c + "-"):
            return True
    return False

ALLOWED_TAG_KEYS = {
    "category", "bizType", "docType", "wasteClass", "wasteCode",
    "action", "rCode", "facilityType", "facilityApproval",
    "physicalState", "wasteVars",
}

KNOWN_EXEMPT_CODES = {"12-00-00", "91-20-00"}  # 천연방사성 (wasteInformation 미등록이지만 법령상 유효)


def is_section_header(it):
    return it.get("tags") is None


def has_content(it):
    t = it.get("tags")
    return isinstance(t, dict) and (t.get("action") or t.get("wasteClass"))


def waste_class_expected(code):
    """wasteCode 의 접두어를 보고 기대되는 wasteClass 집합을 반환."""
    if not code:
        return None
    head = code.split("-")[0]
    if head == "10":
        return {"D"}
    if head.isdigit() and 1 <= int(head) <= 11 and head != "10":
        return {"D"}
    if head == "12":
        return {"D"}  # 천연방사성도 지정폐기물
    if head == "51":
        return {"GO", "GN"}
    if head == "91":
        return {"L"}
    return None


# 섹션 경계 사전 계산: 대섹션 헤더(1., 2., 3., 4., 5., 6.) 를 순회하며 idx 범위 확정.
# hwp 변환 과정에서 d0 헤더가 중간에 깨져있어도 text 기반 매칭으로 경계 확정.
SECTION_KEYWORDS = [
    ("생활폐기물의 기준 및 방법", "L"),
    ("음식물류 폐기물의 기준 및 방법", "L"),
    ("사업장일반폐기물의 기준 및 방법", "G"),
    ("지정폐기물(의료폐기물은 제외", "D"),
    ("지정폐기물 중 의료폐기물", "D"),
    ("의료폐기물의 기준 및 방법", "D"),
    ("폐기물수집", None),   # 해석 컨텍스트 없음 (내부에 품목별 명시)
]


def _build_section_map():
    mapping = {}  # idx -> kind
    current = None
    for i, it in enumerate(items):
        t = it.get("text") or ""
        for kw, kind in SECTION_KEYWORDS:
            if kw in t:
                current = kind
                break
        mapping[i] = current
    return mapping


SECTION_MAP = _build_section_map()


def parent_section_kind(idx):
    return SECTION_MAP.get(idx)


DESIGNATED_CROSSOVER_CODES = {"51-08", "51-09", "51-22", "51-30-05"}


a1_missing_tags = []        # tags=dict 인데 action·wasteClass 둘 다 없음
a1_unknown_keys = []        # 알 수 없는 키
a1_phasestate = []          # phaseState 잔존

a2_unknown_codes = []       # canonical 미등록 (알려진 예외 제외)
a2_string_join = []         # "+" 나 "," 가 문자열로 남은 경우
a2_hierarchy_dup = []       # 51-03 과 51-03-01 이 동시 등장
a2_empty_code = []          # 빈 문자열

a3_mismatch = []            # wasteCode ↔ wasteClass 불일치
a3_exempt_warn = []         # 천연방사성 등 예외 경고

stats = defaultdict(int)


def brief(it):
    return {
        "idx": it.get("_idx_runtime"),
        "depth": it.get("depth"),
        "marker": it.get("marker"),
        "text": (it.get("text") or "")[:70],
    }


for idx, it in enumerate(items):
    it["_idx_runtime"] = idx
    tags = it.get("tags")

    if tags is None:
        stats["section_headers"] += 1
        continue

    if not isinstance(tags, dict):
        stats["nondict_tags"] += 1
        a1_missing_tags.append((brief(it), f"tags가 dict 아님: {type(tags).__name__}"))
        continue

    stats["content_items"] += 1

    # A-1: 알 수 없는 키 / legacy 키
    for k in tags.keys():
        if k == "phaseState":
            a1_phasestate.append(brief(it))
        elif k not in ALLOWED_TAG_KEYS:
            a1_unknown_keys.append((brief(it), k))

    # A-1: action·wasteClass 둘 다 없음
    if not tags.get("action") and not tags.get("wasteClass"):
        a1_missing_tags.append((brief(it), "action·wasteClass 모두 없음"))

    # A-2: wasteCode 검사
    wc = tags.get("wasteCode")
    if wc is not None:
        if not isinstance(wc, list):
            a2_string_join.append((brief(it), f"wasteCode가 list 아님: {wc!r}"))
            continue
        cleaned = []
        for c in wc:
            if not isinstance(c, str):
                a2_string_join.append((brief(it), f"wasteCode 요소가 str 아님: {c!r}"))
                continue
            if not c:
                a2_empty_code.append(brief(it))
                continue
            if "+" in c or "," in c:
                a2_string_join.append((brief(it), f"'+' 또는 ',' 포함: {c}"))
                continue
            cleaned.append(c)
            if not code_is_known(c) and c not in KNOWN_EXEMPT_CODES:
                a2_unknown_codes.append((brief(it), c))
            if c in KNOWN_EXEMPT_CODES:
                a3_exempt_warn.append((brief(it), c))

        # A-2: 계층 중복 (51-03 + 51-03-01 동시)
        for a in cleaned:
            for b in cleaned:
                if a != b and (b.startswith(a + "-") or a.startswith(b + "-")):
                    a2_hierarchy_dup.append((brief(it), a, b))
                    break

        # A-3: 교차검증
        wclass = tags.get("wasteClass") or []
        if wclass and cleaned:
            section_kind = parent_section_kind(idx)
            for c in cleaned:
                if c in KNOWN_EXEMPT_CODES:
                    continue
                # 지정폐기물 섹션 하위에서 51-xx 지정편입 코드는 D 허용
                if section_kind == "D" and c in DESIGNATED_CROSSOVER_CODES and "D" in wclass:
                    continue
                expected = waste_class_expected(c)
                if expected and not any(w in expected for w in wclass):
                    a3_mismatch.append((brief(it), c, wclass, sorted(expected)))


# ── 리포트 작성 ──────────────────────────────────────────────────────
lines = []
lines.append("# 별표5 정밀 검토 A 리포트 (자동 스캔)")
lines.append("")
lines.append(f"- 대상 파일: `data/검토사항/시행규칙/별표5_처리구체적기준및방법.json`")
lines.append(f"- 총 항목 수: {len(items)}")
lines.append(f"- 섹션 헤더(tags=null): {stats['section_headers']}")
lines.append(f"- 실 항목(tags=dict): {stats['content_items']}")
lines.append("")

def section(title, rows, fmt):
    lines.append(f"## {title}")
    lines.append("")
    if not rows:
        lines.append("문제 없음.")
        lines.append("")
        return
    lines.append(f"**{len(rows)}건 발견**")
    lines.append("")
    for r in rows[:50]:
        lines.append(fmt(r))
    if len(rows) > 50:
        lines.append(f"... (상위 50건만 표시, 전체 {len(rows)}건)")
    lines.append("")


section(
    "A-1. tags 구조 불완전",
    a1_missing_tags,
    lambda r: f"- [{r[0]['idx']}] d{r[0]['depth']} `{r[0]['marker']}` {r[0]['text']} — {r[1]}",
)
section(
    "A-1. phaseState 잔존",
    a1_phasestate,
    lambda r: f"- [{r['idx']}] d{r['depth']} `{r['marker']}` {r['text']}",
)
section(
    "A-1. 알 수 없는 tags 키",
    a1_unknown_keys,
    lambda r: f"- [{r[0]['idx']}] d{r[0]['depth']} `{r[0]['marker']}` key=`{r[1]}` — {r[0]['text']}",
)
section(
    "A-2. wasteCode 문자열 오류 (+ / , / 비문자열)",
    a2_string_join,
    lambda r: f"- [{r[0]['idx']}] `{r[0]['marker']}` {r[1]}",
)
section(
    "A-2. wasteCode 빈 문자열",
    a2_empty_code,
    lambda r: f"- [{r['idx']}] `{r['marker']}` {r['text']}",
)
section(
    "A-2. wasteCode canonical 미등록 (천연방사성 예외 제외)",
    a2_unknown_codes,
    lambda r: f"- [{r[0]['idx']}] `{r[0]['marker']}` code=`{r[1]}` — {r[0]['text']}",
)
section(
    "A-2. wasteCode 계층 중복 (상위+하위 동시 등장)",
    a2_hierarchy_dup,
    lambda r: f"- [{r[0]['idx']}] `{r[0]['marker']}` `{r[1]}` ↔ `{r[2]}` — {r[0]['text']}",
)
section(
    "A-3. wasteClass ↔ wasteCode 불일치",
    a3_mismatch,
    lambda r: f"- [{r[0]['idx']}] `{r[0]['marker']}` code=`{r[1]}` wasteClass={r[2]} (기대값: {r[3]}) — {r[0]['text']}",
)
section(
    "A-3. 천연방사성 예외 항목 (참고)",
    a3_exempt_warn,
    lambda r: f"- [{r[0]['idx']}] `{r[0]['marker']}` code=`{r[1]}` — {r[0]['text']}",
)

REPORT_PATH.write_text("\n".join(lines), encoding="utf-8")

# ── 콘솔 요약 ────────────────────────────────────────────────────────
print("=" * 70)
print("별표5 정밀 검토 A 자동 스캔 결과")
print("=" * 70)
print(f"총 항목: {len(items)} (헤더 {stats['section_headers']} / 실항목 {stats['content_items']})")
print()
print(f"A-1. tags 구조 불완전       : {len(a1_missing_tags)}건")
print(f"A-1. phaseState 잔존         : {len(a1_phasestate)}건")
print(f"A-1. 알 수 없는 tags 키      : {len(a1_unknown_keys)}건")
print(f"A-2. wasteCode 문자열 오류   : {len(a2_string_join)}건")
print(f"A-2. wasteCode 빈 문자열     : {len(a2_empty_code)}건")
print(f"A-2. wasteCode 미등록        : {len(a2_unknown_codes)}건")
print(f"A-2. wasteCode 계층 중복     : {len(a2_hierarchy_dup)}건")
print(f"A-3. wasteClass 불일치       : {len(a3_mismatch)}건")
print(f"A-3. 천연방사성 예외 (참고)  : {len(a3_exempt_warn)}건")
print()
print(f"리포트 작성: {REPORT_PATH.relative_to(BASE)}")
