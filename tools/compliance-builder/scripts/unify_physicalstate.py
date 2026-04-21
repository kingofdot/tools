# -*- coding: utf-8 -*-
"""
별표5 JSON의 tags.phaseState (legacy) 를 physicalState 로 통일.

정책:
  - 각 태그 객체에서 phaseState 를 physicalState 로 변환
  - 기존에 physicalState 가 이미 있으면 phaseState 는 단순 제거 (physicalState 우선)
  - 매핑: "solid" → ["S"], "liquid" → ["L"], "semisolid"/null → 제거
  - 변환 후 키 순서는 physicalState 를 항상 태그 객체 뒤쪽에 배치
"""

import json
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
TARGET = BASE / "data" / "검토사항" / "시행규칙" / "별표5_처리구체적기준및방법.json"

doc = json.loads(TARGET.read_text(encoding="utf-8"))
items = doc.get("별표내용") or []

PHASE_MAP = {
    "solid": ["S"],
    "liquid": ["L"],
    "semisolid": None,
    "gas": None,
}

migrated = 0
removed_null = 0
already_had = 0
conflict_resolved = 0

for it in items:
    tags = it.get("tags")
    if not isinstance(tags, dict):
        continue
    if "phaseState" not in tags:
        continue

    phase = tags.pop("phaseState")
    converted = PHASE_MAP.get(phase)

    if "physicalState" in tags:
        if phase is None:
            pass
        elif converted and tags["physicalState"] != converted:
            conflict_resolved += 1
        already_had += 1
        continue

    if phase is None:
        removed_null += 1
        continue

    if converted is None:
        continue

    tags["physicalState"] = converted
    migrated += 1

TARGET.write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")

print(f"phaseState → physicalState 마이그레이션: {migrated}건")
print(f"phaseState=null 단순 제거: {removed_null}건")
print(f"physicalState 이미 존재 (phaseState 제거만): {already_had}건")
print(f"  - 그 중 값 충돌 (physicalState 우선): {conflict_resolved}건")
