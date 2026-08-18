# -*- coding: utf-8 -*-
r"""미리보기 갑지 최종본 생성기.

원본 캡처(test.png 를 카드 단위로 자른 test_컷)를 소스로,
마커컷2 에서 확정한 문구를 그대로 쓰고, 주석 패널 스타일(annotate/work)로 렌더한다.

  1) 시드 박스를 소스 PNG 위에서 **픽셀 스캔으로 스냅** → 대상 실제 경계 + 2px
  2) 패널 crop 의 위·아래를 **배경 행에 맞춰 스냅** → 행이 반토막 나지 않는다
  3) annotate 스키마 JSON 을 만들고 패널 PNG 를 잘라낸다
  4) work/ 렌더러로 섹션 카드를 뽑는다

  python gen_final.py            전량
  python gen_final.py 01 03      해당 섹션만
"""
import io, json, os, subprocess, sys

import numpy as np
from PIL import Image

# stdout 인코딩은 아래 _build_markers2 가 import 시점에 설정한다(여기서 또 감싸면 충돌)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SHOTS = os.path.join(ROOT, '갑지', '자료', '화면캡처')
CUTS = os.path.join(SHOTS, 'test_컷')
ANN = os.path.join(SHOTS, 'annotate')
WORK = os.path.join(ANN, 'work')
OUT = os.path.join(SHOTS, '미리보기_갑지_최종')
IMGDIR = os.path.join(OUT, 'img')
TMP = os.path.join(ROOT, '갑지', '_tmp_final')

sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, '갑지'))
import _build_markers2 as M          # snap() 재사용

CHROME = M.CHROME

# ── 카드 규격 ──────────────────────────────────────────────────────
# 소스 화면이 1549 CSS 로 넓어 기본 카드(1010)에 넣으면 글씨가 뭉갠다.
# 카드를 키우고 IW + GAP + CW = CARD - 62 를 유지한다.
CARD_W = 1440
SIDE = dict(IW=940, GAP=26, CW=412, IX=0, CPL=43)
assert SIDE['IW'] + SIDE['GAP'] + SIDE['CW'] == CARD_W - 62

SRC_SCALE = 2          # test_컷 은 레티나 2배
PADY = 40              # crop 위·아래 최소 여백(섹션 좌표). 패널별로 g['pady'] 로 재정의.
#   좁게 주면 대상 위의 라벨(‘표준산업분류코드’)이나 카드 테두리가 반토막 난다.
#   snap_edge 는 ‘거의 전부 배경인 행’만 후보로 삼는데 카드 안쪽은 배경이 아니다.
#   따라서 탐색 범위가 카드 바깥까지 닿을 만큼 넉넉해야 후보를 찾는다.

# ── 섹션 정의 ──────────────────────────────────────────────────────
#   b   : 시드 박스 [x,y,w,h] · 소스의 CSS 좌표. 스냅으로 보정된다.
#   g   : 패널 = 항목 인덱스 묶음 + 라벨
S = [
 dict(key='s01', src='test_2.png', step='STEP 01', title='서류 선택',
      sub='신청할 갑지 서류를 고르는 단계입니다',
      f=[dict(b=[38, 318, 982, 64], title='이름으로 검색',
              desc='서류 이름을 입력하면 관련 서류만 바로 걸러집니다.'),
         dict(b=[38, 402, 874, 106], grow=(3, 3), title='분야로 좁히기',
              desc='대기 · 폐수 · 소음 등 분야를 눌러 목록을 좁히세요. 숫자는 그 분야에서 고른 서류 수입니다.'),
         dict(b=[838, 596, 164, 40], title='펼쳐서 상세 선택',
              desc='시설군을 클릭하면 설치신고 · 변경신고처럼 세부 서류를 고를 수 있습니다.')],
      xcrop=(0, 1040),          # 우측 '담은 서류' 컬럼은 STEP 02 에서 다룬다
      g=[dict(f=[0, 1], label='이름 검색 · 분야 필터', ycrop=(296, 516)),
         # 머리만 잘라 놓으면 무엇이 펼쳐지는지 안 보인다. 첫 줄까지 넣는다.
         dict(f=[2], label='시설군 펼치기', ycrop=(524, 756))]),

 dict(key='s02', src='test_2.png', step='STEP 02', title='서류 담기',
      sub='선택한 서류가 오른쪽에 쌓이고 금액이 함께 계산됩니다',
      f=[dict(b=[66, 686, 932, 60], grow=(0, 16), title='서류 체크',
              desc='체크하면 오른쪽 목록에 바로 담깁니다. 여러 종을 동시에 고를 수 있습니다.'),
         dict(b=[1060, 172, 450, 225], title='담은 서류 확인',
              desc='선택한 서류가 시설군별로 정리됩니다. ×로 하나씩, [전체 해제]로 한 번에 지웁니다.'),
         dict(b=[1060, 432, 450, 44], np='mid', title='예상 금액',
              desc='선택한 종수에 따라 금액이 자동으로 계산됩니다.'),
         dict(b=[1080, 506, 406, 50], title='다음 단계로',
              desc='누르면 사업장 정보 입력 화면으로 넘어갑니다.')],
      # 체크한 줄만 잘라 내면 위 시설군 머리와 아래 줄이 반토막 난다.
      # 검색 결과 줄부터 시설군 카드 전체(5줄)까지 넣어 실제 화면과 같게 본다.
      g=[dict(f=[0], label='목록에서 체크', ycrop=(524, 946), xcrop=(0, 1040)),
         dict(f=[1, 2, 3], label='담은 결과 · 금액 · 다음', ycrop=(150, 628))],
      # 목록에서 체크한 것이 오른쪽 담은 목록으로 넘어간다는 흐름을 화살표로 잇는다.
      flow=[dict(**{'from': 1, 'to': 2, 'text': '체크하면 바로 담깁니다'})]),

 dict(key='s03', src='test_3.png', step='STEP 03', title='사업장 정보 · 기본',
      sub='선택한 모든 서류에 공통으로 기재되는 정보입니다',
      # 개인(왼쪽) 콜아웃을 위에 두면 지시선이 법인 박스를 가로지른다 → co 로 아래에 배치
      f=[dict(b=[38, 312, 730, 58], wire='bottom', co=2, title='개인 선택',
              desc='개인 사업자면 이쪽입니다. 아래에 대표자 주민등록번호 칸이 나옵니다.'),
         dict(b=[782, 312, 728, 58], co=1, title='법인 선택',
              desc='법인 사업자면 이쪽입니다. 아래에 법인등록번호 칸이 나옵니다.'),
         # 빈 칸만 보여 주면 무엇을 넣는 칸인지 알기 어렵다.
         # 개인·법인 각각 값이 들어간 화면을 나란히 놓아 라벨이 바뀌는 걸 보인다.
         dict(b=[18, 506, 978, 36], snap=False, src='갑지생성4.png', scale=1,
              title='개인을 골랐을 때',
              desc='라벨이 주민등록번호로 바뀌고, 대표자 한 명의 주민등록번호를 넣습니다.'),
         dict(b=[19, 507, 978, 36], snap=False, src='갑지생성5.png', scale=1,
              title='법인을 골랐을 때',
              desc='라벨이 법인등록번호로 바뀌고, 법인의 법인등록번호를 넣습니다.')],
      # 라벨과 앞뒤 칸이 같이 보여야 화면 어디인지 읽힌다. 위아래로 넉넉히 잡는다.
      g=[dict(f=[0, 1], label='사업자 유형', ycrop=(252, 536)),
         dict(f=[2], label='개인 · 주민등록번호', src='갑지생성4.png', scale=1,
              ycrop=(444, 628)),
         dict(f=[3], label='법인 · 법인등록번호', src='갑지생성5.png', scale=1,
              ycrop=(445, 629))]),

 dict(key='s04', src='test_3.png', step='STEP 04', title='사업장 정보 · 주소와 연락처',
      sub='주소는 검색으로 넣고, 여러 곳이면 칸을 늘립니다',
      f=[dict(b=[1400, 976, 110, 26], title='주소 추가',
              desc='사업장 주소가 여러 곳이면 칸을 늘릴 수 있습니다.'),
         dict(b=[1338, 1100, 150, 48], title='주소는 검색으로',
              desc='직접 타이핑하지 않고 눌러서 고릅니다.'),
         dict(b=[38, 1240, 1470, 50], title='전화번호',
              desc='사업장 전화번호가 없다면 연락 가능한 휴대폰 번호를 적어 주세요.')],
      g=[dict(f=[0, 1], label='주소 추가 · 검색', ycrop=(950, 1192)),
         # 칸만 보이면 무슨 번호를 넣는지 모른다. 머리와 휴대폰 칸까지 함께 넣는다.
         dict(f=[2], label='연락처', ycrop=(1192, 1414))]),

 dict(key='s05', src='test_3.png', step='STEP 05', title='사업장 정보 · 업종',
      sub='코드 앞자리만 넣으면 목록에서 골라 분류명까지 한 번에 채워집니다',
      # 코드(왼쪽) 콜아웃을 위에 두면 지시선이 분류명 박스를 가로지른다 → co 로 아래에 배치
      # 업종 추가 버튼과 코드·분류명 칸은 같은 카드라 한 장으로 묶는다.
      # 콜아웃은 위→아래로 업종추가 → 분류명 → 분류코드 순(co). 왼쪽 칸을 맨 아래로
      # 내려야 그 지시선이 오른쪽 분류명 박스를 가로지르지 않는다.
      f=[dict(b=[1400, 1555, 100, 22], co=1, title='업종 추가',
              desc='업종이 여러 개면 칸을 늘릴 수 있습니다.'),
         # 두 칸 모두 test_3 위에서 테두리를 직접 재서 넣었다(스냅 반경으로는 못 맞춘다).
         dict(b=[67, 1706, 548, 54], snap=False, wire='bottom', co=3, np='mid', title='분류코드',
              desc='한국표준산업분류 11차 코드를 넣는 칸입니다. 앞자리만 넣어도 됩니다.'),
         dict(b=[652, 1706, 830, 54], snap=False, co=2, np='mid', title='분류명',
              desc='코드를 고르면 나머지 한 칸이 자동으로 채워집니다.'),
         # 자동완성 목록은 test_3 에 없는 화면이라 갑지생성6-2 에서 따로 좌표를 뜬다
         dict(b=[28, 114, 374, 36], src='갑지생성6-2.png', scale=1, np='mid', title='앞자리만 입력',
              desc='코드 앞자리만 쳐도 해당하는 업종이 목록으로 떠오릅니다.'),
         dict(b=[28, 157, 374, 50], src='갑지생성6-2.png', scale=1, title='목록에서 선택',
              desc='목록에서 고르면 코드와 분류명이 함께 채워집니다.')],
      g=[dict(f=[0, 1, 2], label='업종 추가 · 코드 · 분류명'),
         dict(f=[3, 4], label='코드 자동완성', src='갑지생성6-2.png', scale=1,
              ycrop=(6, 354))]),

 # 서류가 여러 종이면 첫 제출청을 넣는 순간 '일괄 적용' 확인 창이 뜬다.
 # test_4 는 서류 한 종만 잡힌 캡처라 4종이 다 보이는 갑지생성7 로 바꿨다.
 dict(key='s06', src='갑지생성7.png', scale=1, step='STEP 06', title='제출청',
      sub='첫 서류의 제출청을 넣으면 나머지 서류에 한 번에 적용할 수 있습니다',
      f=[dict(b=[83, 170, 895, 31], title='첫 서류 제출청',
              desc='맨 위 서류의 제출청을 먼저 넣습니다. 검색해서 고르는 칸입니다.'),
         dict(b=[83, 300, 895, 310], snap=False, np='mid', title='나머지 서류',
              desc='아래 서류들의 제출청 칸입니다. 일괄 적용을 누르면 여기가 한 번에 채워집니다.'),
         # 확인 창은 갑지생성7-1 에만 있다. 취소(왼쪽) 콜아웃을 아래로 내려야 선이 안 꼬인다.
         dict(b=[567, 327, 60, 36], src='갑지생성7-1.png', scale=1, co=1, title='확인',
              desc='누르면 아래 서류에 모두 같은 제출청이 채워집니다.'),
         dict(b=[497, 327, 62, 37], src='갑지생성7-1.png', scale=1, co=2,
              wire='bottom', title='취소',
              desc='관청이 서류마다 다르면 취소하고 서류별로 따로 넣으세요.')],
      g=[dict(f=[0, 1], label='서류별 제출청 입력', ycrop=(0, 638)),
         dict(f=[2, 3], label='일괄 적용 확인 창', src='갑지생성7-1.png', scale=1,
              ycrop=(222, 396))]),

 # 단위 탭은 셋 중 하나를 고르는 선택지다. 칸마다 박스를 치면 시끄러워서
 # 박스는 컨트롤 하나로 두고 세 칸에 점(dots)만 찍어 '고를 게 셋'임을 보인다.
 dict(key='s07', src='test_5.png', step='STEP 07', title='제출 시점',
      sub='서류에 적을 날짜 단위를 셋 중에 고르고 시점을 넣습니다',
      f=[dict(b=[38, 198, 1472, 52], np='mid',
              dots=[[337, 230], [824, 230], [1307, 230]],
              title='입력 단위 선택',
              desc='일자 · 연/월 · 연도 셋 중에서 서류에 기재할 단위를 하나 고릅니다.'),
         dict(b=[38, 356, 1470, 52], title='제출 시점 입력',
              desc='고른 단위에 맞춰 칸 모양이 바뀝니다. 달력에서 골라 넣으세요.')],
      g=[dict(f=[0], label='단위 선택', ycrop=(158, 266)),
         dict(f=[1], label='시점 입력', ycrop=(322, 424))]),

 dict(key='s08', src='test_6.png', step='STEP 08', title='검증 · 서류 생성',
      sub='빠진 곳을 확인하고 서류를 만듭니다',
      # 번호 순서 = 콜아웃 쌓이는 순서. 오른쪽 박스부터 번호를 매겨야 선이 안 꼬인다.
      # 좌표는 test_6 위에서 픽셀로 직접 재서 넣었다(스냅 탐색 반경 9px 로는 못 맞춘다).
      f=[dict(b=[1383, 48, 162, 60], snap=False, title='서류 생성',
              desc='모든 항목을 채우면 버튼이 켜집니다. 누르면 최종 확인 화면으로 넘어갑니다.'),
         dict(b=[1212, 48, 156, 60], snap=False, wire='bottom', title='검증하기',
              desc='누르면 채우지 않은 항목을 한 번에 찾아 빨갛게 표시해 줍니다.'),
         dict(b=[348, 42, 208, 72], snap=False, wire='bottom', title='예상 금액',
              desc='고른 서류 종수 기준으로 계산된 금액입니다.'),
         dict(b=[4, 14, 470, 57], src='갑지생성10.png', scale=1, wire='bottom', title='작성 완성도',
              desc='채운 만큼 막대가 찹니다. 100% 가 되면 [서류 생성] 버튼이 켜집니다.')],
      # 왼쪽 진행률 영역은 test_6 에서 잘려 비어 보인다. 구분선부터 잘라 낸다(08-2 가 따로 다룸).
      xcrop=(318, 1549),
      g=[dict(f=[0, 1, 2], label='금액 · 검증 · 생성'),
         dict(f=[3], label='진행률', src='갑지생성10.png', scale=1)]),

 # 최종 확인 화면은 사업장 정보 · 선택 서류 · 제출청/시점 세 덩어리를 훑고 생성 버튼을 누른다.
 # 캡처가 화면별로 따로라 패널 셋으로 나눠 붙였다.
 dict(key='s09', src='갑지생성11.png', scale=1, step='STEP 09', title='최종 확인',
      sub='만들기 전에 입력한 내용을 항목별로 마지막까지 확인합니다',
      f=[dict(b=[445, 109, 608, 532], snap=False, np='mid', co=2,
              title='사업장 정보 확인',
              desc='앞에서 넣은 사업장 정보가 그대로 들어갔는지 한 줄씩 확인합니다.'),
         dict(b=[1085, 109, 320, 40], snap=False, co=1, title='서류 생성',
              desc='선택하신 금액이 표시됩니다. 누르면 서류가 만들어지고 바로 내려받을 수 있습니다.'),
         dict(b=[14, 10, 608, 325], snap=False, np='mid', src='갑지생성11-1.png', scale=1,
              title='선택 서류 확인',
              desc='고른 서류가 빠짐없이 담겼는지 종수와 목록을 확인합니다.'),
         dict(b=[9, 14, 608, 316], snap=False, np='mid', src='갑지생성11-2.png', scale=1,
              title='제출청 확인',
              desc='서류마다 제출청이 맞게 들어갔는지 확인합니다.'),
         dict(b=[9, 349, 608, 125], snap=False, np='mid', src='갑지생성11-2.png', scale=1,
              title='제출 시점 확인',
              desc='고른 입력 단위와 제출 시점이 맞는지 확인합니다.')],
      g=[dict(f=[0, 1], label='사업장 정보 · 생성', xcrop=(428, 1425),
              mask=[[957, 311, 82, 18],     # 법인등록번호
                    [954, 348, 86, 18],     # 사업자등록번호
                    [892, 385, 147, 18],    # 사업장 주소
                    [1002, 422, 37, 18],    # 상세주소
                    [962, 459, 77, 18],     # 사업장 전화번호
                    [946, 496, 93, 18]]),   # 휴대폰 번호
         dict(f=[2], label='선택 서류', src='갑지생성11-1.png', scale=1),
         dict(f=[3, 4], label='제출청 · 제출 시점', src='갑지생성11-2.png', scale=1)]),

 dict(key='s10', src='갑지생성12.png', scale=1, step='STEP 10', title='생성 · 다운로드',
      sub='서류를 만드는 동안 잠시 기다리시면 됩니다',
      f=[dict(b=[1124, 42, 91, 47], title='처리 중',
              desc='서류를 만드는 동안 상태가 [처리 중] 으로 표시됩니다.'),
         dict(b=[1116, 48, 99, 45], src='갑지생성12-1.png', title='생성 완료',
              desc='다 만들어지면 [생성 완료] 로 바뀝니다.'),
         dict(b=[1071, 208, 144, 56], src='갑지생성12-1.png', wire='bottom', title='눌러서 받으세요',
              desc='만들어진 서류는 3일간 보관됩니다. 그 안에 내려받아 주세요.')],
      g=[dict(f=[0], label='만드는 중'),
         dict(f=[1, 2], label='완료 · 내려받기', src='갑지생성12-1.png')]),

 # 결과물은 주석 달 화면이 아니라 만들어진 서류 자체다.
 # 박스·지시선 없이 카드 머리만 같은 스타일로 두고 그리드로 늘어놓는다.
 dict(key='s11', step='', title='결과물', gallery=True,
      sub='입력한 사업장 정보가 선택한 갑지에 그대로 채워져 나옵니다',
      docs=[('예시1_대기배출시설 설치신고.png', '대기배출시설 설치신고'),
            ('예시5_폐수배출시설 설치신고.png', '폐수배출시설 설치신고'),
            ('예시3_소음진동배출시설 설치신고.png', '소음·진동배출시설 설치신고'),
            ('예시2_사업장폐기물배출자(별지6호) 신고.png', '사업장폐기물배출자 신고'),
            ('예시4_폐기물중간재활용업 허가신청.png', '폐기물중간재활용업 허가신청')],
      note='한 번 넣은 사업장 정보로 선택한 서류가 모두 함께 만들어집니다'),
]


# ── 배경 행 스냅 ────────────────────────────────────────────────────
def bg_rows(a):
    """행마다 '배경 비율'을 구한다(카드 사이 빈 줄 찾기용)."""
    s = a[::3, ::3].reshape(-1, 3)
    v, c = np.unique(s, axis=0, return_counts=True)
    bg = v[c.argmax()]
    return (np.abs(a - bg).sum(axis=2) < 12).mean(axis=1)


def snap_edge(ratio, at, lo, hi, thr=0.985):
    """at 근처에서 '거의 전부 배경'인 행을 찾는다. 없으면 at 그대로."""
    cand = [i for i in range(max(0, lo), min(len(ratio), hi)) if ratio[i] > thr]
    return min(cand, key=lambda i: abs(i - at)) if cand else at


def pixelate(img, boxes, scale, cell=6):
    """개인정보 값을 모자이크 처리한다. boxes 는 잘라낸 패널 기준 CSS 좌표 [x,y,w,h]."""
    for x, y, w, h in boxes:
        r = (max(0, x * scale), max(0, y * scale),
             min(img.width, (x + w) * scale), min(img.height, (y + h) * scale))
        if r[2] <= r[0] or r[3] <= r[1]:
            continue
        patch = img.crop(r)
        nx, ny = max(1, patch.width // cell), max(1, patch.height // cell)
        img.paste(patch.resize((nx, ny), Image.BILINEAR)
                       .resize(patch.size, Image.NEAREST), r)
    return img


def save_panel(gim, g, gx0, gx1, y0, y1, scale, gi, note=''):
    out = gim.crop((gx0 * scale, y0 * scale, gx1 * scale, y1 * scale))
    if g.get('mask'):   # 실제 등록번호·주소·연락처는 그대로 실으면 안 된다
        out = pixelate(out, [[b[0] - gx0, b[1] - y0, b[2], b[3]] for b in g['mask']], scale)
        note += ' · 모자이크 %d' % len(g['mask'])
    out.save(os.path.join(IMGDIR, g['img']))
    print('   패널 %d  crop y %d~%d (%dpx%s) → %s' % (gi, y0, y1, y1 - y0, note, g['img']))


# ── 빌드 ───────────────────────────────────────────────────────────
def open_src(name):
    """test_컷 우선, 없으면 화면캡처 루트(갑지생성*.png)."""
    p = os.path.join(CUTS, name)
    if not os.path.exists(p):
        p = os.path.join(SHOTS, name)
    return Image.open(p).convert('RGB')


def build_section(sec, ratio_cache):
    im = open_src(sec['src'])
    SRC_SCALE = sec.get('scale', 2)
    cw, ch = im.width // SRC_SCALE, im.height // SRC_SCALE

    # 주석이 한쪽에만 몰린 화면은 가로도 잘라 낸다. 무관한 컬럼이 딸려 오면
    # crop 경계에서 남의 내용이 반토막 나고 표시 배율도 불필요하게 작아진다.
    x0, x1 = sec.get('xcrop') or (0, cw)
    ck = (sec['src'], x0, x1)
    if ck not in ratio_cache:
        ratio_cache[ck] = bg_rows(np.asarray(im).astype(int)[:, x0 * SRC_SCALE:x1 * SRC_SCALE])
    ratio = ratio_cache[ck]

    print('■ %s %s · %s (%dx%d CSS · 가로 %d~%d)'
          % (sec['step'], sec['title'], sec['src'], cw, ch, x0, x1))

    # 1) 시드 → 스냅 (소스 픽셀 좌표에서 수행하고 CSS 로 되돌린다)
    for i, f in enumerate(sec['f'], 1):
        x, y, w, h = f['b']
        fim = open_src(f['src']) if f.get('src') else im
        SRC_SCALE = f.get('scale', sec.get('scale', 2))
        if f.get('snap') is False:      # 여러 요소를 한 박스로 묶은 경우 스냅이 오히려 망친다
            print('   %d. %-14s 시드 %s (스냅 생략)' % (i, f['title'][:12], f['b']))
            continue
        sx, sy, sw, sh = M.snap(fim, (x * SRC_SCALE, y * SRC_SCALE,
                                      w * SRC_SCALE, h * SRC_SCALE),
                                search=9 * SRC_SCALE, pad=0)
        nb = [round(sx / SRC_SCALE), round(sy / SRC_SCALE),
              round(sw / SRC_SCALE), round(sh / SRC_SCALE)]
        # grow=(dx,dy) · 스냅이 대상에 딱 붙인 뒤 사면 여백을 따로 벌린다.
        # 여러 요소를 한 박스로 묶을 때 좌우 여백만 넓고 위아래가 붙어 보이는 걸 맞춘다.
        gx, gy = f.get('grow', (0, 0))
        nb = [nb[0] - gx, nb[1] - gy, nb[2] + gx * 2, nb[3] + gy * 2]
        d = [nb[0] - x, nb[1] - y, nb[2] - w, nb[3] - h]
        f['b'] = nb
        print('   %d. %-14s 시드 %s → 스냅 %s  이동 %s' % (i, f['title'][:12], [x, y, w, h], nb, d))

    # 1-b) 맞붙은 박스 처리
    #   기본 여백 2px 이 양쪽에 붙으면 위아래로 인접한 박스가 4px 겹친다.
    #   맞붙은 쌍은 그 변의 여백을 0 으로 주어 타이트하게 따고(pad),
    #   아래 박스의 번호는 위 박스 테두리와 부딪치므로 왼쪽 변 중앙으로 뺀다(np).
    for g in sec['g']:
        ks = sorted(g['f'], key=lambda k: sec['f'][k]['b'][1])
        for a, b in zip(ks, ks[1:]):
            A, B = sec['f'][a], sec['f'][b]
            # 가로로 겹치지 않으면 나란히 놓인 것뿐이다(세로 인접이 아니다)
            if min(A['b'][0] + A['b'][2], B['b'][0] + B['b'][2]) - max(A['b'][0], B['b'][0]) <= 0:
                continue
            gap = B['b'][1] - (A['b'][1] + A['b'][3])
            if gap < 2 * M.PAD:                       # 여백을 주면 겹친다
                A['pad'] = B['pad'] = 0
                B['np'] = 'mid'
                print('   ! %s ↔ %s 간격 %dpx → 여백 0, %s 번호는 중앙'
                      % (A['title'], B['title'], gap, B['title']))

    # 2) 패널 crop · 항목 범위 + 여백, 위아래를 배경 행에 스냅
    for gi, g in enumerate(sec['g'], 1):
        gim = open_src(g['src']) if g.get('src') else im
        SRC_SCALE = g.get('scale', sec.get('scale', 2))
        gw, gh = gim.width // SRC_SCALE, gim.height // SRC_SCALE
        gx0, gx1 = g.get('xcrop') or ((x0, x1) if gim is im else (0, gw))
        gk = (g.get('src', sec['src']), gx0, gx1)
        if gk not in ratio_cache:
            ratio_cache[gk] = bg_rows(np.asarray(gim).astype(int)
                                      [:, gx0 * SRC_SCALE:gx1 * SRC_SCALE])
        gr = ratio_cache[gk]

        top = min(sec['f'][k]['b'][1] for k in g['f'])
        bot = max(sec['f'][k]['b'][1] + sec['f'][k]['b'][3] for k in g['f'])
        py = g.get('pady', PADY)
        if g.get('ycrop'):                       # 스냅으로 못 잡는 화면은 직접 지정
            y0, y1 = g['ycrop']
            y0, y1 = max(0, int(y0)), min(gh, int(y1))
            g['crop'] = [gx0, y0, gx1 - gx0, y1 - y0]
            g['mode'] = 'side'
            g['img'] = '%s-%d.png' % (sec['key'], gi)
            save_panel(gim, g, gx0, gx1, y0, y1, SRC_SCALE, gi, ' · 지정')
            continue
        y0 = snap_edge(gr, (top - py) * SRC_SCALE,
                       (top - py * 3) * SRC_SCALE, (top - 4) * SRC_SCALE) // SRC_SCALE
        y1 = snap_edge(gr, (bot + py) * SRC_SCALE,
                       (bot + 4) * SRC_SCALE, (bot + py * 3) * SRC_SCALE) // SRC_SCALE
        y0, y1 = max(0, int(y0)), min(gh, int(y1))
        g['crop'] = [gx0, y0, gx1 - gx0, y1 - y0]
        g['mode'] = 'side'
        g['img'] = '%s-%d.png' % (sec['key'], gi)
        save_panel(gim, g, gx0, gx1, y0, y1, SRC_SCALE, gi)

    sec['cw'], sec['ch'] = cw, ch
    return sec


CSS_OVERRIDE = """
.ag{width:%(card)dpx}
.ag-head{padding:24px 30px 22px}
.ag-head h2{font-size:22px}
""" % dict(card=CARD_W)

JS_OVERRIDE = ("AG_LAYOUT.side.IW=%(IW)d;AG_LAYOUT.side.GAP=%(GAP)d;"
               "AG_LAYOUT.side.CW=%(CW)d;AG_LAYOUT.side.IX=%(IX)d;"
               "AG_LAYOUT.side.CPL=%(CPL)d;") % SIDE


def render(sec):
    css = open(os.path.join(WORK, 'annotation-guide.css'), encoding='utf-8').read() + CSS_OVERRIDE
    js = open(os.path.join(WORK, 'annotation-guide.js'), encoding='utf-8').read()
    data = dict(sec, imgBase='file:///%s/' % IMGDIR.replace('\\', '/'))
    html = ('<!doctype html><html lang="ko"><head><meta charset="utf-8">\n'
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/'
            'pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">\n'
            '<style>%s\nhtml,body{margin:0;padding:36px;background:#fff}</style></head>'
            '<body><div id="root"></div>\n<script>%s</script>\n'
            '<script>%sconst DATA=%s;document.getElementById("root").innerHTML=renderGuideSection(DATA);'
            'AG_fixWires();AG_fixFlows(document, DATA);</script></body></html>'
            % (css, js, JS_OVERRIDE, json.dumps(data, ensure_ascii=False)))
    os.makedirs(TMP, exist_ok=True)
    p = os.path.join(TMP, '_x.html')
    open(p, 'w', encoding='utf-8').write(html)
    # 업로드용 · 파일명은 순번 ASCII 로만. 한글이 들어가면 인코딩 문제가 난다.
    dst = os.path.join(OUT, 'step%02d.png' % int(sec['key'][1:]))
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                    '--force-device-scale-factor=2', '--virtual-time-budget=20000',
                    '--window-size=1700,4600', '--screenshot=' + dst,
                    'file:///' + p.replace('\\', '/')],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    img = Image.open(dst).convert('RGB')
    a = np.asarray(img).astype(int)
    m = np.abs(a - 255).sum(axis=2) > 12
    ys, xs = np.where(m)
    if len(xs):
        pad = 36
        img = img.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                        min(img.width, xs.max() + pad), min(img.height, ys.max() + pad)))
        img.save(dst)
    print('   → %s  %dx%d\n' % (os.path.basename(dst), img.width, img.height))
    return dst


def main():
    only = [a for a in sys.argv[1:] if a.isdigit()]
    os.makedirs(IMGDIR, exist_ok=True)
    cache, done = {}, []
    for sec in S:
        if only and sec['key'][1:] not in only:
            continue
        if sec.get('gallery'):
            import gallery
            gallery.render(sec, root=ROOT, work=WORK, out=OUT, tmp=TMP,
                           chrome=CHROME, card_w=CARD_W, css_override=CSS_OVERRIDE)
            continue
        done.append(build_section(sec, cache))
        render(sec)
    json.dump(done, open(os.path.join(OUT, 'guide-data.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('완료 · %d섹션 → %s' % (len(done), OUT))


if __name__ == '__main__':
    main()
