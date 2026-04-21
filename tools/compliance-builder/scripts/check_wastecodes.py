# -*- coding: utf-8 -*-
"""
별표5 JSON의 tags.wasteCode 값을 wasteInformation.json과 교차검증.

검증 규칙:
  1. wasteInformation.json의 wasteCode 집합을 "canonical"로 삼음
  2. 별표5에서 쓰인 코드가 canonical에 없으면 "unknown" 목록에 출력
  3. canonical에 XX-XX-XX 세부 코드가 있으면 부모(XX-XX)로 참조한 경우도 허용
  4. 별표5에서 쓰인 모든 코드·빈도 집계 → 상위 50개 출력
"""

import json
import re
import sys
import io
from pathlib import Path
from collections import Counter

# Windows 콘솔에서 한글·기호 출력 안전하게
if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
DATA = BASE / "data"
B5 = DATA / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"
WINFO = DATA / "wasteInformation.json"


def load_canonical_codes():
    """wasteInformation.json에서 모든 wasteCode 수집."""
    data = json.loads(WINFO.read_text(encoding="utf-8"))
    codes = set()
    names = {}
    # 리스트 or {items: [...]} 양쪽 대응
    items = data if isinstance(data, list) else data.get("items", [])
    for it in items:
        code = it.get("wasteCode")
        if code:
            codes.add(code)
            names[code] = it.get("wasteName", "")
    return codes, names


def iter_items(b5):
    """별표내용 리스트 반환."""
    return b5.get("별표내용") or b5.get("items") or []


def is_prefix(parent, child):
    """parent가 child의 접두어 코드인지 확인. e.g. 01-06 ⊂ 01-06-01"""
    if parent == child:
        return True
    return child.startswith(parent + "-")


def canonical_match(code, canonical):
    """code가 canonical 집합에 있거나, 상위·하위 관계로 매칭되는지."""
    if code in canonical:
        return True
    for c in canonical:
        if is_prefix(code, c) or is_prefix(c, code):
            return True
    return False


def main():
    canonical, names = load_canonical_codes()
    b5 = json.loads(B5.read_text(encoding="utf-8"))
    items = iter_items(b5)

    freq = Counter()
    unknown = Counter()
    unknown_ctx = {}

    for i, it in enumerate(items):
        tags = it.get("tags") or {}
        wc = tags.get("wasteCode")
        if not isinstance(wc, list):
            continue
        for code in wc:
            if not code:
                continue
            freq[code] += 1
            if not canonical_match(code, canonical):
                unknown[code] += 1
                unknown_ctx.setdefault(code, []).append({
                    "idx": i,
                    "marker": it.get("marker"),
                    "text": (it.get("text") or "")[:60],
                })

    print("=" * 60)
    print(f"별표5 wasteCode 총 출현 횟수: {sum(freq.values())}")
    print(f"고유 코드 수: {len(freq)}")
    print(f"canonical(wasteInformation) 미등록 코드: {len(unknown)}")
    print()

    print("[빈도 상위 30]")
    for code, n in freq.most_common(30):
        mark = "" if canonical_match(code, canonical) else "  [!] UNKNOWN"
        name = names.get(code, "")
        print(f"  {code:<12} {n:>4}회  {name}{mark}")
    print()

    if unknown:
        print("[canonical 미등록 코드 전체]")
        for code, n in sorted(unknown.items()):
            print(f"  {code}  ({n}회)")
            for ctx in unknown_ctx[code][:2]:
                print(f"    └ [{ctx['idx']}] {ctx['marker']} {ctx['text']}")
    else:
        print("모든 코드가 canonical과 매칭됨.")


if __name__ == "__main__":
    main()
