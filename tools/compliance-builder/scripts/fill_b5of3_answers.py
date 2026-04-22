# -*- coding: utf-8 -*-
"""
fill_b5of3_answers.py — 별표5의3 미작성 answer 자동 채움

전략:
  1. 각 항목의 text 끝 표현으로 의무/허용 구분
     - "~해야 한다" / "~하여야 한다" → "~하겠음." (의무)
     - "~할 수 있다" → "~할 수 있음을 숙지하겠음."
     - "~미만/이하/이상" 등 수치 기준 → "(기준) 충족하겠음."
  2. 이미 answer 키가 있으면 건너뜀
  3. 기본 결과만 생성 — 폐기물별 태그는 수동으로 enrich

실행:
  python scripts/fill_b5of3_answers.py
"""

import json
import re
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
TARGET = BASE / "data" / "검토사항" / "시행규칙" / "별표5의3_재활용기준.json"


def _clean(t: str) -> str:
    """법령 text 앞뒤 공백·번호표기 정리."""
    return re.sub(r"\s+", " ", (t or "").strip())


def _obligation_to_commitment(s: str) -> str:
    """의무 표현을 다짐 표현으로 변환."""
    # 문장 끝 패턴 변환
    s = s.rstrip("。 .")
    patterns = [
        (r"하여야\s*한다$", "하겠음"),
        (r"해야\s*한다$", "하겠음"),
        (r"하여야\s*하며$", "하겠으며"),
        (r"해야\s*하며$", "하겠으며"),
        (r"하여야\s*한다는$", "하겠다는"),
        (r"아니\s*된다$", "하지 않겠음"),
        (r"아니하여야\s*한다$", "하지 않겠음"),
        (r"않아야\s*한다$", "않겠음"),
        (r"할\s*수\s*있다$", "할 수 있음을 숙지하겠음"),
        (r"수\s*없다$", "수 없음을 숙지하겠음"),
        (r"적합해야\s*한다$", "적합하도록 하겠음"),
        (r"적합하여야\s*한다$", "적합하도록 하겠음"),
        (r"갖추어야\s*한다$", "갖추겠음"),
        (r"갖춰야\s*한다$", "갖추겠음"),
        (r"준수해야\s*한다$", "준수하겠음"),
        (r"준수하여야\s*한다$", "준수하겠음"),
        (r"설치·운영해야\s*한다$", "설치·운영하겠음"),
        (r"따라야\s*한다$", "따르겠음"),
        (r"처리해야\s*한다$", "처리하겠음"),
        (r"재활용해야\s*한다$", "재활용하겠음"),
        (r"사용해야\s*한다$", "사용하겠음"),
        (r"보관해야\s*한다$", "보관하겠음"),
        (r"회수해야\s*한다$", "회수하겠음"),
        (r"분리해야\s*한다$", "분리하겠음"),
        (r"제거해야\s*한다$", "제거하겠음"),
        (r"보존해야\s*한다$", "보존하겠음"),
    ]
    for pat, rep in patterns:
        if re.search(pat, s):
            s = re.sub(pat, rep, s)
            return s + "."
    # 매칭 실패
    return s + "."


def make_answer(text: str) -> str:
    """text에서 answer 기본값 생성."""
    t = _clean(text)
    if not t:
        return ""

    # 수치 기준 단문 (예: "납: 킬로그램 당 3,200밀리그램 미만")
    if re.match(r"^[가-힣A-Za-z0-9()\s]+[::]\s*.+(미만|이하|이상|초과)$", t):
        return f"{t} 기준을 충족하겠음."

    # '다음의 기준을 준수하여 재활용해야 한다' 형태
    if "다음의 기준을 준수" in t and t.endswith(("한다", "한다.")):
        return re.sub(r"다음의.*?(준수|적합).*?한다\.?$", "하위 기준을 준수하겠음", t) + "."

    # 일반적 의무/허용
    return _obligation_to_commitment(t)


def walk(items, counters):
    """재귀 순회하며 answer 필드 채움."""
    for it in items:
        if not isinstance(it, dict):
            continue
        if "text" in it and "answer" not in it:
            it["answer"] = make_answer(it["text"])
            counters["filled"] += 1
        elif "answer" in it:
            counters["skipped"] += 1

        # depth 있는 children: 별표5의3은 flat list라 children 없음
        # 하지만 혹시 모를 nested 구조 대비
        for k in ("children", "items", "sub"):
            if k in it and isinstance(it[k], list):
                walk(it[k], counters)


def main():
    data = json.loads(TARGET.read_text(encoding="utf-8"))
    items = data.get("별표내용", [])

    counters = {"filled": 0, "skipped": 0}
    walk(items, counters)

    TARGET.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"✅ 완료: 신규 {counters['filled']}건, 기존 {counters['skipped']}건")


if __name__ == "__main__":
    main()
