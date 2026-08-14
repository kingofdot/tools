# -*- coding: utf-8 -*-
r"""
인허가 서대리 공통 '지시선-박스' 마커 annotator.
스크린샷 위에 [작은 점 + 루트(√) 리더선 + 라벨박스]를 일관 스타일로 찍는다.

사용법:
  1) 스펙(JSON)으로:   python annotate.py spec.json
  2) import 해서:       from annotate import annotate
                        annotate(base="../컷/image.png", out="../컷/out.png",
                                 markers=[{"x":317,"y":224,"text":"필요한 갑지 서류를 선택하세요","side":"ur"}])

좌표(x,y)는 '원본 스크린샷 픽셀' 기준(=가리킬 지점). side 는 리더선 방향:
  ur(오른위·기본) / ul(왼위) / dr(오른아래) / dl(왼아래)
출력은 2x(레티나) PNG.
"""
import os, sys, json, subprocess
from PIL import Image

CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
BUILD  = os.path.dirname(os.path.abspath(__file__))

# ===== 마커 스타일 토큰(단일 소스, 여기만 고치면 전체 일관 반영) =====
TOK = dict(
    color   = "#F5820A",                       # 오렌지 액센트(파랑 메인의 보색)
    bg      = "#FFFFFF",                         # 라벨 배경: 흰색(불투명)
    dot_r   = 4.5, halo_r = 8, halo_op = 0.20, # 앵커 점 + 헤일로
    diag_dx = 35, diag_dy = 36, hbar = 54,     # 리더선: 대각(dx,dy) 후 수평(hbar)
    stroke  = 2.2,
    font_px = 18, font_w = 700,
    pad     = "9px 15px", radius = 11, border = 1.6,
    shadow  = "0 0 6px rgba(245,130,10,.35), 0 0 15px 1px rgba(245,130,10,.16)", # 바깥 주황 글로우(은은)
    font    = "'Malgun Gothic','맑은 고딕',sans-serif",
)

def _leader(x, y, side):
    dx, dy, h = TOK["diag_dx"], TOK["diag_dy"], TOK["hbar"]
    sx = 1 if side in ("ur", "dr") else -1     # 좌우
    sy = -1 if side in ("ur", "ul") else 1     # 상하
    bx, by = x + sx*dx, y + sy*dy              # 대각 꺾임점
    ex, ey = bx + sx*h, by                     # 수평 끝(= 박스 접점)
    path = f"M{x} {y} L{bx} {by} L{ex} {ey}"
    # 박스 위치/정렬: 오른쪽이면 좌측기준, 왼쪽이면 우측기준(translateX -100%)
    tx = "0" if sx > 0 else "-100%"
    return path, ex, ey, tx

def _html(base_rel, markers):
    caps, svg = [], []
    for m in markers:
        x, y = m["x"], m["y"]
        side = m.get("side", "ur")
        path, ex, ey, tx = _leader(x, y, side)
        svg.append(f'<circle cx="{x}" cy="{y}" r="{TOK["halo_r"]}" fill="{TOK["color"]}" opacity="{TOK["halo_op"]}"/>')
        svg.append(f'<circle cx="{x}" cy="{y}" r="{TOK["dot_r"]}" fill="{TOK["color"]}"/>')
        svg.append(f'<path d="{path}" stroke="{TOK["color"]}" stroke-width="{TOK["stroke"]}" '
                   f'stroke-linecap="round" stroke-linejoin="round"/>')
        caps.append(f'<div class="cap" style="left:{ex}px;top:{ey}px;transform:translate({tx},-50%)">'
                    f'{m["text"]}</div>')
    return f"""<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
body{{font-family:{TOK['font']}}}
.wrap{{position:relative}}
.wrap img{{display:block}}
.ov{{position:absolute;inset:0;pointer-events:none}}
.cap{{position:absolute;font-weight:{TOK['font_w']};font-size:{TOK['font_px']}px;white-space:nowrap;
  padding:{TOK['pad']};border-radius:{TOK['radius']}px;color:{TOK['color']};background:{TOK['bg']};
  border:{TOK['border']}px solid {TOK['color']};box-shadow:{TOK['shadow']}}}
</style></head><body>
<div class="wrap"><img id="bg" src="{base_rel}" alt="">
<svg class="ov" id="ov" fill="none">{''.join(svg)}</svg>
{''.join(caps)}
</div></body></html>"""

def annotate(base, out, markers, scale=2):
    """base: 스크린샷 경로, out: 결과 PNG 경로, markers: [{x,y,text,side}]"""
    base_abs = base if os.path.isabs(base) else os.path.normpath(os.path.join(BUILD, base))
    out_abs  = out  if os.path.isabs(out)  else os.path.normpath(os.path.join(BUILD, out))
    W, H = Image.open(base_abs).size
    base_rel = "file:///" + base_abs.replace("\\", "/")
    html = _html(base_rel, markers)
    # wrap/svg 크기를 원본 픽셀에 고정
    html = html.replace('<div class="wrap">',
                        f'<div class="wrap" style="width:{W}px;height:{H}px">')
    html = html.replace('<img id="bg"',
                        f'<img id="bg" style="width:{W}px;height:{H}px"')
    html = html.replace('<svg class="ov" id="ov" fill="none">',
                        f'<svg class="ov" id="ov" viewBox="0 0 {W} {H}" fill="none">')
    genp = os.path.join(BUILD, "_annotate_gen.html")
    open(genp, "w", encoding="utf-8").write(html)
    subprocess.run([CHROME, "--headless", "--disable-gpu", "--hide-scrollbars",
        f"--force-device-scale-factor={scale}", f"--window-size={W},{H}",
        "--screenshot=" + out_abs, "file:///" + genp.replace("\\", "/")],
        check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    ow, oh = Image.open(out_abs).size
    print(f"  {os.path.basename(out_abs)}  ({ow}x{oh}, {len(markers)} 마커)")
    return out_abs

if __name__ == "__main__":
    if len(sys.argv) >= 2:
        spec = json.load(open(sys.argv[1], encoding="utf-8"))
        annotate(spec["base"], spec["out"], spec["markers"], spec.get("scale", 2))
    else:
        # 데모: 확정 스타일 예시 재생성
        annotate("../컷/image.png", "../컷/image_marker.png",
                 [{"x": 317, "y": 224, "text": "필요한 갑지 서류를 선택하세요", "side": "ur"}])
