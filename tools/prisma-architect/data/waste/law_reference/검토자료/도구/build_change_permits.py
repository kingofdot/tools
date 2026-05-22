"""폐기물처리업의 변경허가(시행규칙 제29조) + 변경신고(제33조) 데이터화.

API 에서 직접 fetch (정확성 보장) → {조항, 문구, ...} 평탄화 list → 쓸자료/폐기물 변경사항.json 출력.

실행: python data/waste/law_reference/검토자료/도구/build_change_permits.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import Any, Optional

ROOT = Path("d:/seodaeri/seodaeri-lambda")
sys.path.insert(0, str(ROOT))
from tools.law_api import fetch_law  # noqa: E402

OUT = ROOT / "data/waste/law_reference/쓸자료/폐기물_변경사항.json"
BYEOLPYO_DIR = ROOT / "data/waste/law_reference/쓸자료/별표/시행규칙"
OC = "123"
RULE_ID = "008567"
LAW_ID = "001771"


def strip_revision(s: str) -> str:
    s = re.sub(r"\s*<[^>]+>\s*", " ", s or "")
    s = re.sub(r"\s*\[[^\]]+\]\s*", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_marker_prefix(s: str, marker: str) -> str:
    if not s:
        return ""
    s = strip_revision(s)
    return re.sub(r"^" + re.escape(marker) + r"\s*", "", s).strip()


def get_조문(api_law_root: dict, num: str, gaji: str = "") -> Optional[dict]:
    units = api_law_root["법령"]["조문"]["조문단위"]
    if isinstance(units, dict):
        units = [units]
    for u in units:
        if u.get("조문여부") != "조문":
            continue
        if str(u.get("조문번호", "")) == num and str(u.get("조문가지번호", "")) == gaji:
            return u
    return None


def split_condition(text: str) -> tuple[str, Optional[str]]:
    """본문 끝의 단서절('...만 해당한다)' 등) 을 condition 으로 분리."""
    m = re.search(
        r"\(([^()]*?(?:만 해당[^)]*|만 한[^)]*|에 해당[^)]*|를 제외[^)]*|는 제외[^)]*))\)\s*$",
        text,
    )
    if m:
        return text[: m.start()].strip(), m.group(1).strip()
    return text, None


# "다만, 다음 1)부터 4)까지의 경우만 해당한다." / "다만, 다음 1) 및 2)의 경우만 해당한다." 패턴
_DANSEO_RE = re.compile(r"\s*다만,\s*다음\s+[^.]+?의\s*경우[^.]*해당한다\.\s*")


def split_subcases(text: str) -> tuple[str, Optional[str], list[dict]]:
    """'본문. 다만, 다음 1)부터 N)까지의 경우만 해당한다. 1) ... 2) ... N) ...' 분해.

    Returns (main_text, 단서, [{번호, 내용}]).
    매치 실패 시 (text, None, []).
    인라인 1)/2)/3)/4) 마커는 외곽 (앞에 공백 또는 문자열 시작) 만 대상으로 하여
    '별표 9 제1호나목2)가)의' '(1)ㆍ(2)' '13)' 등 본문 안의 토큰은 split 안 됨.
    """
    m = _DANSEO_RE.search(text)
    if not m:
        return text, None, []
    main = text[: m.start()].strip().rstrip(".").strip()
    dan_seo = m.group(0).strip()
    rest = text[m.end():].strip()

    # 순차적으로 1), 2), 3), ... 매치
    subcases: list[dict] = []
    n = 1
    pos = 0
    while True:
        pat = re.compile(rf"(?:^|(?<=\s)){n}\)\s+")
        mm = pat.search(rest, pos)
        if not mm:
            break
        if subcases:
            subcases[-1]["_end"] = mm.start()
        subcases.append({"번호": f"{n})", "_start": mm.end()})
        pos = mm.end()
        n += 1
    if subcases:
        subcases[-1]["_end"] = len(rest)
        for item in subcases:
            item["내용"] = rest[item["_start"]: item["_end"]].strip()
            del item["_start"]
            del item["_end"]
    elif rest:
        # 단서는 있는데 1)/2) 분해가 실패한 경우 — rest 를 미분해 텍스트로 보존
        subcases = [{"번호": "(미분해)", "내용": rest}]
    return main, dan_seo, subcases


# ─── 처리업그룹 → bizType 매핑 (상황코드_코드표 W01) ────────────
# 종합처분업은 코드표 미정의 — null 로 두고 추후 코드 추가 시 연결.

GROUP_MAP = {
    "1.": {
        "처리업그룹": "폐기물 수집·운반업",
        "처리업종_상세": ["폐기물수집운반업"],
        "bizType_W01": ["TR"],
    },
    "2.": {
        "처리업그룹": "폐기물 중간처분업, 폐기물 최종처분업 및 폐기물 종합처분업",
        "처리업종_상세": ["폐기물중간처분업", "폐기물최종처분업", "폐기물종합처분업"],
        "bizType_W01": ["ID", "FD", None],  # 종합처분업 코드 미정의
    },
    "3.": {
        "처리업그룹": "폐기물 중간재활용업, 폐기물 최종재활용업 및 폐기물 종합재활용업",
        "처리업종_상세": ["폐기물중간재활용업", "폐기물최종재활용업", "폐기물종합재활용업"],
        "bizType_W01": ["IR", "FR", "CR"],
    },
}

NOTI_APPLY = {
    "1.": {"적용업종": "전체", "신고시점": "사후 30일 이내"},
    "2.": {"적용업종": "전체", "신고시점": "사후 30일 이내",
           "비고": "법 제33조 권리·의무 승계 케이스는 제외"},
    "3.": {"적용업종": "전체", "신고시점": "사전"},
    "4.": {"적용업종": "전체", "신고시점": "사전"},
    "5.": {"적용업종": "재활용업", "신고시점": "사전",
           "비고": "별표 4의2 제4호 재활용 유형(매체접촉형)에 한정"},
    "6.": {"적용업종": "재활용업", "신고시점": "사전",
           "비고": "재활용 세부 유형 미변경 + 폐기물 추가만"},
    "7.": {"적용업종": "재활용업", "신고시점": "사전",
           "비고": "재활용 시설/소재지 미변경"},
    "8.": {"적용업종": "처분업(매립)", "신고시점": "사전",
           "비고": "매립시설만 해당"},
    "9.": {"적용업종": "전체", "신고시점": "사후 30일 이내",
           "비고": "별표 7 기술능력 변경"},
}


def build_변경허가_사유(unit29: dict) -> list[dict]:
    """제29조①의 호·목 을 평탄화."""
    out: list[dict] = []
    항s = unit29.get("항", []) or []
    if isinstance(항s, dict):
        항s = [항s]
    항1 = next((h for h in 항s if h.get("항번호") == "①"), None)
    if not 항1:
        return out
    for 호 in 항1.get("호", []) or []:
        호번호 = 호.get("호번호", "")
        호내용 = strip_marker_prefix(호.get("호내용", ""), 호번호)
        if 호내용.startswith("삭제") or "삭제" in 호.get("호내용", ""):
            continue
        grp = GROUP_MAP.get(호번호, {"처리업그룹": 호내용, "bizType_W01": []})
        for 목 in 호.get("목", []) or []:
            목번호 = 목.get("목번호", "")
            text = strip_marker_prefix(목.get("목내용", ""), 목번호)
            # 인라인 sub-case 분해 먼저 → 단순 단서 분리
            text, dan_seo, subcases = split_subcases(text)
            text, cond = split_condition(text)
            entry = {
                "조항": f"시행규칙 제29조①{호번호}{목번호}",
                "구분": "변경허가",
                "처리업그룹": grp["처리업그룹"],
                "처리업종_상세": grp.get("처리업종_상세", []),
                "bizType_W01": grp.get("bizType_W01", []),
                "문구": text,
            }
            if cond:
                entry["조건"] = cond
            if dan_seo:
                entry["단서"] = dan_seo
            if subcases:
                entry["세부사유"] = subcases
            out.append(entry)
    return out


def build_변경신고_사항(unit33: dict) -> list[dict]:
    out: list[dict] = []
    항s = unit33.get("항", []) or []
    if isinstance(항s, dict):
        항s = [항s]
    항1 = next((h for h in 항s if h.get("항번호") == "①"), None)
    if not 항1:
        return out
    for 호 in 항1.get("호", []) or []:
        호번호 = 호.get("호번호", "")
        text = strip_marker_prefix(호.get("호내용", ""), 호번호)
        if text.startswith("삭제"):
            continue
        text, cond = split_condition(text)
        info = NOTI_APPLY.get(호번호, {"적용업종": "전체", "신고시점": "사전"})
        entry = {
            "조항": f"시행규칙 제33조①{호번호}",
            "구분": "변경신고",
            "적용업종": info["적용업종"],
            "신고시점": info["신고시점"],
            "문구": text,
        }
        if cond:
            entry["조건"] = cond
        if info.get("비고"):
            entry["비고"] = info["비고"]
        out.append(entry)
    return out


def build_제출서류_변경허가(unit29: dict) -> list[dict]:
    """제29조② 호별 제출서류."""
    out: list[dict] = []
    항s = unit29.get("항", []) or []
    if isinstance(항s, dict):
        항s = [항s]
    항2 = next((h for h in 항s if h.get("항번호") == "②"), None)
    if not 항2:
        return out
    out.append({
        "조항": "시행규칙 제29조②",
        "구분": "변경허가_제출서류",
        "문구": "별지 제18호서식의 변경허가신청서 (시·도지사나 지방환경관서의 장에게 제출)",
        "필수": True,
    })
    for 호 in 항2.get("호", []) or []:
        호번호 = 호.get("호번호", "")
        text = strip_marker_prefix(호.get("호내용", ""), 호번호)
        if text.startswith("삭제"):
            continue
        text, cond = split_condition(text)
        entry = {
            "조항": f"시행규칙 제29조②{호번호}",
            "구분": "변경허가_제출서류",
            "문구": text,
        }
        if cond:
            entry["조건"] = cond
        out.append(entry)
    return out


def build_제출서류_변경신고() -> list[dict]:
    """제33조② 본문 기반 (단일 문장이라 수동 분해)."""
    return [
        {
            "조항": "시행규칙 제33조②",
            "구분": "변경신고_제출서류",
            "문구": "별지 제21호서식의 폐기물처리업 변경신고서",
            "필수": True,
        },
        {
            "조항": "시행규칙 제33조②",
            "구분": "변경신고_제출서류",
            "문구": "허가증",
            "필수": True,
        },
        {
            "조항": "시행규칙 제33조②",
            "구분": "변경신고_제출서류",
            "문구": "변경내용을 확인할 수 있는 서류",
            "필수": True,
            "조건": "운반차량을 감차하는 경우 제외",
        },
    ]


# ─── reference resolver ────────────────────────────────────────

# 캐시 (main 에서 채움)
_RULE_CHO_CACHE: dict[tuple[str, str], dict] = {}   # (조번호, 가지) → 시행규칙 조문
_RULE_BP_CACHE: dict[tuple[str, str], dict] = {}    # (별표번호, 가지) → 시행규칙 별표
_LAW_CHO_CACHE: dict[tuple[str, str], dict] = {}    # (조번호, 가지) → 법 조문


def _all_chomun(api_root: dict) -> list[dict]:
    units = api_root["법령"]["조문"]["조문단위"]
    if isinstance(units, dict):
        units = [units]
    return [u for u in units if u.get("조문여부") == "조문"]


def _find_ho(unit: dict, hang_num: str, ho_num: str) -> Optional[str]:
    """조문 unit 에서 항M 의 호K 본문 찾기."""
    항s = unit.get("항", [])
    if isinstance(항s, dict):
        항s = [항s]
    # 항번호: '①' '②' '③' ...
    circled = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
    target_hang = circled[int(hang_num) - 1] if hang_num.isdigit() and int(hang_num) <= 20 else None
    항 = next((h for h in 항s if h.get("항번호") == target_hang), 항s[0] if 항s else None)
    if not 항:
        return None
    호s = 항.get("호", []) or []
    target_ho = f"{ho_num}."
    for 호 in 호s:
        if 호.get("호번호") == target_ho:
            return strip_marker_prefix(호.get("호내용", ""), target_ho)
    return None


def _find_byeolpyo_ho(bp: dict, ho_num: str) -> Optional[str]:
    """별표 안에서 'M.' 마커의 본문 찾기 (depth 0 number)."""
    target = f"{ho_num}."
    for it in bp.get("별표내용", []) or []:
        if it.get("depth") == 0 and it.get("type") == "number" and it.get("marker") == target:
            return it.get("text", "")
    return None


def _parse_byeolpyo_path(deep: str) -> list[tuple[str, int]]:
    """'제1호나목2)가)의 (1)ㆍ(2)' 같은 deep path → [(marker, depth), ...].

    depth 매핑:
      제N호 → depth 0 (marker = "N.")
      X목   → depth 1 (marker = "X.")
      N)    → depth 2 (marker = "N)")
      X)    → depth 3 (marker = "X)")
      (N)   → depth 4 (marker = "(N)")
      (X)   → depth 5 (marker = "(X)")
    """
    tokens: list[tuple[str, int]] = []
    patterns = [
        (re.compile(r"제(\d+)호"),       lambda m: (f"{m.group(1)}.",   0)),
        (re.compile(r"([가-힣])목"),     lambda m: (f"{m.group(1)}.",   1)),
        (re.compile(r"\((\d+)\)"),       lambda m: (f"({m.group(1)})", 4)),
        (re.compile(r"\(([가-힣])\)"),   lambda m: (f"({m.group(1)})", 5)),
        (re.compile(r"(\d+)\)"),         lambda m: (f"{m.group(1)})",   2)),
        (re.compile(r"([가-힣])\)"),     lambda m: (f"{m.group(1)})",   3)),
    ]
    pos = 0
    while pos < len(deep):
        if deep[pos] in " 의ㆍ,":
            pos += 1
            continue
        matched = False
        for pat, mk_fn in patterns:
            m = pat.match(deep, pos)
            if m:
                tokens.append(mk_fn(m))
                pos = m.end()
                matched = True
                break
        if not matched:
            pos += 1  # 알 수 없는 글자 skip
    return tokens


def _navigate_byeolpyo_path(items: list[dict], deep: str) -> list[dict]:
    """deep path 를 따라 items 배열에서 final marker(들)의 item 반환.

    마지막 depth 의 ㆍ로 구분된 여러 marker (예: "(1)ㆍ(2)") 는 모두 수집.
    Sibling 범위 좁힐 때 chain 상위 marker 와 일치하는 item 은 parser 부작용으로 인한
    fragment 로 보고 skip — 본문 텍스트가 잘못 marker 로 인식된 케이스 방어.
    """
    tokens = _parse_byeolpyo_path(deep)
    if not tokens:
        return []
    last_depth = tokens[-1][1]
    i = len(tokens) - 1
    while i > 0 and tokens[i - 1][1] == last_depth:
        i -= 1
    chain_pre = tokens[:i]
    leaves = tokens[i:]
    leaf_markers = {lm for lm, _ in leaves}

    # chain 상의 (depth, marker) 집합 — sibling 범위 결정 시 fragment 판정용
    chain_set: set[tuple[int, str]] = set()

    parent_start, parent_end = 0, len(items)
    for marker, depth in chain_pre:
        # 현재 step 의 marker 도 chain set 에 추가 (자기 자신과 같은 marker 가 다시 나오면 fragment)
        chain_set.add((depth, marker))
        found_idx = None
        for j in range(parent_start, parent_end):
            it = items[j]
            if isinstance(it, dict) and it.get("depth") == depth and it.get("marker") == marker:
                found_idx = j
                break
        if found_idx is None:
            return []
        # 다음 step 의 범위: found_idx+1 ~ 다음 진짜 sibling
        # (chain 의 어떤 step marker 와도 일치하면 데이터 fragment → skip)
        next_end = parent_end
        for k in range(found_idx + 1, parent_end):
            it = items[k]
            if isinstance(it, dict):
                kd = it.get("depth")
                km = it.get("marker", "")
                if kd is not None and kd <= depth:
                    if (kd, km) in chain_set:
                        continue  # fragment 의심 — skip
                    next_end = k
                    break
        parent_start, parent_end = found_idx + 1, next_end

    # leaf 수집
    found: list[dict] = []
    for j in range(parent_start, parent_end):
        it = items[j]
        if isinstance(it, dict) and it.get("depth") == last_depth and it.get("marker") in leaf_markers:
            found.append(it)
    return found


# 별표 references 검출 — "별표 N[의X]" + 후속 deep path
_DEEP_PATH_BOUNDARY = re.compile(
    r"(?:에\s따른|에\s따라|에\s해당|를\s제외|는\s제외|만\s해당|로\s한정|로서|와\s같|와\s같다|까지의|까지|와|및\s|\s또는|로\s|만$|\.|,)"
)


def _tokens_to_path_str(tokens: list[tuple[str, int]]) -> str:
    """tokens → deep path 문자열 재구성 (sibling 합성용).

    depth 0: "N."  → "제N호"
    depth 1: "X."  → "X목"
    depth 2: "N)"  → "N)"
    depth 3: "X)"  → "X)"
    depth 4: "(N)" → "(N)"
    depth 5: "(X)" → "(X)"
    """
    parts: list[str] = []
    for marker, depth in tokens:
        if depth == 0:
            parts.append(f"제{marker.rstrip('.')}호")
        elif depth == 1:
            parts.append(f"{marker.rstrip('.')}목")
        else:
            parts.append(marker)
    return "".join(parts)


def _detect_sibling_paths(text: str, start: int, base_tokens: list[tuple[str, int]]) -> list[str]:
    """첫 별표 ref 캡처 직후 text[start:] 에서 sibling deep path 들 탐지.

    Pattern A — 콤마 sibling (depth 3 leaf):
      ", X)의 (N)[ㆍ(N)...]"   ex) "...가)의 (1)ㆍ(2), 나)의 (1)ㆍ(2), 다)의 (2)ㆍ(3)"
      parent = base_tokens 중 depth<3 (제N호+X목+N))
    Pattern B — "또는 X목" sibling (depth 1 leaf):
      " 또는 X목 N)[ㆍN)...]"  ex) "마목13)ㆍ14) 또는 사목 11)ㆍ12)"
      parent = base_tokens 중 depth<1 (제N호만)
    """
    results: list[str] = []
    pos = start

    def parent_at(target_depth: int) -> list[tuple[str, int]]:
        return [(m, d) for m, d in base_tokens if d < target_depth]

    while pos < len(text):
        seg = text[pos:]

        # Pattern A — 콤마 + X)의 (N) [ㆍ(N)...]
        ma = re.match(r"\s*,\s*([가-힣])\)의\s*\((\d+)\)((?:ㆍ\(\d+\))*)", seg)
        if ma:
            parent = parent_at(3)
            if parent:
                deep = f"{_tokens_to_path_str(parent)}{ma.group(1)})의 ({ma.group(2)}){ma.group(3)}"
                results.append(deep)
            pos += ma.end()
            continue

        # Pattern B — 또는 + X목 + N) [ㆍN)...]
        mb = re.match(r"\s*또는\s+([가-힣])목\s*(\d+\))((?:ㆍ\d+\))*)", seg)
        if mb:
            parent = parent_at(1)
            if parent:
                deep = f"{_tokens_to_path_str(parent)}{mb.group(1)}목{mb.group(2)}{mb.group(3)}"
                results.append(deep)
            pos += mb.end()
            continue

        break
    return results


def _capture_byeolpyo_ref(text: str, start: int) -> tuple[str, str]:
    """text[start:] 가 '별표 N[의X]' 로 시작한다고 가정. 전체 표시 + deep_path 반환."""
    # 별표 N의X 부분
    head_m = re.match(r"별표\s*\d+(?:의\d+)?", text[start:])
    if not head_m:
        return "", ""
    head = head_m.group(0)
    after = start + head_m.end()
    # 후속 deep path: " 제M호[..]" 또는 그 이상 — 경계 키워드 직전까지
    if not text[after:].startswith(" "):
        return head, ""
    # 후속 텍스트에서 첫 boundary 찾기
    rest = text[after:]
    # "  제M호..." 가 안 따라오면 head 만 반환
    if not re.match(r"\s+제\d+호", rest):
        return head, ""
    # 경계까지 잘라내기
    boundary = _DEEP_PATH_BOUNDARY.search(rest, 1)  # pos 1 부터 (앞 공백 제외)
    if boundary:
        deep = rest[:boundary.start()].strip()
    else:
        deep = rest.strip()
    return f"{head} {deep}", deep


def find_references(text: str) -> list[dict]:
    """텍스트에서 법령 references 추출 (중복 제거)."""
    refs: list[dict] = []
    seen: set[str] = set()
    masked = list(text)

    # 1. 법 references (가장 명확함, 우선 처리)
    for m in re.finditer(r"법\s+제(\d+)조(?:의(\d+))?(?:제(\d+)항(?:제(\d+)호)?)?", text):
        if m.group(0) in seen:
            continue
        seen.add(m.group(0))
        refs.append({
            "표시": m.group(0),
            "유형": "폐기물관리법",
            "조": m.group(1),
            "조가지": m.group(2) or "",
            "항": m.group(3) or "",
            "호": m.group(4) or "",
        })
        # 마스킹
        for i in range(m.start(), m.end()):
            masked[i] = " "

    # 2. 별표 references
    for m in re.finditer(r"별표\s*\d+(?:의\d+)?", "".join(masked)):
        # 캡처는 원본 text 에서 (마스킹은 중복 매치 방지용)
        full, deep = _capture_byeolpyo_ref(text, m.start())
        if not full or full in seen:
            continue
        seen.add(full)
        nm = re.match(r"별표\s*(\d+)(?:의(\d+))?", full)
        bp_num = nm.group(1) if nm else ""
        bp_gaji = nm.group(2) or "" if nm else ""
        head = f"별표 {bp_num}" + (f"의{bp_gaji}" if bp_gaji else "")
        ref = {
            "표시": full,
            "유형": "시행규칙_별표",
            "별표번호": bp_num,
            "별표가지번호": bp_gaji,
        }
        if deep:
            ref["내부경로"] = deep
        refs.append(ref)

        # sibling 추적 — capture 끝난 직후부터
        if deep:
            base_tokens = _parse_byeolpyo_path(deep)
            for sd in _detect_sibling_paths(text, m.start() + len(full), base_tokens):
                sib_full = f"{head} {sd}"
                if sib_full in seen:
                    continue
                seen.add(sib_full)
                refs.append({
                    "표시": sib_full,
                    "유형": "시행규칙_별표",
                    "별표번호": bp_num,
                    "별표가지번호": bp_gaji,
                    "내부경로": sd,
                })

        # 마스킹
        for i in range(m.start(), m.start() + len(full)):
            if i < len(masked):
                masked[i] = " "

    # 3. 시행규칙 자체 (법/별표 마스킹 후 남은 "제N조제M항제K호")
    masked_text = "".join(masked)
    for m in re.finditer(r"제(\d+)조(?:의(\d+))?제(\d+)항제(\d+)호", masked_text):
        key = m.group(0)
        if key in seen:
            continue
        seen.add(key)
        refs.append({
            "표시": key,
            "유형": "시행규칙_조문",
            "조": m.group(1),
            "조가지": m.group(2) or "",
            "항": m.group(3),
            "호": m.group(4),
        })

    return refs


def resolve_reference(ref: dict) -> dict:
    """ref 에 원문/제목 등을 채워서 반환."""
    out = dict(ref)
    유형 = ref.get("유형")

    if 유형 == "시행규칙_조문":
        unit = _RULE_CHO_CACHE.get((ref["조"], ref.get("조가지", "")))
        if unit:
            out["조문제목"] = unit.get("조문제목", "")
            out["출처"] = f"시행규칙 제{ref['조']}{'의'+ref['조가지'] if ref['조가지'] else ''}조"
            ho = _find_ho(unit, ref["항"], ref["호"])
            if ho:
                out["원문"] = ho
        else:
            out["주의"] = "조문 캐시에서 매칭 실패"

    elif 유형 == "폐기물관리법":
        unit = _LAW_CHO_CACHE.get((ref["조"], ref.get("조가지", "")))
        if unit:
            out["조문제목"] = unit.get("조문제목", "")
            out["출처"] = f"폐기물관리법 제{ref['조']}{'의'+ref['조가지'] if ref['조가지'] else ''}조"
            if ref.get("항") and ref.get("호"):
                ho = _find_ho(unit, ref["항"], ref["호"])
                if ho:
                    out["원문"] = ho
            elif ref.get("항"):
                # 항 본문만
                항s = unit.get("항", [])
                if isinstance(항s, dict):
                    항s = [항s]
                circled = "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
                target = circled[int(ref["항"]) - 1] if ref["항"].isdigit() else None
                항 = next((h for h in 항s if h.get("항번호") == target), None)
                if 항:
                    out["원문"] = strip_revision(항.get("항내용", ""))
            else:
                # 조문 전체 본문 요약
                out["원문"] = strip_marker_prefix(unit.get("조문내용", ""), "")
        else:
            out["주의"] = "법 조문 캐시에서 매칭 실패"

    elif 유형 == "시행규칙_별표":
        bp_num = ref["별표번호"].zfill(4)
        bp_gaji = (ref.get("별표가지번호") or "").zfill(2) if ref.get("별표가지번호") else "00"
        bp = _RULE_BP_CACHE.get((bp_num, bp_gaji))
        if bp:
            out["별표제목"] = bp.get("별표제목", "")
            deep = ref.get("내부경로", "")
            if deep:
                # 호 단위 본문 (제M호) 우선 추출
                ho_match = re.match(r"제(\d+)호", deep)
                if ho_match:
                    ho_text = _find_byeolpyo_ho(bp, ho_match.group(1))
                    if ho_text:
                        out["호본문"] = ho_text
                # 깊은 path (목/번호/(N) 등) 까지 navigate
                items = bp.get("별표내용", []) or []
                deep_items = _navigate_byeolpyo_path(items, deep)
                if deep_items:
                    out["깊은_본문"] = [
                        {
                            "marker": d.get("marker"),
                            "depth": d.get("depth"),
                            "text": d.get("text"),
                        }
                        for d in deep_items
                    ]
        else:
            out["주의"] = "별표 캐시에서 매칭 실패"

    # 빈 값 필드 제거 ("", None) — JSON 가독성 + 사이즈
    return {k: v for k, v in out.items() if v not in ("", None)}


def attach_references(entries: list[dict]) -> None:
    """각 entry 의 텍스트 필드에서 references 추출 → '참조' 필드 부여.

    스캔 대상: 문구·조건·단서 (원문 텍스트). 비고 는 운영해석이라 제외 (중복 방지).
    """
    for e in entries:
        scan_texts = []
        for k in ("문구", "조건", "단서"):
            if e.get(k):
                scan_texts.append(e[k])
        # 세부사유 안 내용 별도 스캔
        for sub in e.get("세부사유", []) or []:
            sub_refs_raw = find_references(sub.get("내용", ""))
            if sub_refs_raw:
                sub["참조"] = [resolve_reference(r) for r in sub_refs_raw]
        combined = " ".join(scan_texts)
        refs_raw = find_references(combined)
        if refs_raw:
            e["참조"] = [resolve_reference(r) for r in refs_raw]


def main() -> int:
    print(f"API fetch: 시행규칙 제29조, 제33조 (ID={RULE_ID})")
    full29 = fetch_law(OC, law_id=RULE_ID, jo="002900")
    full33 = fetch_law(OC, law_id=RULE_ID, jo="003300")
    unit29 = get_조문(full29, "29")
    unit33 = get_조문(full33, "33")
    if not unit29 or not unit33:
        print("ERROR: 조문 매칭 실패", file=sys.stderr)
        return 1

    # ─── reference 캐시 채우기 ───
    print("API fetch: 시행규칙 자체 references (제33 자기참조)")
    _RULE_CHO_CACHE[("33", "")] = unit33

    print("API fetch: 폐기물관리법 (법 references)")
    full_law = fetch_law(OC, law_id=LAW_ID)
    for u in _all_chomun(full_law):
        _LAW_CHO_CACHE[(str(u.get("조문번호", "")), str(u.get("조문가지번호", "")))] = u

    print("로컬 + API fetch: 시행규칙 별표")
    # 로컬 (쓸자료/별표/시행규칙) 먼저 — 캐시 가능
    for f in BYEOLPYO_DIR.glob("*.json"):
        bp = json.loads(f.read_text(encoding="utf-8"))
        key = (bp.get("별표번호", ""), bp.get("별표가지번호", "00"))
        _RULE_BP_CACHE[key] = bp
    # 별표 7, 9 는 쓸자료에 없음 (검토사항/시행규칙 에 WIP) → API fetch
    for bp_num, bp_gaji in [("0007", "00"), ("0009", "00")]:
        if (bp_num, bp_gaji) in _RULE_BP_CACHE:
            continue
        full_bp = fetch_law(OC, law_id=RULE_ID)
        for u in full_bp["법령"].get("별표", {}).get("별표단위", []):
            k = (u.get("별표번호", ""), u.get("별표가지번호", "00"))
            if k not in _RULE_BP_CACHE:
                _RULE_BP_CACHE[k] = u
        break  # 한 번 fetch 로 모든 별표 캐시됨

    변경허가_사유 = build_변경허가_사유(unit29)
    변경신고_사항 = build_변경신고_사항(unit33)
    제출_허가 = build_제출서류_변경허가(unit29)
    제출_신고 = build_제출서류_변경신고()

    # ─── 각 entry 에 참조 attach ───
    print("references 해결 중...")
    attach_references(변경허가_사유)
    attach_references(변경신고_사항)
    attach_references(제출_허가)
    attach_references(제출_신고)

    result = {
        "_meta": {
            "버전": "2026-05-09",
            "출처": "국가법령정보 OPEN API (tools/law_api.py)",
            "법령": {
                "법령ID": "008567",
                "법령명_한글": full29["법령"]["기본정보"].get("법령명_한글", ""),
                "공포번호": full29["법령"]["기본정보"].get("공포번호", ""),
                "시행일자": full29["법령"]["기본정보"].get("시행일자", ""),
            },
            "근거조문": ["시행규칙 제29조 (변경허가)", "시행규칙 제33조 (변경신고)"],
            "법근거": "법 제25조제11항",
            "bizType_매핑근거": "쓸자료/상황코드_코드표.json (bizType.W01)",
            "신고시점_규칙": {
                "사후 30일 이내": "1호(상호), 2호(대표자), 9호(기술능력)",
                "사전": "3~8호 (소재지/차량/재활용 관련/매립 침출수)",
            },
        },
        "변경허가": 변경허가_사유,
        "변경신고": 변경신고_사항,
        "제출서류_변경허가": 제출_허가,
        "제출서류_변경신고": 제출_신고,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n✓ 생성: {OUT}  ({OUT.stat().st_size:,} bytes)")
    print(f"  변경허가 사유: {len(변경허가_사유)}건")
    print(f"  변경신고 사항: {len(변경신고_사항)}건")
    print(f"  제출서류 (변경허가): {len(제출_허가)}건 / (변경신고): {len(제출_신고)}건")
    return 0


if __name__ == "__main__":
    sys.exit(main())
