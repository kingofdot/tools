# -*- coding: utf-8 -*-
r"""마커컷2 생성 — 강조박스를 대상에 균일하게 물리고, 라벨 글씨를 한 크기로 통일한다.

기존 마커컷의 문제
  · 강조박스를 눈대중으로 찍어 대상과의 여백이 컷마다 제각각이었다.
  · 라벨 글씨가 15px / 16px / 17px 로 섞여 있었다.

여기서 하는 일
  1) `_build/flow_gapzi*.html` 의 스타일을 공통 토큰으로 덮어쓴다(글씨 크기 하나로 통일).
  2) 각 강조박스의 실제 위치를 '브라우저에게 물어본다'.
     박스마다 고유 색을 칠해 한 번 렌더한 뒤(probe), 그 색의 경계상자를 읽는다.
     박스가 어느 부모 안에 들어 있든, 이미지가 확대·축소돼 있든 정확히 잡힌다.
  3) 박스 없는 화면(clean)을 렌더해, 그 위에서 대상 요소의 진짜 테두리를 찾고
     바깥으로 PAD(2px)만큼만 띄운 사각형을 구한다.
  4) 원래 위치와의 차이만큼 인라인 스타일을 보정해 최종 렌더한다.

  python _build_markers2.py            → 갑지/자료/화면캡처/마커컷2/*.png
"""
import io, os, re, subprocess, sys
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
BUILD = os.path.join(ROOT, '_build')
SHOTS = os.path.join(HERE, '자료', '화면캡처')
OUT = os.path.join(SHOTS, '마커컷2')
TMP = os.path.join(HERE, '_tmp_markers2')

PAD = 2               # 대상 바깥 여백(px) — 전 컷 공통
FONT_PX = 16          # 라벨 글씨 크기 — 전 컷 공통
# 컷별로 글씨 크기를 다르게 주고 싶을 때 여기에 적는다. 없으면 FONT_PX(공통)를 쓴다.
#   예) '갑지생성1_marker': 18
FONT_OVERRIDE = {'갑지생성1_marker': 12}

# 폭 통일 여부. True 면 가장 넓은 컷에 맞춰 좌우 여백을 채운다(글씨가 같은 크기로 보임).
# 컷마다 여백 없이 꽉 채우려면 False. 이때 컷별 글씨 크기는 FONT_OVERRIDE 로 맞춘다.
NORMALIZE = False

# ── 폭을 반드시 맞춰야 하는 묶음 ──────────────────────────────────
# 개요·필요서류처럼 나란히 놓고 보는 섹션 카드는 X 사이즈가 같아야 한다.
# 잘라내기는 내용 기준이라 그냥 두면 컷마다 몇 px 씩 어긋난다.
# 묶음 안에서는 가장 넓은 컷에 맞춰 좌우 여백만 채운다(리사이즈 없음).
WIDTH_GROUPS = {
    '섹션카드': ['갑지_01개요_marker', '갑지_02필요서류_marker', '갑지_03작성안내_marker'],
}
NORM_WIDTH = 3320
SHEET_BG = (255, 255, 255)

CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]
CHROME = next((c for c in CANDIDATES if os.path.exists(c)), CANDIDATES[0])

# 컷 이름 ← flow 파일
CUTS = [
    ('flow_overview.html', '갑지_01개요_marker'),      # card_04 에서 분리
    ('flow_docs.html',     '갑지_02필요서류_marker'),
    ('flow_guide.html',    '갑지_03작성안내_marker'),
    ('flow_gapzi1.html',  '갑지생성1_marker'),
    ('flow_gapzi2.html',  '갑지생성2_marker'),
    ('flow_gapzi3.html',  '갑지생성3_marker'),
    ('flow_gapzi45.html', '갑지생성45_marker'),
    ('flow_gapzi6.html',  '갑지생성6_marker'),
    ('flow_gapzi7.html',  '갑지생성7_marker'),
    ('flow_gapzi8.html',  '갑지생성8_marker'),
    ('flow_gapzi9.html',  '갑지생성9_marker'),
    ('flow_gapzi10.html', '갑지생성10_marker'),
    ('flow_gapzi11.html', '갑지생성11_marker'),
    ('flow_gapzi12.html', '갑지생성12_marker'),
    ('flow_gapzi13.html', '갑지생성13_marker'),   # 결과물 예시 5종
]

# 전 컷 공통 스타일(파일마다 제각각이던 값을 여기서 하나로 맞춘다)
def tokens(font_px):
    return """
  .hl{position:absolute;border:2.2px solid #F5820A !important;border-radius:9px !important;
    box-shadow:0 0 6px rgba(245,130,10,.35), 0 0 15px 1px rgba(245,130,10,.16) !important}
  .cap{font-size:%dpx !important;font-weight:700 !important;padding:4px 9px !important;
    border-radius:10px !important;border:1.6px solid #F5820A !important;
    color:#F5820A !important;background:#FFFFFF !important;white-space:nowrap;
    box-shadow:0 0 6px rgba(245,130,10,.35), 0 0 15px 1px rgba(245,130,10,.16) !important}
""" % font_px


# ── 스냅 ────────────────────────────────────────────────────────────
def _bg_color(a, x0, y0, x1, y1, margin=10):
    h, w, _ = a.shape
    X0, Y0 = max(0, x0 - margin), max(0, y0 - margin)
    X1, Y1 = min(w, x1 + margin), min(h, y1 + margin)
    band = np.concatenate([
        a[Y0:Y0 + 3, X0:X1].reshape(-1, 3), a[max(Y0, Y1 - 3):Y1, X0:X1].reshape(-1, 3),
        a[Y0:Y1, X0:X0 + 3].reshape(-1, 3), a[Y0:Y1, max(X0, X1 - 3):X1].reshape(-1, 3)])
    vals, cnt = np.unique(band, axis=0, return_counts=True)
    return vals[cnt.argmax()].astype(int)


def snap(img, seed, search=9, thr=18, pad=PAD):
    """seed=(x,y,w,h) → 대상 실제 경계 + pad 를 적용한 (x,y,w,h)."""
    a = np.asarray(img.convert('RGB')).astype(int)
    H, W, _ = a.shape
    x, y, w, h = [int(round(v)) for v in seed]
    x0, y0, x1, y1 = x, y, x + w, y + h
    X0, Y0 = max(0, x0 - search), max(0, y0 - search)
    X1, Y1 = min(W, x1 + search), min(H, y1 + search)
    if X1 - X0 < 4 or Y1 - Y0 < 4:
        return (x0 - pad, y0 - pad, w + pad * 2, h + pad * 2)
    win = a[Y0:Y1, X0:X1]
    mask = np.abs(win - _bg_color(a, x0, y0, x1, y1)).sum(axis=2) > thr
    ww, hh = X1 - X0, Y1 - Y0
    sx0, sy0, sx1, sy1 = x0 - X0, y0 - Y0, x1 - X0, y1 - Y0

    def edge(axis, at, lo, hi, s0, s1):
        need = max(4, (s1 - s0) * 0.5)
        cands, best, bi = [], -1, None
        for i in range(max(0, lo), min(hi, hh if axis == 0 else ww)):
            line = mask[i, s0:s1] if axis == 0 else mask[s0:s1, i]
            c = int(line.sum())
            if c >= need:
                cands.append(i)
            if c > best:
                best, bi = c, i
        # 기준을 넘는 선이 여럿이면 시드 변에 가장 가까운 선을 택한다
        return (min(cands, key=lambda i: abs(i - at)), True) if cands else (bi, False)

    t, ok1 = edge(0, sy0, sy0 - search, sy0 + search + 1, sx0, sx1)
    b, ok2 = edge(0, sy1, sy1 - search, sy1 + search + 1, sx0, sx1)
    l, ok3 = edge(1, sx0, sx0 - search, sx0 + search + 1, sy0, sy1)
    r, ok4 = edge(1, sx1, sx1 - search, sx1 + search + 1, sy0, sy1)
    if not ok1: t = sy0
    if not ok2: b = sy1
    if not ok3: l = sx0
    if not ok4: r = sx1
    nx0, ny0, nx1, ny1 = X0 + l, Y0 + t, X0 + r + 1, Y0 + b + 1
    # 감싸는 대상이 박스 밖으로 튀어나오면 안 되므로, 시드 영역은 반드시 포함시킨다
    nx0, ny0 = min(nx0, x0), min(ny0, y0)
    nx1, ny1 = max(nx1, x1), max(ny1, y1)
    return (nx0 - pad, ny0 - pad, (nx1 - nx0) + pad * 2, (ny1 - ny0) + pad * 2)


# ── HTML 손질 ───────────────────────────────────────────────────────
HL = re.compile(r'<div class="hl"([^>]*)></div>')


def prepare(src, font_px=None):
    s = open(src, encoding='utf-8').read()
    s = s.replace('../자료/갑지생성자료/', SHOTS.replace('\\', '/') + '/')
    s = s.replace('</style>', tokens(font_px or FONT_PX) + '</style>')
    # 라벨의 개별 글씨 크기 지정을 걷어낸다(통일)
    s = re.sub(r'(<div class="cap"[^>]*style="[^"]*?);?\s*font-size:\s*[\d.]+px', r'\1', s)
    return s


def shoot(html, png, scale=1, w=2400, h=2200):
    open(os.path.join(TMP, '_x.html'), 'w', encoding='utf-8').write(html)
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                    '--force-device-scale-factor=%d' % scale, '--virtual-time-budget=15000',
                    '--window-size=%d,%d' % (w, h), '--screenshot=' + png,
                    'file:///' + os.path.join(TMP, '_x.html').replace('\\', '/')],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return Image.open(png).convert('RGB')


def probe_rects(html, n):
    """박스마다 고유 색을 칠해 렌더 → 그 색의 경계상자를 읽어 실제 좌표를 얻는다."""
    def paint(m, i=[0]):
        c = 'rgb(%d,%d,%d)' % (7, 11 + i[0] * 9, 251 - i[0] * 7)
        i[0] += 1
        # 원래 style 의 left/top/width/height 를 반드시 살려야 한다.
        # (예전엔 style 을 통째로 data-s 로 밀어내 박스가 0x0 이 되면서
        #  경계상자를 못 찾았고, 그래서 스냅이 조용히 건너뛰어졌다.)
        st = re.search(r'style="([^"]*)"', m.group(1))
        geo = st.group(1) if st else ''
        return ('<div class="hl" style="%s;background:%s;border:0 !important;'
                'border-radius:0 !important;box-shadow:none !important"></div>' % (geo, c))
    painted = HL.sub(paint, html)
    im = shoot(painted, os.path.join(TMP, 'probe.png'))
    a = np.asarray(im).astype(int)
    out = []
    for i in range(n):
        c = np.array([7, 11 + i * 9, 251 - i * 7])
        ys, xs = np.where(np.abs(a - c).sum(axis=2) < 12)
        out.append(None if len(xs) == 0 else
                   (int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1),
                    int(ys.max() - ys.min() + 1)))
    return out


def build(flow, name):
    src = os.path.join(BUILD, flow)
    if not os.path.exists(src):
        print('  !! 없음:', flow)
        return None
    font_px = FONT_OVERRIDE.get(name, FONT_PX)
    html = prepare(src, font_px)
    rects = HL.findall(html)
    n = len(rects)
    clean = shoot(HL.sub('', html), os.path.join(TMP, 'clean.png'))
    probes = probe_rects(html, n) if n else []

    deltas = []
    for p in probes:
        if p is None:
            deltas.append(None); continue
        s = snap(clean, p)
        deltas.append((s[0] - p[0], s[1] - p[1], s[2] - p[2], s[3] - p[3]))

    def fix(m, i=[0]):
        k = i[0]; i[0] += 1
        attr = m.group(1)
        d = deltas[k] if k < len(deltas) else None
        if d is None:
            return m.group(0)
        def num(key):
            mm = re.search(key + r'\s*:\s*(-?[\d.]+)px', attr)
            return float(mm.group(1)) if mm else 0.0
        L, T, W, H = num('left'), num('top'), num('width'), num('height')
        L, T, W, H = L + d[0], T + d[1], W + d[2], H + d[3]
        return ('<div class="hl" style="left:%.1fpx;top:%.1fpx;width:%.1fpx;height:%.1fpx"></div>'
                % (L, T, W, H))

    final = HL.sub(fix, html)

    # ── 기록: 이 컷에 실제로 들어간 수치를 전부 남긴다 ──────────────
    rec = {'flow': flow, '파일': name + '.png', '글씨_px': font_px, '강조박스': [], '라벨': [], '리더선': [], '앵커점': []}
    for k, p0 in enumerate(probes):
        d = deltas[k]
        rec['강조박스'].append({
            '번호': k + 1,
            '지정한위치': None if p0 is None else {'x': p0[0], 'y': p0[1], 'w': p0[2], 'h': p0[3]},
            '스냅후': None if p0 is None or d is None else
                     {'x': p0[0] + d[0], 'y': p0[1] + d[1], 'w': p0[2] + d[2], 'h': p0[3] + d[3]},
            '이동량': None if d is None else {'dx': d[0], 'dy': d[1], 'dw': d[2], 'dh': d[3]},
        })
    for m in re.finditer(r'<div class="cap"[^>]*style="([^"]*)"[^>]*>(.*?)</div>', final, re.S):
        st, txt = m.group(1), re.sub(r'<[^>]+>', '', m.group(2)).strip()
        pos = dict(re.findall(r'(left|top|right|bottom)\s*:\s*(-?[\d.]+)px', st))
        rec['라벨'].append({'문구': txt, '위치': pos,
                          '정렬': (re.search(r'transform:\s*([^;"]+)', st) or [None, ''])[1].strip()})
    for m in re.finditer(r'<path d="([^"]+)"', final):
        rec['리더선'].append(m.group(1))
    for m in re.finditer(r'<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"', final):
        if float(m.group(3)) < 6:            # 헤일로(큰 원) 말고 점만
            rec['앵커점'].append({'x': float(m.group(1)), 'y': float(m.group(2))})

    dst = os.path.join(OUT, name + '.png')
    im = shoot(final, dst, scale=2)
    # 시트 배경 여백 잘라내기 — 배경색은 파일마다 달라서 모서리 픽셀에서 직접 읽는다
    a = np.asarray(im).astype(int)
    # 배경색은 파일마다 다르다(흰색이거나 연회색 시트). 가장 많은 색을 배경으로 본다.
    vals, cnt = np.unique(a.reshape(-1, 3), axis=0, return_counts=True)
    bg = vals[cnt.argmax()]
    m = np.abs(a - bg).sum(axis=2) > 12
    ys, xs = np.where(m)
    if len(xs):
        pad = 10
        im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                      min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
        im.save(dst)
    rec['크기'] = {'w': im.width, 'h': im.height}
    print('  %-22s 박스 %d개 · %dx%d' % (name, n, im.width, im.height))
    return dst, rec


def normalize(files, width=None):
    """좌우 여백만 채워 폭을 통일한다.

    리사이즈를 하지 않으므로 화면·문서에서 같은 폭으로 놓고 볼 때
    라벨 글씨가 모든 컷에서 정확히 같은 크기로 보인다.
    """
    if not files:
        return
    width = width or max(Image.open(f).width for f in files)
    print('  폭 통일 기준 %dpx' % width)
    for f in files:
        im = Image.open(f).convert('RGB')
        if im.width == width:
            continue
        c = Image.new('RGB', (width, im.height), tuple(np.asarray(im)[2, 2].tolist()))
        c.paste(im, ((width - im.width) // 2, 0))
        c.save(f)


def enforce_groups():
    """WIDTH_GROUPS 에 묶인 컷들의 폭을 서로 맞춘다."""
    for gname, names in WIDTH_GROUPS.items():
        paths = [os.path.join(OUT, n + '.png') for n in names]
        paths = [p for p in paths if os.path.exists(p)]
        if len(paths) < 2:
            continue
        W = max(Image.open(p).width for p in paths)
        fixed = []
        for p in paths:
            im = Image.open(p).convert('RGB')
            if im.width == W:
                continue
            bg = tuple(np.asarray(im)[2, 2].tolist())
            c = Image.new('RGB', (W, im.height), bg)
            c.paste(im, ((W - im.width) // 2, 0))
            c.save(p)
            fixed.append('%s %d→%d' % (os.path.basename(p), im.width, W))
        print('  [%s] 폭 %d 로 통일%s' % (gname, W, (' · ' + ', '.join(fixed)) if fixed else ' (이미 동일)'))


def write_record(recs, partial=False):
    """컷별 수치를 사람이 읽는 표(_기록.md)와 기계용(_기록.json)으로 남긴다."""
    import json
    js = {'공통': {'대상바깥여백_px': PAD, '글씨_px': FONT_PX, '컷별글씨재정의': FONT_OVERRIDE,
                  '라벨안쪽여백': '4px 9px', '라벨모서리': '10px', '라벨테두리': '1.6px',
                  '강조박스테두리': '2.2px', '강조박스모서리': '9px',
                  '폭통일': ('전량 생성 시 가장 넓은 컷에 맞춰 좌우 여백만 채움'
                            if NORMALIZE else '끔 — 컷마다 내용에 맞춰 꽉 자름')},
          '컷': recs}
    mode = 'a' if partial else 'w'
    with open(os.path.join(OUT, '_기록.json'), 'w', encoding='utf-8') as f:
        json.dump(js, f, ensure_ascii=False, indent=1)

    L = ['# 마커컷2 수치 기록', '',
         '`_build_markers2.py` 가 만들 때 자동으로 남긴다. 값을 고치려면',
         '`_build/flow_gapzi*.html` 의 좌표나 `_build_markers2.py` 위쪽 상수를 고친 뒤 다시 돌리면 된다.', '',
         '## 전 컷 공통', '', '| 항목 | 값 |', '|---|---|']
    for k, v in js['공통'].items():
        L.append('| %s | %s |' % (k, v))
    L += ['', '- 강조박스는 대상 요소의 실제 테두리를 찾아 **바깥으로 %dpx** 띄운다.' % PAD,
          '- 대상이 박스 밖으로 튀어나오지 않도록, 지정한 영역은 반드시 포함시킨다.',
          '- 좌표는 모두 **시트(sheet) 기준 CSS px**. 출력 PNG는 2배(레티나)다.', '']
    for r in recs:
        L += ['---', '', '## %s' % r['파일'], '',
              '- 원본 정의: `_build/%s`' % r['flow'],
              '- 글씨: %dpx%s' % (r['글씨_px'],
                                ' (공통)' if r['글씨_px'] == FONT_PX else ' (이 컷만 따로 지정)'),
              '- 크기: %dx%d%s' % (r['크기']['w'], r['크기']['h'],
                                 ' → 폭 통일 %d' % r['크기']['최종폭']
                                 if r['크기'].get('최종폭') and r['크기']['최종폭'] != r['크기']['w'] else ''), '']
        if r['강조박스']:
            L += ['### 강조박스', '', '| # | 지정한 위치 | 스냅 후(대상+%dpx) | 이동량 |' % PAD, '|---|---|---|---|']
            for b in r['강조박스']:
                f_ = lambda d: '-' if not d else '%d, %d · %dx%d' % (d['x'], d['y'], d['w'], d['h'])
                mv = '-' if not b['이동량'] else 'dx %+d dy %+d dw %+d dh %+d' % (
                    b['이동량']['dx'], b['이동량']['dy'], b['이동량']['dw'], b['이동량']['dh'])
                L.append('| %d | %s | %s | %s |' % (b['번호'], f_(b['지정한위치']), f_(b['스냅후']), mv))
            L.append('')
        else:
            L += ['### 강조박스', '', '없음 (앵커 점 + 리더선 + 라벨만 쓰는 컷)', '']
        if r['라벨']:
            L += ['### 라벨', '', '| 문구 | 위치 | 정렬 |', '|---|---|---|']
            for c in r['라벨']:
                pos = ' · '.join('%s %s' % (k, v) for k, v in c['위치'].items())
                L.append('| %s | %s | %s |' % (c['문구'], pos, c['정렬'] or '-'))
            L.append('')
        if r['앵커점']:
            L += ['### 앵커 점', '',
                  ', '.join('(%g, %g)' % (p['x'], p['y']) for p in r['앵커점']), '']
        if r['리더선']:
            L += ['### 리더선 (SVG path)', ''] + ['- `%s`' % d for d in r['리더선']] + ['']
    open(os.path.join(OUT, '_기록.md'), 'w', encoding='utf-8').write(chr(10).join(L))
    print('  기록 → _기록.md / _기록.json')


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    # 인자로 컷 번호를 주면 그것만 뽑는다(확인용). 이때 폭 통일은 건너뛴다.
    only = sys.argv[1:]
    # 인자는 컷 번호('8') 또는 flow 파일 이름 일부('overview') 둘 다 받는다
    cuts = [(f, n) for f, n in CUTS
            if not only or any(('flow_gapzi%s.html' % o) == f or o in f for o in only)]
    print('마커컷2 생성 · 여백 %dpx · 글씨 %dpx%s'
          % (PAD, FONT_PX, ' · 일부만(%s)' % ','.join(only) if only else ''))
    made, recs = [], []
    for flow, name in cuts:
        r = build(flow, name)
        if r:
            made.append(r[0]); recs.append(r[1])
    if not only and NORMALIZE:
        normalize(made)
    enforce_groups()
    for r, f in zip(recs, made):
        if os.path.exists(f):
            r['크기']['최종폭'] = Image.open(f).width
    write_record(recs, partial=bool(only))
    for f in os.listdir(TMP):
        os.remove(os.path.join(TMP, f))
    os.rmdir(TMP)
    print('완료 · %d컷 → %s' % (len(made), OUT))


if __name__ == '__main__':
    main()
