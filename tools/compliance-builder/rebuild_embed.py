"""
index.html 임베딩 데이터 재생성 스크립트
- 별표5 JSON(최신) 기준으로 B5_ITEMS, B5_ALL_FOR_WORD 재embed
- build.js를 node 없이 Python으로 대체
"""
import json, re

BASE    = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder"
B5_PATH = f"{BASE}/data/검토사항/시행규칙/별표5_처리구체적기준및방법.json"
HTML    = f"{BASE}/app/index.html"

# 삭제 조항 판정 (text가 "삭제"로 시작하는 항목)
def is_deleted(item):
    return bool(re.match(r'^삭제[\s<(]', item.get('text', '') or ''))

with open(B5_PATH, encoding='utf-8') as f:
    raw = json.load(f)['별표내용']

all_raw = []
for idx, item in enumerate(raw):
    if isinstance(item, dict):
        all_raw.append({**item, '_idx': idx})

# B5_ITEMS: action 있는 것 중 삭제 항목 제외
items = [i for i in all_raw
         if i.get('tags') and i['tags'].get('action')
         and not is_deleted(i)]

# B5_ALL_FOR_WORD: noWord=False & (섹션헤더 or action 있음) & 삭제 항목 제외
all_for_word = [i for i in all_raw
                if not i.get('noWord')
                and not is_deleted(i)
                and (i.get('tags') is None or (i.get('tags') and i['tags'].get('action')))]

# HTML <script> 안에서 < > & 는 이스케이프 필요 (VS Code HTML 파서 오류 방지)
def safe_json(obj):
    s = json.dumps(obj, ensure_ascii=False)
    # HTML <script> 안에서 < > & 는 유니코드 이스케이프로 교체
    return s.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')

b5_items_json     = safe_json(items)
b5_all_word_json  = safe_json(all_for_word)

with open(HTML, encoding='utf-8') as f:
    html = f.read()

# B5_ITEMS 교체 (한 줄 전체)
def replace_const(html, const_name, new_json):
    start_marker = f'const {const_name} = ['
    end_marker   = '];'
    si = html.find(start_marker)
    if si == -1:
        raise ValueError(f'{const_name} 를 찾을 수 없습니다')
    ei = html.find(end_marker, si)
    if ei == -1:
        raise ValueError(f'{const_name} 닫힘 부분을 찾을 수 없습니다')
    return html[:si] + f'const {const_name} = {new_json}' + html[ei:]

html = replace_const(html, 'B5_ITEMS',       b5_items_json)
html = replace_const(html, 'B5_ALL_FOR_WORD', b5_all_word_json)

with open(HTML, 'w', encoding='utf-8') as f:
    f.write(html)

print(f'완료: B5_ITEMS={len(items)}개, B5_ALL_FOR_WORD={len(all_for_word)}개')
print(f'삭제 항목 제외: {len([i for i in all_raw if is_deleted(i)])}개')
print(f'noWord 항목 제외: {len([i for i in all_raw if i.get("noWord")])}개')
