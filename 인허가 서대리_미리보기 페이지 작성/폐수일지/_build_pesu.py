# -*- coding: utf-8 -*-
r"""폐수일지 미리보기 도판 생성기.

섹션 정의는 전부 sections.py(데이터)에 있다. 이 파일은 기계 부분만 맡는다:

  1) 시드 박스를 소스 PNG 위에서 픽셀 스캔으로 스냅 → 대상 실제 경계 + 2px
  2) 패널 crop 잘라내기 (ycrop 지정 우선, 없으면 배경 행 스냅)
  3) annotate 스키마 JSON 조립 → work/ 렌더러(tb 모드)로 카드 렌더

  python 폐수일지/_build_pesu.py            # 전량
  python 폐수일지/_build_pesu.py 01 03      # 해당 스텝만

카드 규격은 갑지와 동일: 폭 2955(=1440 CSS x2 + 여백), 테두리 1px #C9D6EC, 그림자 없음.
"""
import json, os, subprocess, sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))          # 폐수일지/
ROOT = os.path.dirname(HERE)                               # 미리보기 페이지 작성/
SRCDIR = os.path.join(HERE, '원본')
ASSETS = os.path.join(HERE, '목록등자료', '폐수일지')
WORK = os.path.join(ROOT, '갑지', '자료', '화면캡처', 'annotate', 'work')
OUT = os.path.join(HERE, '미리보기_폐수일지_최종')
IMGDIR = os.path.join(OUT, 'img')
TMP = os.path.join(HERE, '_tmp_final')

sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(ROOT, '갑지'))
import _build_markers2 as M          # snap() · CHROME 재사용
from sections import S

CHROME = M.CHROME

# ── 카드 규격 (갑지 gen_final 과 동일) ─────────────────────────────
CARD_W = 1440
# tb 모드: 이미지 전폭 + 위·아래 콜아웃 밴드. 콜아웃 글씨는 갑지보다 3px 큼(15px) →
# 줄당 글자수 CPL 과 줄높이 LH 도 그에 맞춘다.
TB = dict(IW=1378, CW=340, LANE=26, CPL=18, LH=24)
assert TB['IW'] == CARD_W - 62                # 테두리 2 + 좌우 패딩 60

DEFAULT_SCALE = 3      # 원본 캡처는 3배. 목록등자료 보조컷은 scale=1 로 지정.
PADY = 40


# ── gen_final 에서 그대로 가져온 유틸 ──────────────────────────────
def bg_rows(a):
    s = a[::3, ::3].reshape(-1, 3)
    v, c = np.unique(s, axis=0, return_counts=True)
    bg = v[c.argmax()]
    return (np.abs(a - bg).sum(axis=2) < 12).mean(axis=1)


def snap_edge(ratio, at, lo, hi, thr=0.985):
    cand = [i for i in range(max(0, lo), min(len(ratio), hi)) if ratio[i] > thr]
    return min(cand, key=lambda i: abs(i - at)) if cand else at


def pixelate(img, boxes, scale, cell=6):
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
    if g.get('mask'):
        out = pixelate(out, [[b[0] - gx0, b[1] - y0, b[2], b[3]] for b in g['mask']], scale)
        note += ' · 모자이크 %d' % len(g['mask'])
    out.save(os.path.join(IMGDIR, g['img']))
    print('   패널 %d  crop y %d~%d (%dpx%s) → %s' % (gi, y0, y1, y1 - y0, note, g['img']))


def open_src(name):
    """원본/ 우선, 없으면 목록등자료/폐수일지/."""
    p = os.path.join(SRCDIR, name)
    if not os.path.exists(p):
        p = os.path.join(ASSETS, name)
    return Image.open(p).convert('RGB')


# ── 빌드 (gen_final.build_section 의 폐수일지판 · 기본 scale 3 · mode 는 g 지정) ──
def build_section(sec, ratio_cache):
    im = open_src(sec['src'])
    sc = sec.get('scale', DEFAULT_SCALE)
    cw, ch = im.width // sc, im.height // sc
    x0, x1 = sec.get('xcrop') or (0, cw)
    print('■ %s %s · %s (%dx%d CSS · 가로 %d~%d)'
          % (sec['step'], sec['title'], sec['src'], cw, ch, x0, x1))

    for i, f in enumerate(sec['f'], 1):
        x, y, w, h = f['b']
        fim = open_src(f['src']) if f.get('src') else im
        fsc = f.get('scale', sc)
        if f.get('snap') is False:
            print('   %d. %-14s 시드 %s (스냅 생략)' % (i, f['title'][:12], f['b']))
            continue
        sx, sy, sw, sh = M.snap(fim, (x * fsc, y * fsc, w * fsc, h * fsc),
                                search=9 * fsc, pad=0)
        nb = [round(sx / fsc), round(sy / fsc), round(sw / fsc), round(sh / fsc)]
        gx, gy = f.get('grow', (0, 0))
        nb = [nb[0] - gx, nb[1] - gy, nb[2] + gx * 2, nb[3] + gy * 2]
        d = [nb[0] - x, nb[1] - y, nb[2] - w, nb[3] - h]
        f['b'] = nb
        print('   %d. %-14s 시드 %s → 스냅 %s  이동 %s' % (i, f['title'][:12], [x, y, w, h], nb, d))

    for gi, g in enumerate(sec['g'], 1):
        gim = open_src(g['src']) if g.get('src') else im
        gsc = g.get('scale', sc)
        gw, gh = gim.width // gsc, gim.height // gsc
        gx0, gx1 = g.get('xcrop') or ((x0, x1) if gim.size == im.size and not g.get('src') else (0, gw))
        g.setdefault('mode', 'tb')
        g['img'] = '%s-%d.png' % (sec['key'], gi)
        if g.get('ycrop'):
            y0, y1 = g['ycrop']
            y0, y1 = max(0, int(y0)), min(gh, int(y1))
            g['crop'] = [gx0, y0, gx1 - gx0, y1 - y0]
            save_panel(gim, g, gx0, gx1, y0, y1, gsc, gi, ' · 지정')
            continue
        gk = (g.get('src', sec['src']), gx0, gx1)
        if gk not in ratio_cache:
            ratio_cache[gk] = bg_rows(np.asarray(gim).astype(int)
                                      [:, gx0 * gsc:gx1 * gsc])
        gr = ratio_cache[gk]
        top = min(sec['f'][k]['b'][1] for k in g['f'])
        bot = max(sec['f'][k]['b'][1] + sec['f'][k]['b'][3] for k in g['f'])
        py = g.get('pady', PADY)
        y0 = snap_edge(gr, (top - py) * gsc, (top - py * 3) * gsc, (top - 4) * gsc) // gsc
        y1 = snap_edge(gr, (bot + py) * gsc, (bot + 4) * gsc, (bot + py * 3) * gsc) // gsc
        y0, y1 = max(0, int(y0)), min(gh, int(y1))
        g['crop'] = [gx0, y0, gx1 - gx0, y1 - y0]
        save_panel(gim, g, gx0, gx1, y0, y1, gsc, gi)

    sec['cw'], sec['ch'] = cw, ch
    return sec


CSS_OVERRIDE = """
.ag{width:%(card)dpx}
.ag-head{padding:24px 30px 22px}
.ag-head h2{font-size:22px}
/* 안내 문구(콜아웃)는 갑지보다 3px 크게 */
.ag-co h3{font-size:15.5px;margin:0 0 4px}
.ag-co p{font-size:15px}
""" % dict(card=CARD_W)

JS_OVERRIDE = ("AG_LAYOUT.tb.IW=%(IW)d;AG_LAYOUT.tb.CW=%(CW)d;AG_LAYOUT.tb.LANE=%(LANE)d;"
               "AG_LAYOUT.tb.CPL=%(CPL)d;AG_LAYOUT.tb.LH=%(LH)d;") % TB


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
            'AG_fixWires();AG_fixBands();AG_fixFlows(document, DATA);</script></body></html>'
            % (css, js, JS_OVERRIDE, json.dumps(data, ensure_ascii=False)))
    os.makedirs(TMP, exist_ok=True)
    p = os.path.join(TMP, '_x.html')
    open(p, 'w', encoding='utf-8').write(html)
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
