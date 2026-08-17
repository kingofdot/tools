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
PADY = 16              # crop 위·아래 최소 여백(섹션 좌표)

# ── 섹션 정의 ──────────────────────────────────────────────────────
#   b   : 시드 박스 [x,y,w,h] — 소스의 CSS 좌표. 스냅으로 보정된다.
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
      g=[dict(f=[0, 1], label='이름 검색 · 분야 필터'),
         dict(f=[2], label='시설군 펼치기')]),

 dict(key='s02', src='test_2.png', step='STEP 02', title='서류 담기',
      sub='고른 서류가 오른쪽에 쌓이고 금액이 함께 계산됩니다',
      f=[dict(b=[66, 686, 932, 60], grow=(0, 16), title='서류 체크',
              desc='체크하면 오른쪽 목록에 바로 담깁니다. 여러 종을 동시에 고를 수 있습니다.'),
         dict(b=[1060, 172, 450, 225], title='담은 서류 확인',
              desc='고른 서류가 시설군별로 정리됩니다. ×로 하나씩, [전체 해제]로 한 번에 지웁니다.'),
         dict(b=[1060, 432, 450, 44], np='mid', title='예상 금액',
              desc='고른 종수에 따라 금액이 자동으로 계산됩니다.'),
         dict(b=[1080, 506, 406, 50], title='다음 단계로',
              desc='누르면 사업장 정보 입력 화면으로 넘어갑니다.')],
      g=[dict(f=[0], label='목록에서 체크'),
         dict(f=[1, 2, 3], label='담은 결과 · 금액 · 다음')]),

 dict(key='s03', src='test_3.png', step='STEP 03', title='사업장 정보 — 기본',
      sub='선택한 모든 서류에 공통으로 기재되는 정보입니다',
      f=[dict(b=[38, 312, 730, 58], wire='bottom', title='개인 선택',
              desc='개인 사업자면 이쪽입니다. 아래에 대표자 주민등록번호 칸이 나옵니다.'),
         dict(b=[782, 312, 728, 58], title='법인 선택',
              desc='법인 사업자면 이쪽입니다. 아래에 법인등록번호 칸이 나옵니다.'),
         dict(b=[38, 772, 1470, 52], title='등록번호 입력',
              desc='고른 유형에 맞춰 대표자 주민등록번호 또는 법인등록번호를 넣습니다.')],
      g=[dict(f=[0, 1], label='사업자 유형'),
         dict(f=[2], label='등록번호')]),

 dict(key='s04', src='test_3.png', step='STEP 04', title='사업장 정보 — 주소 · 연락처',
      sub='주소는 검색으로 넣고, 여러 곳이면 칸을 늘립니다',
      f=[dict(b=[1400, 976, 110, 26], title='주소 추가',
              desc='사업장 주소가 여러 곳이면 칸을 늘릴 수 있습니다.'),
         dict(b=[1338, 1100, 150, 48], title='주소는 검색으로',
              desc='직접 타이핑하지 않고 눌러서 고릅니다.'),
         dict(b=[38, 1240, 1470, 50], title='전화번호',
              desc='사업장 전화번호가 없다면 연락 가능한 휴대폰 번호를 적어 주세요.')],
      g=[dict(f=[0, 1], label='주소 추가 · 검색'),
         dict(f=[2], label='연락처')]),

 dict(key='s05', src='test_3.png', step='STEP 05', title='사업장 정보 — 업종',
      sub='코드를 넣으면 분류명이 자동으로 채워집니다',
      f=[dict(b=[1400, 1555, 100, 22], title='업종 추가',
              desc='업종이 여러 개면 칸을 늘릴 수 있습니다.'),
         dict(b=[55, 1700, 565, 45], wire='bottom', title='분류코드',
              desc='한국표준산업분류 11차 코드를 입력합니다. 앞자리만 넣어도 됩니다.'),
         dict(b=[645, 1700, 845, 45], title='분류명',
              desc='코드를 넣으면 나머지 한 칸이 자동으로 채워집니다.')],
      g=[dict(f=[0], label='업종 추가'),
         dict(f=[1, 2], label='코드 · 분류명')]),

 dict(key='s06', src='test_4.png', step='STEP 06', title='제출청',
      sub='서류를 낼 관청을 지정합니다',
      f=[dict(b=[140, 278, 1350, 44], title='서류별 제출청',
              desc='첫 서류의 제출청을 넣으면 아래 서류에도 모두 적용할지 물어봅니다. 관청이 다르면 서류별로 따로 넣으세요.')],
      g=[dict(f=[0], label='제출청 입력')]),

 dict(key='s07', src='test_5.png', step='STEP 07', title='제출 시점',
      sub='서류에 적을 날짜 단위를 고르고 시점을 넣습니다',
      f=[dict(b=[38, 198, 1472, 52], title='입력 단위 선택',
              desc='일자 · 연월 · 연도 셋 중 서류에 기재할 단위를 하나 고릅니다.'),
         dict(b=[38, 356, 1470, 52], title='제출 시점 입력',
              desc='고른 단위에 맞춰 제출 시점을 입력합니다.')],
      g=[dict(f=[0, 1], label='단위 선택 · 시점 입력')]),

 dict(key='s08', src='test_6.png', step='STEP 08', title='검증 · 서류 생성',
      sub='빠진 곳을 확인하고 서류를 만듭니다',
      # 번호 순서 = 콜아웃 쌓이는 순서. 오른쪽 박스부터 번호를 매겨야 선이 안 꼬인다.
      f=[dict(b=[1372, 52, 158, 48], title='서류 생성',
              desc='모든 항목을 채우면 버튼이 켜집니다. 누르면 최종 확인 화면으로 넘어갑니다.'),
         dict(b=[1204, 52, 148, 48], wire='bottom', title='검증하기',
              desc='누르면 채우지 않은 항목을 한 번에 찾아 빨갛게 표시해 줍니다.'),
         dict(b=[350, 44, 205, 58], wire='bottom', title='예상 금액',
              desc='고른 서류 종수 기준으로 계산된 금액입니다.'),
         dict(b=[4, 14, 470, 57], src='갑지생성10.png', scale=1, wire='bottom', title='작성 완성도',
              desc='채운 만큼 막대가 찹니다. 100% 가 되면 [서류 생성] 버튼이 켜집니다.')],
      g=[dict(f=[0, 1, 2], label='금액 · 검증 · 생성'),
         dict(f=[3], label='진행률', src='갑지생성10.png', scale=1)]),

 dict(key='s09', src='갑지생성11.png', scale=1, step='STEP 09', title='최종 확인',
      sub='만들기 전에 입력한 내용을 마지막으로 확인합니다',
      f=[dict(b=[1079, 103, 334, 55], title='서류 생성',
              desc='누르면 서류가 만들어지고 바로 내려받을 수 있습니다. 베타 기간에는 결제 없이 무료입니다.')],
      g=[dict(f=[0], label='내용 확인 · 생성')]),

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

    print('■ %s %s — %s (%dx%d CSS · 가로 %d~%d)'
          % (sec['step'], sec['title'], sec['src'], cw, ch, x0, x1))

    # 1) 시드 → 스냅 (소스 픽셀 좌표에서 수행하고 CSS 로 되돌린다)
    for i, f in enumerate(sec['f'], 1):
        x, y, w, h = f['b']
        fim = open_src(f['src']) if f.get('src') else im
        SRC_SCALE = f.get('scale', sec.get('scale', 2))
        sx, sy, sw, sh = M.snap(fim, (x * SRC_SCALE, y * SRC_SCALE,
                                      w * SRC_SCALE, h * SRC_SCALE),
                                search=9 * SRC_SCALE, pad=0)
        nb = [round(sx / SRC_SCALE), round(sy / SRC_SCALE),
              round(sw / SRC_SCALE), round(sh / SRC_SCALE)]
        # grow=(dx,dy) — 스냅이 대상에 딱 붙인 뒤 사면 여백을 따로 벌린다.
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

    # 2) 패널 crop — 항목 범위 + 여백, 위아래를 배경 행에 스냅
    for gi, g in enumerate(sec['g'], 1):
        gim = open_src(g['src']) if g.get('src') else im
        SRC_SCALE = g.get('scale', sec.get('scale', 2))
        gw, gh = gim.width // SRC_SCALE, gim.height // SRC_SCALE
        gx0, gx1 = (x0, x1) if gim is im else (0, gw)
        gk = (g.get('src', sec['src']), gx0, gx1)
        if gk not in ratio_cache:
            ratio_cache[gk] = bg_rows(np.asarray(gim).astype(int)
                                      [:, gx0 * SRC_SCALE:gx1 * SRC_SCALE])
        gr = ratio_cache[gk]

        top = min(sec['f'][k]['b'][1] for k in g['f'])
        bot = max(sec['f'][k]['b'][1] + sec['f'][k]['b'][3] for k in g['f'])
        y0 = snap_edge(gr, (top - PADY) * SRC_SCALE,
                       (top - PADY * 3) * SRC_SCALE, (top - 4) * SRC_SCALE) // SRC_SCALE
        y1 = snap_edge(gr, (bot + PADY) * SRC_SCALE,
                       (bot + 4) * SRC_SCALE, (bot + PADY * 3) * SRC_SCALE) // SRC_SCALE
        y0, y1 = max(0, int(y0)), min(gh, int(y1))
        g['crop'] = [gx0, y0, gx1 - gx0, y1 - y0]
        g['mode'] = 'side'
        g['img'] = '%s-%d.png' % (sec['key'], gi)
        gim.crop((gx0 * SRC_SCALE, y0 * SRC_SCALE, gx1 * SRC_SCALE, y1 * SRC_SCALE)) \
           .save(os.path.join(IMGDIR, g['img']))
        print('   패널 %d  crop y %d~%d (%dpx) → %s' % (gi, y0, y1, y1 - y0, g['img']))

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
            '<script>%sdocument.getElementById("root").innerHTML=renderGuideSection(%s);'
            'AG_fixWires();</script></body></html>'
            % (css, js, JS_OVERRIDE, json.dumps(data, ensure_ascii=False)))
    os.makedirs(TMP, exist_ok=True)
    p = os.path.join(TMP, '_x.html')
    open(p, 'w', encoding='utf-8').write(html)
    # 업로드용 — 파일명은 순번 ASCII 로만. 한글이 들어가면 인코딩 문제가 난다.
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
        done.append(build_section(sec, cache))
        render(sec)
    json.dump(done, open(os.path.join(OUT, 'guide-data.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('완료 · %d섹션 → %s' % (len(done), OUT))


if __name__ == '__main__':
    main()
