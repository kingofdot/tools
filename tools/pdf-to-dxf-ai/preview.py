"""추출된 JSON을 matplotlib으로 시각화."""
import matplotlib
import matplotlib.pyplot as plt
import matplotlib.font_manager as fm
from matplotlib.patches import Rectangle, FancyArrow, Polygon

# ── 한글 폰트 자동 선택 ────────────────────────────────────
_KR_CANDIDATES = ["Malgun Gothic", "NanumGothic", "AppleGothic", "Noto Sans CJK KR", "Gulim", "Dotum"]
_installed = {f.name for f in fm.fontManager.ttflist}
for _f in _KR_CANDIDATES:
    if _f in _installed:
        matplotlib.rcParams["font.family"] = _f
        break
matplotlib.rcParams["axes.unicode_minus"] = False


def render(data: dict, ax=None, image_aspect: float = 297 / 210):
    """image_aspect = 이미지 폭 / 높이. 기본 A4 가로(1.414)."""
    close_after = ax is None
    if ax is None:
        fig, ax = plt.subplots(figsize=(10, 10 / image_aspect))

    ax.set_xlim(0, 1)
    ax.set_ylim(1, 0)
    # 정규화 좌표 0~1 공간을 image_aspect 비율로 표시
    #   x 단위 1 : y 단위 1/image_aspect  → 전체 박스가 image_aspect : 1
    ax.set_aspect(1.0 / image_aspect)
    ax.set_facecolor("#fafafa")
    ax.grid(True, linestyle=":", alpha=0.3)

    title = (data.get("title") or "").strip()
    if title:
        ax.text(0.02, 0.04, title, fontsize=13, color="red", weight="bold")

    # 대지/부지 경계선
    for sb in data.get("site_boundaries", []) or []:
        poly = sb.get("polygon") or []
        if len(poly) >= 3:
            ax.add_patch(Polygon(poly, closed=True, fill=False, edgecolor="red", linewidth=1.8))
            if sb.get("label"):
                xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
                ax.text(sum(xs)/len(xs), sum(ys)/len(ys), sb["label"], fontsize=8, color="red")

    for b in data.get("buildings", []) or []:
        poly = b.get("polygon")
        if poly and len(poly) >= 3:
            ax.add_patch(Polygon(poly, closed=True, fill=False, edgecolor="black", linewidth=1.2))
            xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
            x1, y1 = min(xs), min(ys)
        else:
            x1, y1, x2, y2 = b["bounds"]
            ax.add_patch(Rectangle((x1, y1), x2 - x1, y2 - y1, fill=False, edgecolor="black", linewidth=1.2))
        if b.get("label"):
            ax.text(x1 + 0.003, y1 + 0.015, b["label"], fontsize=7, color="black")

    for m in data.get("machines", []) or []:
        x1, y1, x2, y2 = m["bounds"]
        hatch = {"diagonal": "///", "cross": "xxx"}.get((m.get("hatch") or "none").lower(), "")
        ax.add_patch(Rectangle((x1, y1), x2 - x1, y2 - y1, fill=False, edgecolor="blue", hatch=hatch, linewidth=0.8))
        if m.get("label"):
            ax.text(x1, y2 + 0.015, m["label"], fontsize=6, color="blue")

    for a in data.get("annotations", []) or []:
        px, py = a["pos"]
        ax.text(px, py, a["text"], fontsize=8, color="green")
        if a.get("arrow_to"):
            ax_, ay_ = a["arrow_to"]
            ax.add_patch(FancyArrow(px, py, ax_ - px, ay_ - py, width=0.002, color="green", length_includes_head=True))

    ax.set_title("AI 추출 미리보기")
    if close_after:
        plt.tight_layout()
        plt.show()
