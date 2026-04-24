"""Gemini Vision(REST) 으로 도면을 JSON 구조로 추출.

Python 3.8 호환을 위해 SDK 대신 httpx로 직접 호출한다.
"""
from __future__ import annotations

import base64
import json
import os
import re
import sys
from pathlib import Path
from typing import Callable, Optional

import httpx
import fitz

from prompts import EXTRACT_SYSTEM, EXTRACT_USER

# Windows 콘솔 cp949 → 한글·em-dash 에러 방지. 가능한 환경에서만 UTF-8로 재설정.
try:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    if hasattr(sys.stderr, "reconfigure"):
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
except Exception:
    pass

# Flash: 일일 1500회·분당 15회 무료. 정확도 높일 땐 'gemini-2.5-pro' 로 교체(유료 권장).
MODEL = "gemini-2.5-flash"
API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"
RENDER_DPI = 220                  # 정밀도와 업로드 속도 밸런스
MAX_OUTPUT_TOKENS = 32768
REQUEST_TIMEOUT = 240.0           # 네트워크/모델 지연 여유
MAX_RETRIES = 2                   # 타임아웃·5xx 재시도
ProgressCb = Callable[[str], None]

# 사용자 요청으로 코드에 내장된 기본 키 (보안상 권장 X — 로테이션 필수)
DEFAULT_API_KEY = "AIzaSyD34uqwo28ZfxMG1tk-xhNheuAUevHBT_o"


def pdf_to_png_bytes(pdf_path: str, page_index: int = 0) -> bytes:
    with fitz.open(pdf_path) as doc:
        page = doc[page_index]
        mat = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
        pix = page.get_pixmap(matrix=mat)
        return pix.tobytes("png")


def image_to_png_bytes(img_path: str) -> bytes:
    return Path(img_path).read_bytes()


def _strip_json_fence(text: str) -> str:
    m = re.search(r"```(?:json)?\s*(\{.*\})\s*```", text, re.DOTALL)
    if m:
        return m.group(1)
    # fence 없이 첫 번째 JSON object 추출
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        return text[start:end + 1]
    return text.strip()


def _repair_json(raw: str) -> str:
    """LLM이 자주 깨뜨리는 패턴 보정."""
    s = raw
    s = s.replace("“", '"').replace("”", '"').replace("‘", "'").replace("’", "'")
    s = re.sub(r'(?m)^\s*//.*$', '', s)
    s = re.sub(r'/\*.*?\*/', '', s, flags=re.DOTALL)
    s = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f]', '', s)
    s = re.sub(r',\s*([}\]])', r'\1', s)
    return s


def _salvage_truncated(raw: str) -> Optional[str]:
    """max_tokens 등으로 잘린 JSON을 마지막으로 완료된 객체까지만 남기고 닫는다."""
    if not raw.lstrip().startswith("{"):
        return None
    depth_obj = 0
    depth_arr = 0
    in_str = False
    esc = False
    start = raw.find("{")
    i = start
    last_complete_member_end = -1   # depth_obj==1 에서 , 를 만난 위치
    while i < len(raw):
        c = raw[i]
        if esc:
            esc = False
        elif c == "\\" and in_str:
            esc = True
        elif c == '"':
            in_str = not in_str
        elif not in_str:
            if c == "{":
                depth_obj += 1
            elif c == "}":
                depth_obj -= 1
            elif c == "[":
                depth_arr += 1
            elif c == "]":
                depth_arr -= 1
            elif c == "," and depth_obj == 1 and depth_arr == 0:
                # 최상위 key: value, 바로 뒤 — 이 지점까지는 안전하게 자를 수 있음
                last_complete_member_end = i
        i += 1
    if last_complete_member_end < 0:
        return None
    # last_complete_member_end 앞까지 자르고, 남아있던 깊이만큼 닫아준다
    trimmed = raw[start:last_complete_member_end]
    # trimmed 기준으로 현재 깊이 다시 계산
    d_obj = 0
    d_arr = 0
    in_str = False
    esc = False
    for c in trimmed:
        if esc:
            esc = False
            continue
        if c == "\\" and in_str:
            esc = True
            continue
        if c == '"':
            in_str = not in_str
            continue
        if in_str:
            continue
        if c == "{":
            d_obj += 1
        elif c == "}":
            d_obj -= 1
        elif c == "[":
            d_arr += 1
        elif c == "]":
            d_arr -= 1
    closing = "]" * d_arr + "}" * d_obj
    return trimmed + closing


def _parse_json_safe(raw_text: str, progress: Optional[ProgressCb] = None) -> dict:
    body = _strip_json_fence(raw_text)
    try:
        return json.loads(body)
    except json.JSONDecodeError:
        pass
    if progress:
        progress("JSON 보정 중…")
    repaired = _repair_json(body)
    try:
        return json.loads(repaired)
    except json.JSONDecodeError:
        pass
    if progress:
        progress("응답 잘림 감지 — 완료된 부분만 복원 중…")
    salvaged = _salvage_truncated(repaired)
    if salvaged:
        try:
            data = json.loads(salvaged)
            if progress:
                progress("부분 복원 성공 — 일부 객체는 누락될 수 있음")
            return data
        except json.JSONDecodeError:
            pass
    # 디버그용 원본 저장
    dbg = Path(__file__).parent / "last_response.txt"
    try:
        dbg.write_text(raw_text, encoding="utf-8")
    except Exception:
        pass
    raise ValueError(
        f"Gemini 응답을 JSON으로 파싱 실패.\n"
        f"원본 저장됨: {dbg}\n"
        f"— 원본 앞부분 —\n{raw_text[:600]}"
    )


def extract(png_bytes: bytes, api_key: Optional[str] = None, progress: Optional[ProgressCb] = None) -> dict:
    def _p(msg: str):
        try:
            print(f"[extract] {msg}", flush=True)
        except UnicodeEncodeError:
            # 재설정 실패한 구형 콘솔 — ASCII로 치환해서라도 출력
            print(f"[extract] {msg}".encode("ascii", "replace").decode("ascii"), flush=True)
        if progress:
            try:
                progress(msg)
            except Exception:
                pass

    key = api_key or os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or DEFAULT_API_KEY
    if not key:
        raise RuntimeError("GEMINI_API_KEY 환경변수 또는 api_key 인자가 필요합니다.")

    _p(f"이미지 준비 중 ({len(png_bytes) // 1024} KB)")
    img_b64 = base64.standard_b64encode(png_bytes).decode()

    url = f"{API_BASE}/{MODEL}:generateContent"
    body = {
        "systemInstruction": {"parts": [{"text": EXTRACT_SYSTEM}]},
        "contents": [{
            "role": "user",
            "parts": [
                {"inlineData": {"mimeType": "image/png", "data": img_b64}},
                {"text": EXTRACT_USER},
            ],
        }],
        "generationConfig": {
            "responseMimeType": "application/json",
            "temperature": 0.1,
            "maxOutputTokens": MAX_OUTPUT_TOKENS,
            # Flash 2.5 기본 thinking 비활성 — 출력 토큰 잠식 방지
            "thinkingConfig": {"thinkingBudget": 0},
        },
    }

    import time
    resp = None
    last_err = None
    for attempt in range(1, MAX_RETRIES + 2):
        _p(f"Gemini 호출 중 ({MODEL}) — 시도 {attempt}/{MAX_RETRIES + 1}, 타임아웃 {int(REQUEST_TIMEOUT)}초")
        t0 = time.time()
        try:
            with httpx.Client(timeout=REQUEST_TIMEOUT) as client:
                r = client.post(url, params={"key": key}, json=body)
            elapsed = time.time() - t0
            if r.status_code == 200:
                resp = r.json()
                _p(f"응답 수신 (걸린 시간 {elapsed:.1f}초)")
                break
            # 5xx/429는 재시도, 4xx는 즉시 실패
            if r.status_code >= 500 or r.status_code == 429:
                last_err = f"API {r.status_code}: {r.text[:300]}"
                _p(f"재시도 가능 오류: {last_err}")
                time.sleep(2 ** attempt)
                continue
            raise RuntimeError(f"Gemini API {r.status_code}: {r.text[:800]}")
        except httpx.TimeoutException as e:
            last_err = f"timeout after {time.time() - t0:.1f}s"
            _p(f"타임아웃 — {last_err}. 재시도합니다.")
            continue
        except httpx.HTTPError as e:
            last_err = f"{type(e).__name__}: {e}"
            _p(f"HTTP 오류: {last_err}. 재시도합니다.")
            time.sleep(1)
            continue
    if resp is None:
        raise RuntimeError(f"Gemini 호출 모든 재시도 실패. 마지막 오류: {last_err}")

    # usage/finishReason 로깅
    try:
        fr = resp["candidates"][0].get("finishReason", "?")
        usage = resp.get("usageMetadata", {})
        _p(f"응답 수신 — finishReason={fr}, in={usage.get('promptTokenCount','?')} out={usage.get('candidatesTokenCount','?')}")
        if fr == "MAX_TOKENS":
            _p("⚠ MAX_TOKENS 도달 — 응답이 잘렸을 수 있음. 부분 복원 시도.")
    except Exception:
        pass

    try:
        text = resp["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError) as e:
        raise RuntimeError(f"응답 구조 오류: {json.dumps(resp, ensure_ascii=False)[:500]}") from e

    _p("JSON 파싱 중…")
    data = _parse_json_safe(text, progress=_p)
    n_b = len(data.get("buildings", []) or [])
    n_m = len(data.get("machines", []) or [])
    n_a = len(data.get("annotations", []) or [])
    _p(f"파싱 완료 — 건물 {n_b}, 기계 {n_m}, 주석 {n_a}")
    return data
