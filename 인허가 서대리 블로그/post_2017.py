# -*- coding: utf-8 -*-
"""2017 질의회신 사례집을 인허가 서대리 블로그에 올린다.

  START   시작 인덱스(생략하면 _게시상태_2017.json 의 next_index)
  COUNT   올릴 건수(기본 10)
  PUBLISHED  true 공개 / false 비공개(기본 false)

  PUBLISHED=false COUNT=2 python post_saup.py
"""
import os, sys, io, json, time, urllib.request, urllib.error
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "posts_2017사례집.json")
STATE = os.path.join(HERE, "_게시상태_2017.json")
URL = "https://seodaeri.com/api/blog/posts"

SECRET = os.environ.get("BLOG_API_SECRET")
if not SECRET:
    print("ERROR: BLOG_API_SECRET 없음"); sys.exit(1)


def _next_index():
    if os.path.exists(STATE):
        try:
            return int(json.load(open(STATE, encoding="utf-8")).get("next_index", 0))
        except Exception:
            return 0
    return 0


START = int(os.environ["START"]) if os.environ.get("START") else _next_index()
COUNT = int(os.environ.get("COUNT", "10"))
PUBLISHED = os.environ.get("PUBLISHED", "false").lower() == "true"

ALL = json.load(open(SRC, encoding="utf-8"))
batch = []
for p in ALL[START:START + COUNT]:
    q = dict(p)
    q["published"] = PUBLISHED
    txt = q["title"] + q["content"] + q.get("excerpt", "")
    assert chr(0x2014) not in txt, "em-dash 가 들어 있다"
    batch.append(q)

if not batch:
    print("올릴 것이 없다. next_index %d, 전체 %d" % (START, len(ALL))); sys.exit(0)

print("대상 index %d~%d (%d건) · %s"
      % (START, START + len(batch) - 1, len(batch), "공개" if PUBLISHED else "비공개"))
for i, b in enumerate(batch):
    print("  [%d] %s" % (START + i, b["title"][:60]))

body = json.dumps({"posts": batch}, ensure_ascii=False).encode("utf-8")
req = urllib.request.Request(
    URL, data=body, method="POST",
    headers={"Authorization": "Bearer " + SECRET,
             "Content-Type": "application/json; charset=utf-8"})
try:
    with urllib.request.urlopen(req, timeout=90) as r:
        res = json.loads(r.read().decode("utf-8", "replace"))
except urllib.error.HTTPError as e:
    print("HTTP", e.code)
    print(e.read().decode("utf-8", "replace")[:1500])
    sys.exit(1)

d = res.get("data", {})
print("\n결과: created %s / skipped %s / failed %s"
      % (d.get("created"), d.get("skipped"), d.get("failed")))
ok = []
for r in d.get("results", []):
    i = r.get("index")
    t = batch[i]["title"][:46]
    if r.get("ok"):
        ok.append(r.get("postNumber"))
        print("  [%d] OK #%s  %s" % (START + i, r.get("postNumber"), t))
    elif r.get("skipped"):
        print("  [%d] SKIP(%s)  %s" % (START + i, r.get("error", ""), t))
    else:
        print("  [%d] FAIL %s  %s" % (START + i, r.get("error", ""), t))

st = {"source": "질의회신 사례집(2017.8.~2017.11.)", "total": len(ALL),
      "next_index": 0, "history": []}
if os.path.exists(STATE):
    try:
        st = json.load(open(STATE, encoding="utf-8"))
    except Exception:
        pass
st["total"] = len(ALL)
st["next_index"] = max(st.get("next_index", 0), START + len(batch))
st.setdefault("history", []).append(
    {"date": time.strftime("%Y-%m-%d %H:%M"), "start": START,
     "end": START + len(batch) - 1, "count": len(batch), "public": PUBLISHED,
     "created": d.get("created"), "skipped": d.get("skipped"),
     "posts": ("#%s~%s" % (min(ok), max(ok))) if ok else "-"})
json.dump(st, open(STATE, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n진행: %d/%d 완료, 다음 재개 index %d"
      % (st["next_index"], len(ALL), st["next_index"]))
