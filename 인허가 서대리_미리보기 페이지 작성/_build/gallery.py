# -*- coding: utf-8 -*-
"""결과물 컷(STEP 11) 렌더러.

주석 패널과 달리 강조 박스·지시선이 없다. 만들어진 서류 자체를 보여 주는 자리라
카드 머리만 같은 스타일로 두고 서류를 그리드로 늘어놓는다.
"""
import os
import subprocess

import numpy as np
from PIL import Image

CSS = """
.ag-docs{display:flex;flex-wrap:wrap;gap:26px 22px;justify-content:center}
.ag-doc{width:%(w)dpx}
.ag-doc .t{font-size:12.5px;font-weight:700;color:var(--ag-blue-ink);margin-bottom:8px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ag-doc .s{border:1px solid var(--ag-line);border-radius:10px;overflow:hidden;background:#fff;
  box-shadow:0 8px 20px -12px rgba(20,45,110,.30)}
.ag-doc .s img{display:block;width:100%%}
.ag-note{display:flex;justify-content:center;margin-top:28px}
.ag-note span{font-size:12.5px;font-weight:700;color:var(--ag-accent-ink);background:#fff;
  border:1px solid var(--ag-accent-line);border-radius:9px;padding:8px 14px;
  box-shadow:0 2px 6px rgba(124,45,18,.07)}
"""

PRETENDARD = ('<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/'
              'pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">')


def render(sec, *, root, work, out, tmp, chrome, card_w, css_override, per_row=3):
    docs_dir = os.path.join(root, '갑지', '결과물')
    w = (card_w - 62 - 22 * (per_row - 1)) // per_row
    css = (open(os.path.join(work, 'annotation-guide.css'), encoding='utf-8').read()
           + css_override + CSS % dict(w=w))

    cells = []
    for fn, tag in sec['docs']:
        src = os.path.join(docs_dir, fn).replace(os.sep, '/')
        cells.append('<div class="ag-doc"><div class="t">%s</div>'
                     '<div class="s"><img src="file:///%s" alt=""></div></div>' % (tag, src))

    body = ('<div class="ag" data-section="%s">'
            '<div class="ag-head"><span class="ag-step">%s</span><h2>%s</h2><p>%s</p></div>'
            '<div class="ag-panels" style="padding:26px 30px 30px">'
            '<div class="ag-docs">%s</div>'
            '<div class="ag-note"><span>%s</span></div>'
            '</div></div>'
            % (sec['key'], sec['step'], sec['title'], sec['sub'], ''.join(cells), sec['note']))

    html = ('<!doctype html><html lang="ko"><head><meta charset="utf-8">' + PRETENDARD
            + '<style>' + css + '\nhtml,body{margin:0;padding:36px;background:#fff}</style>'
            + '</head><body>' + body + '</body></html>')

    os.makedirs(tmp, exist_ok=True)
    page = os.path.join(tmp, '_gallery.html')
    open(page, 'w', encoding='utf-8').write(html)

    dst = os.path.join(out, 'step%02d.png' % int(sec['key'][1:]))
    subprocess.run([chrome, '--headless', '--disable-gpu', '--hide-scrollbars',
                    '--force-device-scale-factor=2', '--virtual-time-budget=30000',
                    '--run-all-compositor-stages-before-draw',
                    '--window-size=1700,5200', '--screenshot=' + dst,
                    'file:///' + page.replace(os.sep, '/')],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    img = Image.open(dst).convert('RGB')
    a = np.asarray(img).astype(int)
    ys, xs = np.where(np.abs(a - 255).sum(axis=2) > 12)
    if len(xs):
        pad = 36
        img = img.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                        min(img.width, xs.max() + pad), min(img.height, ys.max() + pad)))
        img.save(dst)
    print('■ %s %s · 서류 %d장 → %s  %dx%d'
          % (sec['step'], sec['title'], len(sec['docs']),
             os.path.basename(dst), img.width, img.height))
