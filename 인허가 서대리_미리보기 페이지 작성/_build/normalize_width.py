# -*- coding: utf-8 -*-
r"""
마커컷 폭 통일(리사이즈 없이 좌우 패딩만).
같은 문서/슬라이드에 넣었을 때 축소 배율이 같아져 라벨 글씨 크기가 일정해진다.
사용: python normalize_width.py [대상폴더] [--width N]
"""
import sys, os, glob
from PIL import Image

def run(folder, width=None, bg=(247, 249, 252)):
    files = sorted(glob.glob(os.path.join(folder, "*_marker.png")))
    if not files:
        print("대상 없음"); return
    sizes = [Image.open(f).size for f in files]
    W = width or max(w for w, h in sizes)
    print(f"기준 폭 {W}px · 대상 {len(files)}컷")
    for f, (w, h) in zip(files, sizes):
        if w == W:
            print(f"  = {os.path.basename(f)} ({w}x{h}) 변경없음"); continue
        im = Image.open(f).convert("RGB")
        canvas = Image.new("RGB", (W, h), bg)
        canvas.paste(im, ((W - w) // 2, 0))     # 가운데 정렬
        canvas.save(f)
        print(f"  + {os.path.basename(f)} {w} → {W}")

if __name__ == "__main__":
    a = sys.argv[1:]
    width = None
    if "--width" in a:
        i = a.index("--width"); width = int(a[i+1]); del a[i:i+2]
    folder = a[0] if a else r"c:\Users\USER\OneDrive\바탕 화면\py\tools\인허가 서대리_미리보기 페이지 작성\자료\갑지생성자료\마커컷"
    run(folder, width)
