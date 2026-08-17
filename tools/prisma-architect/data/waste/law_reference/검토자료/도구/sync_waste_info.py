# -*- coding: utf-8 -*-
"""시행규칙 별표4(폐기물 종류별 세부분류) → 쓸자료/wasteInformation.json 현행화.

law_api.py 로 받은 별표4 를 정본 삼아 wasteInformation.json 을 맞춘다.
기존 항목의 recyclingCodeNone / recyclingCodeCorrespond 값은 보존하고,
신설 코드는 값을 비워둔 채 `_todo` 로 표시해 사람이 채우도록 남긴다.

사용법
------
    python law_api.py fetch --target 시행규칙
    python law_api.py byeolpyo 4

    python sync_waste_info.py --byeolpyo <LAW_CACHE_DIR>/byeolpyo/별표4.json --dry-run
    python sync_waste_info.py --byeolpyo ... --out 쓸자료/wasteInformation.json

입력 별표4 JSON 은 두 가지 모양을 모두 받는다.
  (a) law_active 계열 — {"별표내용": [{"marker": "51-01", "text": "유기성오니류", ...}, ...]}
  (b) API 원본/PDF 추출 — 위 구조가 없으면 별표내용 문자열에서 `코드 + 명칭` 을 정규식으로 훑는다.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

CODE_RE = re.compile(r"^\d{2}(?:-\d{2}){1,2}$")
# PDF/평문 폴백용: 줄머리 코드 + 뒤따르는 명칭
LINE_RE = re.compile(r"(?m)^\s*(\d{2}(?:-\d{2}){1,2})\s+(\S.*?)\s*$")


def _walk(node, out: list):
    if isinstance(node, dict):
        marker = str(node.get("marker") or "").strip()
        text = str(node.get("text") or "").strip()
        if CODE_RE.fullmatch(marker) and text:
            out.append((marker, text))
        for v in node.values():
            _walk(v, out)
    elif isinstance(node, list):
        for v in node:
            _walk(v, out)


GLUE_RE = re.compile(r"(?<=[가-힣)\]])(\d{2})(?=\s*[가-힣])")


def strip_glued_header(name: str, own_prefix: str, prefixes: set[str]) -> str:
    """대분류 제목이 앞 항목 명칭 뒤에 붙어버린 파싱 오류를 잘라낸다.

    예: '그 밖의 폐농약02 부식성폐기물' → '그 밖의 폐농약'
    뒤에 붙은 2자리가 '다른' 대분류 번호일 때만 자른다 (본문의 숫자는 건드리지 않음).
    """
    for m in GLUE_RE.finditer(name):
        nxt = m.group(1)
        if nxt in prefixes and nxt != own_prefix:
            return name[:m.start()].strip()
    return name


def extract_codes(byeolpyo: dict, clean: bool = True) -> dict[str, str]:
    """별표4 JSON 에서 {코드: 명칭} 추출. 먼저 나온 것을 우선한다."""
    pairs: list[tuple[str, str]] = []
    _walk(byeolpyo, pairs)
    if not pairs:
        blob = "\n".join(
            str(byeolpyo.get(k, ""))
            for k in ("별표내용_PDF추출", "별표내용", "별표본문")
            if byeolpyo.get(k)
        )
        pairs = LINE_RE.findall(blob)
    codes: dict[str, str] = {}
    for code, name in pairs:
        codes.setdefault(code, re.sub(r"\s+", " ", name).strip())
    if clean:
        prefixes = {c.split("-")[0] for c in codes}
        codes = {c: strip_glued_header(n, c.split("-")[0], prefixes) for c, n in codes.items()}
    return codes


def load_json(p: Path):
    return json.loads(p.read_bytes().replace(b"\r\n", b"\n").decode("utf-8"))


def main() -> int:
    ap = argparse.ArgumentParser(description="별표4 → wasteInformation.json 동기화")
    ap.add_argument("--byeolpyo", required=True, type=Path, help="별표4 JSON 경로")
    ap.add_argument("--waste", type=Path,
                    default=Path("쓸자료/wasteInformation.json"), help="현재 wasteInformation.json")
    ap.add_argument("--out", type=Path, help="출력 경로 (생략 시 --waste 덮어쓰기)")
    ap.add_argument("--dry-run", action="store_true", help="차이만 출력하고 쓰지 않음")
    ap.add_argument("--raw-names", action="store_true",
                    help="명칭 뒤에 붙은 대분류 제목 자동 제거를 끄기")
    ap.add_argument("--keep-removed", action="store_true",
                    help="별표4 에 없는 기존 코드를 지우지 않고 유지 (기본은 제거)")
    args = ap.parse_args()

    codes = extract_codes(load_json(args.byeolpyo), clean=not args.raw_names)
    if not codes:
        print("별표4 에서 코드를 하나도 못 뽑았습니다. 입력 파일 구조를 확인하세요.", file=sys.stderr)
        return 1
    waste = load_json(args.waste)
    cur = {x["wasteCode"]: x for x in waste}

    added   = [c for c in codes if c not in cur]
    removed = [c for c in cur if c not in codes and len(c.split("-")) > 1]
    renamed = [(c, cur[c]["wasteName"], codes[c]) for c in codes
               if c in cur and cur[c]["wasteName"].split("(")[0].strip() != codes[c].split("(")[0].strip()]

    print(f"별표4 코드 {len(codes)}개 / wasteInformation {len(waste)}개")
    print(f"  + 신설 {len(added)}  - 삭제 {len(removed)}  ~ 명칭변경 {len(renamed)}")
    for c in added:   print(f"    + {c}  {codes[c][:56]}")
    for c in removed: print(f"    - {c}  {cur[c]['wasteName'][:56]}")
    for c, a, b in renamed: print(f"    ~ {c}  {a[:34]!r} → {b[:34]!r}")

    if args.dry_run:
        return 0

    out: list[dict] = []
    for code in sorted(codes, key=lambda c: [int(x) for x in c.split("-")]):
        if code in cur:
            row = dict(cur[code])
            row["wasteName"] = codes[code]
            row.pop("_todo", None)
        else:
            row = {"wasteCode": code, "wasteName": codes[code],
                   "recyclingCodeNone": "", "recyclingCodeCorrespond": "",
                   "_todo": "신설 코드 — 별표4의3 확인 후 재활용 가능 유형 기입"}
        out.append(row)
    if args.keep_removed:
        for code in removed:
            row = dict(cur[code]); row["_todo"] = "별표4 에 없음 — 폐지 여부 확인"
            out.append(row)
    # 대분류(1단) 행은 원본에 있었다면 유지
    for code, row in cur.items():
        if len(code.split("-")) == 1 and code not in codes:
            out.insert(0, row)

    dest = args.out or args.waste
    body = json.dumps(out, ensure_ascii=False, indent=2) + "\n"
    dest.write_bytes(body.replace("\n", "\r\n").encode("utf-8"))
    todo = sum(1 for r in out if "_todo" in r)
    print(f"\n→ {dest}  ({len(out)}개, 확인 필요 {todo}개)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
