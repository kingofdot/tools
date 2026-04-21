# -*- coding: utf-8 -*-
"""별표5 90건 불일치 각 항목의 부모 섹션 경로를 출력."""

import json
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
TARGET = BASE / "data" / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"
doc = json.loads(TARGET.read_text(encoding="utf-8"))
items = doc["별표내용"]


def waste_class_expected(code):
    if not code:
        return None
    head = code.split("-")[0]
    if head == "10":
        return {"D"}
    if head.isdigit() and 1 <= int(head) <= 11 and head != "10":
        return {"D"}
    if head == "12":
        return {"D"}
    if head == "51":
        return {"GO", "GN"}
    if head == "91":
        return {"L"}
    return None


def path_for(idx):
    """idx 항목의 조상 섹션 경로 (depth별로 가장 가까운 상위 항목)."""
    target = items[idx]
    path = []
    current_depth = target.get("depth", 0)
    for i in range(idx - 1, -1, -1):
        it = items[i]
        d = it.get("depth", 0)
        if d < current_depth:
            path.append((d, it.get("marker"), (it.get("text") or "")[:60]))
            current_depth = d
            if d == 0:
                break
    return list(reversed(path))


mismatches = []
for idx, it in enumerate(items):
    tags = it.get("tags")
    if not isinstance(tags, dict):
        continue
    wc = tags.get("wasteCode") or []
    wclass = tags.get("wasteClass") or []
    if not (wc and wclass):
        continue
    for c in wc:
        if c in {"12-00-00", "91-20-00"}:
            continue
        expected = waste_class_expected(c)
        if expected and not any(w in expected for w in wclass):
            mismatches.append((idx, c, wclass, sorted(expected)))
            break

print(f"총 불일치 항목: {len(mismatches)}건 (중복 항목 1개당 1건씩)")
print("=" * 100)
for idx, code, wclass, expected in mismatches:
    it = items[idx]
    path = path_for(idx)
    print(f"\n[{idx}] d{it['depth']} `{it.get('marker')}` code={code} wasteClass={wclass} → 기대 {expected}")
    print(f"  text: {(it.get('text') or '')[:90]}")
    print(f"  path:")
    for d, m, t in path:
        print(f"    d{d} `{m}` {t}")
