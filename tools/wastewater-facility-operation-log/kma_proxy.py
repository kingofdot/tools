#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KMA 온도 로컬 프록시 (CORS 우회 + EUC-KR→UTF-8)

기상청 apihub(kma_sfctm2 ASOS 시간자료)는 Access-Control-Allow-Origin 헤더가
없어 브라우저에서 직접 fetch 하면 CORS 로 막힌다. 이 프록시를 로컬에서 띄우면
운영일지 HTML(index.html)의 "온도 자동 채우기"가 여기로 요청 → 여기서 KMA 호출 →
CORS 헤더를 붙여 JSON 으로 돌려준다.

실행:  python kma_proxy.py     (→ http://127.0.0.1:8765)
종료:  Ctrl+C

엔드포인트:
  GET /temp?stn=203&d1=2026-07-01&d2=2026-07-02
    → {"ok":true, "stn":"203", "days":[{"date":"2026-07-01","temp":29.4,"tmax":33.9,"tmin":24.1}, ...]}

일별 온도 = 그 날 시간자료(TA)들의 평균(소수1). tmax/tmin 도 함께 반환.
"""

import json
import urllib.request
import urllib.parse
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

AUTH = "wiEQCJ__QkmhEAif_wJJtQ"          # 사용자 발급 authKey
KMA_URL = "https://apihub.kma.go.kr/api/typ01/url/kma_sfctm2.php"
PORT = 8765


def parse_ymd(s):
    y, m, d = map(int, s.split("-"))
    return date(y, m, d)


# kma_sfctm2 는 '특정시각 스냅샷' 엔드포인트 → tm1/tm2 범위를 무시하고 현재값만
# 돌려준다. 과거 기간자료(kma_sfctm3)는 authKey 활용신청이 별도로 필요(현재 403).
# 그래서 하루를 3시간 간격 8개 시각으로 '단일 tm' 호출해 표본을 모으고 평균한다.
SAMPLE_HOURS = [0, 3, 6, 9, 12, 15, 18, 21]


def fetch_ta(stn, ymdhm):
    """특정 시각(YYYYMMDDHHMM) 단일 조회 → TA(°C) 또는 None."""
    q = urllib.parse.urlencode({"tm": ymdhm, "stn": stn, "help": "0", "authKey": AUTH})
    url = f"{KMA_URL}?{q}"
    req = urllib.request.Request(url, headers={"User-Agent": "kma-proxy/1.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        raw = r.read().decode("euc-kr", errors="replace")
    for ln in raw.splitlines():
        if not ln or ln.startswith("#"):
            continue
        f = ln.split()
        # 헤더 순서: YYMMDDHHMI STN WD WS GST_WD GST_WS GST_TM PA PS PT PR TA ...
        if len(f) < 12 or not f[0].startswith(ymdhm[:8]):
            continue
        try:
            ta = float(f[11])
        except ValueError:
            continue
        if ta <= -50:          # 결측(-99 등) 제외
            continue
        return ta
    return None


def fetch_day(stn, day):
    """하루를 3시간 간격 표본으로 조회 → TA 리스트 반환."""
    tas = []
    for h in SAMPLE_HOURS:
        ymdhm = day.strftime("%Y%m%d") + f"{h:02d}00"
        try:
            ta = fetch_ta(stn, ymdhm)
        except Exception:
            ta = None
        if ta is not None:
            tas.append(ta)
    return tas


class Handler(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/temp":
            self.send_response(404)
            self._cors()
            self.end_headers()
            return
        qs = urllib.parse.parse_qs(u.query)
        stn = (qs.get("stn") or ["203"])[0]
        d1 = (qs.get("d1") or [""])[0]
        d2 = (qs.get("d2") or [d1])[0]
        try:
            start = parse_ymd(d1)
            end = parse_ymd(d2)
        except Exception as e:
            self._json({"ok": False, "error": f"bad date: {e}"}, 400)
            return

        days = []
        cur = start
        while cur <= end:
            try:
                tas = fetch_day(stn, cur)
            except Exception as e:
                tas = []
                err = str(e)
            else:
                err = None
            if tas:
                avg = round(sum(tas) / len(tas), 1)
                days.append({"date": cur.isoformat(), "temp": avg,
                             "tmax": round(max(tas), 1), "tmin": round(min(tas), 1),
                             "n": len(tas)})
            else:
                days.append({"date": cur.isoformat(), "temp": None,
                             "tmax": None, "tmin": None, "n": 0,
                             "note": err or "no data"})
            cur += timedelta(days=1)

        self._json({"ok": True, "stn": stn, "days": days})

    def _json(self, obj, code=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):        # 콘솔 조용히
        pass


if __name__ == "__main__":
    srv = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    print(f"KMA 온도 프록시 실행 중 → http://127.0.0.1:{PORT}")
    print("  예: http://127.0.0.1:%d/temp?stn=203&d1=2026-07-01&d2=2026-07-02" % PORT)
    print("  종료: Ctrl+C")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n종료됨")
