# -*- coding: utf-8 -*-
r"""전체 페이지 캡처 한 장을 카드 단위로 잘라낸다.

던져준 스크린샷에서 좌측 사이드바·상단 내비게이션을 걷어내고,
카드 사이의 '완전 배경' 줄을 구분자로 삼아 섹션 카드만 뽑는다.

  python _cut_page.py 자료/화면캡처/test.png
  python _cut_page.py 자료/화면캡처/test.png --out 자료/화면캡처/test_컷 --margin 12

결과 파일 이름은 `<원본>_1.png` … 순서대로. 잘린 카드를 마커컷 flow 에서
`<img>` 로 그대로 물려 쓰면 된다(원본은 건드리지 않는다).
"""
import io, os, sys
import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

MIN_H = 200        # 이보다 얇은 덩어리는 카드로 보지 않는다(배너·구분선)
GAP = 0.985        # 이 비율 이상이 배경색이면 '카드 사이 빈 줄'
MARGIN = 10        # 잘라낸 카드 둘레에 남길 여백(px)


def page_bg(a):
    """가장 많이 쓰인 색을 페이지 배경으로 본다."""
    s = a[::7, ::7].reshape(-1, 3)
    vals, cnt = np.unique(s, axis=0, return_counts=True)
    return vals[cnt.argmax()]


def content_x(a, bg):
    """좌측 사이드바를 뺀 본문 열 범위. 흰 카드가 차지하는 구간을 찾는다."""
    white = (np.abs(a - 255).sum(axis=2) < 14).mean(axis=0)
    xs = np.where(white > 0.25)[0]
    if not len(xs):
        return 0, a.shape[1]
    return int(xs.min()), int(xs.max()) + 1


def cards(a, bg, x0, x1):
    """카드 사이의 배경 줄을 구분자로 세로 구간을 나눈다."""
    isbg = (np.abs(a[:, x0:x1] - bg).sum(axis=2) < 10).mean(axis=1)
    out, s = [], None
    for y, g in enumerate(isbg > GAP):
        if not g and s is None:
            s = y
        elif g and s is not None:
            if y - s >= MIN_H:
                out.append((s, y))
            s = None
    if s is not None and len(isbg) - s >= MIN_H:
        out.append((s, len(isbg)))
    return out


def tight(a, bg, y0, y1, x0, x1):
    """카드 하나의 실제 경계를 다시 조인다."""
    seg = a[y0:y1, x0:x1]
    nb = (np.abs(seg - bg).sum(axis=2) > 10)
    xs = np.where(nb.any(axis=0))[0]
    ys = np.where(nb.any(axis=1))[0]
    return (x0 + int(xs.min()), y0 + int(ys.min()),
            x0 + int(xs.max()) + 1, y0 + int(ys.min()) + int(ys.max()) - int(ys.min()) + 1)


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    opt = {a.split('=')[0]: a.split('=')[1] for a in sys.argv[1:] if '=' in a and a.startswith('--')}
    if not args:
        sys.exit('사용법: python _cut_page.py <캡처.png> [--out=폴더] [--margin=10]')
    src = args[0]
    margin = int(opt.get('--margin', MARGIN))
    base = os.path.splitext(os.path.basename(src))[0]
    out = opt.get('--out', os.path.join(os.path.dirname(src), base + '_컷'))
    os.makedirs(out, exist_ok=True)

    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(int)
    bg = page_bg(a)
    x0, x1 = content_x(a, bg)
    bands = cards(a, bg, x0, x1)
    print('%s  %dx%d · 배경 %s · 본문 x %d~%d · 카드 %d개'
          % (os.path.basename(src), im.width, im.height, tuple(bg), x0, x1, len(bands)))

    n = 0
    for y0, y1 in bands:
        cx0, cy0, cx1, cy1 = tight(a, bg, y0, y1, x0, x1)
        L = max(0, cx0 - margin); T = max(0, cy0 - margin)
        R = min(im.width, cx1 + margin); B = min(im.height, cy1 + margin)
        if (R - L) < 200 or (B - T) < MIN_H:
            continue
        n += 1
        dst = os.path.join(out, '%s_%d.png' % (base, n))
        im.crop((L, T, R, B)).save(dst)
        print('  %d) %-22s %4dx%-4d  (CSS %dx%d)'
              % (n, os.path.basename(dst), R - L, B - T, (R - L) // 2, (B - T) // 2))
    print('→', out)


if __name__ == '__main__':
    main()
