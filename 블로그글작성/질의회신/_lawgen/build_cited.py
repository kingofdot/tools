# -*- coding: utf-8 -*-
# AI가 생성한 관련법령 인용(_cite/out*.json) → 법령API 원문 fetch → 헤더음영 표로 조립
import io,sys,os,re,json,glob
import lawrefs as R, lawengine as E
import build_qa_v2 as B   # import 시 stdout을 utf-8로 래핑함(재래핑 금지)
SC=os.path.dirname(os.path.abspath(__file__))
OUT=r"c:\Users\USER\OneDrive\바탕 화면\py\tools\인허가 서대리 블로그"
qa=json.load(open(os.path.join(SC,'qa_parsed.json'),encoding='utf-8'))
TYPEMAP=B.TYPEMAP
EMDASH=chr(0x2014)

# AI 인용 병합
cites_by_idx={}
for f in sorted(glob.glob(os.path.join(SC,'_cite','out*.json'))):
    try: d=json.load(open(f,encoding='utf-8'))
    except Exception as e: print("SKIP",f,e); continue
    for p in d.get('posts',[]):
        cites_by_idx[int(p['idx'])]=p.get('cites',[])

def _row_for_cite(c,ans,refdate):
    try:
        return _row_for_cite_inner(c,ans,refdate)
    except Exception:
        return None
def _row_for_cite_inner(c,ans,refdate):
    law=R.norm_law(c.get('law','')); prov=(c.get('prov','') or '').strip()
    role=c.get('role','본문'); badge='본문' if role=='본문' else ('연계' if role=='연계' else '보충')
    if not law or not prov: return None
    if '별표' in prov:
        r=R._parse_byl(law,prov)
        if not r['byl']: return None
        # 별표4의3(종류별 유형) → TYPEMAP 정확 대체
        if r['byl']=='4의3':
            apc=re.search(r'\((\d{2}-\d{2}-\d{2})\)',ans)
            if apc and TYPEMAP.get(apc.group(1)):
                cur=TYPEMAP[apc.group(1)]
                return (badge,"「폐기물관리법 시행규칙」 [별표 4의3]","폐기물의 종류별 재활용 가능 유형",
                        f"{cur['name']}({apc.group(1)})의 재활용 가능 유형 : "+", ".join(cur['types']))
            return None
        bt,law_used=E.byl_fetch_any(r['law'],r['byl'])
        if not bt: return None
        moon=R.byl_excerpt_hinted(bt,r,ans)
        if not moon: return None
        return (badge,f"「{law_used}」 {R.label_of(r)}",bt.get('title',''),moon)
    else:
        m=re.search(r'제\d+조(?:의\d+)?(?:제\d+항)?(?:제\d+호(?:의\d+)?)?(?:[가-하]목)?',prov.replace(' ',''))
        if not m: return None                       # 조 형식 아님 → 스킵
        r=R._parse_jo(law,m.group(0))
        if not r.get('jo'): return None
        cc=E.jo_get(r['law'],r['jo'],r['ji'])
        if not cc: return None
        ti=E.jo_title(cc)
        cur=R._law_clean(E.unit_text(cc,r['hang'],r['ho'],r['mok'])); old=''
        if refdate:
            co=E.jo_get_asof(r['law'],r['jo'],r['ji'],refdate)
            if co: old=R._law_clean(E.unit_text(co,r['hang'],r['ho'],r['mok']))
        ce,oe=R._empty_law(cur),R._empty_law(old); yr=refdate[:4] if refdate else ''
        if ce and oe: return None
        if ce and not oe: moon=f"<small>[회신 당시 {yr}년]</small> {old}"
        elif R._substantive_diff(old,cur): moon=f"<small>[현행]</small> {cur}<br><small>[회신 당시 {yr}년]</small> {old}"
        else: moon=cur
        return (badge,f"「{r['law']}」 {R.label_of(r)}",ti,moon)

def table_from_cites(cites,ans,refdate):
    rows=[]; seen=set()
    order={'본문':0,'연계':1,'보충':2}
    for c in sorted(cites,key=lambda x:order.get(x.get('role','본문'),0)):
        row=_row_for_cite(c,ans,refdate)
        if not row: continue
        if row[1] in seen: continue
        seen.add(row[1]); rows.append(row)
    if not rows: return ""
    tr="\n".join(R._row(b,lr,st,m) for b,lr,st,m in rows)
    return ('<table>\n<thead>\n<tr><th style="background-color:#eef1f5;text-align:left;">조항 · 적용 문구</th></tr>\n</thead>\n'
            '<tbody>\n'+tr+'\n</tbody>\n</table>')

def build(o,cites):
    q=o['q']; a=o['a']; subj=o['subject']; summ=B.holding(a)
    cites=list(cites)
    # 폐기물코드 있으면 별표4의3(종류별 재활용 가능 유형) TYPEMAP 자동 보충(정확·유용)
    apc=re.search(r'\((\d{2}-\d{2}-\d{2})\)',a)
    if apc and TYPEMAP.get(apc.group(1)) and not any('4의3' in (c.get('prov','')) for c in cites):
        cites.append({'law':'폐기물관리법 시행규칙','prov':'[별표 4의3]','role':'보충','why':'폐기물 종류별 재활용 가능 유형'})
    table=table_from_cites(cites,a,B.refdate_of(o))
    add=("<p><small>※ ‘본문 인용’은 질의·답변이 근거로 삼은 조항을, ‘보충’은 이해를 돕기 위해 덧붙인 조항을 정리한 것입니다. "
         "조문은 회신 당시와 현행이 다르면 함께 표기하였으며, 실제 적용 시 국가법령정보센터의 현행 조문 전문을 확인하시기 바랍니다.</small></p>")
    lawsec=(f"""<p>&nbsp;</p>
<h2>3. 관련 법령</h2>
{table}

<p>&nbsp;</p>
<h2>4. 추가 정보 <small>(인허가 서대리 확인 · 참고용)</small></h2>
{add}
""" if table.strip() else "")
    content=f"""<table>
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

<p><small><strong>출처</strong> · 폐기물재활용 질의·회신 사례집(환경부), 2017. 12.{(' ['+str(o['page'])+'페이지]') if o.get('page') else ''}</small></p>
<p><small><em>본 사례집은 환경부가 회신한 폐기물 재활용 관련 질의·회신 사례를 정리한 것입니다. 행정상 확정의 효력이나 쟁송 시 법적 대항력이 없으며, 제도·지침 변경에 따라 해석이 달라질 수 있습니다. ※ 참고용으로만 활용하시기 바랍니다.</em></small></p>"""
    return {"title":subj,"content":content.strip(),"categorySlug":"질의회신",
            "tags":B.tags_of(o),"excerpt":summ[:200],"published":False}

if __name__=="__main__":
    missing=[i for i in range(len(qa)) if i not in cites_by_idx]
    if missing: print("경고: 인용 누락 idx",missing[:20],"총",len(missing))
    posts=[]
    for i in range(len(qa)):
        posts.append(build(qa[i],cites_by_idx.get(i,[])))
        if (i+1)%40==0: E.save_cache(); print("  ..",i+1,flush=True)
    E.save_cache()
    bad=[i for i,p in enumerate(posts) if EMDASH in p['title']+p['content']+p['excerpt']]
    assert not bad, f"em-dash {bad[:5]}"
    haslaw=sum('3. 관련 법령' in p['content'] for p in posts)
    import statistics
    rows=[p['content'].split('3. 관련 법령')[1].count('<tr>')-1 if '3. 관련 법령' in p['content'] else 0 for p in posts]
    json.dump(posts,open(os.path.join(OUT,'posts_질의회신_all.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print(f"[완료] 173건 저장 · 법령있음 {haslaw} · 평균행(법령有) {statistics.mean([r for r in rows if r]):.1f} · em-dash 0")
