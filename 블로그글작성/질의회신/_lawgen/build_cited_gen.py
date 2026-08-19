# -*- coding: utf-8 -*-
# 범용 AI 인용판 빌더: qa + AI인용(_cite) → 법령API 원문 → 헤더음영 표 → posts JSON
# 사용: python build_cited_gen.py <cite_glob> <qa_json> <out_json> <source> <refdate|none> <extratags,콤마> [notes_json|none]
import os, re, json, glob, sys, statistics
import lawrefs as R, lawengine as E
import build_all_v2 as B2   # parse/holding/tags_base/norm (import 시 stdout utf-8 래핑)

OUTDIR = r"c:\Users\USER\OneDrive\바탕 화면\py\tools\인허가 서대리 블로그"
EMDASH = chr(0x2014)
# 법령 원문이 쓰는 가운뎃점 변형들. 화면에서 튀므로 하나로 모은다.
MIDDOT = {chr(0x318D): chr(0xB7), chr(0x2219): chr(0xB7), chr(0x2027): chr(0xB7),
          chr(0x119E): chr(0xB7), chr(0xFF65): chr(0xB7)}


def norm_dot(s):
    for a, b in MIDDOT.items():
        s = s.replace(a, b)
    return s

CITE_GLOB = sys.argv[1]
QA_FILE   = sys.argv[2]
OUTFILE   = sys.argv[3]
SOURCE    = sys.argv[4]
REFDATE   = None if (len(sys.argv) <= 5 or sys.argv[5] in ('none', 'None', '')) else sys.argv[5]
EXTRATAGS = sys.argv[6].split(',') if len(sys.argv) > 6 and sys.argv[6] else []
NOTEFILE  = sys.argv[7] if len(sys.argv) > 7 and sys.argv[7] not in ('none', 'None', '') else None
NOTES = {}
if NOTEFILE:
    _nd = json.load(open(NOTEFILE, encoding='utf-8'))
    _nd = _nd.get('notes', _nd)
    NOTES = {int(k): [x for x in v if str(x).strip()] for k, v in _nd.items()}

qa = json.load(open(QA_FILE, encoding='utf-8'))
cites_by_idx = {}
for f in sorted(glob.glob(CITE_GLOB)):
    d = json.load(open(f, encoding='utf-8'))
    for p in d.get('posts', []):
        cites_by_idx[int(p['idx'])] = p.get('cites', [])

def _row_for_cite(c, ans, refdate):
    try: return _row_for_cite_inner(c, ans, refdate)
    except Exception: return None
def _row_for_cite_inner(c, ans, refdate):
    law = R.norm_law(c.get('law', '')); prov = (c.get('prov', '') or '').strip()
    role = c.get('role', '본문'); badge = '본문' if role == '본문' else ('연계' if role == '연계' else '보충')
    if not law or not prov: return None
    if '별표' in prov:
        r = R._parse_byl(law, prov)
        if not r['byl']: return None
        bt, law_used = E.byl_fetch_any(r['law'], r['byl'])
        if not bt: return None
        title = re.sub(r'\s*\(제\d+조[^)]*관련\)\s*$', '', bt.get('title', '')).strip()
        moon = R.byl_excerpt_hinted(bt, r, ans)
        if not moon:
            # 대형 flat 별표는 정확 추출 불가 → 라벨+제목 포인터 행(내용 생략, 오추출 방지)
            if not title: return None
            return (badge, f"「{law_used}」 {R.label_of(r)}", title, "")
        return (badge, f"「{law_used}」 {R.label_of(r)}", title, moon)
    m = re.search(r'제\d+조(?:의\d+)?(?:제\d+항)?(?:제\d+호(?:의\d+)?)?(?:[가-하]목)?', prov.replace(' ', ''))
    if not m: return None
    r = R._parse_jo(law, m.group(0))
    if not r.get('jo'): return None
    cc = E.jo_get(r['law'], r['jo'], r['ji'])
    if not cc: return None
    ti = E.jo_title(cc)
    cur = R._law_clean(E.unit_text(cc, r['hang'], r['ho'], r['mok'])); old = ''
    if refdate:
        co = E.jo_get_asof(r['law'], r['jo'], r['ji'], refdate)
        if co: old = R._law_clean(E.unit_text(co, r['hang'], r['ho'], r['mok']))
    ce, oe = R._empty_law(cur), R._empty_law(old); yr = refdate[:4] if refdate else ''
    if ce and oe: return None
    if ce and not oe: moon = f"<small>[회신 당시 {yr}년]</small> {old}"
    elif refdate and R._substantive_diff(old, cur): moon = f"<small>[현행]</small> {cur}<br><small>[회신 당시 {yr}년]</small> {old}"
    else: moon = cur
    return (badge, f"「{r['law']}」 {R.label_of(r)}", ti, moon)

def table_from_cites(cites, ans, refdate):
    rows = []; seen = set(); order = {'본문': 0, '연계': 1, '보충': 2}
    for c in sorted(cites, key=lambda x: order.get(x.get('role', '본문'), 0)):
        row = _row_for_cite(c, ans, refdate)
        if not row: continue
        if row[1] in seen: continue
        seen.add(row[1]); rows.append(row)
    if not rows: return ""
    rows = [r for r in rows if r[3]]          # 원문을 못 뽑은 행은 싣지 않는다
    if not rows: return ""
    tr = chr(10).join(R._row(b, lr, st, m) for b, lr, st, m in rows)
    return ('<table>\n<thead>\n<tr><th style="background-color:#eef1f5;text-align:left;">조항 · 적용 문구</th></tr>\n</thead>\n'
            '<tbody>\n' + tr + '\n</tbody>\n</table>')

def _delabel(s):  # 멀티파트 '(질의 N)/(답변 N)' 라벨 제거(게시 텍스트 흐름화)
    s = re.sub(r'\(\s*(답변|질의)\s*\d*\s*\)\s*', ' ', s or '')
    return re.sub(r'\s{2,}', ' ', s).strip()

def build(o, cites):
    q = _delabel(o['q']); a = _delabel(o['a']); subj = o['subject']; summ = B2.holding(a)
    summ = re.sub(r'^\([^)]{2,40}\)\s*(※\s*)?(다만,?\s*)?', '', summ).strip() or summ  # 요약 선행 괄호인용 정리
    table = table_from_cites(list(cites), a, REFDATE)
    notes = NOTES.get(o['idx'], [])
    add = ("<p><small>※ ‘본문 인용’은 질의·답변이 근거로 삼은 조항을, ‘보충’은 이해를 돕기 위해 덧붙인 조항을 정리한 것입니다. "
           "조문은 회신 당시와 현행이 다르면 함께 표기하였으며, 실제 적용 시 국가법령정보센터의 현행 조문 전문을 확인하시기 바랍니다.</small></p>")
    notehtml = ("<ul>" + "".join(f"<li>{R.esc(n)}</li>" for n in notes) + "</ul>") if notes else ""
    lawblk = (f"""<p>&nbsp;</p>
<h2>3. 관련 법령</h2>
{table}
""" if table.strip() else "")
    addblk = (f"""<p>&nbsp;</p>
<h2>{'4' if table.strip() else '3'}. 추가 정보 <small>(인허가 서대리 확인 · 참고용)</small></h2>
{notehtml}{add}
""" if (table.strip() or notes) else "")
    lawsec = lawblk + addblk
    page = o.get('page', '')
    content = f"""<table>
<thead>
<tr><th>※ 요약</th></tr>
</thead>
<tbody>
<tr><td>{R.esc(summ)}</td></tr>
</tbody>
</table>

<hr>

<h2>1. 질의</h2>
<blockquote>
<p>{R.esc(q)}</p>
</blockquote>

<p>&nbsp;</p>
<h2>2. 답변</h2>
<p>{R.esc(a)}</p>

{lawsec}
<hr>

<p><small><strong>출처</strong> · {R.esc(SOURCE)}{(' ['+str(page)+'페이지]') if page else ''}</small></p>
<p><small><em>본 자료는 환경부 질의·회신 사례를 정리한 것으로, 행정상 확정의 효력이나 법적 대항력이 없으며 제도·지침 변경에 따라 해석이 달라질 수 있습니다. ※ 참고용으로만 활용하시기 바랍니다.</em></small></p>"""
    return {"title": norm_dot(subj), "content": norm_dot(content.strip()),
            "categorySlug": "질의회신",
            "tags": B2.tags_base(subj, a, EXTRATAGS),
            "excerpt": norm_dot(summ[:200]), "published": False}

if __name__ == "__main__":
    missing = [o['idx'] for o in qa if o['idx'] not in cites_by_idx]
    if missing: print("경고: 인용 누락 idx", missing[:20], "총", len(missing))
    posts = []; seen_t = set()
    for o in qa:
        p = build(o, cites_by_idx.get(o['idx'], []))
        if p['title'] in seen_t: continue
        seen_t.add(p['title']); posts.append(p)
        if len(posts) % 20 == 0: E.save_cache(); print("  ..", len(posts), flush=True)
    E.save_cache()
    bad = [i for i, p in enumerate(posts) if EMDASH in p['title'] + p['content'] + p['excerpt']]
    assert not bad, f"em-dash {bad[:5]}"
    haslaw = sum('3. 관련 법령' in p['content'] for p in posts)
    rows = [p['content'].split('3. 관련 법령')[1].count('<tr>') - 1 if '3. 관련 법령' in p['content'] else 0 for p in posts]
    json.dump(posts, open(os.path.join(OUTDIR, OUTFILE), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    r2 = [r for r in rows if r]
    print(f"[완료] {OUTFILE} {len(posts)}건 · 법령있음 {haslaw} · 평균행(법령有) {statistics.mean(r2) if r2 else 0:.1f} · em-dash 0")
