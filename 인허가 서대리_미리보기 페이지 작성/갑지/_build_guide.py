# -*- coding: utf-8 -*-
r"""갑지 이용가이드 렌더 (분할 → 세로 결합).

Chrome 헤드리스는 큰 이미지가 여러 장 들어간 아주 긴 페이지를 한 번에 캡처하면
뒷부분을 통째로 누락시킨다(이 가이드는 STEP 4-4 이후가 잘렸다).
그래서 `<!-- SPLIT -->` 로 나눠 각각 렌더한 뒤 세로로 이어 붙인다.

  python _build_guide.py            → 갑지_이용가이드.png
"""
import os, re, subprocess, sys
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "_guide_gapzi.html")
DST = os.path.join(HERE, "갑지_이용가이드.png")
SCALE = 2
MARGIN = 64          # 최종 캔버스 상하좌우 여백(출력 px)
CAP_H = 9000         # 파트별 캡처 높이(CSS px)

CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]
CHROME = next((c for c in CANDIDATES if os.path.exists(c)), CANDIDATES[0])


def split_html(src):
    """HEAD + 본문청크들 + TAIL 로 분리."""
    s = open(src, encoding="utf-8").read()
    i = s.index('<div class="page">') + len('<div class="page">')
    head, rest = s[:i], s[i:]
    j = rest.rindex("</div>")
    body, tail = rest[:j], rest[j:]
    chunks = [c for c in body.split("<!-- SPLIT -->") if c.strip()]
    return head, chunks, tail


def shoot(html_path, out_png, width):
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=%d" % SCALE,
                    "--virtual-time-budget=20000",
                    "--window-size=%d,%d" % (width, CAP_H),
                    "--screenshot=" + out_png, "file:///" + html_path.replace("\\", "/")],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def tight_bottom(im, bg=(255, 255, 255)):
    """아래쪽 배경색 영역을 잘라낼 y 좌표."""
    px = im.load()
    w, h = im.size
    step = max(1, w // 220)
    for y in range(h - 1, -1, -1):
        if any(px[x, y] != bg for x in range(0, w, step)):
            return y + 1
    return h


def main():
    head, chunks, tail = split_html(SRC)
    m = re.search(r"\.page\s*\{[^}]*?width\s*:\s*(\d+)px", head, re.S)
    page_w = int(m.group(1)) if m else 1480
    win_w = page_w + 80

    parts = []
    for n, chunk in enumerate(chunks):
        h = head
        if n:  # 이어지는 파트는 페이지 상단 여백 제거
            h = h.replace("</style>", "  .page{padding-top:0}\n</style>")
        tmp_html = os.path.join(HERE, "_part%d.html" % n)
        tmp_png = os.path.join(HERE, "_part%d.png" % n)
        open(tmp_html, "w", encoding="utf-8").write(h + chunk + tail)
        shoot(tmp_html, tmp_png, win_w)
        im = Image.open(tmp_png).convert("RGB")
        im = im.crop((0, 0, im.width, tight_bottom(im)))
        parts.append(im)
        print("  part%d  %dx%d" % (n, im.width, im.height))
        os.remove(tmp_html)
        os.remove(tmp_png)

    W = max(p.width for p in parts)
    H = sum(p.height for p in parts)
    canvas = Image.new("RGB", (W + MARGIN * 2, H + MARGIN * 2), (255, 255, 255))
    y = MARGIN
    for p in parts:
        canvas.paste(p, (MARGIN, y))
        y += p.height
    canvas.save(DST)
    print("완료 -> %s  (%dx%d)" % (os.path.basename(DST), canvas.width, canvas.height))


if __name__ == "__main__":
    main()
