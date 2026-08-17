# -*- coding: utf-8 -*-
"""강조 시안 렌더 (스냅·공통토큰 없이 그대로 찍는다)."""
import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import _build_markers2 as M

_S = M.SHOTS.replace(chr(92), "/")
M.prepare = lambda src, font_px=None: (
    open(src, encoding="utf-8").read().replace("../갑지/자료/화면캡처/test_컷", _S + "/test_컷"))
M.OUT = os.path.join(M.SHOTS, "스타일시안")
_NAMES = ["0_소프트필", "1_헤어라인", "3_그라데이션"]
M.CUTS = [("style_%s.html" % n, n) for n in _NAMES]
M.WIDTH_GROUPS = {"시안": _NAMES}
MARGIN = 44          # 잘라낸 뒤 둘레에 더 줄 여백(device px)

if __name__ == "__main__":
    import _shots_util as U
    M.main()
    U.unify(M.OUT, MARGIN)
