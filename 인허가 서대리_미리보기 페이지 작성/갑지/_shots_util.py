# -*- coding: utf-8 -*-
"""컷 이미지 뒷정리 도우미."""
import glob as _glob
import os

import numpy as np
from PIL import Image


def trim(im, tol=12):
    """흰 여백을 잘라낸다."""
    a = np.asarray(im.convert('RGB')).astype(int)
    m = np.abs(a - 255).sum(axis=2) > tol
    ys, xs = np.where(m)
    if not len(xs):
        return im
    return im.crop((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))


def unify(folder, margin=44, pattern='*.png'):
    """폴더 안 컷들을 한 캔버스 크기로 맞춘다.

    먼저 흰 여백을 걷어낸 뒤 다시 채우므로 몇 번 돌려도 결과가 같다.
    리사이즈는 하지 않는다 · 나란히 놓고 볼 때 글씨가 같은 크기로 보여야 한다.
    """
    paths = sorted(p for p in _glob.glob(os.path.join(folder, pattern))
                   if not os.path.basename(p).startswith('_'))
    if len(paths) < 2:
        return
    ims = [trim(Image.open(p).convert('RGB')) for p in paths]
    W = max(i.width for i in ims) + margin * 2
    H = max(i.height for i in ims) + margin * 2
    for p, im in zip(paths, ims):
        c = Image.new('RGB', (W, H), (255, 255, 255))
        c.paste(im, ((W - im.width) // 2, (H - im.height) // 2))
        c.save(p)
    print('  여백 %dpx · %d장 %dx%d 로 통일' % (margin, len(paths), W, H))
