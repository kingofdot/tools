"""waste 참고자료 vs API 현행 폐기물법 원문 비교 → MD 리포트.

목적: 참고자료(이미 정리된 정의/분류 데이터)와 API 현행본을 대조해
1) API 의 더 정확한 용어를 참고자료에 반영할지
2) API 의 세분화된 항목이 참고자료에 누락됐는지
점검할 수 있는 체크리스트 MD 를 만든다.
"""
from __future__ import annotations

import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any, Optional

_BASE = Path("d:/seodaeri/seodaeri-lambda/data/waste/law_reference")
REVIEW_ROOT = _BASE / "쓸자료/별표"
OUTPUT_MD = _BASE / "검토자료/_API검토_참고자료.md"

API_FILES = {
    "법": Path("d:/tmp/law_law_001771.json"),
    "시행령": Path("d:/tmp/law_decree_005353.json"),
    "시행규칙": Path("d:/tmp/law_rule_008567.json"),
}

# 의도적 차이(API 에 parser 버그가 있어서 참고자료가 더 정확한 케이스). 비교 결과에서 무시.
# 2026-05-09: tools/law_api.py parser 자체를 보강해 동일 패턴 자동 정정 (split_inline_markers의
# Korean letter marker 인라인 분할 제거 + 줄결합 공백 보정 패턴 추가). 화이트리스트 비움.
INTENTIONAL_DIFFS: list[dict] = []


def is_intentional(category: str, filename: str, diff: dict) -> bool:
    for w in INTENTIONAL_DIFFS:
        if w["category"] != category or w["filename"] != filename:
            continue
        if w.get("level") and w["level"] != diff.get("level"):
            continue
        if w.get("key_contains") and w["key_contains"] not in str(diff.get("key", "")):
            continue
        return True
    return False


def norm(s: Any) -> str:
    if s is None:
        return ""
    s = str(s)
    s = unicodedata.normalize("NFKC", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = re.sub(r"\[[^\]]+\]", "", s)
    s = re.sub(r"\s+", "", s)
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
    if not isinstance(unit.get("항"), list):
        return {}
    return {h["항번호"]: h for h in unit["항"] if isinstance(h, dict) and "항번호" in h}


def 호_map(항: dict) -> dict[str, dict]:
    if not isinstance(항.get("호"), list):
        return {}
    return {h["호번호"]: h for h in 항["호"] if isinstance(h, dict) and "호번호" in h}


def compare_조문(local: dict, api: dict) -> list[dict]:
    out: list[dict] = []
    if norm(local.get("조문내용")) != norm(api.get("조문내용")):
        out.append({"level": "조문", "key": "조문내용", "status": "다름",
                    "local_text": local.get("조문내용", ""),
                    "api_text": api.get("조문내용", ""), "note": ""})
    if str(local.get("조문시행일자", "")) != str(api.get("조문시행일자", "")):
        out.append({"level": "조문", "key": "조문시행일자", "status": "다름",
                    "local_text": str(local.get("조문시행일자", "")),
                    "api_text": str(api.get("조문시행일자", "")), "note": ""})
    lmap = 항_map(local)
    amap = 항_map(api)
    all_keys = list(dict.fromkeys(list(lmap.keys()) + list(amap.keys())))
    for k in all_keys:
        L, A = lmap.get(k), amap.get(k)
        if L and not A:
            out.append({"level": "항", "key": k, "status": "원문누락",
                        "local_text": L.get("항내용", ""), "api_text": "", "note": ""})
            continue
        if A and not L:
            out.append({"level": "항", "key": k, "status": "세분화부족",
                        "local_text": "", "api_text": A.get("항내용", ""),
                        "note": "API에는 있는데 참고자료에 없음"})
            continue
        if norm(L.get("항내용")) != norm(A.get("항내용")):
            out.append({"level": "항", "key": k, "status": "다름",
                        "local_text": L.get("항내용", ""),
                        "api_text": A.get("항내용", ""), "note": ""})
        lh, ah = 호_map(L), 호_map(A)
        all_h = list(dict.fromkeys(list(lh.keys()) + list(ah.keys())))
        for hk in all_h:
            HL, HA = lh.get(hk), ah.get(hk)
            if HL and not HA:
                out.append({"level": f"항{k}호", "key": hk, "status": "원문누락",
                            "local_text": HL.get("호내용", ""), "api_text": "", "note": ""})
            elif HA and not HL:
                out.append({"level": f"항{k}호", "key": hk, "status": "세분화부족",
                            "local_text": "", "api_text": HA.get("호내용", ""), "note": ""})
            elif norm(HL.get("호내용")) != norm(HA.get("호내용")):
                out.append({"level": f"항{k}호", "key": hk, "status": "다름",
                            "local_text": HL.get("호내용", ""),
                            "api_text": HA.get("호내용", ""), "note": ""})
    return out


def _item_key(item: Any) -> str:
    if not isinstance(item, dict):
        return ""
    return norm((item.get("marker") or "") + (item.get("text") or ""))


def _item_display(item: Any, limit: int = 280) -> str:
    if not isinstance(item, dict):
        return ""
    s = (item.get("marker", "") + " " + item.get("text", "")).strip()
    if item.get("table"):
        s += f" [표:{len(item['table'])}행]"
    return (s[:limit] + ("…" if len(s) > limit else ""))


def compare_별표(local: dict, api: dict) -> list[dict]:
    out: list[dict] = []
    if str(local.get("별표시행일자", "")) != str(api.get("별표시행일자", "")):
        out.append({"level": "별표", "key": "별표시행일자", "status": "다름",
                    "local_text": str(local.get("별표시행일자", "")),
                    "api_text": str(api.get("별표시행일자", "")), "note": ""})
    if norm(local.get("별표제목")) != norm(api.get("별표제목")):
        out.append({"level": "별표", "key": "별표제목", "status": "다름",
                    "local_text": local.get("별표제목", ""),
                    "api_text": api.get("별표제목", ""), "note": ""})

    lcontent = local.get("별표내용") or []
    acontent = api.get("별표내용") or []
    if not isinstance(lcontent, list) or not isinstance(acontent, list):
        return out

    L_keys = [_item_key(it) for it in lcontent]
    A_keys = [_item_key(it) for it in acontent]
    sm = difflib.SequenceMatcher(a=L_keys, b=A_keys, autojunk=False)
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag == "equal":
            continue
        local_block = lcontent[i1:i2]
        api_block = acontent[j1:j2]
        local_lines = [_item_display(it) for it in local_block]
        api_lines = [_item_display(it) for it in api_block]
        if tag == "replace":
            status = "다름"
            label = f"item[{i1}:{i2}] vs API[{j1}:{j2}]"
        elif tag == "delete":
            status = "원문누락"
            label = f"item[{i1}:{i2}] (참고자료만 있음)"
        elif tag == "insert":
            status = "세분화부족"
            label = f"API[{j1}:{j2}] (API에만 있음)"
        else:
            status, label = tag, f"item[{i1}:{i2}] vs API[{j1}:{j2}]"
        out.append({
            "level": "별표내용", "key": label, "status": status,
            "local_text": "\n".join(f"- {l}" for l in local_lines) if local_lines else "_(없음)_",
            "api_text": "\n".join(f"- {l}" for l in api_lines) if api_lines else "_(없음)_",
            "note": "",
        })
    return out


def collect() -> list[dict]:
    api_law = json.loads(API_FILES["법"].read_text(encoding="utf-8"))
    api_decree = json.loads(API_FILES["시행령"].read_text(encoding="utf-8"))
    api_rule = json.loads(API_FILES["시행규칙"].read_text(encoding="utf-8"))

    results: list[dict] = []
    for cat, sub_root, api_data in [
        ("시행령", REVIEW_ROOT / "시행령", api_decree),
        ("시행규칙", REVIEW_ROOT / "시행규칙", api_rule),
    ]:
        for path in sorted(sub_root.glob("*.json")):
            local = json.loads(path.read_text(encoding="utf-8"))
            if local.get("별표번호"):
                num = str(local.get("별표번호", ""))
                gaji = str(local.get("별표가지번호", "")) or "00"
                api = find_별표(api_data, num, gaji)
                label = f"별표 {int(num)}{'의' + str(int(gaji)) if int(gaji) else ''}"
                if not api:
                    results.append({"category": cat, "filename": path.name,
                                    "match": False, "diffs": [], "label": label})
                    continue
                diffs = [d for d in compare_별표(local, api) if not is_intentional(cat, path.name, d)]
                results.append({"category": cat, "filename": path.name, "match": True,
                                "label": label, "title": local.get("별표제목", ""),
                                "api_시행일": api.get("별표시행일자", ""), "diffs": diffs})
            elif local.get("조문번호"):
                num = str(local.get("조문번호", ""))
                gaji = local.get("조문가지번호") or ""
                api = find_조문(api_data, num, gaji)
                label = f"제{num}{'의' + gaji if gaji else ''}조"
                if not api:
                    results.append({"category": cat, "filename": path.name,
                                    "match": False, "diffs": [], "label": label})
                    continue
                diffs = [d for d in compare_조문(local, api) if not is_intentional(cat, path.name, d)]
                results.append({"category": cat, "filename": path.name, "match": True,
                                "label": label, "title": local.get("조문제목", ""),
                                "api_시행일": api.get("조문시행일자", ""), "diffs": diffs})
    return results


def render_md(results: list[dict]) -> str:
    L: list[str] = []
    L.append("# 폐기물 참고자료 ↔ 국가법령정보 API 원문 대조")
    L.append("")
    L.append("- 기준: API 현행본(시행 예정 포함). 폐기물관리법 ID 001771 / 시행령 005353 / 시행규칙 008567.")
    L.append("- 비교 대상: `data/waste/law_reference/참고자료/{시행령,시행규칙}/*.json` 의 원문 텍스트(별표내용/조문내용/항내용/호내용).")
    L.append("- 정규화: `<개정 …>` `[전문개정 …]` 메타 태그 + 공백 + NFKC(한자 호환) 정규화 후 비교.")
    L.append("- 목표: ① API 의 정확한 용어를 참고자료에 반영, ② API 의 세분화된 항목이 누락됐는지 점검.")
    L.append("")
    L.append("## 처리 방법")
    L.append("")
    L.append("각 차이 항목 `[ ]` 에:")
    L.append("- `[수정]` — API 쪽이 정답 → 참고자료 JSON 수정")
    L.append("- `[추가]` — API 항목이 누락 → 참고자료에 항목 추가")
    L.append("- `[유지]` — 참고자료가 의도된 가공 → 그대로")
    L.append("- `[무시]` — 형식 차이 등 무의미")
    L.append("- 빈칸 — 미결정")
    L.append("")
    L.append("**상태 종류:**")
    L.append("- 🟡 다름 — 텍스트가 다름 (용어 차이일 가능성)")
    L.append("- 🔵 세분화부족 — API 에는 있고 참고자료에는 없음 → 추가 후보")
    L.append("- 🔴 원문누락 — 참고자료에는 있고 API 에는 없음 → 삭제·이전 가능성")
    L.append("")
    L.append("---")
    L.append("")
    L.append("## 요약")
    L.append("")
    L.append("| 카테고리 | 파일 | 차이 | 시행일(API) | 매칭 |")
    L.append("|---|---|---:|---|---|")
    for r in results:
        n = len(r.get("diffs", []))
        L.append(f"| {r['category']} | {r['filename']} | {n} | {r.get('api_시행일','-')} | {'✅' if r['match'] else '❌'} |")
    L.append("")
    L.append("---")
    L.append("")

    for r in results:
        L.append(f"## [{r['category']}] {r['label']} — {r.get('title','')}")
        L.append("")
        L.append(f"- 파일: `참고자료/{r['category']}/{r['filename']}`")
        if not r["match"]:
            L.append("- ❌ **API 에서 매칭되는 항목을 찾지 못함**")
            L.append("")
            continue
        L.append(f"- API 시행일: {r.get('api_시행일','-')}")
        diffs = r.get("diffs", [])
        if not diffs:
            L.append("- ✅ 원문 차이 없음")
            L.append("")
            continue
        c: dict = {}
        for d in diffs:
            c[d["status"]] = c.get(d["status"], 0) + 1
        L.append(f"- ⚠ 차이 {len(diffs)}건: " + ", ".join(f"{k} {v}건" for k, v in c.items()))
        L.append("")

        for i, d in enumerate(diffs, 1):
            badge = {"다름": "🟡 다름", "원문누락": "🔴 원문누락",
                     "세분화부족": "🔵 세분화부족"}.get(d["status"], d["status"])
            L.append(f"### {i}. [ ] {d['level']} {d['key']} — {badge}")
            if d.get("note"):
                L.append(f"> {d['note']}")
            L.append("")
            local_t = str(d.get("local_text", "") or "_(없음)_")
            api_t = str(d.get("api_text", "") or "_(없음)_")
            if len(local_t) > 1500:
                local_t = local_t[:1500] + "…"
            if len(api_t) > 1500:
                api_t = api_t[:1500] + "…"
            L.append("**참고자료:**")
            L.append("```")
            L.append(local_t)
            L.append("```")
            L.append("**API 현행:**")
            L.append("```")
            L.append(api_t)
            L.append("```")
            L.append("")
        L.append("---")
        L.append("")
    return "\n".join(L)


def main() -> int:
    results = collect()
    md = render_md(results)
    OUTPUT_MD.write_text(md, encoding="utf-8")
    print(f"OK: {OUTPUT_MD}")
    for r in results:
        n = len(r.get("diffs", []))
        flag = "✅" if r["match"] and n == 0 else ("⚠" if r["match"] else "❌")
        print(f"  {flag} [{r['category']}] {r['filename']}: {n}개")
    return 0


if __name__ == "__main__":
    sys.exit(main())
