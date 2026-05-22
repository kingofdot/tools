"""waste 검토사항 vs API 현행 폐기물법 원문 비교 → MD 리포트 생성."""
from __future__ import annotations

import difflib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Optional

_BASE = Path("d:/seodaeri/seodaeri-lambda/data/waste/law_reference")
REVIEW_ROOT = _BASE / "검토자료/검토사항"
OUTPUT_MD = _BASE / "검토자료/_API검토_검토사항.md"

API_FILES = {
    "법": Path("d:/tmp/law_law_001771.json"),
    "시행령": Path("d:/tmp/law_decree_005353.json"),
    "시행규칙": Path("d:/tmp/law_rule_008567.json"),
}


def norm(s: Any) -> str:
    """비교용 텍스트 정규화: 공백/개정태그 제거 + NFKC."""
    if s is None:
        return ""
    s = str(s)
    s = unicodedata.normalize("NFKC", s)  # CJK Compatibility 등 통일
    s = re.sub(r"<[^>]+>", "", s)         # <개정 ...>, <신설 ...>
    s = re.sub(r"\[[^\]]+\]", "", s)       # [전문개정 ...]
    s = re.sub(r"\s+", "", s)              # 모든 공백 제거
    return s.strip()


def find_조문(api_data: dict, num: str, gaji: Optional[str]) -> Optional[dict]:
    units = api_data["법령"]["조문"]["조문단위"]
    target_num = str(num).lstrip("0") or "0"
    target_gaji = str(gaji) if gaji else ""
    for u in units:
        if u.get("조문여부") != "조문":
            continue
        if str(u.get("조문번호", "")).lstrip("0") == target_num and \
           str(u.get("조문가지번호", "")) == target_gaji:
            return u
    return None


def find_별표(api_data: dict, num: str, gaji: str) -> Optional[dict]:
    units = api_data["법령"]["별표"]["별표단위"]
    for u in units:
        if str(u.get("별표번호", "")) == str(num) and \
           str(u.get("별표가지번호", "")) == str(gaji):
            return u
    return None


def 항_map(unit: dict) -> dict[str, dict]:
    """항번호 → 항 객체."""
    return {h["항번호"]: h for h in unit.get("항", []) if isinstance(h, dict) and "항번호" in h}


def 호_map(항: dict) -> dict[str, dict]:
    return {h["호번호"]: h for h in 항.get("호", []) if isinstance(h, dict) and "호번호" in h}


def compare_조문(local: dict, api: dict) -> list[dict]:
    """반환: [{level, key, status, local_text, api_text, note}]"""
    out: list[dict] = []

    # 조문내용 (제목)
    if norm(local.get("조문내용")) != norm(api.get("조문내용")):
        out.append({
            "level": "조문",
            "key": "조문내용",
            "status": "다름",
            "local_text": local.get("조문내용", ""),
            "api_text": api.get("조문내용", ""),
            "note": "",
        })

    # 시행일자 비교 (참고용)
    local_d = str(local.get("조문시행일자", ""))
    api_d = str(api.get("조문시행일자", ""))
    if local_d != api_d:
        out.append({
            "level": "조문",
            "key": "조문시행일자",
            "status": "다름",
            "local_text": local_d,
            "api_text": api_d,
            "note": "",
        })

    # 항 비교
    lmap = 항_map(local)
    amap = 항_map(api)
    all_keys = list(dict.fromkeys(list(lmap.keys()) + list(amap.keys())))
    for k in all_keys:
        L = lmap.get(k)
        A = amap.get(k)
        if L and not A:
            out.append({"level": "항", "key": k, "status": "원문누락",
                        "local_text": L.get("항내용", ""), "api_text": "",
                        "note": "검토사항에는 있는데 현행 API에 없음 (개정으로 삭제?)"})
            continue
        if A and not L:
            # 검토사항에 없는 항은 "검토 미수행" — 사용자 가공 누락일 수 있음
            out.append({"level": "항", "key": k, "status": "미검토",
                        "local_text": "", "api_text": A.get("항내용", ""),
                        "note": "현행 API에 있는데 검토사항에는 없음"})
            continue
        # 둘 다 있는 경우 항내용 비교
        if norm(L.get("항내용")) != norm(A.get("항내용")):
            out.append({"level": "항", "key": k, "status": "다름",
                        "local_text": L.get("항내용", ""),
                        "api_text": A.get("항내용", ""), "note": ""})

        # 호 비교
        lh = 호_map(L)
        ah = 호_map(A)
        all_h = list(dict.fromkeys(list(lh.keys()) + list(ah.keys())))
        for hk in all_h:
            HL = lh.get(hk)
            HA = ah.get(hk)
            if HL and not HA:
                out.append({"level": f"항{k}호", "key": hk, "status": "원문누락",
                            "local_text": HL.get("호내용", ""), "api_text": "",
                            "note": ""})
            elif HA and not HL:
                out.append({"level": f"항{k}호", "key": hk, "status": "미검토",
                            "local_text": "", "api_text": HA.get("호내용", ""),
                            "note": "현행 API 신규/추가 호"})
            elif norm(HL.get("호내용")) != norm(HA.get("호내용")):
                out.append({"level": f"항{k}호", "key": hk, "status": "다름",
                            "local_text": HL.get("호내용", ""),
                            "api_text": HA.get("호내용", ""), "note": ""})
    return out


def _item_key(item: Any) -> str:
    """별표내용 item 비교용 키: marker + text 를 정규화한 문자열."""
    if not isinstance(item, dict):
        return ""
    return norm((item.get("marker") or "") + (item.get("text") or ""))


def _item_display(item: Any, limit: int = 240) -> str:
    if not isinstance(item, dict):
        return ""
    s = (item.get("marker", "") + " " + item.get("text", "")).strip()
    if item.get("table"):
        s += " [표:" + str(len(item["table"])) + "행]"
    return s[:limit] + ("…" if len(s) > limit else "")


def compare_별표(local: dict, api: dict) -> list[dict]:
    out: list[dict] = []
    # 시행일자
    if str(local.get("별표시행일자", "")) != str(api.get("별표시행일자", "")):
        out.append({"level": "별표", "key": "별표시행일자", "status": "다름",
                    "local_text": local.get("별표시행일자", ""),
                    "api_text": api.get("별표시행일자", ""), "note": ""})
    # 제목
    if norm(local.get("별표제목")) != norm(api.get("별표제목")):
        out.append({"level": "별표", "key": "별표제목", "status": "다름",
                    "local_text": local.get("별표제목", ""),
                    "api_text": api.get("별표제목", ""), "note": ""})

    # 별표내용 SequenceMatcher 정렬
    lcontent = local.get("별표내용") or []
    acontent = api.get("별표내용") or []
    L_keys = [_item_key(it) for it in lcontent]
    A_keys = [_item_key(it) for it in acontent]

    sm = difflib.SequenceMatcher(a=L_keys, b=A_keys, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        # 한 블록 단위로 묶어서 표시
        local_block = lcontent[i1:i2]
        api_block = acontent[j1:j2]
        local_lines = [_item_display(it) for it in local_block]
        api_lines = [_item_display(it) for it in api_block]
        if tag == "replace":
            status = "다름"
            label = f"item[{i1}:{i2}] vs API[{j1}:{j2}]"
        elif tag == "delete":
            status = "원문누락"
            label = f"item[{i1}:{i2}] (검토사항만 있음)"
        elif tag == "insert":
            status = "미검토"
            label = f"API[{j1}:{j2}] (API에만 있음)"
        else:
            status = tag
            label = f"item[{i1}:{i2}] vs API[{j1}:{j2}]"
        out.append({
            "level": "별표내용",
            "key": label,
            "status": status,
            "local_text": "\n".join(f"- {l}" for l in local_lines) if local_lines else "_(없음)_",
            "api_text": "\n".join(f"- {l}" for l in api_lines) if api_lines else "_(없음)_",
            "note": "",
        })

    return out


def collect() -> list[dict]:
    """모든 검토사항 파일 → 비교 결과."""
    api_law = json.loads(API_FILES["법"].read_text(encoding="utf-8"))
    api_decree = json.loads(API_FILES["시행령"].read_text(encoding="utf-8"))
    api_rule = json.loads(API_FILES["시행규칙"].read_text(encoding="utf-8"))

    results = []

    for cat, root, api_data in [
        ("법", REVIEW_ROOT / "법", api_law),
        ("시행령", REVIEW_ROOT / "시행령", api_decree),
    ]:
        for path in sorted(root.glob("*.json")):
            local = json.loads(path.read_text(encoding="utf-8"))
            num = str(local.get("조문번호", ""))
            gaji = local.get("조문가지번호") or ""
            api = find_조문(api_data, num, gaji)
            if not api:
                results.append({"category": cat, "filename": path.name, "match": False,
                                "diffs": [], "label": f"제{num}{'의' + gaji if gaji else ''}조"})
                continue
            diffs = compare_조문(local, api)
            results.append({
                "category": cat, "filename": path.name, "match": True,
                "label": f"제{num}{'의' + gaji if gaji else ''}조",
                "title": local.get("조문제목", ""),
                "diffs": diffs,
                "api_시행일": api.get("조문시행일자", ""),
            })

    # 시행규칙 (별표)
    rule_root = REVIEW_ROOT / "시행규칙"
    for path in sorted(rule_root.glob("*.json")):
        local = json.loads(path.read_text(encoding="utf-8"))
        num = str(local.get("별표번호", ""))
        gaji = str(local.get("별표가지번호", "")) or "00"
        api = find_별표(api_rule, num, gaji)
        if not api:
            results.append({"category": "시행규칙", "filename": path.name, "match": False,
                            "diffs": [], "label": f"별표 {int(num)}{'의' + str(int(gaji)) if int(gaji) else ''}"})
            continue
        diffs = compare_별표(local, api)
        results.append({
            "category": "시행규칙", "filename": path.name, "match": True,
            "label": f"별표 {int(num)}{'의' + str(int(gaji)) if int(gaji) else ''}",
            "title": local.get("별표제목", ""),
            "diffs": diffs,
            "api_시행일": api.get("별표시행일자", ""),
        })
    return results


def render_md(results: list[dict]) -> str:
    lines: list[str] = []
    lines.append("# 폐기물 검토사항 ↔ 국가법령정보 API 원문 대조")
    lines.append("")
    lines.append("- 기준: API 현행본(시행 예정 포함). 폐기물관리법 ID 001771 / 시행령 005353 / 시행규칙 008567.")
    lines.append("- 비교 대상: 원문(조문내용·항내용·호내용·별표내용 텍스트). 가공 필드(`answer`/`condition`/`위임`/`tags`/`noWord`)는 비교 제외.")
    lines.append("- 정규화: `<개정 …>` `[전문개정 …]` 같은 메타 태그·공백 제거 후 비교.")
    lines.append("")
    lines.append("## 검토 처리 표시 방법")
    lines.append("")
    lines.append("각 항목 옆 `[ ]` 를 채워 주세요:")
    lines.append("")
    lines.append("- `[수정]` — 사용자가 수정 지시 → 내가 검토사항 JSON을 고침")
    lines.append("- `[확인]` — 차이 있어 보이지만 의도된 것 (가공 결과 유지)")
    lines.append("- `[무시]` — 형식 차이 등 무의미한 diff")
    lines.append("- 빈칸 — 아직 결정 전")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 요약 표
    lines.append("## 요약")
    lines.append("")
    lines.append("| 카테고리 | 파일 | 차이 개수 | 시행일(API) | 매칭 |")
    lines.append("|---|---|---:|---|---|")
    for r in results:
        n_diff = len(r.get("diffs", []))
        date = r.get("api_시행일", "-")
        match = "✅" if r["match"] else "❌"
        lines.append(f"| {r['category']} | {r['filename']} | {n_diff} | {date} | {match} |")
    lines.append("")
    lines.append("---")
    lines.append("")

    # 상세
    for r in results:
        lines.append(f"## [{r['category']}] {r['label']} — {r.get('title','')}")
        lines.append("")
        lines.append(f"- 파일: `{r['filename']}`")
        if not r["match"]:
            lines.append("- ❌ **API에서 매칭되는 조문/별표를 찾지 못함**")
            lines.append("")
            continue
        lines.append(f"- API 시행일: {r.get('api_시행일','-')}")
        diffs = r.get("diffs", [])
        if not diffs:
            lines.append("- ✅ 원문 차이 없음")
            lines.append("")
            continue

        # 다름/누락/미검토 카운트
        c = {}
        for d in diffs:
            c[d["status"]] = c.get(d["status"], 0) + 1
        summary = ", ".join(f"{k} {v}건" for k, v in c.items())
        lines.append(f"- ⚠ 차이 {len(diffs)}건: {summary}")
        lines.append("")

        for i, d in enumerate(diffs, 1):
            status = d["status"]
            badge = {
                "다름": "🟡 다름",
                "원문누락": "🔴 원문누락",
                "미검토": "🔵 미검토",
                "참고": "⚪ 참고",
                "길이다름": "🟠 길이다름",
            }.get(status, status)
            lines.append(f"### {i}. [ ] {d['level']} {d['key']} — {badge}")
            if d.get("note"):
                lines.append(f"> {d['note']}")
            lines.append("")
            local_t = d.get("local_text", "") or "_(없음)_"
            api_t = d.get("api_text", "") or "_(없음)_"
            # 너무 길면 자름
            if len(str(local_t)) > 1500:
                local_t = str(local_t)[:1500] + "…"
            if len(str(api_t)) > 1500:
                api_t = str(api_t)[:1500] + "…"
            lines.append("**검토사항:**")
            lines.append("```")
            lines.append(str(local_t))
            lines.append("```")
            lines.append("**API 현행:**")
            lines.append("```")
            lines.append(str(api_t))
            lines.append("```")
            lines.append("")
        lines.append("---")
        lines.append("")
    return "\n".join(lines)


def main() -> int:
    results = collect()
    md = render_md(results)
    OUTPUT_MD.write_text(md, encoding="utf-8")
    print(f"OK: {OUTPUT_MD}  ({len(results)}개 파일)")
    # 콘솔에 차이 카운트만 출력
    for r in results:
        n = len(r.get("diffs", []))
        flag = "✅" if r["match"] and n == 0 else ("⚠" if r["match"] else "❌")
        print(f"  {flag} [{r['category']}] {r['filename']}: {n}개 차이")
    return 0


if __name__ == "__main__":
    sys.exit(main())
