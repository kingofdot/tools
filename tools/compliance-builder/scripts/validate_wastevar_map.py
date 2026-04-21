# -*- coding: utf-8 -*-
"""
wasteVarMap.json 매핑 검증 스크립트.

각 표시명 → wasteCode 매핑이 wasteInformation.json 과 일치하는지 확인.
매칭 방식:
  - wasteName 이 표시명과 완전일치 또는 포함관계면 OK
  - 상·하위 코드 (XX-XX ↔ XX-XX-XX) 는 동일군으로 간주
"""

import json
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
WMAP = BASE / "data" / "wasteVarMap.json"
WINFO = BASE / "data" / "wasteInformation.json"

wmap = json.loads(WMAP.read_text(encoding="utf-8"))
winfo = json.loads(WINFO.read_text(encoding="utf-8"))

by_code = {it["wasteCode"]: it for it in winfo}
by_prefix = {}
for it in winfo:
    code = it["wasteCode"]
    if len(code) == 5:
        by_prefix.setdefault(code, []).append(it)

def name_for(code):
    it = by_code.get(code)
    return it["wasteName"] if it else None


print("=" * 70)
print("wasteVarMap.json 매핑 검증")
print("=" * 70)

issues = []
ok_count = 0

SYNONYMS = [
    ("폐가전제품", "폐전기전자제품"),
    ("광재", "슬래그"),
    ("철강슬래그", "광재"),
    ("폐고무", "폐합성고무"),
    ("폐유리조각", "폐유리"),
    ("폐가구", "폐목재"),
    ("안정화처리물", "안정화또는고형화·고화처리물"),
    ("안정화처리물", "안정화고형화고화처리물"),
]


def norm(s):
    return (s or "").replace(" ", "").replace("·", "").replace("및", "").replace("(", "").replace(")", "")


def fuzzy_match(varname, name):
    v = norm(varname)
    n = norm(name)
    if not v or not n:
        return False
    if v in n or n in v:
        return True
    v_stem = v.rstrip("류")
    n_stem = n.rstrip("류")
    if v_stem and (v_stem in n or n_stem in v):
        return True
    if n_stem and (n_stem in v or v_stem in n):
        return True
    for a, b in SYNONYMS:
        a, b = norm(a), norm(b)
        if (a in v and b in n) or (b in v and a in n):
            return True
    return False


for varname, codes_by_class in wmap["map"].items():
    for cls, codes in codes_by_class.items():
        for code in codes:
            name = name_for(code)
            if name is None:
                parent = code.rsplit("-", 1)[0] if code.count("-") >= 2 else None
                pname = name_for(parent) if parent else None
                if pname and fuzzy_match(varname, pname):
                    ok_count += 1
                    continue
                issues.append((varname, cls, code, None, "코드 없음 (wasteInformation에 미등록)"))
                continue
            if fuzzy_match(varname, name):
                ok_count += 1
                continue
            children = by_prefix.get(code, [])
            child_match = any(fuzzy_match(varname, c["wasteName"]) for c in children)
            if child_match:
                ok_count += 1
                continue
            issues.append((varname, cls, code, name, "이름 불일치"))

print(f"정상: {ok_count}건 / 문제: {len(issues)}건")
print()

if issues:
    print("[문제 항목]")
    for varname, cls, code, name, reason in issues:
        print(f"  {varname:<20}  {cls} → {code}  (wasteInformation: {name or '—'})  [{reason}]")
    print()
    print("[제안]")
    for varname, cls, code, name, reason in issues:
        cands = [it for it in winfo if varname in it["wasteName"] or it["wasteName"] == varname]
        if not cands:
            stem = varname.rstrip("류")
            cands = [it for it in winfo if stem and stem in it["wasteName"]]
        if cands:
            picks = [c for c in cands if len(c["wasteCode"]) == 5]
            picks = picks or cands
            print(f"  {varname:<20} 후보: " + ", ".join(f"{c['wasteCode']}={c['wasteName']}" for c in picks[:5]))
