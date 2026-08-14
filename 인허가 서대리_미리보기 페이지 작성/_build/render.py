# -*- coding: utf-8 -*-
# _build/card_*.html → Chrome 헤드리스 2x 렌더 → 여백 오토크롭 → ../컷/*.png
import subprocess, sys, os, glob
from PIL import Image, ImageChops, ImageOps

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BUILD  = os.path.dirname(os.path.abspath(__file__))
OUT    = os.path.join(os.path.dirname(BUILD), "컷")
SCALE  = 2          # 레티나 2배
MARGIN = 64         # 카드 주변 캔버스 여백(출력 px)
os.makedirs(OUT, exist_ok=True)

def render(html):
    name = os.path.splitext(os.path.basename(html))[0]
    tmp  = os.path.join(BUILD, "_tmp_%s.png" % name)
    url  = "file:///" + html.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=%d" % SCALE,
        "--window-size=1300,6000", "--screenshot=" + tmp, url],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    dst = os.path.join(OUT, name + ".png")
    autocrop(tmp, dst)
    os.remove(tmp)
    w, h = Image.open(dst).size
    print("  %-22s -> 컷/%s.png  (%dx%d)" % (name, name, w, h))

def autocrop(src, dst):
    im = Image.open(src).convert("RGB")
    bg = Image.new("RGB", im.size, im.getpixel((3, 3)))
    diff = ImageChops.difference(im, bg)
    bbox = diff.getbbox()
    if not bbox:
        im.save(dst); return
    keep = 40 * SCALE   # 그림자 살리려고 bbox 살짝 확장
    l = max(0, bbox[0]-keep); t = max(0, bbox[1]-keep)
    r = min(im.width, bbox[2]+keep); b = min(im.height, bbox[3]+keep)
    im = im.crop((l, t, r, b))
    im = ImageOps.expand(im, border=MARGIN, fill=im.getpixel((0, 0)))
    im.save(dst)

if __name__ == "__main__":
    args = sys.argv[1:]
    files = ([os.path.join(BUILD, a if a.endswith(".html") else a+".html") for a in args]
             if args else sorted(glob.glob(os.path.join(BUILD, "card_*.html"))))
    print("렌더:", len(files), "컷")
    for f in files:
        render(f)
    print("완료 ->", OUT)
