"""CustomTkinter GUI: PDF/이미지 → Claude Vision → JSON 미리보기 → DXF 저장"""
import json
import os
import threading
from pathlib import Path
from tkinter import filedialog, messagebox

import customtkinter as ctk
import matplotlib
matplotlib.use("TkAgg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from PIL import Image, ImageTk
import io

from ai_extract import extract, pdf_to_png_bytes, image_to_png_bytes
from dxf_writer import write as dxf_write
from preview import render as preview_render

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")


class App(ctk.CTk):
    def __init__(self):
        super().__init__()
        self.title("PDF → DXF (Gemini)")
        self.geometry("1200x780")

        self.input_path = None    # type: ignore
        self.png_bytes = None     # type: ignore
        self.result = None        # type: ignore
        self.image_aspect = 297 / 210  # width/height — 로드 시 실제 이미지에서 갱신

        # ── 좌측 컨트롤 패널 ────────────────────
        left = ctk.CTkFrame(self, width=300)
        left.pack(side="left", fill="y", padx=10, pady=10)
        left.pack_propagate(False)

        ctk.CTkLabel(left, text="PDF → DXF (Gemini)", font=("", 18, "bold")).pack(pady=(10, 20))

        self.btn_open = ctk.CTkButton(left, text="📂 PDF/이미지 열기", command=self.on_open)
        self.btn_open.pack(fill="x", padx=20, pady=5)

        self.lbl_file = ctk.CTkLabel(left, text="파일 없음", wraplength=260, text_color="gray")
        self.lbl_file.pack(padx=20, pady=(5, 15))

        # API 키: 코드에 내장됨 (ai_extract.DEFAULT_API_KEY). 덮어쓰고 싶으면 환경변수 GEMINI_API_KEY.
        self.entry_key = None

        self.btn_rotate = ctk.CTkButton(left, text="↻ 90° 우회전", command=self.on_rotate, state="disabled")
        self.btn_rotate.pack(fill="x", padx=20, pady=5)

        self.btn_analyze = ctk.CTkButton(left, text="🔎 AI 분석 실행", command=self.on_analyze, state="disabled")
        self.btn_analyze.pack(fill="x", padx=20, pady=5)

        self.btn_save = ctk.CTkButton(left, text="💾 DXF 저장", command=self.on_save, state="disabled")
        self.btn_save.pack(fill="x", padx=20, pady=5)

        self.btn_copy_json = ctk.CTkButton(left, text="📋 JSON 복사", command=self.on_copy_json, state="disabled")
        self.btn_copy_json.pack(fill="x", padx=20, pady=5)

        self.status = ctk.CTkLabel(left, text="준비됨", text_color="#38a169")
        self.status.pack(padx=20, pady=(20, 5))

        ctk.CTkLabel(left, text="진행 로그").pack(padx=20, pady=(10, 0), anchor="w")
        self.log_box = ctk.CTkTextbox(left, height=220, font=("Consolas", 10))
        self.log_box.pack(fill="x", padx=20, pady=(3, 10))
        self.log_box.configure(state="disabled")

        # ── 우측 프리뷰 영역 ────────────────────
        right = ctk.CTkFrame(self)
        right.pack(side="right", fill="both", expand=True, padx=(0, 10), pady=10)

        tabs = ctk.CTkTabview(right)
        tabs.pack(fill="both", expand=True, padx=10, pady=10)
        tabs.add("원본")
        tabs.add("AI 추출")
        tabs.add("JSON")
        self.tabs = tabs

        self.orig_label = ctk.CTkLabel(tabs.tab("원본"), text="(파일 없음)")
        self.orig_label.pack(fill="both", expand=True)

        self.fig, self.ax = plt.subplots(figsize=(8, 5.6))
        self.canvas = FigureCanvasTkAgg(self.fig, master=tabs.tab("AI 추출"))
        self.canvas.get_tk_widget().pack(fill="both", expand=True)

        self.json_box = ctk.CTkTextbox(tabs.tab("JSON"))
        self.json_box.pack(fill="both", expand=True)

    # ──────────────────────────────────────────
    def _set_status(self, text, color="#38a169"):
        self.status.configure(text=text, text_color=color)

    def _log(self, msg: str):
        import datetime as _dt
        ts = _dt.datetime.now().strftime("%H:%M:%S")
        self.log_box.configure(state="normal")
        self.log_box.insert("end", f"[{ts}] {msg}\n")
        self.log_box.see("end")
        self.log_box.configure(state="disabled")
        try:
            print(f"[{ts}] {msg}", flush=True)
        except UnicodeEncodeError:
            print(f"[{ts}] {msg}".encode("ascii", "replace").decode("ascii"), flush=True)

    def on_open(self):
        path = filedialog.askopenfilename(
            title="PDF 또는 이미지 선택",
            filetypes=[("PDF", "*.pdf"), ("이미지", "*.png *.jpg *.jpeg"), ("모두", "*.*")],
        )
        if not path:
            return
        self.input_path = path
        self.lbl_file.configure(text=Path(path).name)
        self._set_status("렌더링 중…", "#d69e2e")
        self.update()

        try:
            if path.lower().endswith(".pdf"):
                self.png_bytes = pdf_to_png_bytes(path)
            else:
                self.png_bytes = image_to_png_bytes(path)
        except Exception as e:
            messagebox.showerror("렌더 실패", str(e))
            self._set_status("렌더 실패", "#e53e3e")
            return

        self._refresh_preview()
        self.tabs.set("원본")
        self.btn_analyze.configure(state="normal")
        self.btn_rotate.configure(state="normal")
        self._set_status("분석 준비 완료")

    def _refresh_preview(self):
        if not self.png_bytes:
            return
        img = Image.open(io.BytesIO(self.png_bytes))
        w, h = img.size
        self.image_aspect = w / max(h, 1)
        img.thumbnail((850, 620))
        self._preview_img = ImageTk.PhotoImage(img)
        self.orig_label.configure(image=self._preview_img, text="")

    def on_rotate(self):
        """현재 원본 이미지(png_bytes)를 90° 우회전해 덮어씀 — 분석·저장 모두 회전된 기준."""
        if not self.png_bytes:
            return
        img = Image.open(io.BytesIO(self.png_bytes))
        # PIL: expand=True 로 회전 후 캔버스 자동 확장. -90 = 시계방향 90°
        rotated = img.rotate(-90, expand=True)
        buf = io.BytesIO()
        rotated.save(buf, format="PNG")
        self.png_bytes = buf.getvalue()
        self._refresh_preview()
        self.tabs.set("원본")
        self._set_status("90° 우회전됨 — 재분석 필요", "#d69e2e")
        # 이전 결과 무효화
        self.result = None
        self.btn_save.configure(state="disabled")
        self.btn_copy_json.configure(state="disabled")

    def on_analyze(self):
        if not self.png_bytes:
            return
        api_key = None  # ai_extract 쪽에서 DEFAULT_API_KEY fallback 사용
        self.btn_analyze.configure(state="disabled")
        self._set_status("Gemini 호출 중…", "#d69e2e")
        self._log("━━━ 분석 시작 ━━━")

        def progress_cb(msg: str):
            # 백그라운드 스레드에서 호출 — UI 업데이트는 after로 메인 스레드에 위임
            self.after(0, self._log, msg)
            self.after(0, self._set_status, msg, "#d69e2e")

        def worker():
            try:
                data = extract(self.png_bytes, api_key=api_key, progress=progress_cb)
                self.after(0, self._on_analyze_done, data)
            except Exception as e:
                self.after(0, self._on_analyze_fail, e)

        threading.Thread(target=worker, daemon=True).start()

    def _on_analyze_done(self, data):
        self.result = data
        self.json_box.delete("1.0", "end")
        self.json_box.insert("1.0", json.dumps(data, ensure_ascii=False, indent=2))
        self.ax.clear()
        preview_render(data, ax=self.ax, image_aspect=self.image_aspect)
        self.canvas.draw()
        self.tabs.set("AI 추출")
        self.btn_analyze.configure(state="normal")
        self.btn_save.configure(state="normal")
        self.btn_copy_json.configure(state="normal")
        n_s = len(data.get("site_boundaries", []) or [])
        n_b = len(data.get("buildings", []) or [])
        n_m = len(data.get("machines", []) or [])
        n_a = len(data.get("annotations", []) or [])
        self._log(f"✓ 완료 — 경계선 {n_s} · 건물 {n_b} · 기계 {n_m} · 주석 {n_a}")
        self._set_status(f"완료: 경계 {n_s} · 건물 {n_b} · 기계 {n_m} · 주석 {n_a}", "#38a169")

    def _on_analyze_fail(self, err):
        self.btn_analyze.configure(state="normal")
        self._set_status("분석 실패", "#e53e3e")
        self._log(f"✗ 실패: {type(err).__name__}: {str(err)[:200]}")
        messagebox.showerror("분석 실패", f"{type(err).__name__}: {err}")

    def on_save(self):
        if not self.result:
            return
        path = filedialog.asksaveasfilename(
            title="DXF로 저장",
            defaultextension=".dxf",
            initialfile=(Path(self.input_path).stem if self.input_path else "output") + ".dxf",
            filetypes=[("DXF", "*.dxf")],
        )
        if not path:
            return
        try:
            # 이미지 실제 비율에 맞춰 캔버스 결정 (긴 변 297mm 기준)
            if self.image_aspect >= 1:
                cw, ch = 297.0, 297.0 / self.image_aspect
            else:
                ch = 297.0
                cw = 297.0 * self.image_aspect
            dxf_write(self.result, path, canvas_w=cw, canvas_h=ch)
            self._set_status(f"저장됨: {Path(path).name}")
            messagebox.showinfo("완료", f"DXF 저장 완료\n{path}")
        except Exception as e:
            messagebox.showerror("저장 실패", str(e))
            self._set_status("저장 실패", "#e53e3e")

    def on_copy_json(self):
        if not self.result:
            return
        self.clipboard_clear()
        self.clipboard_append(json.dumps(self.result, ensure_ascii=False, indent=2))
        self._set_status("JSON 클립보드 복사됨")


if __name__ == "__main__":
    App().mainloop()
