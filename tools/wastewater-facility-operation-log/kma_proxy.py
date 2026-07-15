#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
KMA 날씨/온도 로컬 프록시 (기후통계 일자료 + CORS 우회 + EUC-KR→UTF-8)

기상청 apihub 는 Access-Control-Allow-Origin 헤더가 없어 브라우저에서 직접 fetch 하면
CORS 로 막힌다. 이 프록시를 로컬에서 띄우면 운영일지 HTML(index.html)의
"날씨/온도 자동 채우기"가 여기로 요청 → 여기서 KMA 호출 → CORS 헤더를 붙여 JSON 반환.

■ 데이터 소스: 기후통계 일자료(sts_*). 기간(tm1~tm2)을 한 번 호출하면 일별 집계값이
   전부 온다. 요소별 5개 엔드포인트만 호출하면 되므로 시간자료 표본추출보다 훨씬 적은 호출.
   (지점 파라미터는 stn 이 아니라 stn_id, 날짜는 yyyymmdd)
   - sts_ta   : 일평균/최고/최저 기온
   - sts_cloud: 평균전운량(맑음/흐림)
   - sts_rn   : 일합계강수량(비)
   - sts_sd   : 최심신적설(눈)
   - sts_fog  : 안개계속시간(안개)

실행:  python kma_proxy.py     (→ http://127.0.0.1:8765)
종료:  Ctrl+C

엔드포인트:
  GET /wx?stn=203&d1=2026-07-01&d2=2026-07-02     ← 날씨+온도 한 번에
  GET /temp?stn=203&d1=2026-07-01&d2=2026-07-02   ← 온도만(sts_ta 1회 호출)
"""

import json
import urllib.request
import urllib.parse
from datetime import date, timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

AUTH = "wiEQCJ__QkmhEAif_wJJtQ"          # 사용자 발급 authKey (배포 시 운영 계정 키로 교체)
BASE = "https://apihub.kma.go.kr/api/typ01/url"
PORT = 8765

# 기후통계 일자료 엔드포인트
EP = {"ta": "sts_ta", "cloud": "sts_cloud", "rain": "sts_rn", "snow": "sts_sd", "fog": "sts_fog"}
# 각 CSV 행의 컬럼 인덱스(0-based, 공통 prefix: 0=YMD 1=STN 2=LAT 3=LON 4=ALTD)
COL = {"ta_davg": 5, "tmx": 6, "tmn": 8, "tca": 6, "rn_dsum": 5, "fsd": 5, "fog": 5}


def parse_ymd(s):
    y, m, d = map(int, s.split("-"))
    return date(y, m, d)


def _num(f, i, allow_neg=False):
    """CSV 필드 → float. 결측(-99.9/-999)은 None. allow_neg=False면 음수도 None(강수/적설/운량용)."""
    try:
        v = float(f[i])
    except (ValueError, IndexError):
        return None
    if v <= -90:            # 결측 코드
        return None
    if not allow_neg and v < 0:
        return None
    return v


def fetch_stat(ep, stn, d1, d2):
    """기후통계 일자료 1회 호출 → {yyyymmdd: [필드...]}. 기간 전체가 한 번에 온다."""
    q = urllib.parse.urlencode({"tm1": d1, "tm2": d2, "stn_id": stn,
                                "disp": "0", "help": "0", "authKey": AUTH})
    req = urllib.request.Request(f"{BASE}/{ep}.php?{q}", headers={"User-Agent": "kma-proxy/2.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read().decode("euc-kr", errors="replace")
    out = {}
    for ln in raw.splitlines():
        ln = ln.strip()
        if not ln or not ln[0].isdigit():      # 주석(#)/헤더/빈줄 제외
            continue
        f = ln.split(",")
        if len(f) >= 6 and len(f[0]) == 8:
            out[f[0]] = f
    return out


def derive_weather(ta, cloud, rain, snow, fog):
    """일 집계값 → 대표 날씨(맑음/흐림/비/눈/안개) + 강수/적설 수치."""
    if snow and snow > 0:
        return f"눈({snow}cm)"
    if rain and rain > 0:
        return f"비({rain}mm)"
    if fog and fog > 0:
        return "안개"
    if cloud is not None:
        return "흐림" if cloud >= 6 else "맑음"
    return None


def build_days(stn, start, end, weather=True):
    d1, d2 = start.strftime("%Y%m%d"), end.strftime("%Y%m%d")
    keys = EP.keys() if weather else ["ta"]
    stats = {}
    for k in keys:
        try:
            stats[k] = fetch_stat(EP[k], stn, d1, d2)
        except Exception:
            stats[k] = {}

    days = []
    cur = start
    while cur <= end:
        ymd = cur.strftime("%Y%m%d")
        ta_row = stats.get("ta", {}).get(ymd)
        temp = _num(ta_row, COL["ta_davg"], allow_neg=True) if ta_row else None
        tmax = _num(ta_row, COL["tmx"], allow_neg=True) if ta_row else None
        tmin = _num(ta_row, COL["tmn"], allow_neg=True) if ta_row else None
        rec = {"date": cur.isoformat(), "temp": temp, "tmax": tmax, "tmin": tmin}
        if weather:
            cl = stats.get("cloud", {}).get(ymd)
            rn = stats.get("rain", {}).get(ymd)
            sd = stats.get("snow", {}).get(ymd)
            fg = stats.get("fog", {}).get(ymd)
            cloud = _num(cl, COL["tca"]) if cl else None
            rain = _num(rn, COL["rn_dsum"]) if rn else None
            snow = _num(sd, COL["fsd"]) if sd else None
            fog = _num(fg, COL["fog"]) if fg else None
            rec.update({"weather": derive_weather(temp, cloud, rain, snow, fog),
                        "rain": rain, "snow": snow, "cloud": cloud})
        days.append(rec)
        cur += timedelta(days=1)
    return days


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
        if u.path not in ("/wx", "/temp"):
            self.send_response(404)
            self._cors()
            self.end_headers()
            return
        qs = urllib.parse.parse_qs(u.query)
        stn = (qs.get("stn") or ["203"])[0]
        d1 = (qs.get("d1") or [""])[0]
        d2 = (qs.get("d2") or [d1])[0]
        try:
            start, end = parse_ymd(d1), parse_ymd(d2)
        except Exception as e:
            self._json({"ok": False, "error": f"bad date: {e}"}, 400)
            return
        try:
            days = build_days(stn, start, end, weather=(u.path == "/wx"))
        except Exception as e:
            self._json({"ok": False, "error": str(e)}, 500)
            return
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
    print(f"KMA 날씨/온도 프록시 실행 중 → http://127.0.0.1:{PORT}")
    print("  예: http://127.0.0.1:%d/wx?stn=203&d1=2026-07-01&d2=2026-07-02" % PORT)
    print("  종료: Ctrl+C")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\n종료됨")
