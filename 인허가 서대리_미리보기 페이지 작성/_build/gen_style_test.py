# -*- coding: utf-8 -*-
r"""강조 표현 시안 — '서류 선택' 한 장으로만 비교한다.

남은 3종(소프트필 / 헤어라인 / 그라데이션)에 **문서형 골격**을 씌워
안내 이미지가 아니라 제품 문서의 도판처럼 보이게 한다.

  · 위아래 헤어라인으로 도판 영역을 닫는다(머리말 STEP · 워드마크 / 꼬리말 캡션 · 쪽번호)
  · 레일 항목마다 구분선을 넣어 표처럼 정렬한다
  · 번호는 스티커 같은 원 대신 **모서리 둥근 사각 칩 + 두 자리 숫자**
  · 연결선·앵커는 더 얇고 옅게 눌러 화면을 방해하지 않는다

강조 표현만 STYLES 로 갈아끼운다.

  python gen_style_test.py
"""
import io, os, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
SHOT = '../갑지/자료/화면캡처/test_컷/test_2.png'

PAD, GAP, RAIL, ROW = 40, 56, 392, 26
HEAD = 56                               # 머리말 띠 높이
OX = PAD + 1                            # 화면 좌표 → 시트 좌표(가로)
OY = PAD + HEAD + 1                     # 〃 (세로)
IW, CW, CH = 1549, 1040, 976            # 원본 CSS 폭 / 보여줄 영역

STEP, TOTAL = 1, 8                      # 머리말 STEP · 꼬리말 쪽번호
BRAND = '인허가 서대리'

# 스냅으로 보정된 강조 영역(화면 기준 좌표)
BOXES = [(36, 316, 987, 69), (36, 400, 879, 111), (836, 594, 168, 45)]
MARKS = [(1020, 350, '이름으로 검색', '서류 이름 일부만 넣어도 관련 서류만 남습니다'),
         (912, 455, '분야별로 선택', '대기 · 폐수 · 소음 등 분야를 눌러 좁힙니다'),
         (1002, 616, '펼쳐서 상세 선택', '설치신고 · 변경신고처럼 세부 서류를 고릅니다')]

BASE = """  :root{
    --ink:#0F172A; --muted:#64748B; --faint:#94A3B8;
    --edge:#E5EAF2; --line:#EEF2F7; --accent:#EA580C;
    --a03:rgba(234,88,12,.03); --a11:rgba(234,88,12,.11);
    --a16:rgba(234,88,12,.16); --a24:rgba(234,88,12,.24);
    --a42:rgba(234,88,12,.42);
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Malgun Gothic','맑은 고딕',sans-serif;background:#FFFFFF;
    -webkit-font-smoothing:antialiased}
  .sheet{position:relative;width:%(sw)dpx;height:%(sh)dpx}

  /* 머리말 · 꼬리말: 도판 영역을 위아래 헤어라인으로 닫는다 */
  .bar{position:absolute;left:%(pad)dpx;right:%(pad)dpx;display:flex;
    align-items:baseline;justify-content:space-between}
  .top{top:%(pad)dpx;padding-bottom:11px;border-bottom:1px solid var(--line)}
  .foot{top:%(fy)dpx;padding-top:13px;border-top:1px solid var(--line)}
  .step{font-size:12px;font-weight:800;color:var(--accent);letter-spacing:1.6px}
  .brand{font-size:12.5px;font-weight:700;color:var(--faint);letter-spacing:.2px}
  .note{font-size:12.5px;color:var(--faint);letter-spacing:-.1px}
  .pg{font-size:12.5px;font-weight:700;color:var(--muted);letter-spacing:.6px}

  /* 화면 */
  .main{position:absolute;left:%(pad)dpx;top:%(top)dpx;width:%(cw)dpx;height:%(ch)dpx;
    overflow:hidden;border:1px solid var(--edge);border-radius:14px;background:#fff;
    box-shadow:0 18px 40px -26px rgba(15,23,42,.28), 0 1px 3px rgba(15,23,42,.04)}
  .main img{display:block;width:%(iw)dpx}
  .ov{position:absolute;inset:0;pointer-events:none}
  .mk{position:absolute}

  /* 레일: 항목마다 구분선을 두어 표처럼 정렬한다 */
  .rail{position:absolute;padding-top:14px;border-top:1px solid var(--line)}
  .rail .no{position:absolute;left:0;top:14px;width:22px;height:22px;border-radius:6px;
    background:var(--accent);color:#fff;font-size:11.5px;font-weight:800;
    display:flex;align-items:center;justify-content:center;letter-spacing:-.2px}
  .rail .tx{margin-left:34px}
  .rail .t{font-size:17px;font-weight:700;color:var(--ink);letter-spacing:-.3px;line-height:1.3}
  .rail .d{margin-top:5px;font-size:14.5px;color:var(--muted);line-height:1.5;letter-spacing:-.2px}
"""

# 이름 → (CSS, 한 줄 설명)
STYLES = {
 '0_소프트필': ('  .mk{background:var(--a16);border-radius:8px}',
                '원본 · 색면만'),

 '1_헤어라인': ('  .mk{background:var(--a11);border:1px solid var(--a42);border-radius:8px}',
                '필을 낮추고 1px 실선'),

 '3_그라데이션': ('  .mk{background:linear-gradient(95deg,var(--a24),var(--a03));'
                  'border-radius:8px}',
                  '좌→우로 사라지는 필'),
}


def layout():
    """레일 항목 세로 위치 — 앵커 높이를 따르되 겹치지 않게 민다."""
    items = [{'ax': a, 'ay': b, 't': t, 'd': d, 'h': 60} for (a, b, t, d) in MARKS]
    items.sort(key=lambda i: i['ay'])
    y = 0
    for it in items:
        it['y'] = max(y, it['ay'] - 24)      # 번호 칩이 앵커 높이에 오도록
        y = it['y'] + it['h'] + ROW
    return items


def build(key, css, memo):
    items = layout()
    sw = PAD * 2 + CW + GAP + RAIL
    contentH = max(CH, max(i['y'] + i['h'] for i in items))
    fy = PAD + HEAD + contentH + 30
    sh = fy + 34 + PAD
    railx = PAD + CW + GAP

    o = ['<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><style>']
    o.append(BASE % dict(sw=sw, sh=sh, cw=CW, ch=CH, iw=IW,
                         pad=PAD, top=PAD + HEAD, fy=fy))
    o.append(css)
    o.append('</style></head><body>\n<div class="sheet">')
    o.append('  <div class="bar top"><div class="step">STEP %02d</div>'
             '<div class="brand">%s</div></div>' % (STEP, BRAND))
    o.append('  <div class="main"><img src="%s" alt=""></div>' % SHOT)

    for (x, y, w, h) in BOXES:
        o.append('  <div class="mk" style="left:%dpx;top:%dpx;width:%dpx;height:%dpx"></div>'
                 % (x + OX, y + OY, w, h))

    o.append('\n  <svg class="ov" viewBox="0 0 %d %d" fill="none">' % (sw, sh))
    for it in items:
        AX, AY = it['ax'] + OX, it['ay'] + OY
        EX, EY = railx - 14, it['y'] + OY + 25
        mid = AX + (EX - AX) * 0.55
        o.append('    <path d="M%d %d C %d %d, %d %d, %d %d" stroke="#EA580C" stroke-width="1.3"'
                 ' stroke-opacity=".42" stroke-linecap="round"/>' % (AX, AY, mid, AY, mid, EY, EX, EY))
        o.append('    <circle cx="%d" cy="%d" r="3.2" fill="#EA580C"/><circle cx="%d" cy="%d" r="6.5"'
                 ' fill="none" stroke="#EA580C" stroke-opacity=".24" stroke-width="1.3"/>'
                 % (AX, AY, AX, AY))
    o.append('  </svg>\n')

    for n, it in enumerate(items, 1):
        o.append('  <div class="rail" style="left:%dpx;top:%dpx;width:%dpx">'
                 '<div class="no">%02d</div><div class="tx"><div class="t">%s</div>'
                 '<div class="d">%s</div></div></div>'
                 % (railx, it['y'] + OY, RAIL, n, it['t'], it['d']))

    o.append('  <div class="bar foot"><div class="note">%s &nbsp;·&nbsp; %s</div>'
             '<div class="pg">%02d / %02d</div></div>'
             % (key.split('_', 1)[1], memo, STEP, TOTAL))
    o.append('</div>\n</body></html>\n')
    name = 'style_%s.html' % key
    open(os.path.join(HERE, name), 'w', encoding='utf-8').write('\n'.join(o))
    print('생성 %-26s %s' % (name, memo))


for k, (v, memo) in STYLES.items():
    build(k, v, memo)
