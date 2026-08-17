# -*- coding: utf-8 -*-
"""국가법령정보 OPEN API → 로컬 캐시 (law_*.json).

`_README.md` 의 데이터 갱신 흐름에서 빠져 있던 fetch 단계.

    국가법령정보 API
       ↓ (law_api.py fetch)      ← 이 스크립트
    <LAW_CACHE_DIR>/law_*.json
       ↓ (compare_chamgo.py / compare_waste.py / build_definitions.py)
    검토자료/_API검토_*.md, md자료/*.md, 쓸자료/definitions.json

사용법
------
    set LAW_OC=<본인 OC 값>                      # 미설정 시 '123'

    python law_api.py fetch                      # 법·시행령·시행규칙 전문 → 캐시
    python law_api.py fetch --target 시행규칙      # 하나만
    python law_api.py byeolpyo 4 4의2 4의3        # 시행규칙 별표 원문 추출
    python law_api.py byeolpyo 1 2 --target 시행령
    python law_api.py show                        # 캐시 상태 확인

환경변수
--------
    LAW_OC          국가법령정보 OPEN API 사용자 식별값 (필수 성격)
    LAW_CACHE_DIR   덤프 저장 위치 (기본 d:/tmp) — build_definitions.py 와 같은 값을 쓸 것

주의
----
- OC 는 국가법령정보센터에 등록한 이메일 ID. 잘못되면 '사용자 정보 검증에 실패하였습니다' 가 온다.
- JSON 이 빈 응답 `{}` 으로 오는 경우가 있어 XML 폴백을 둔다 (법령API_사용법.md 트러블슈팅 참조).
- 별표 본문은 lawService 응답에 텍스트가 실리지 않는 경우가 있어, licbyl 검색 → PDF 링크 →
  pdfplumber 추출 경로를 폴백으로 둔다 (_lawgen/lawengine.py 의 byl_fetch 와 같은 방식).
"""
from __future__ import annotations

import argparse
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

OC = os.environ.get("LAW_OC", "123")
CACHE = Path(os.environ.get("LAW_CACHE_DIR", "d:/tmp"))
BASE = "https://www.law.go.kr"

# 파일명은 build_definitions.py / compare_*.py 가 기대하는 이름 그대로 유지한다.
TARGETS = {
    "법":       {"lid": "001771", "name": "폐기물관리법",           "file": "law_law_001771.json"},
    "시행령":   {"lid": "005353", "name": "폐기물관리법 시행령",     "file": "law_decree_005353.json"},
    "시행규칙": {"lid": "008567", "name": "폐기물관리법 시행규칙",   "file": "law_rule_008567.json"},
}

AUTH_FAIL = "사용자 정보 검증에 실패"


class LawApiError(RuntimeError):
    pass


# ─── HTTP ────────────────────────────────────────────────────────

def _get(url: str, binary: bool = False, timeout: int = 60):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    raw = urllib.request.urlopen(req, timeout=timeout).read()
    return raw if binary else raw.decode("utf-8")


def _check_auth(text: str) -> None:
    if AUTH_FAIL in text:
        raise LawApiError(
            f"OC 인증 실패 (현재 OC={OC!r}).\n"
            "  국가법령정보센터에 등록한 이메일 ID 를 LAW_OC 환경변수로 지정하세요.\n"
            "  예) set LAW_OC=gwangsik0424"
        )


# ─── 검색 / 본문 ─────────────────────────────────────────────────

def search_mst(law_name: str) -> str | None:
    """법령명으로 MST(법령일련번호) 조회. 부분일치 노이즈를 피해 정확 일치를 우선한다."""
    url = (f"{BASE}/DRF/lawSearch.do?OC={OC}&target=law&type=XML&search=1&display=20"
           f"&query={urllib.parse.quote(law_name)}")
    xml = _get(url)
    _check_auth(xml)
    exact = first = None
    for block in re.findall(r"<law[\s>].*?</law>", xml, re.S):
        mst = re.search(r"<법령일련번호>(\d+)</법령일련번호>", block)
        nm = re.search(r"<법령명한글>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</법령명한글>", block)
        if not mst:
            continue
        first = first or mst.group(1)
        if nm and nm.group(1).strip() == law_name:
            exact = mst.group(1)
            break
    return exact or first


def fetch_law(lid: str | None = None, mst: str | None = None) -> dict:
    """현행(시행일 기준) 법령 전문. JSON 우선, 빈 응답이면 XML 로 재시도해 원인을 알린다."""
    if not (lid or mst):
        raise ValueError("lid 또는 mst 중 하나는 필요합니다.")
    key = f"MST={mst}" if mst else f"ID={lid}"
    url = f"{BASE}/DRF/lawService.do?OC={OC}&target=eflaw&{key}&type=JSON"
    body = _get(url)
    _check_auth(body)
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        raise LawApiError(f"JSON 파싱 실패 ({key}). 응답 앞부분: {body[:200]!r}")
    if not data or "법령" not in data:
        xml = _get(f"{BASE}/DRF/lawService.do?OC={OC}&target=eflaw&{key}&type=XML")
        _check_auth(xml)
        raise LawApiError(
            f"JSON 이 비어 있습니다 ({key}). XML 응답 앞부분: {xml[:300]!r}\n"
            "  법령API_사용법.md 트러블슈팅의 '빈 응답' 항목을 참조하세요."
        )
    return data


def summarize(data: dict) -> dict:
    info = data["법령"].get("기본정보", {})
    jo = data["법령"].get("조문", {}).get("조문단위", [])
    if isinstance(jo, dict):
        jo = [jo]
    byl = data["법령"].get("별표", {}).get("별표단위", [])
    if isinstance(byl, dict):
        byl = [byl]
    return {
        "법령명": info.get("법령명_한글"),
        "법령ID": info.get("법령ID"),
        "법령일련번호": info.get("법령일련번호"),
        "시행일자": info.get("시행일자"),
        "공포번호": info.get("공포번호"),
        "조문수": len(jo),
        "별표수": len(byl),
    }


# ─── 별표 ────────────────────────────────────────────────────────

def byeolpyo_code(num: str) -> str:
    """'4의2' → '000402', '4' → '000400' (별표번호 4자리 + 가지번호 2자리)."""
    m = re.fullmatch(r"\s*(\d+)(?:의\s*(\d+))?\s*", num)
    if not m:
        raise ValueError(f"별표번호 형식 오류: {num!r}")
    return f"{int(m.group(1)):04d}{int(m.group(2) or 0):02d}"


def find_byeolpyo(data: dict, num: str) -> dict | None:
    code = byeolpyo_code(num)
    items = data["법령"].get("별표", {}).get("별표단위", [])
    if isinstance(items, dict):
        items = [items]
    for b in items:
        got = f"{int(str(b.get('별표번호', 0) or 0)):04d}{int(str(b.get('별표가지번호', 0) or 0)):02d}"
        if got == code and str(b.get("별표구분", "별표")).strip() == "별표":
            return b
    return None


def byeolpyo_pdf_text(law_name: str, num: str, max_pages: int = 30) -> str | None:
    """lawService 응답에 본문이 없을 때 licbyl 검색 → PDF → 텍스트 추출."""
    try:
        import pdfplumber
    except ImportError:
        print("  [!] pdfplumber 미설치 — PDF 폴백 생략 (pip install pdfplumber)", file=sys.stderr)
        return None
    code = byeolpyo_code(num)
    flat = law_name.replace(" ", "")
    link = None
    for page in range(1, 6):
        url = (f"{BASE}/DRF/lawSearch.do?OC={OC}&target=licbyl&type=XML&search=2&display=100"
               f"&page={page}&query={urllib.parse.quote(law_name)}")
        xml = _get(url)
        _check_auth(xml)
        blocks = re.findall(r"<licbyl [^>]*>.*?</licbyl>", xml, re.S)
        if not blocks:
            break
        for b in blocks:
            def g(tag: str) -> str:
                m = re.search(rf"<{tag}>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{tag}>", b, re.S)
                return m.group(1).strip() if m else ""
            if g("별표종류") != "별표" or g("별표번호") != code:
                continue
            if g("관련법령명").replace(" ", "") != flat:
                continue
            link = g("별표서식PDF파일링크") or g("별표서식파일링크")
            break
        if link:
            break
    if not link:
        return None
    with pdfplumber.open(io.BytesIO(_get(BASE + link, binary=True))) as pdf:
        return "\n".join((pg.extract_text() or "") for pg in pdf.pages[:max_pages])


# ─── 커맨드 ──────────────────────────────────────────────────────

def cmd_fetch(args) -> int:
    CACHE.mkdir(parents=True, exist_ok=True)
    keys = [args.target] if args.target else list(TARGETS)
    rc = 0
    for k in keys:
        spec = TARGETS[k]
        print(f"[{k}] {spec['name']} …")
        try:
            mst = search_mst(spec["name"]) if args.by_mst else None
            data = fetch_law(lid=None if mst else spec["lid"], mst=mst)
        except (LawApiError, urllib.error.URLError) as e:
            print(f"  ✗ {e}", file=sys.stderr)
            rc = 1
            continue
        meta = summarize(data)
        if meta["법령ID"] and meta["법령ID"] != spec["lid"]:
            print(f"  ! 법령ID 불일치: 기대 {spec['lid']} / 응답 {meta['법령ID']}", file=sys.stderr)
        out = CACHE / spec["file"]
        out.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        print(f"  ✓ {out}  시행일 {meta['시행일자']} · 조문 {meta['조문수']} · 별표 {meta['별표수']}")
    return rc


def cmd_byeolpyo(args) -> int:
    spec = TARGETS[args.target]
    path = CACHE / spec["file"]
    if not path.exists():
        print(f"캐시 없음: {path}\n  먼저 `python law_api.py fetch` 를 실행하세요.", file=sys.stderr)
        return 1
    data = json.loads(path.read_text(encoding="utf-8"))
    outdir = Path(args.outdir) if args.outdir else CACHE / "byeolpyo"
    outdir.mkdir(parents=True, exist_ok=True)
    rc = 0
    for num in args.numbers:
        b = find_byeolpyo(data, num)
        if b is None:
            print(f"  ✗ 별표 {num} — 캐시에서 못 찾음", file=sys.stderr)
            rc = 1
            continue
        title = str(b.get("별표제목", "")).strip()
        has_text = bool(str(b.get("별표내용", "")).strip())
        if not has_text and not args.no_pdf:
            text = byeolpyo_pdf_text(spec["name"], num)
            if text:
                b = dict(b)
                b["별표내용_PDF추출"] = text
                has_text = True
        out = outdir / f"별표{num}.json"
        out.write_text(json.dumps(b, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"  ✓ 별표 {num}  {title[:44]}  본문 {'있음' if has_text else '없음'} → {out}")
    return rc


def cmd_show(args) -> int:
    print(f"OC          = {OC!r}{'  (기본값 — LAW_OC 미설정)' if OC == '123' else ''}")
    print(f"LAW_CACHE_DIR = {CACHE}")
    for k, spec in TARGETS.items():
        p = CACHE / spec["file"]
        if not p.exists():
            print(f"  [{k:<5}] (없음)  {p}")
            continue
        try:
            meta = summarize(json.loads(p.read_text(encoding="utf-8")))
            print(f"  [{k:<5}] 시행일 {meta['시행일자']} · 조문 {meta['조문수']:>3} · 별표 {meta['별표수']:>3}  {p}")
        except Exception as e:
            print(f"  [{k:<5}] 읽기 실패: {e}")
    return 0


def main() -> int:
    ap = argparse.ArgumentParser(description="국가법령정보 OPEN API → 로컬 캐시")
    sub = ap.add_subparsers(dest="cmd", required=True)

    f = sub.add_parser("fetch", help="법령 전문을 받아 캐시에 저장")
    f.add_argument("--target", choices=list(TARGETS), help="생략 시 셋 다")
    f.add_argument("--by-mst", action="store_true",
                   help="법령ID 대신 검색으로 MST 를 찾아 호출 (시행일 특정이 필요할 때)")
    f.set_defaults(func=cmd_fetch)

    b = sub.add_parser("byeolpyo", help="캐시에서 별표를 뽑아 저장 (본문 없으면 PDF 폴백)")
    b.add_argument("numbers", nargs="+", help="별표번호. 예: 4 4의2 4의3")
    b.add_argument("--target", choices=list(TARGETS), default="시행규칙")
    b.add_argument("--outdir", help="기본 <LAW_CACHE_DIR>/byeolpyo")
    b.add_argument("--no-pdf", action="store_true", help="PDF 폴백 끄기")
    b.set_defaults(func=cmd_byeolpyo)

    s = sub.add_parser("show", help="OC·캐시 상태 확인")
    s.set_defaults(func=cmd_show)

    args = ap.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
