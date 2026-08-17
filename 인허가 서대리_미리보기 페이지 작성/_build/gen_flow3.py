# -*- coding: utf-8 -*-
r"""마커컷3 flow 생성기 — 주석 레일(annotation rail) 방식.

기존 방식은 라벨 박스를 화면 위 빈 곳마다 흩뿌려서, 읽는 순서도 없고
요소 굵기도 전부 같아 산만했다. 여기서는 다음을 지킨다.

  · 라벨은 화면 위에 얹지 않고 **오른쪽 레일 한 줄에 정렬**한다 → 읽는 순서가 생긴다
  · 라벨 박스·테두리를 없애고 **번호 칩 + 제목 + 설명**의 타이포 위계로 대신한다
  · 글로우 대신 **포커스 링**, 굵은 선 대신 **헤어라인**
  · 강조색은 앵커·연결선·번호 칩에만 쓰고, 글자는 먹색으로 둔다

좌표는 잘린 카드의 CSS px(원본 2x의 절반) 기준.

  python gen_flow3.py
"""
import io, os, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
SHOT = '../갑지/자료/화면캡처/test_컷'

PAD = 40          # 시트 여백
GAP = 56          # 화면 ↔ 레일 사이
RAIL = 392        # 레일 폭
ROW = 30          # 레일 항목 사이 최소 간격
OFF = PAD + 1     # 화면 좌표 → 시트 좌표(테두리 1px 포함)

HEAD = """<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><style>
  :root{
    --ink:#0F172A; --muted:#64748B; --edge:#E5EAF2;
    --accent:#EA580C; --accent-15:rgba(234,88,12,.15); --accent-30:rgba(234,88,12,.30);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;background:#FFFFFF;
    -webkit-font-smoothing:antialiased}
  .sheet{position:relative;width:%(sw)dpx;height:%(sh)dpx;padding:%(pad)dpx}

  /* 화면: 얇은 테두리 + 낮고 넓은 그림자로 살짝 띄운다 */
  .main{position:absolute;left:%(pad)dpx;top:%(pad)dpx;width:%(cw)dpx;height:%(ch)dpx;
    overflow:hidden;border:1px solid var(--edge);border-radius:14px;background:#fff;
    box-shadow:0 18px 40px -26px rgba(15,23,42,.28), 0 1px 3px rgba(15,23,42,.04)}
  .main img{display:block;width:%(iw)dpx;margin:-%(cy)dpx 0 0 -%(cx)dpx}

  /* 강조: 글로우 대신 포커스 링 */
  .hl{position:absolute;border:1.5px solid var(--accent);border-radius:7px;
    box-shadow:0 0 0 3px var(--accent-15)}

  .ov{position:absolute;inset:0;pointer-events:none}

  /* 레일 */
  .rail{position:absolute}
  .rail .no{position:absolute;left:0;top:0;width:23px;height:23px;border-radius:50%%;
    background:var(--accent);color:#fff;font-size:12px;font-weight:800;
    display:flex;align-items:center;justify-content:center;letter-spacing:-.2px}
  .rail .tx{margin-left:35px}
  .rail .t{font-size:17px;font-weight:700;color:var(--ink);letter-spacing:-.3px;line-height:1.35}
  .rail .d{margin-top:4px;font-size:14.5px;color:var(--muted);line-height:1.5}
</style></head><body>
<div class="sheet">
  <div class="main"><img src="%(src)s" alt=""></div>
"""

# ── 파트 정의 ────────────────────────────────────────────────────
#   marks: (앵커x, 앵커y, 제목, 설명)  — 설명은 '' 이면 한 줄짜리
PARTS = [
 dict(name='flow3_01_서류선택', src='test_2.png', iw=1549, clip=(0, 0, 1040, 976),
      boxes=[(38, 318, 982, 64), (38, 402, 874, 106), (838, 596, 164, 40)],
      marks=[(1020, 350, '이름으로 검색', '서류 이름 일부만 넣어도 관련 서류만 남습니다'),
             (912, 455, '분야별로 선택', '대기 · 폐수 · 소음 등 분야를 눌러 좁힙니다'),
             (1002, 616, '펼쳐서 상세 선택', '설치신고 · 변경신고처럼 세부 서류를 고릅니다')]),

 dict(name='flow3_02_서류담기', src='test_2.png', iw=1549, clip=(0, 0, 1549, 976),
      boxes=[(66, 686, 462, 60), (536, 686, 462, 60),
             (1060, 172, 450, 260), (1060, 432, 450, 44), (1080, 506, 406, 50)],
      marks=[(998, 716, '체크하면 바로 담깁니다', '고른 서류가 오른쪽 목록에 쌓입니다'),
             (1510, 454, '예상 금액이 함께 계산', '고른 개수에 따라 금액이 달라집니다'),
             (1486, 531, '다음 단계로', '사업장 정보 입력 화면으로 넘어갑니다')],
      curves=[('M 559 716 C 720 716, 900 470, 1054 320', True),
              ('M 1029 716 C 1050 690, 1054 500, 1054 396', True)]),

 dict(name='flow3_03_사업장정보_기본', src='test_3.png', iw=1549, clip=(0, 0, 1549, 930),
      boxes=[(38, 312, 730, 58), (782, 312, 728, 58), (38, 772, 1470, 52)],
      marks=[(1510, 341, '개인 · 법인 선택', '고른 유형에 따라 아래 입력 항목이 달라집니다'),
             (1508, 798, '등록번호 입력', '법인은 법인등록번호, 개인은 주민등록번호를 넣습니다')]),

 dict(name='flow3_04_사업장정보_주소연락처', src='test_3.png', iw=1549, clip=(0, 940, 1549, 580),
      boxes=[(1400, 36, 110, 26), (1338, 160, 150, 48), (38, 300, 1470, 50)],
      marks=[(1510, 49, '주소 추가', '사업장이 여러 곳이면 칸을 늘릴 수 있습니다'),
             (1488, 184, '주소는 검색으로', '직접 타이핑하지 않고 눌러서 고릅니다'),
             (1508, 325, '전화번호', '사업장 번호가 없으면 휴대폰 번호를 적어도 됩니다')]),

 dict(name='flow3_05_사업장정보_업종', src='test_3.png', iw=1549, clip=(0, 1530, 1549, 300),
      boxes=[(1400, 25, 100, 22), (55, 170, 565, 45), (645, 170, 845, 45)],
      marks=[(1500, 36, '업종 추가', '업종이 여러 개면 칸을 늘릴 수 있습니다'),
             (620, 192, '분류코드', '한국표준산업분류 11차 코드를 넣습니다'),
             (1490, 192, '분류명', '코드를 넣으면 나머지 한 칸이 자동으로 채워집니다')]),

 dict(name='flow3_06_제출청', src='test_4.png', iw=1549, clip=(0, 0, 1549, 394),
      boxes=[(140, 278, 1350, 44)],
      marks=[(1490, 300, '서류별 제출청', '첫 제출청을 넣으면 나머지에도 함께 적용할지 물어봅니다')]),

 dict(name='flow3_07_제출시점', src='test_5.png', iw=1549, clip=(0, 0, 1549, 455),
      boxes=[(38, 198, 1472, 52), (38, 356, 1470, 52)],
      marks=[(1510, 224, '입력 단위 선택', '일자 · 연/월 · 연도 중 서류에 기재할 단위를 고릅니다'),
             (1508, 382, '제출 시점 입력', '고른 단위에 맞춰 날짜를 넣습니다')]),

 dict(name='flow3_08_검증생성', src='test_6.png', iw=1549, clip=(0, 0, 1549, 137),
      boxes=[(1204, 52, 148, 48), (1372, 52, 158, 48)],
      marks=[(1352, 76, '검증하기', '빠진 항목을 한 번에 찾아 표시해 줍니다'),
             (1530, 76, '서류 생성', '모두 채우면 버튼이 켜집니다')]),
]


def rail_layout(marks, ch):
    """레일 항목 세로 위치를 정한다. 앵커 높이를 따르되 서로 겹치지 않게 민다."""
    items = []
    for (ax, ay, t, d) in marks:
        items.append({'ax': ax, 'ay': ay, 't': t, 'd': d,
                      'h': 46 if d else 24})
    items.sort(key=lambda i: i['ay'])
    y = 0
    for it in items:
        want = it['ay'] - it['h'] / 2
        it['y'] = max(y, want)
        y = it['y'] + it['h'] + ROW
    # 화면보다 아래로 넘치면 위로 당긴다
    over = y - ROW - ch
    if over > 0:
        shift = min(over, min(i['y'] for i in items))
        for it in items:
            it['y'] -= shift
    return items


def build(p):
    cx, cy, cw, ch = p['clip']
    sw = PAD * 2 + cw + GAP + RAIL
    items = rail_layout(p['marks'], ch)
    need = max(i['y'] + i['h'] for i in items) if items else 0
    sh = PAD * 2 + max(ch, need)
    railx = PAD + cw + GAP

    o = [HEAD % dict(sw=sw, sh=sh, cw=cw, ch=ch, iw=p['iw'], cx=cx, cy=cy, pad=PAD,
                     src='%s/%s' % (SHOT, p['src']))]
    for (x, y, w, h) in p.get('boxes', []):
        o.append('  <div class="hl" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx"></div>'
                 % (x + OFF, y + OFF, w, h))

    o.append('\n  <svg class="ov" viewBox="0 0 %d %d" fill="none">' % (sw, sh))
    o.append('''    <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="4"
      orient="auto"><path d="M1 1.3 L6.8 4 L1 6.7 Z" fill="var(--accent)"/></marker></defs>''')
    for d, arrow in p.get('curves', []):
        o.append('    <path d="%s" stroke="var(--accent)" stroke-width="1.4" stroke-opacity=".55"'
                 ' stroke-linecap="round"%s/>' % (d, ' marker-end="url(#ar)"' if arrow else ''))
    for it in items:
        AX, AY = it['ax'] + OFF, it['ay'] + OFF
        EX, EY = railx - 15, it['y'] + OFF + 11
        mid = AX + (EX - AX) * 0.55
        o.append('    <path d="M%d %d C %d %d, %d %d, %d %d" stroke="var(--accent)"'
                 ' stroke-width="1.4" stroke-opacity=".5" stroke-linecap="round"/>'
                 % (AX, AY, mid, AY, mid, EY, EX, EY))
        o.append('    <circle cx="%d" cy="%d" r="3.6" fill="var(--accent)"/>'
                 '<circle cx="%d" cy="%d" r="7" fill="none" stroke="var(--accent)"'
                 ' stroke-opacity=".28" stroke-width="1.4"/>' % (AX, AY, AX, AY))
    o.append('  </svg>\n')

    for n, it in enumerate(items, 1):
        o.append('  <div class="rail" style="left:%dpx;top:%dpx;width:%dpx">' % (railx, it['y'] + OFF, RAIL))
        o.append('    <div class="no">%d</div><div class="tx"><div class="t">%s</div>%s</div>'
                 % (n, it['t'], ('<div class="d">%s</div>' % it['d']) if it['d'] else ''))
        o.append('  </div>')
    o.append('</div>\n</body></html>\n')
    open(os.path.join(HERE, p['name'] + '.html'), 'w', encoding='utf-8').write('\n'.join(o))
    print('생성 %-34s 시트 %dx%d · 강조 %d · 주석 %d'
          % (p['name'] + '.html', sw, sh, len(p.get('boxes', [])), len(items)))


for p in PARTS:
    build(p)
