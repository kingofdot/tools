"""data/waste/law_reference/ 의 md자료/ 와 쓸자료/definitions.json 생성.

원문 출처:
- 조문: API 캐시 (d:/tmp/law_*.json) — 법 001771 / 시행령 005353 / 시행규칙 008567
- 별표: 쓸자료/별표/시행령·시행규칙/별표*.json (API와 일치 검증 완료)
- 매핑: 쓸자료/상황코드_코드표.json

산출물:
- md자료/_README.md, md자료/01~05_*.md
- 쓸자료/definitions.json
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Optional

import os

# 저장소 위치는 환경변수로 덮어쓸 수 있다 (기본값은 종전 하드코딩 경로).
#   SEODAERI_ROOT  — data/waste/law_reference 의 상위 경로
#   LAW_CACHE_DIR  — 국가법령정보 API 덤프(law_*.json) 디렉터리
ROOT = Path(os.environ.get("SEODAERI_ROOT", "d:/seodaeri/seodaeri-lambda"))
_BASE = ROOT / "data/waste/law_reference"
OUT_MD = _BASE / "md자료"
OUT_DATA = _BASE / "쓸자료"
REF = OUT_DATA / "별표"

LAW_CACHE = Path(os.environ.get("LAW_CACHE_DIR", "d:/tmp"))
API_LAW = json.loads((LAW_CACHE / "law_law_001771.json").read_text(encoding="utf-8"))
API_DECREE = json.loads((LAW_CACHE / "law_decree_005353.json").read_text(encoding="utf-8"))
API_RULE = json.loads((LAW_CACHE / "law_rule_008567.json").read_text(encoding="utf-8"))
CODE_TABLE = json.loads((OUT_DATA / "상황코드_코드표.json").read_text(encoding="utf-8"))


# ─── helpers ─────────────────────────────────────────────────────

def get_조문(api: dict, num: str, gaji: str = "") -> Optional[dict]:
    for u in api["법령"]["조문"]["조문단위"]:
        if u.get("조문여부") != "조문":
            continue
        if str(u.get("조문번호", "")) == num and str(u.get("조문가지번호", "")) == gaji:
            return u
    return None


def get_별표(api: dict, num: str, gaji: str = "00") -> Optional[dict]:
    for u in api["법령"]["별표"]["별표단위"]:
        if str(u.get("별표번호", "")) == num and str(u.get("별표가지번호", "")) == gaji:
            return u
    return None


def get_ref(category: str, name: str) -> dict:
    return json.loads((REF / category / name).read_text(encoding="utf-8"))


def code_values(seg: dict) -> dict:
    """코드표 세그먼트에서 코드→명칭 매핑을 꺼낸다.

    현행 스키마는 seg["값"] 이 {코드: 명칭} dict 이고, 구버전 일부는 seg["값"] 이
    코드 리스트 + seg["레이블"] 이 별도 dict 였다. 둘 다 받아 dict 로 정규화한다.
    """
    vals = seg.get("값")
    labels = seg.get("레이블", {})
    if isinstance(vals, dict):
        return {c: (labels.get(c) or n) for c, n in vals.items()}
    if isinstance(vals, (list, tuple)):
        return {c: labels.get(c, "") for c in vals}
    return dict(labels)


def code_label(seg: dict, code: str) -> str:
    return code_values(seg).get(code, "")


def 조문_label(num: str, gaji: str) -> str:
    return f"제{num}{'의' + gaji if gaji else ''}조"


def strip_revision_tags(s: str) -> str:
    """<개정 …>, <신설 …> 등 메타 태그 제거. 원문 텍스트는 보존."""
    return re.sub(r"\s*<[^>]+>", "", s).strip()


def render_조문(unit: dict, *, hide_revision: bool = True) -> list[str]:
    """조문 → MD 라인. blockquote 형태."""
    out: list[str] = []
    title = unit.get("조문제목", "")
    label = 조문_label(str(unit.get("조문번호", "")), str(unit.get("조문가지번호", "")))
    head = f"**{label}({title})**" if title else f"**{label}**"
    out.append(head)
    out.append("")

    # 조문내용에서 "제N조(...)" 헤더 제거하고 본문만 표시
    body = unit.get("조문내용", "") or ""
    if hide_revision:
        body = strip_revision_tags(body)
    body_rest = re.sub(r"^제\d+조(?:의\d+)?\([^)]*\)\s*", "", body).strip()
    if body_rest:
        out.append(f"> {body_rest}")
        out.append(">")

    # 항 — list (일반) 또는 dict (단일 항이 곧 호 묶음, 예: 법 제2조)
    항s = unit.get("항")
    항_list: list[dict] = []
    if isinstance(항s, list):
        항_list = [h for h in 항s if isinstance(h, dict)]
    elif isinstance(항s, dict):
        항_list = [항s]

    for 항 in 항_list:
        txt = 항.get("항내용", "") or ""
        if hide_revision:
            txt = strip_revision_tags(txt)
        if txt:
            out.append(f"> {txt}")
        for 호 in 항.get("호", []) or []:
            if not isinstance(호, dict):
                continue
            ht = 호.get("호내용", "") or ""
            if hide_revision:
                ht = strip_revision_tags(ht)
            out.append(f">   {ht}")
            for 목 in 호.get("목", []) or []:
                if not isinstance(목, dict):
                    continue
                mt = 목.get("목내용", "") or ""
                if hide_revision:
                    mt = strip_revision_tags(mt)
                out.append(f">     {mt}")
        out.append(">")
    out.append("")
    return out


def render_별표(unit: dict, *, hide_revision: bool = True) -> list[str]:
    """별표 → MD 라인. depth 기반 들여쓰기."""
    out: list[str] = []
    title = unit.get("별표제목", "")
    num = unit.get("별표번호", "")
    gaji = unit.get("별표가지번호", "00")
    label = f"별표 {int(num)}{'의' + str(int(gaji)) if int(gaji) else ''}"
    head = f"**{label} — {title}**"
    out.append(head)
    out.append(f"_시행일자: {unit.get('별표시행일자','-')}_")
    out.append("")

    items = unit.get("별표내용", []) or []
    for it in items:
        if not isinstance(it, dict):
            continue
        d = it.get("depth", 0) or 0
        marker = it.get("marker", "")
        text = it.get("text", "")
        if hide_revision:
            text = strip_revision_tags(text)
        kind = it.get("type", "")
        if kind == "title":
            # title 행은 별표 본문 시작 표시 — 이미 위에서 헤더로 출력했으므로 생략
            continue
        prefix = "  " * (d if d else 0)
        line = f"{prefix}- "
        if marker and kind == "note":
            line += f"**{marker}**{text}".strip()
        elif marker:
            line += f"`{marker}` {text}".strip()
        else:
            line += text.strip()
        if it.get("table"):
            line += f"  _[표 {len(it['table'])}행 — 별표 원본 참고]_"
        out.append(line)
    out.append("")
    return out


# ─── 1. 법령용어정의 ────────────────────────────────────────────

def build_terms_md() -> str:
    L: list[str] = []
    L.append("# 법령용어 정의")
    L.append("")
    L.append("폐기물관리법(법률) / 시행령 / 시행규칙에서 정의하는 용어 모음. 원문은 국가법령정보 OPEN API verbatim (메타 태그 `<개정 …>` 제거).")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 1. 폐기물관리법 제2조 (정의) — 핵심 용어")
    L.append("")
    art = get_조문(API_LAW, "2")
    L += render_조문(art)

    L.append("## 2. 폐기물관리법 제2조의2 (폐기물의 세부분류)")
    L.append("")
    art = get_조문(API_LAW, "2", "2")
    L += render_조문(art)

    L.append("## 3. 시행령 제1조의2 (정의)")
    L.append("")
    art = get_조문(API_DECREE, "1", "2")
    if art:
        L += render_조문(art)
    else:
        L.append("_(해당 조문 없음 — 시행령에 별도 정의 조항 없음)_")
        L.append("")

    L.append("## 4. 시행령 제2조 (사업장의 범위)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "2"))

    L.append("## 5. 시행령 제3조 (지정폐기물의 종류)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "3"))

    L.append("## 6. 시행령 제4조 (의료폐기물의 종류)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "4"))

    L.append("## 7. 시행령 제5조 (폐기물처리시설)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "5"))

    L.append("## 8. 시행령 제6조 (폐기물 감량화시설)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "6"))

    L.append("## 9. 시행령 제7조 (폐기물의 처리기준 등)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "7"))

    L.append("## 10. 시행규칙 제4조의2 (폐기물의 종류 및 재활용 유형)")
    L.append("")
    L += render_조문(get_조문(API_RULE, "4", "2"))

    return "\n".join(L)


# ─── 2. 폐기물 종류 ─────────────────────────────────────────────

def build_waste_types_md() -> str:
    L: list[str] = []
    L.append("# 폐기물 종류 / 분류 체계")
    L.append("")
    L.append("법령상 폐기물 분류와 매핑용 코드 체계. 사용자가 입력하는 \"폐기물의 종류\" 는 이 표를 기준으로 매핑됨.")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 1. 법상 1차 분류 (폐기물관리법 제2조)")
    L.append("")
    L.append("| 분류 | 정의 | 출처 |")
    L.append("|---|---|---|")
    art = get_조문(API_LAW, "2")
    호s = (art.get("항", {}) or {}).get("호", []) if isinstance(art.get("항"), dict) else []
    if not 호s and isinstance(art.get("항"), list):
        # 다른 케이스
        for 항 in art["항"]:
            호s += 항.get("호", []) or []
    for 호 in 호s:
        if not isinstance(호, dict):
            continue
        n = 호.get("호번호", "")
        text = strip_revision_tags(호.get("호내용", ""))
        if any(kw in text for kw in ['"폐기물"', '"생활폐기물"', '"사업장폐기물"', '"지정폐기물"', '"의료폐기물"']):
            # 따옴표로 둘러싼 정의 추출
            m = re.match(r'^\s*\d+(?:\d+)?\.\s*"([^"]+)"\s*이?란?\s*(.+)$', text)
            if m:
                term, defn = m.group(1), m.group(2)
                L.append(f"| {term} | {defn[:200]} | 법 제2조 {n} |")
    L.append("")

    L.append("## 2. 사업장폐기물 매트릭스 (시행령 제2조 기준)")
    L.append("")
    L.append("> 사업장의 범위는 시행령 제2조에서 정의. 사업장 안에서 발생하는 폐기물은 사업장폐기물.")
    L.append("> 그 외에서 발생하는 폐기물은 생활폐기물.")
    L.append("> 사업장 중 「대기환경보전법」 등에 따른 배출시설을 설치ㆍ운영하는 사업장 → 사업장배출시설계 (코드 GO)")
    L.append("> 그 외 사업장 → 사업장비배출시설계 (코드 GN)")
    L.append("")
    L.append("→ 자세한 시행령 제2조 원문은 `01_법령용어정의.md` 참조.")
    L.append("")

    L.append("## 3. 지정폐기물 — 시행령 별표1")
    L.append("")
    L.append("> 사업장폐기물 중 폐유ㆍ폐산 등 주변 환경 오염 또는 인체 위해 우려가 있는 폐기물.")
    L.append("> 종류는 시행령 제3조 + 별표1 참조.")
    L.append("")
    bp1 = get_ref("시행령", "별표1_지정폐기물종류.json")
    L += render_별표(bp1)

    L.append("## 4. 의료폐기물 — 시행령 별표2")
    L.append("")
    bp2 = get_ref("시행령", "별표2_의료폐기물종류.json")
    L += render_별표(bp2)

    L.append("## 5. 폐기물 종류별 세부분류 코드 — 시행규칙 별표4")
    L.append("")
    L.append("> 6자리 코드 체계 (예: 51-01-01). 첫 2자리 = 대분류, 가운데 2자리 = 중분류, 마지막 2자리 = 세부.")
    L.append("> 폐기물처리업 허가증·신고증 기재용. 매핑에서 `wasteCode` 차원으로 사용됨.")
    L.append("")
    bp4 = get_ref("시행규칙", "별표4_폐기물세부분류코드.json")
    L.append(f"_총 {len(bp4['별표내용'])}개 항목. 별도 파일 참조: `쓸자료/별표/시행규칙/별표4_폐기물세부분류코드.json`_")
    L.append("")
    # 대분류 헤더만 추출 (depth 0 number 항목)
    L.append("**대분류 (앞 2자리):**")
    L.append("")
    for it in bp4["별표내용"]:
        if it.get("depth") == 0 and it.get("type") == "number":
            mk = it.get("marker", "")
            tx = strip_revision_tags(it.get("text", ""))
            L.append(f"- `{mk}` {tx}")
    L.append("")

    L.append("## 6. 매핑 — `wasteClass` 코드")
    L.append("")
    L.append("상황코드_코드표.json 의 `wasteClass` 차원:")
    L.append("")
    L.append("| 코드 | 의미 | 설명 |")
    L.append("|---|---|---|")
    wc_codes = {
        "D": ("지정폐기물", "법 제2조 4호 / 시행령 별표1"),
        "GO": ("사업장일반-배출시설계", "「대기환경보전법」 등 배출시설 설치·운영 사업장에서 발생"),
        "GN": ("사업장일반-비배출시설계", "그 외 사업장에서 발생"),
        "L": ("생활폐기물", "사업장폐기물 외의 폐기물"),
    }
    for code, (name, desc) in wc_codes.items():
        L.append(f"| {code} | {name} | {desc} |")
    L.append("")
    L.append("> 의료폐기물(코드 D 내 wasteCode `10-xx`) 은 별도 wasteClass 가 아니라 D 안에서 wasteCode로 식별 — 별표7 등 시설·장비 요건 분기는 wasteCode 매칭으로 처리.")
    L.append("")

    return "\n".join(L)


# ─── 3. 처리시설 종류 ──────────────────────────────────────────

def build_facilities_md() -> str:
    L: list[str] = []
    L.append("# 폐기물처리시설 종류")
    L.append("")
    L.append("사용자가 입력하는 \"폐기물처리시설\" 종류와 매핑되는 법령상 시설 분류.")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 1. 법상 정의 (법 제2조 8호 / 9호)")
    L.append("")
    L.append("> **폐기물처리시설**: 폐기물의 중간처분시설, 최종처분시설 및 재활용시설로서 대통령령으로 정하는 시설. (법 제2조 8호)")
    L.append("> ")
    L.append("> **폐기물감량화시설**: 생산 공정에서 발생하는 폐기물의 양을 줄이고, 사업장 내 재활용을 통하여 폐기물 배출을 최소화하는 시설로서 대통령령으로 정하는 시설. (법 제2조 9호)")
    L.append("")

    L.append("## 2. 시행령 제5조 (폐기물처리시설)")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "5"))

    L.append("## 3. 시행령 별표3 — 폐기물 처리시설의 종류")
    L.append("")
    bp3 = get_ref("시행령", "별표3_처리시설종류.json")
    L += render_별표(bp3)

    L.append("## 4. 시행령 별표4 — 폐기물 감량화시설의 종류")
    L.append("")
    api_b4 = get_별표(API_DECREE, "0004", "00")
    if api_b4:
        L += render_별표(api_b4)

    L.append("## 5. 시행규칙 제4조 (폐기물 재활용시설)")
    L.append("")
    L += render_조문(get_조문(API_RULE, "4"))

    L.append("## 6. 매핑 — `facilityType` 코드 (상황코드_코드표)")
    L.append("")
    ft = CODE_TABLE.get("코드표", {}).get("facilityType", {})
    L.append(f"_근거: {ft.get('근거','-')}_  ")
    L.append(f"_복수 가능 (`+` 구분자)_")
    L.append("")
    if "그룹" in ft:
        for grp_name, grp_codes in ft.get("그룹", {}).items():
            L.append(f"### 그룹 — {grp_name}")
            L.append("")
            L.append("| 코드 | 시설명 |")
            L.append("|---|---|")
            for code in grp_codes:
                label = code_label(ft, code)
                L.append(f"| `{code}` | {label} |")
            L.append("")
    return "\n".join(L)


# ─── 4. 처리업 종류 ─────────────────────────────────────────────

def build_biz_md() -> str:
    L: list[str] = []
    L.append("# 폐기물처리업 종류")
    L.append("")
    L.append("사용자가 \"폐기물처리업\" 으로 등록·신고할 때의 업종 구분과 법적 근거.")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 1. 법 제25조 — 폐기물처리업 (허가)")
    L.append("")
    L += render_조문(get_조문(API_LAW, "25"))

    L.append("## 2. 법 제25조의2 — 전용용기 제조업 (등록)")
    L.append("")
    L += render_조문(get_조문(API_LAW, "25", "2"))

    L.append("## 3. 법 제29조 — 폐기물처리시설의 설치 (승인/신고)")
    L.append("")
    L += render_조문(get_조문(API_LAW, "29"))

    L.append("## 4. 법 제46조 — 폐기물처리 신고")
    L.append("")
    L += render_조문(get_조문(API_LAW, "46"))

    L.append("## 5. 매핑 — `category` × `bizType` (상황코드_코드표)")
    L.append("")
    ct = CODE_TABLE.get("코드표", {})
    cat = ct.get("category", {})
    L.append(f"### category — {cat.get('설명','-')}")
    L.append("")
    L.append("| 코드 | 의미 | 근거 |")
    L.append("|---|---|---|")
    # 코드표 스키마는 "값"(구버전 일부는 "레이블")에 코드→의미 매핑을 둔다.
    cat_values = cat.get("값") or cat.get("레이블") or {}
    for code, label in cat_values.items():
        근거 = cat.get("근거_상세", {}).get(code, "")
        L.append(f"| `{code}` | {label} | {근거} |")
    L.append("")
    if cat.get("비고"):
        L.append(f"> {cat['비고']}")
        L.append("")

    bt = ct.get("bizType", {})
    L.append(f"### bizType — {bt.get('설명','-')}")
    L.append("")
    L.append(f"_근거: {bt.get('근거','-')}_")
    L.append("")
    L.append("**카테고리별 사용 가능 코드:**")
    L.append("")
    L.append("| category | 사용가능 bizType |")
    L.append("|---|---|")
    for cat_code in ["W01", "W02", "W03", "W04", "W05"]:
        codes = bt.get(cat_code, [])
        if codes:
            labels = [f"`{c}`" for c in codes]
            L.append(f"| {cat_code} | {', '.join(labels)} |")
    L.append("")

    # bizType 레이블 — 구버전은 bt["레이블"], 현행 스키마는 카테고리별 dict 에 코드→명칭이 들어있다.
    bt_labels = dict(bt.get("레이블", {}))
    if not bt_labels:
        for cat_code in ["W01", "W02", "W03", "W04", "W05"]:
            codes = bt.get(cat_code, {})
            if isinstance(codes, dict):
                for code, name in codes.items():
                    bt_labels.setdefault(f"{cat_code} · {code}", name)
    if bt_labels:
        L.append("**bizType 레이블:**")
        L.append("")
        L.append("| 코드 | 명칭 |")
        L.append("|---|---|")
        for code, name in bt_labels.items():
            L.append(f"| `{code}` | {name} |")
        L.append("")

    확장 = bt.get("확장규칙")
    if 확장:
        L.append("**종합업 확장규칙:**")
        L.append("")
        L.append(f"_{확장.get('설명','')}_")
        L.append("")
        L.append("| 상위 코드 | 상속하는 코드 |")
        L.append("|---|---|")
        for code, children in 확장.get("상속", {}).items():
            L.append(f"| `{code}` | {', '.join(f'`{c}`' for c in children)} |")
        L.append("")
        if 확장.get("적용방향"):
            L.append(f"> {확장['적용방향']}")
        L.append("")

    return "\n".join(L)


# ─── 5. 처리방법 분류 ──────────────────────────────────────────

def build_methods_md() -> str:
    L: list[str] = []
    L.append("# 폐기물처리 방법 분류")
    L.append("")
    L.append("사용자가 입력하는 \"폐기물처리 방법\" / 공정도 와 매핑되는 법령상 행위 분류.")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 1. 법상 정의 (법 제2조)")
    L.append("")
    L.append("법 제2조 5의3호·6호·7호 발췌:")
    L.append("")
    art = get_조문(API_LAW, "2")
    호s = []
    if isinstance(art.get("항"), dict):
        호s = art["항"].get("호", []) or []
    elif isinstance(art.get("항"), list):
        for 항 in art["항"]:
            호s += 항.get("호", []) or []
    for 호 in 호s:
        n = 호.get("호번호", "")
        if n in ("5의3.", "6.", "7."):
            text = strip_revision_tags(호.get("호내용", ""))
            L.append(f"> {text}")
            for 목 in 호.get("목", []) or []:
                L.append(f">   {strip_revision_tags(목.get('목내용', ''))}")
            L.append(">")
    L.append("")

    L.append("## 2. 시행령 제7조 — 폐기물의 처리기준 등")
    L.append("")
    L += render_조문(get_조문(API_DECREE, "7"))

    L.append("## 3. 매핑 — `action` 코드 (상황코드_코드표)")
    L.append("")
    ac = CODE_TABLE.get("코드표", {}).get("action", {})
    L.append(f"_{ac.get('설명','-')}_")
    L.append("")
    L.append("| 코드 | 행위 | 정의/출처 |")
    L.append("|---|---|---|")
    action_defs = {
        "CT": ("수집·운반", "법 제2조 5의3호 \"처리\" 정의에 포함"),
        "ST": ("보관", "법 제2조 5의3호 \"처리\" 정의에 포함"),
        "MI": ("중간처분", "법 제2조 6호 \"처분\" — 소각·중화·파쇄·고형화 등"),
        "FI": ("최종처분", "법 제2조 6호 \"처분\" — 매립·해역배출"),
        "RCY": ("재활용", "법 제2조 7호 — 재사용·재생이용·에너지회수"),
    }
    ac_values = code_values(ac)
    for code, (name, src) in action_defs.items():
        if code in ac_values:
            L.append(f"| `{code}` | {ac_values[code] or name} | {src} |")
    L.append("")

    L.append("## 4. 매핑 — `rCode` (재활용 유형, 시행규칙 별표4의2)")
    L.append("")
    rc = CODE_TABLE.get("코드표", {}).get("rCode", {})
    L.append(f"_{rc.get('설명','-')}_  ")
    L.append(f"_근거: {rc.get('근거','-')}_  ")
    L.append(f"_표기: {rc.get('표기_주의','')}_")
    L.append("")
    L.append("**대분류 (상황코드 세그먼트용):**")
    L.append("")
    L.append("| 코드 | 의미 |")
    L.append("|---|---|")
    for code, label in code_values(rc).items():
        L.append(f"| `{code}` | {label} |")
    L.append("")
    if rc.get("세부"):
        L.append("**서브코드 (태그·자동판단용, 별표4의2 원형 표기):**")
        L.append("")
        L.append("| 서브코드 | 의미 |")
        L.append("|---|---|")
        for code, label in rc["세부"].items():
            L.append(f"| `{code}` | {label} |")
        L.append("")
    L.append("**세부 R 코드 — 시행규칙 별표4의2 원문 참조:**")
    L.append("")
    L.append("→ `쓸자료/별표/시행규칙/별표4의2_R코드정의.json`")
    L.append("")
    bp4_2 = get_ref("시행규칙", "별표4의2_R코드정의.json")
    L += render_별표(bp4_2)

    L.append("## 5. 매핑 — `physicalState` (폐기물 물리적 상태)")
    L.append("")
    ps = CODE_TABLE.get("코드표", {}).get("physicalState", {})
    L.append(f"_{ps.get('설명','-')}_  ")
    L.append(f"_근거: {ps.get('근거','-')}_  ")
    L.append(f"_비고: {ps.get('비고','')}_")
    L.append("")
    L.append("| 코드 | 상태 |")
    L.append("|---|---|")
    for code, label in code_values(ps).items():
        L.append(f"| `{code}` | {label} |")
    L.append("")
    return "\n".join(L)


# ─── definitions.json ──────────────────────────────────────────

def build_definitions_json() -> dict:
    """매핑용 통합 JSON. 사용자 입력 → 법령 매핑 시 참조."""
    art2 = get_조문(API_LAW, "2")
    호s = []
    if isinstance(art2.get("항"), dict):
        호s = art2["항"].get("호", []) or []
    elif isinstance(art2.get("항"), list):
        for 항 in art2["항"]:
            호s += 항.get("호", []) or []

    terms: dict = {}
    for 호 in 호s:
        text = strip_revision_tags(호.get("호내용", ""))
        m = re.match(r'^\s*[^\s]+\.\s*"([^"]+)"\s*이?란?\s*(.+)$', text)
        if m:
            term, defn = m.group(1), m.group(2)
            terms[term] = {"정의": defn, "출처": f"법 제2조 {호.get('호번호','')}"}

    bp1 = get_ref("시행령", "별표1_지정폐기물종류.json")
    bp2 = get_ref("시행령", "별표2_의료폐기물종류.json")
    bp3 = get_ref("시행령", "별표3_처리시설종류.json")
    bp4 = get_ref("시행규칙", "별표4_폐기물세부분류코드.json")
    bp4_2 = get_ref("시행규칙", "별표4의2_R코드정의.json")

    waste_code_대분류 = []
    for it in bp4.get("별표내용", []):
        if it.get("depth") == 0 and it.get("type") == "number":
            text = strip_revision_tags(it.get("text", ""))
            # "지정폐기물의 세부분류 및 분류번호01 ..." → "지정폐기물"
            m = re.match(r"^([가-힣]+(?:일반)?폐기물)", text)
            정리명 = m.group(1) if m else text.split(" ", 1)[0]
            waste_code_대분류.append({
                "코드": it.get("marker", "").rstrip("."),
                "명칭": 정리명,
                "원문": text[:120],
            })

    facility_groups: dict = {}
    current_l1 = None
    current_l2 = None
    for it in bp3.get("별표내용", []):
        d = it.get("depth")
        kind = it.get("type")
        marker = it.get("marker", "")
        text = strip_revision_tags(it.get("text", ""))
        if d == 0 and kind == "number":
            current_l1 = text
            facility_groups[current_l1] = {}
        elif d == 1 and kind == "korean-dot" and current_l1:
            current_l2 = text
            facility_groups[current_l1][current_l2] = []
        elif d == 2 and current_l1 and current_l2:
            facility_groups[current_l1][current_l2].append({"marker": marker, "name": text})
        elif d == 3 and current_l1 and current_l2:
            # 가)/나) 등 하위 — 마지막 항목에 children 추가
            lst = facility_groups[current_l1][current_l2]
            if lst:
                lst[-1].setdefault("children", []).append({"marker": marker, "name": text})

    return {
        "_meta": {
            "version": "2026-05-09",
            "기준_법령": {
                "법": {"id": "001771", "공포번호": "21065", "시행일": "20260326"},
                "시행령": {"id": "005353", "공포번호": "36217", "시행일": "20260326"},
                "시행규칙": {"id": "008567", "공포번호": "00033", "시행일": "20260326"},
            },
            "비고": "조문 원문은 국가법령정보 API verbatim. 별표는 참고자료/ 의 정리본 (API 일치 검증 완료).",
        },
        "법령용어": terms,
        "폐기물_종류": {
            "법상_분류": {
                "생활폐기물": "법 제2조 2호",
                "사업장폐기물": "법 제2조 3호",
                "지정폐기물": "법 제2조 4호 / 시행령 별표1",
                "의료폐기물": "법 제2조 5호 / 시행령 별표2",
            },
            "wasteClass_매핑": {
                "D": {"명칭": "지정폐기물", "출처": "법 제2조 4호"},
                "GO": {"명칭": "사업장일반-배출시설계", "출처": "사용자 입력 (대기·물환경·소음 배출시설 여부)"},
                "GN": {"명칭": "사업장일반-비배출시설계", "출처": "사용자 입력"},
                "L": {"명칭": "생활폐기물", "출처": "법 제2조 2호"},
            },
            "wasteCode_대분류": waste_code_대분류,
            "wasteCode_상세": "쓸자료/별표/시행규칙/별표4_폐기물세부분류코드.json",
            "지정폐기물_세부": "쓸자료/별표/시행령/별표1_지정폐기물종류.json",
            "의료폐기물_세부": "쓸자료/별표/시행령/별표2_의료폐기물종류.json",
        },
        "처리시설_종류": {
            "법상_분류": "법 제2조 8호 / 시행령 제5조 / 시행령 별표3",
            "분류_트리": facility_groups,
            "facilityType_매핑_근거": "상황코드_코드표.json 의 facilityType",
            "원본_별표": "쓸자료/별표/시행령/별표3_처리시설종류.json",
        },
        "처리업_종류": {
            "법상_업종_제25조5항": [
                {"코드": "1.", "명칭": "폐기물 수집·운반업", "비고": "수집→재활용/처분 장소로 운반하거나 수출"},
                {"코드": "2.", "명칭": "폐기물 중간처분업", "비고": "소각·기계적·화학적·생물학적 처분"},
                {"코드": "3.", "명칭": "폐기물 최종처분업", "비고": "매립 등 (해역 배출 제외)"},
                {"코드": "4.", "명칭": "폐기물 종합처분업", "비고": "중간 + 최종 처분"},
                {"코드": "5.", "명칭": "폐기물 중간재활용업", "비고": "중간가공 폐기물 제조"},
                {"코드": "6.", "명칭": "폐기물 최종재활용업", "비고": "중간가공 폐기물을 재활용"},
                {"코드": "7.", "명칭": "폐기물 종합재활용업", "비고": "중간 + 최종 재활용"},
            ],
            "category_매핑": CODE_TABLE.get("코드표", {}).get("category", {}),
            "bizType_매핑": CODE_TABLE.get("코드표", {}).get("bizType", {}),
        },
        "처리방법_분류": {
            "법상_정의": {
                "처리": "법 제2조 5의3호 — 수집·운반·보관·재활용·처분",
                "처분": "법 제2조 6호 — 중간처분(소각·중화·파쇄·고형화 등) + 최종처분(매립·해역배출)",
                "재활용": "법 제2조 7호 — 재사용·재생이용 + 에너지회수",
            },
            "action_매핑": {
                "CT": "수집·운반",
                "ST": "보관",
                "MI": "중간처분",
                "FI": "최종처분",
                "RCY": "재활용",
            },
            "rCode_매핑": CODE_TABLE.get("코드표", {}).get("rCode", {}),
            "rCode_세부": "쓸자료/별표/시행규칙/별표4의2_R코드정의.json",
            "physicalState_매핑": CODE_TABLE.get("코드표", {}).get("physicalState", {}),
        },
        "_상황코드_코드표_원본": "data/waste/law_reference/상황코드_코드표.json",
    }


# ─── README ───────────────────────────────────────────────────

README_BODY = """# 폐기물 정의·분류 정리

**용도**: 폐기물처리업 생성 시 사용자 입력(폐기물 종류·시설·방법·공정도)을 법령 조문/별표에 정확히 매핑하기 위한 1차 참조 자료.

## 구성

| 파일 | 내용 |
|---|---|
| [`01_법령용어정의.md`](01_법령용어정의.md) | 법 제2조 등 정의 조문 verbatim |
| [`02_폐기물종류_분류체계.md`](02_폐기물종류_분류체계.md) | 폐기물 1차 분류 + 지정/의료/세부분류 코드 + `wasteClass` 매핑 |
| [`03_처리시설_종류.md`](03_처리시설_종류.md) | 시행령 별표3 시설 분류 + `facilityType` 매핑 |
| [`04_처리업_종류.md`](04_처리업_종류.md) | 법 제25/29/46조 + `category`·`bizType` 매핑 |
| [`05_처리방법_분류.md`](05_처리방법_분류.md) | 법 제2조 처리/처분/재활용 정의 + `action`·`rCode` 매핑 |
| [`../쓸자료/definitions.json`](../쓸자료/definitions.json) | 위 내용 통합 매핑용 JSON |

## 원문 출처

- **법령 조문**: 국가법령정보 OPEN API (`tools/law_api.py` 사용) — 폐기물관리법 ID 001771 / 시행령 005353 / 시행규칙 008567 / 시행일 2026-03-26.
- **별표**: `../쓸자료/별표/{시행령,시행규칙}/별표*.json` — API 와 일치 검증 완료 (`../검토자료/_API검토_참고자료.md`).
- **매핑 코드 체계**: `../쓸자료/상황코드_코드표.json`.

## 매핑 흐름 (의도)

```
사용자 입력
  ├─ 폐기물 종류 ─────→ wasteClass + wasteCode
  ├─ 처리시설 종류 ───→ facilityType
  ├─ 처리업 (허가/신고) → category + bizType
  ├─ 처리 행위 ───────→ action
  └─ 재활용 유형 ─────→ rCode
                ↓
       태그 차원별 교집합 매칭
                ↓
   law_active/ 의 조문/별표 항목 필터링
```

## 갱신

법령 개정으로 본 자료를 최신화할 때:
1. `python -m tools.law_api --oc 123 fetch --id 001771` 등으로 API 재조회 → `d:/tmp/law_*.json`
2. `검토자료/도구/compare_chamgo.py` 실행 → `검토자료/_API검토_참고자료.md` 검토
3. 차이가 있으면 `쓸자료/별표/` 의 원본 JSON 수정 후, `검토자료/도구/build_definitions.py` 재실행

본 폴더는 빌더로 자동 생성되므로 직접 편집 금지. 정의/분류 수정은 출처(`쓸자료/별표/`, `쓸자료/상황코드_코드표.json`) 에서.
"""


# ─── main ─────────────────────────────────────────────────────

def main() -> int:
    OUT_MD.mkdir(exist_ok=True)
    OUT_DATA.mkdir(exist_ok=True)
    (OUT_MD / "_README.md").write_text(README_BODY, encoding="utf-8")
    (OUT_MD / "01_법령용어정의.md").write_text(build_terms_md(), encoding="utf-8")
    (OUT_MD / "02_폐기물종류_분류체계.md").write_text(build_waste_types_md(), encoding="utf-8")
    (OUT_MD / "03_처리시설_종류.md").write_text(build_facilities_md(), encoding="utf-8")
    (OUT_MD / "04_처리업_종류.md").write_text(build_biz_md(), encoding="utf-8")
    (OUT_MD / "05_처리방법_분류.md").write_text(build_methods_md(), encoding="utf-8")
    defs = build_definitions_json()
    (OUT_DATA / "definitions.json").write_text(
        json.dumps(defs, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"MD 생성: {OUT_MD}")
    for p in sorted(OUT_MD.glob("*.md")):
        print(f"  {p.name}  ({p.stat().st_size:,} bytes)")
    print(f"JSON 생성: {OUT_DATA / 'definitions.json'}  ({(OUT_DATA / 'definitions.json').stat().st_size:,} bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
