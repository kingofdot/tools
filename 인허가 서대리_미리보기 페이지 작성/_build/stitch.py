# -*- coding: utf-8 -*-
r"""
스크롤 캡처 여러 장을 세로로 이어붙임(폭 정렬 + 선택적 구분선).
사용: python stitch.py <out.png> <in1.png> <in2.png> [...] [--gap N] [--line]
"""
import sys, os
from PIL import Image, ImageDraw

def stitch(out, files, gap=0, line=False, bg=(247, 249, 252)):
    imgs = [Image.open(f).convert("RGB") for f in files]
    W = max(im.width for im in imgs)
    # 폭이 다르면 최대폭 기준 비율 확대(레이아웃 폭 살짝 다른 캡처 정렬)
    norm = []
    for im in imgs:
        if im.width != W:
            h = round(im.height * W / im.width)
            im = im.resize((W, h), Image.LANCZOS)
        norm.append(im)
    H = sum(im.height for im in norm) + gap * (len(norm) - 1)
    canvas = Image.new("RGB", (W, H), bg)
    dr = ImageDraw.Draw(canvas)
    y = 0
    for i, im in enumerate(norm):
        canvas.paste(im, (0, y))
        y += im.height
        if i < len(norm) - 1:
            if line:
                dr.line([(0, y + gap // 2), (W, y + gap // 2)], fill=(228, 233, 242), width=2)
            y += gap
    canvas.save(out)
    print(f"[stitch] {os.path.basename(out)}  {W}x{H}  ({len(files)}장)")
    return out

if __name__ == "__main__":
    a = sys.argv[1:]
    gap = 0; line = False
    if "--gap" in a:
        i = a.index("--gap"); gap = int(a[i+1]); del a[i:i+2]
    if "--line" in a:
        a.remove("--line"); line = True
    stitch(a[0], a[1:], gap=gap, line=line)
