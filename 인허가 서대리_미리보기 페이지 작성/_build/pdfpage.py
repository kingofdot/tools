# -*- coding: utf-8 -*-
r"""
PDF 페이지 → PNG 렌더 (PyMuPDF).
  단일 페이지:   python pdfpage.py "<pdf>" <페이지(1-base)> [dpi=200] [out.png]
  썸네일 인덱스:  python pdfpage.py "<pdf>" index [out.png]
렌더된 페이지 PNG는 그대로 annotate.py로 마커 얹기 가능.
"""
import os, sys, math
import fitz
from PIL import Image, ImageDraw, ImageFont

BUILD = os.path.dirname(os.path.abspath(__file__))
OUT   = os.path.join(os.path.dirname(BUILD), "컷")
os.makedirs(OUT, exist_ok=True)

def render_page(pdf, page1, dpi=200, out=None):
    d = fitz.open(pdf)
    pg = d[page1-1]
    z = dpi/72.0
    pix = pg.get_pixmap(matrix=fitz.Matrix(z, z))
    if not out:
        base = os.path.splitext(os.path.basename(pdf))[0][:20]
        out = os.path.join(OUT, f"pdf_{base}_p{page1}.png")
    pix.save(out)
    print(f"  p{page1} @ {dpi}dpi -> {out}  ({pix.width}x{pix.height})")
    return out

def contact_sheet(pdf, out=None, cols=5, thumb_w=240, pad=16):
    d = fitz.open(pdf); n = d.page_count
    rows = math.ceil(n/cols)
    thumbs = []
    for i in range(n):
        z = thumb_w / d[i].rect.width
        pix = d[i].get_pixmap(matrix=fitz.Matrix(z, z))
        thumbs.append(Image.frombytes("RGB", (pix.width, pix.height), pix.samples))
    tw = thumb_w; th = max(t.height for t in thumbs); lab = 30
    W = cols*tw + (cols+1)*pad
    H = rows*(th+lab) + (rows+1)*pad
    sheet = Image.new("RGB", (W, H), "#EEF2F8")
    dr = ImageDraw.Draw(sheet)
    try: font = ImageFont.truetype("arialbd.ttf", 20)
    except Exception: font = ImageFont.load_default()
    for i, t in enumerate(thumbs):
        r, c = divmod(i, cols)
        x = pad + c*(tw+pad); y = pad + r*(th+lab)
        dr.text((x+2, y), f"p.{i+1}", fill="#1E51D5", font=font)
        sheet.paste(t, (x, y+lab-6))
    if not out:
        out = os.path.join(OUT, "pdf_index.png")
    sheet.save(out)
    print(f"  index {n}p -> {out}  ({W}x{H})")
    return out

if __name__ == "__main__":
    pdf = sys.argv[1]
    arg = sys.argv[2] if len(sys.argv) > 2 else "index"
    if arg == "index":
        contact_sheet(pdf, sys.argv[3] if len(sys.argv) > 3 else None)
    else:
        dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 200
        out = sys.argv[4] if len(sys.argv) > 4 else None
        render_page(pdf, int(arg), dpi, out)
