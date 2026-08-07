# -*- coding: utf-8 -*-
# 완성된 글감 JSON을 읽어 카페에 순차 게시. rate limit(연속등록 제한) 자동 처리.
# 글감 JSON 형식: [{"menuid":"28","subject":"...","content":"...(HTML)"}, ...]
# 사용:  python post_from_json.py "글감.json"
#   옵션 2번째 인자 = 시작 인덱스(중간부터 재개용, 기본 0)
# 주의: 네이버 카페 하루 게시 한도(대략 100~150건) 있음. 초과 시 "이해와 협조" 메시지로 차단됨 → 다음날 재개.
import sys, os, io, time, json, re
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cafe_post
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

def main():
    if len(sys.argv) < 2:
        print("사용: python post_from_json.py <글감.json> [시작인덱스]"); return
    path = sys.argv[1]
    start = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    items = json.load(open(path, encoding="utf-8"))
    print(f"총 {len(items)}건, 인덱스 {start}부터 게시")
    ok_n = blocked = 0
    for i in range(start, len(items)):
        it = items[i]
        menuid = str(it.get("menuid", "28"))
        time.sleep(9)
        body = ""
        for _ in range(6):
            code, body = cafe_post.post_article(menuid, it["subject"], it["content"])
            if "연속으로 등록" in body:
                time.sleep(10); continue
            break
        ok = '"msg":"Success"' in body
        aid = re.search(r'"articleId":(\d+)', body)
        aid = aid.group(1) if aid else "?"
        if ok:
            ok_n += 1
            print(f"[{i}] OK #{aid} | {it['subject'][:40]}")
        else:
            # 일일 한도/도배 차단 감지 시 중단
            if "이해와 협조" in body or "등록할 수 없" in body:
                blocked = 1
                print(f"[{i}] BLOCKED(일일 한도) → 중단. 다음날 'python post_from_json.py {os.path.basename(path)} {i}' 로 재개")
                break
            print(f"[{i}] FAIL {body[-70:]} | {it['subject'][:30]}")
    print(f"\n성공 {ok_n} / 대상 {len(items)-start}" + ("  (일일한도 차단으로 중단)" if blocked else ""))

if __name__ == "__main__":
    main()
