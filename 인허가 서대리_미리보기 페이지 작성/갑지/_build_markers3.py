# -*- coding: utf-8 -*-
r"""마커컷3 빌드.

`_build_markers2.py` 의 규격(여백 2px · 글씨 16px · 스냅 · 기록)을 그대로 쓰되,
대상 flow 와 출력 폴더만 바꿔 `마커컷3` 을 만든다.

  python _build_markers3.py            전량
  python _build_markers3.py 01 05      해당 파트만
"""
import os, sys

# stdout 인코딩은 _build_markers2 가 import 시점에 설정한다(여기서 또 감싸면 충돌)
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

import _build_markers2 as M

# 잘린 카드(test_컷)를 참조하므로 경로 치환 규칙을 하나 더 둔다
_SHOTS = M.SHOTS.replace('\\', '/')
_orig_prepare = M.prepare


def prepare(src, font_px=None):
    """마커컷3 은 자체 디자인(주석 레일)을 쓰므로 2단계 공통 토큰을 덮어씌우지 않는다.
       경로만 절대경로로 바꾼다."""
    s = open(src, encoding='utf-8').read()
    return s.replace('../갑지/자료/화면캡처/test_컷', _SHOTS + '/test_컷')


M.prepare = prepare
M.OUT = os.path.join(M.SHOTS, '마커컷3')
M.CUTS = [
    ('flow3_01_서류선택.html',            '01_서류선택_marker'),
    ('flow3_02_서류담기.html',            '02_서류담기_marker'),
    ('flow3_03_사업장정보_기본.html',       '03_사업장정보_기본_marker'),
    ('flow3_04_사업장정보_주소연락처.html',  '04_사업장정보_주소연락처_marker'),
    ('flow3_05_사업장정보_업종.html',       '05_사업장정보_업종_marker'),
    ('flow3_06_제출청.html',              '06_제출청_marker'),
    ('flow3_07_제출시점.html',            '07_제출시점_marker'),
    ('flow3_08_검증생성.html',            '08_검증생성_marker'),
]
# 폭을 맞출 묶음 — 사업장 정보 3파트는 나란히 보므로 같은 폭이어야 한다
M.WIDTH_GROUPS = {
    '사업장정보': ['03_사업장정보_기본_marker', '04_사업장정보_주소연락처_marker',
                '05_사업장정보_업종_marker'],
    '제출단계': ['06_제출청_marker', '07_제출시점_marker'],
}

if __name__ == '__main__':
    M.main()
