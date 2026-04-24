"""정규화 좌표(0~1)를 mm로 변환해 DXF 생성."""
import ezdxf
from ezdxf import units

# A4 가로: 297 x 210 mm
DEFAULT_W = 297.0
DEFAULT_H = 210.0
TEXT_H = 3.0

def _to_mm(pt, w, h):
    """정규화 좌표(이미지 좌상단 원점, y↓) → DXF 좌표(좌하단 원점, y↑)"""
    x = float(pt[0]) * w
    y = h - float(pt[1]) * h
    return x, y

def _rect(msp, bounds, w, h, color=7):
    x1, y1 = _to_mm(bounds[:2], w, h)
    x2, y2 = _to_mm(bounds[2:], w, h)
    xmin, xmax = sorted([x1, x2])
    ymin, ymax = sorted([y1, y2])
    msp.add_lwpolyline(
        [(xmin, ymin), (xmax, ymin), (xmax, ymax), (xmin, ymax), (xmin, ymin)],
        dxfattribs={"color": color},
    )
    return xmin, ymin, xmax, ymax

def _polyline(msp, points, w, h, color=7, lineweight=None, closed=True):
    pts = [_to_mm(p, w, h) for p in points]
    if closed and pts and pts[0] != pts[-1]:
        pts.append(pts[0])
    attribs = {"color": color}
    if lineweight is not None:
        attribs["lineweight"] = lineweight
    return msp.add_lwpolyline(pts, dxfattribs=attribs)


def write(data: dict, out_path: str, canvas_w: float = DEFAULT_W, canvas_h: float = DEFAULT_H):
    doc = ezdxf.new(dxfversion="R2010", setup=True)
    doc.units = units.MM
    msp = doc.modelspace()

    # 도면 외곽 (연한 회색)
    msp.add_lwpolyline(
        [(0, 0), (canvas_w, 0), (canvas_w, canvas_h), (0, canvas_h), (0, 0)],
        dxfattribs={"color": 8},
    )

    # 제목
    title = (data.get("title") or "").strip()
    if title:
        msp.add_text(title, dxfattribs={"height": 7.0, "color": 1}).set_placement((10, canvas_h - 12))

    # 대지/부지 경계선 (빨간색, 굵게)
    for sb in data.get("site_boundaries", []) or []:
        poly = sb.get("polygon") or []
        if len(poly) >= 3:
            _polyline(msp, poly, canvas_w, canvas_h, color=1, lineweight=50, closed=True)
            if sb.get("label"):
                xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
                cx, cy = _to_mm([sum(xs)/len(xs), sum(ys)/len(ys)], canvas_w, canvas_h)
                msp.add_text(sb["label"], dxfattribs={"height": TEXT_H, "color": 1}).set_placement((cx, cy))

    # 건물
    for b in data.get("buildings", []) or []:
        poly = b.get("polygon")
        if poly and len(poly) >= 3:
            _polyline(msp, poly, canvas_w, canvas_h, color=7, closed=True)
            xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
            xmin, xmax = min(xs), max(xs); ymin, ymax = min(ys), max(ys)
            xmin, ymin_ = _to_mm((xmin, ymin), canvas_w, canvas_h)
            xmax_, ymax = _to_mm((xmax, ymax), canvas_w, canvas_h)
        else:
            xmin, ymin_, xmax_, ymax = _rect(msp, b["bounds"], canvas_w, canvas_h, color=7)
        if b.get("label"):
            msp.add_text(b["label"], dxfattribs={"height": TEXT_H, "color": 7}).set_placement((xmin + 1, ymax - TEXT_H - 1))

    # 기계
    for m in data.get("machines", []) or []:
        xmin, ymin, xmax, ymax = _rect(msp, m["bounds"], canvas_w, canvas_h, color=5)
        # 해치
        ht = (m.get("hatch") or "none").lower()
        if ht != "none":
            hatch = msp.add_hatch(color=5)
            pattern = "ANSI31" if ht == "diagonal" else "ANSI37"
            hatch.set_pattern_fill(pattern, scale=1.0)
            hatch.paths.add_polyline_path(
                [(xmin, ymin), (xmax, ymin), (xmax, ymax), (xmin, ymax)], is_closed=True
            )
        if m.get("label"):
            msp.add_text(m["label"], dxfattribs={"height": TEXT_H - 0.5, "color": 5}).set_placement((xmin, ymin - TEXT_H - 0.5))

    # 주석
    for a in data.get("annotations", []) or []:
        px, py = _to_mm(a["pos"], canvas_w, canvas_h)
        msp.add_text(a["text"], dxfattribs={"height": TEXT_H, "color": 3}).set_placement((px, py))
        if a.get("arrow_to"):
            ax, ay = _to_mm(a["arrow_to"], canvas_w, canvas_h)
            msp.add_line((px, py), (ax, ay), dxfattribs={"color": 3})

    doc.saveas(out_path)
