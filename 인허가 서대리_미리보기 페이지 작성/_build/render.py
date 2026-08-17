# -*- coding: utf-8 -*-
# _build/card_*.html → Chrome 헤드리스 2x 렌더 → 여백 오토크롭 → ../컷/*.png
import subprocess, sys, os, glob, re
from PIL import Image, ImageChops, ImageOps

CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]
CHROME = next((c for c in CANDIDATES if os.path.exists(c)), CANDIDATES[0])
BUILD  = os.path.dirname(os.path.abspath(__file__))
OUT    = os.path.join(os.path.dirname(BUILD), "컷")
SCALE  = 2          # 레티나 2배
MARGIN = 64         # 카드 주변 캔버스 여백(출력 px)
os.makedirs(OUT, exist_ok=True)

def page_width(html, default=1300):
    """html의 .page{width:NNNpx} 를 읽어 창 너비를 맞춘다.
       창이 페이지보다 좁으면 오른쪽이 잘린 채로 캡처된다."""
    try:
        src = open(html, encoding="utf-8").read()
    except OSError:
        return default
    m = re.search(r"\.page\s*\{[^}]*?width\s*:\s*(\d+)px", src, re.S)
    return max(default, int(m.group(1)) + 80) if m else default


def render(html, height=6000):
    name = os.path.splitext(os.path.basename(html))[0]
    tmp  = os.path.join(BUILD, "_tmp_%s.png" % name)
    url  = "file:///" + html.replace("\\", "/")
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        "--force-device-scale-factor=%d" % SCALE,
        # 이미지가 다 로드되기 전에 캡처되면 그 아래가 통째로 잘린다.
        "--virtual-time-budget=20000", "--run-all-compositor-stages-before-draw",
        "--window-size=%d,%d" % (page_width(html), height), "--screenshot=" + tmp, url],
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
    # --h=12000 : 캡처 높이(CSS px). 페이지가 이보다 길면 아래가 잘린다.
    height = 6000
    for a in list(args):
        if a.startswith("--h="):
            height = int(a[4:]); args.remove(a)
    files = ([os.path.join(BUILD, a if a.endswith(".html") else a+".html") for a in args]
             if args else sorted(glob.glob(os.path.join(BUILD, "card_*.html"))))
    print("렌더:", len(files), "컷 / 높이", height)
    for f in files:
        render(f, height)
    print("완료 ->", OUT)
