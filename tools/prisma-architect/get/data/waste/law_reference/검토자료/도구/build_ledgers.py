"""폐기물관리법 시행규칙 — 작성·보존 대장 데이터화.

근거: 시행규칙 제58조 (폐기물처리상황 등의 기록) + 제41조의4 ④ (검사기관 관리대장)
법근거: 법 제36조제1항

각 대장에 대해 별지번호, 대장명, 근거조항, 법근거, 작성주체 원문 + 분류
(처리업자/신고자/배출자/시설관리자/제조수입업자/검사기관) 와 매핑 코드(bizType/category)
까지 첨부. API 직접 fetch 로 정확성 보장.

산출: 쓸자료/폐기물 대장.json
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Optional

ROOT = Path("d:/seodaeri/seodaeri-lambda")
sys.path.insert(0, str(ROOT))
from tools.law_api import fetch_law  # noqa: E402

OUT = ROOT / "data/waste/law_reference/쓸자료/폐기물 대장.json"
OC = "123"
RULE_ID = "008567"


# ─── helpers ─────────────────────────────────────────────────────

def strip_revision(s: str) -> str:
    s = re.sub(r"\s*<[^>]+>\s*", " ", s or "")
    s = re.sub(r"\s*\[[^\]]+\]\s*", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_marker_prefix(s: str, marker: str) -> str:
    if not s:
        return ""
    s = strip_revision(s)
    return re.sub(r"^" + re.escape(marker) + r"\s*", "", s).strip()


def get_조문(api_root: dict, num: str, gaji: str = "") -> Optional[dict]:
    units = api_root["법령"]["조문"]["조문단위"]
    if isinstance(units, dict):
        units = [units]
    for u in units:
        if u.get("조문여부") != "조문":
            continue
        if str(u.get("조문번호", "")) == num and str(u.get("조문가지번호", "")) == gaji:
            return u
    return None


def get_별표(api_root: dict, num: str, gaji: str = "00") -> Optional[dict]:
    for u in api_root["법령"].get("별표", {}).get("별표단위", []) or []:
        if str(u.get("별표번호", "")) == num and str(u.get("별표가지번호", "00")) == gaji:
            return u
    return None


# 별지번호 + 대장명 추출 — 본문에 N개 있을 수 있음
_LEDGER_PATTERN = re.compile(
    r"(별지\s*제\d+(?:의\d+)?호(?:의\d+)?\s*서식)"   # 별지번호
    r"(\([^)]*\))?"                                  # 옵션 괄호 (예: 대안 서식)
    r"\s*(?:의|에\s따른)?\s*"
    r"([^,.()]*?대장)"                               # 대장명
)


def extract_ledgers(text: str) -> list[dict]:
    """텍스트 안의 모든 '별지 제N호...의 ...대장' 매칭."""
    out: list[dict] = []
    for m in _LEDGER_PATTERN.finditer(text):
        bj = re.sub(r"\s+", " ", m.group(1)).strip()
        opt = m.group(2)
        nm = re.sub(r"\s+", " ", m.group(3)).strip()
        entry = {"별지": bj, "대장명": nm}
        if opt:
            # 괄호 안 대안 서식 (예: 매체접촉형은 별지 제45호의2서식)
            entry["대안서식"] = strip_revision(opt.strip("()"))
        out.append(entry)
    return out


def split_subject_ledger(text: str) -> tuple[str, str]:
    """호/목 본문에서 콜론(:/：) 기준 (작성주체, 대장부) 분리.

    콜론이 여러개면 마지막 콜론 기준 (앞쪽 인용은 작성주체에 포함).
    콜론이 없으면 (text, '').
    """
    # 별지 패턴 시작 위치를 기준으로 split — 콜론 위치보다 안전
    m = _LEDGER_PATTERN.search(text)
    if not m:
        return text.strip(), ""
    # 별지 시작 직전에 가장 가까운 콜론·구분자 찾기
    head = text[: m.start()].rstrip()
    head = re.sub(r"[\s:：]+$", "", head).strip()
    return head, text[m.start():].strip()


# ─── 매핑 (수동 정의 — 시행규칙 텍스트의 작성주체 표현 → 코드) ─────

# 호번호 → (주체_카테고리, bizType_W01, category, 법근거)
HO_CONTEXT = {
    "1.":   {"주체_카테고리": "배출자", "category": ["W04"], "법근거": "법 제15조의2제2항"},
    "1의2.": {"주체_카테고리": "배출자", "category": ["W04"], "법근거": "법 제17조제2항·제5항"},
    "1의3.": {"주체_카테고리": "배출자(자가재활용)", "category": ["W04"], "법근거": "법 제13조의2"},
    "1의4.": {"주체_카테고리": "공동처리 운영기구 대표자", "category": ["W04"], "법근거": "법 제15조의2"},
    "2.":   {"주체_카테고리": "공동처리 운영기구 대표자", "category": ["W04"], "법근거": "법 제17조"},
    "3.":   {"주체_카테고리": "처리업자", "category": ["W01"], "법근거": "법 제25조"},  # parent
    "3의2.": {"주체_카테고리": "전용용기 제조업자", "category": [], "법근거": "법 제25조의2"},
    "4.":   {"주체_카테고리": "처리시설 설치·관리자", "category": ["W03", "W05"], "법근거": "법 제29조제2항"},
    "5.":   {"주체_카테고리": "처리신고자", "category": ["W02"], "법근거": "법 제46조"},
    "6.":   {"주체_카테고리": "제품 제조업자/수입업자", "category": [], "법근거": "법 제47조"},
}

# 호.목 매핑 (3호/4호 처리업자/시설관리자별 bizType)
HO_MOK_BIZTYPE = {
    ("3.", "가."): {"명칭": "폐기물 수집ㆍ운반업자", "bizType_W01": ["TR"]},
    ("3.", "나."): {"명칭": "폐기물 중간처분업자",  "bizType_W01": ["ID"]},
    ("3.", "다."): {"명칭": "폐기물 재활용업자",   "bizType_W01": ["IR", "FR", "CR"]},
    ("3.", "라."): {"명칭": "폐기물 최종처분업자",  "bizType_W01": ["FD"]},
    ("3.", "마."): {"명칭": "폐기물 종합처분업자",  "bizType_W01": [None],
                    "비고": "상황코드_코드표 W01 에 종합처분업 코드 미정의"},
    ("4.", "가."): {"명칭": "폐기물 중간처분시설 설치ㆍ관리자", "bizType_W01": []},
    ("4.", "나."): {"명칭": "폐기물 최종처분시설 설치ㆍ관리자", "bizType_W01": []},
    ("4.", "다."): {"명칭": "폐기물 재활용시설 설치ㆍ관리자",   "bizType_W01": []},
    ("6.", "가."): {"명칭": "제품 제조업자 또는 수입업자", "bizType_W01": []},
    ("6.", "나."): {"명칭": "제품 제조업자 또는 수입업자", "bizType_W01": []},
}


def build_from_제58조(unit: dict) -> list[dict]:
    out: list[dict] = []
    항s = unit.get("항", []) or []
    if isinstance(항s, dict):
        항s = [항s]
    항1 = next((h for h in 항s if h.get("항번호") == "①"), None)
    if not 항1:
        return out

    for 호 in 항1.get("호", []) or []:
        호번호 = 호.get("호번호", "")
        if not 호번호:
            continue
        호본문_원문 = strip_marker_prefix(호.get("호내용", ""), 호번호)
        if 호본문_원문.startswith("삭제"):
            continue

        호_ledgers = extract_ledgers(호본문_원문)
        호_context = HO_CONTEXT.get(호번호, {})
        목s = 호.get("목", []) or []

        if 호_ledgers and not 목s:
            # 호 자체가 단일 entry
            subject, _ = split_subject_ledger(호본문_원문)
            for L in 호_ledgers:
                entry = {
                    "별지": L["별지"],
                    "대장명": L["대장명"],
                    "근거조항": f"시행규칙 제58조①{호번호}",
                    "법근거": 호_context.get("법근거", ""),
                    "작성주체_원문": subject,
                    "주체_카테고리": 호_context.get("주체_카테고리", ""),
                    "category": 호_context.get("category", []),
                    "bizType_W01": [],
                    "호본문_원문": 호본문_원문,
                }
                if "대안서식" in L:
                    entry["대안서식"] = L["대안서식"]
                out.append(entry)
        elif 목s:
            # 호는 카테고리, 각 목이 entry — 작성주체는 호 본문 + 목 좌측 결합
            parent_subject = 호본문_원문 if "{" not in 호본문_원문 else ""
            for 목 in 목s:
                목번호 = 목.get("목번호", "")
                목본문 = strip_marker_prefix(목.get("목내용", ""), 목번호)
                if 목본문.startswith("삭제"):
                    continue
                목_ledgers = extract_ledgers(목본문)
                if not 목_ledgers:
                    continue
                subject_local, _ = split_subject_ledger(목본문)
                # 목 본문에 콜론이 있어 좌측이 별도 자격이면 그것 사용 — 없으면 호 본문
                if subject_local and "별지" not in subject_local:
                    subject = f"{parent_subject} → {subject_local}"
                else:
                    subject = parent_subject
                hm_meta = HO_MOK_BIZTYPE.get((호번호, 목번호), {})
                for L in 목_ledgers:
                    entry = {
                        "별지": L["별지"],
                        "대장명": L["대장명"],
                        "근거조항": f"시행규칙 제58조①{호번호}{목번호}",
                        "법근거": 호_context.get("법근거", ""),
                        "작성주체_원문": subject.strip(),
                        "작성주체_명칭": hm_meta.get("명칭", ""),
                        "주체_카테고리": 호_context.get("주체_카테고리", ""),
                        "category": 호_context.get("category", []),
                        "bizType_W01": hm_meta.get("bizType_W01", []),
                        "호본문_원문": 호본문_원문,
                        "목본문_원문": 목본문,
                    }
                    if "대안서식" in L:
                        entry["대안서식"] = L["대안서식"]
                    if "비고" in hm_meta:
                        entry["비고"] = hm_meta["비고"]
                    out.append(entry)
    return out


def build_from_제41조의4(unit: dict) -> list[dict]:
    out: list[dict] = []
    항s = unit.get("항", []) or []
    if isinstance(항s, dict):
        항s = [항s]
    항4 = next((h for h in 항s if h.get("항번호") == "④"), None)
    if not 항4:
        return out
    text = strip_revision(항4.get("항내용", ""))
    ledgers = extract_ledgers(text)
    for L in ledgers:
        out.append({
            "별지": L["별지"],
            "대장명": L["대장명"],
            "근거조항": "시행규칙 제41조의4 ④",
            "법근거": "법 제30조의2",
            "작성주체_원문": "국립환경과학원장 (폐기물처리시설 검사기관 지정·변경지정 시)",
            "작성주체_명칭": "국립환경과학원장",
            "주체_카테고리": "지정권자",
            "category": [],
            "bizType_W01": [],
            "호본문_원문": text,
        })
    return out


def build_from_별표15의2(bp: dict) -> list[dict]:
    """별표 15의2 (전자정보처리프로그램 입력방법): 처리업자별 대장 매핑."""
    out: list[dict] = []
    items = bp.get("별표내용", []) or []
    # 처리업자별 매핑은 시행규칙 제58조의 ditto. 별표15의2 는 input system 절차이므로
    # 본 빌더에서는 별표 15의2 의 별지번호·대장명 인용만 보조 수집.
    # (정식 작성주체 출처는 제58조 — 중복 추가 X).
    for it in items:
        text = strip_revision(it.get("text", ""))
        if not text:
            continue
        ledgers = extract_ledgers(text)
        if not ledgers:
            continue
        for L in ledgers:
            out.append({
                "별지": L["별지"],
                "대장명": L["대장명"],
                "근거조항": "시행규칙 별표15의2",
                "법근거": "법 제36조제3항",
                "작성주체_원문": text,
                "주체_카테고리": "처리업자(전자정보처리)",
                "category": [],
                "bizType_W01": [],
                "비고": "전자정보처리프로그램 입력 절차 — 정식 작성·보존은 제58조",
            })
    return out


def dedup(entries: list[dict]) -> list[dict]:
    """중복 entry (같은 별지+대장명+근거조항) 1개만."""
    seen: set[tuple] = set()
    out = []
    for e in entries:
        key = (e["별지"], e["대장명"], e.get("근거조항", ""))
        if key in seen:
            continue
        seen.add(key)
        out.append(e)
    return out


def main() -> int:
    print(f"API fetch: 시행규칙 ID={RULE_ID} (제58조, 제41조의4, 별표15의2)")
    full58 = fetch_law(OC, law_id=RULE_ID, jo="005800")
    full414 = fetch_law(OC, law_id=RULE_ID, jo="004104")
    # 별표 15의2 는 별표 fetch 로 가져오기 (전체 fetch 후 추출)
    full_rule = fetch_law(OC, law_id=RULE_ID)
    bp_15_2 = get_별표(full_rule, "0015", "02")

    unit58 = get_조문(full58, "58")
    unit414 = get_조문(full414, "41", "4")
    if not unit58 or not unit414:
        print("ERROR: 조문 매칭 실패", file=sys.stderr)
        return 1

    entries: list[dict] = []
    entries.extend(build_from_제58조(unit58))
    entries.extend(build_from_제41조의4(unit414))
    if bp_15_2:
        entries.extend(build_from_별표15의2(bp_15_2))
    entries = dedup(entries)

    # 별지번호 정렬 (제N호[의X]서식)
    def sort_key(e: dict) -> tuple:
        m = re.match(r"별지\s*제(\d+)(?:호(?:의(\d+))?)?", e["별지"])
        if not m:
            return (999, 0, e["별지"])
        return (int(m.group(1)), int(m.group(2) or 0), e.get("근거조항", ""))
    entries.sort(key=sort_key)

    result = {
        "_meta": {
            "버전": "2026-05-09",
            "출처": "국가법령정보 OPEN API (tools/law_api.py)",
            "법령": {
                "법령ID": RULE_ID,
                "법령명_한글": full58["법령"]["기본정보"].get("법령명_한글", ""),
                "공포번호": full58["법령"]["기본정보"].get("공포번호", ""),
                "시행일자": full58["법령"]["기본정보"].get("시행일자", ""),
            },
            "근거조문": [
                "시행규칙 제58조 (폐기물처리상황 등의 기록) — 사업자별 작성·보존 대장",
                "시행규칙 제41조의4 ④ (검사기관 관리대장) — 지정권자 작성",
                "시행규칙 별표15의2 (전자정보처리프로그램 입력방법) — 별지 인용",
            ],
            "법근거": "법 제36조제1항 (장부 기록·보존)",
            "주체_카테고리_종류": [
                "배출자", "배출자(자가재활용)", "공동처리 운영기구 대표자",
                "처리업자", "처리신고자", "처리시설 설치·관리자",
                "전용용기 제조업자", "제품 제조업자/수입업자", "지정권자",
            ],
            "category_매핑": {
                "W01": "폐기물처리업 허가 (법 제25조)",
                "W02": "폐기물처리 신고 (법 제46조)",
                "W03": "처리시설 설치 승인 (법 제29조제2항)",
                "W04": "사업장폐기물배출자 신고 (법 제17조)",
                "W05": "처리시설 설치 신고 (법 제29조제2항)",
            },
            "bizType_매핑근거": "쓸자료/상황코드_코드표.json (bizType.W01)",
        },
        "대장": entries,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ 생성: {OUT}  ({OUT.stat().st_size:,} bytes)")
    print(f"  대장 entry: {len(entries)}개")
    by_cat: dict = {}
    for e in entries:
        by_cat.setdefault(e.get("주체_카테고리", "?"), []).append(e["별지"])
    for cat, items in by_cat.items():
        print(f"    [{cat}] {len(items)}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
