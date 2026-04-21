# -*- coding: utf-8 -*-
"""
별표5 JSON의 tags.wasteClass "G" → "GO"/"GN" 재분류

규칙:
  1. 항목 text에 "사업장배출시설계"만 등장 → ["GO"]
  2. 항목 text에 "사업장비배출시설계"만 등장 → ["GN"]
  3. 두 용어 모두 등장 → ["GO","GN"]
  4. 두 용어 없음 → subsection(가./나./...) 제목 기준 재시도
  5. 여전히 결정 불가 → 기본값 ["GO","GN"]

사업장배출시설계 폐기물(GO) = 배출시설 인허가를 받은 사업장에서 나오는 폐기물
사업장비배출시설계 폐기물(GN) = 그 외 사업장폐기물 (소규모 사업장 등)
둘 다 "사업장일반폐기물"의 하위 분류이므로 wasteCode만으로는 구분 불가 → 사용자 입력 필요
"""

import json
import re
import sys
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
TARGET = BASE / "data" / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"


def classify_by_text(text: str):
    if not text:
        return None
    has_go = "사업장배출시설계" in text
    has_gn = "사업장비배출시설계" in text
    if has_go and has_gn:
        return ["GO", "GN"]
    if has_go:
        return ["GO"]
    if has_gn:
        return ["GN"]
    return None


def main():
    doc = json.loads(TARGET.read_text(encoding="utf-8"))
    items = doc.get("별표내용") or doc.get("items") or []

    top_section = None
    sub_section = None
    changed = 0
    skipped = 0
    samples = []

    top_marker_re = re.compile(r"^\d+\.$")
    sub_marker_re = re.compile(r"^[가-힣]\.$")

    for i, it in enumerate(items):
        marker = it.get("marker") or ""
        depth = it.get("depth")
        typ = it.get("type")
        text = it.get("text") or ""

        if depth == 0 and typ == "number" and top_marker_re.match(marker):
            top_section = {"marker": marker, "text": text}
            sub_section = None

        if depth == 1 and (typ == "korean-dot" or sub_marker_re.match(marker)):
            sub_section = {"marker": marker, "text": text}

        tags = it.get("tags")
        if not tags:
            continue
        wc = tags.get("wasteClass")
        if not isinstance(wc, list) or "G" not in wc:
            continue

        decided = classify_by_text(text)
        if not decided and sub_section:
            decided = classify_by_text(sub_section.get("text", ""))
        if not decided:
            decided = ["GO", "GN"]

        new_wc = []
        seen = set()
        for c in wc:
            cs = decided if c == "G" else [c]
            for d in cs:
                if d not in seen:
                    seen.add(d)
                    new_wc.append(d)

        if new_wc != wc:
            tags["wasteClass"] = new_wc
            changed += 1
            if len(samples) < 20:
                samples.append({
                    "idx": i,
                    "top": (top_section["marker"] + " " + top_section["text"][:30]) if top_section else "",
                    "sub": (sub_section["marker"] + " " + sub_section["text"][:30]) if sub_section else "",
                    "marker": marker,
                    "before": wc,
                    "after": new_wc,
                })
        else:
            skipped += 1

    TARGET.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"변경: {changed} / 건너뜀: {skipped}")
    print("샘플 (최대 20건):")
    for s in samples:
        print(f"  [{s['idx']}] {s['top']} > {s['sub']} > {s['marker']}: {s['before']} → {s['after']}")


if __name__ == "__main__":
    sys.exit(main() or 0)
