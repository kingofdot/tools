# -*- coding: utf-8 -*-
r"""
스크롤 캡처 정밀 세로 결합.
- 각 캡처에서 '본문 카드 좌경계'를 자동 검출해 본문만 크롭 → 폭 통일 → 세로 결합
- 좌측 사이드바는 첫 캡처 것만 1회 배치(반복 제거)
사용: python stitch_scroll.py <out.png> <in1> <in2> ... [--trim "0,12,0"]  (각 장 상단 잘라낼 px)
"""
import sys, os
from PIL import Image
import numpy as np

def content_left(im, lo=150):
    a = np.array(im.convert("RGB")); h, w, _ = a.shape
    xs = []
    for y in range(int(h*0.30), int(h*0.70), 5):
        row = a[y]
        white = np.where((row[:,0] > 250) & (row[:,1] > 250) & (row[:,2] > 250))[0]
        cand = white[white > lo]
        if len(cand): xs.append(int(cand[0]))
    return int(np.median(xs)) if xs else lo

def run(out, files, trims=None):
    ims = [Image.open(f).convert("RGB") for f in files]
    trims = trims or [0]*len(ims)
    lefts = [content_left(im) for im in ims]
    bodies = []
    for im, L, t in zip(ims, lefts, trims):
        b = im.crop((L, t, im.width, im.height))     # 본문만(사이드바 제거) + 상단 트림
        bodies.append(b)
    BW = max(b.width for b in bodies)
    norm = []
    for b in bodies:                                  # 본문 폭 정밀 통일
        if b.width != BW:
            b = b.resize((BW, round(b.height * BW / b.width)), Image.LANCZOS)
        norm.append(b)
    SBW = lefts[0]                                    # 사이드바 폭(첫 장 기준)
    sidebar = ims[0].crop((0, 0, SBW, ims[0].height))
    W = SBW + BW
    H = sum(b.height for b in norm)
    bg = ims[0].getpixel((5, ims[0].height - 5))      # 페이지 배경색 샘플
    canvas = Image.new("RGB", (W, H), bg)
    canvas.paste(sidebar, (0, 0))                     # 사이드바 1회만
    y = 0
    for b in norm:
        canvas.paste(b, (SBW, y)); y += b.height
    canvas.save(out)
    print(f"[stitch] {os.path.basename(out)}  {W}x{H} · 본문폭 {BW} · 사이드바 {SBW} · 좌경계 {lefts}")

if __name__ == "__main__":
    a = sys.argv[1:]
    trims = None
    if "--trim" in a:
        i = a.index("--trim"); trims = [int(x) for x in a[i+1].split(",")]; del a[i:i+2]
    run(a[0], a[1:], trims)
