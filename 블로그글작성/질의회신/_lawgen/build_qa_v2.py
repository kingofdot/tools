# -*- coding: utf-8 -*-
# 폐기물재활용 질의회신 173 → posts (관련법령 v3: 본문인용 조/항/호/목 + 별표 + 연계 + 보충)
import io,sys,os,re,json
import lawrefs as R, lawengine as E
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
SC=os.path.dirname(os.path.abspath(__file__))
OUT=r"c:\Users\USER\OneDrive\바탕 화면\py\tools\인허가 서대리 블로그"
EMDASH=chr(0x2014)
qa=json.load(open(os.path.join(SC,'qa_parsed.json'),encoding='utf-8'))
LC=json.load(open(os.path.join(SC,'lawcache_qa.json'),encoding='utf-8'))
TYPEMAP=LC['typemap']; JO13=LC.get('jo13_2','')
DEFLAW="폐기물관리법 시행규칙"; REFDATE_FALLBACK="20171201"

def esc(s): return R.esc(s)
def sents(a):
    return [p.strip() for p in re.split(r'(?<=니다\.)\s+|(?<=음\.)\s+|(?<=함\.)\s+',a.strip()) if p.strip()]
def holding(a):
    ss=sents(a)
    for s in reversed(ss):
        if re.search(r'(가능|불가|할 수 (있|없)|해당|하여야|받아야|아닙니다|됩니다|제외)',s) and len(s)>=12:
            return re.sub(r'^(아울러|다만|또한|따라서|그러나|한편|이에|참고로)[,\s]*','',s)
    return ss[0] if ss else a

def refdate_of(o):
    d=str(o.get('date','') or '')
    m=re.search(r'(20\d{2})[.\-/]\s*(\d{1,2})',d)
    if m: return f"{m.group(1)}{int(m.group(2)):02d}01"
    return REFDATE_FALLBACK

def supp_fn(a,seen):
    out=[]
    def has(pred): return any(pred(k) for k in seen)
    def add_jo(law,jo,ji,hang,ho,mok,small):
        if has(lambda k:k[0]=='조' and k[1]==law and k[2]==jo and str(k[3])==str(ji)): return
        c=E.jo_get(law,jo,ji)
        if not c: return
        lab=R.label_of({'kind':'조','jo':jo,'ji':ji,'hang':hang,'ho':ho,'mok':mok})
        out.append((f"「{law}」 {lab}<br><small>{small}</small>", E.unit_text(c,hang,ho,mok)))
    # 개념별 보충: 폐기물 정의 논점
    if re.search(r'폐기물이란|폐기물에 해당|폐기물의 정의|폐기물인지|제품인지|폐기물이 아닌|폐기물 여부',a):
        add_jo('폐기물관리법','2','0',None,'1',None,'정의 · 폐기물')
    # 재활용 유형(별표 4의3)
    apc=re.search(r'\((\d{2}-\d{2}-\d{2})\)',a)
    if apc and TYPEMAP.get(apc.group(1)) and not has(lambda k:'4의3' in str(k)):
        cur=TYPEMAP[apc.group(1)]
        out.append(("「폐기물관리법 시행규칙」 [별표 4의3]<br><small>폐기물의 종류별 재활용 가능 유형(제4조의2제3항 관련)</small>",
                    f"{cur['name']}({apc.group(1)})의 재활용 가능 유형 : "+", ".join(cur['types'])))
    # 재활용 원칙(제13조의2)
    if ('재활용' in a) and JO13 and not has(lambda k:k[0]=='조' and k[2]=='13' and str(k[3])=='2'):
        out.append(("「폐기물관리법」 제13조의2<br><small>폐기물의 재활용 원칙 및 준수사항</small>", R.E.trim(JO13,300)))
    # 기초 보충: 인용·개념 아무것도 없으면 폐기물 정의라도
    if not out and not any(k[0] in ('조','별표') for k in seen):
        add_jo('폐기물관리법','2','0',None,'1',None,'정의 · 폐기물')
    return out[:3]

def tags_of(o):
    base=["질의회신","폐기물재활용","폐기물관리법","환경인허가","인허가서대리"]
    km=[("보관","폐기물보관"),("허가","폐기물처리업허가"),("변경","변경허가"),("재활용","재활용"),
        ("오니","오니"),("소각","소각"),("매립","매립"),("건설","건설폐기물"),("성토","성토재"),
        ("음식물","음식물류폐기물"),("고형연료","고형연료제품")]
    t=list(base)
    for k,tag in km:
        if k in (o['subject']+o['a']) and tag not in t: t.append(tag)
    return t[:11]

def build(o):
    q=o['q']; a=o['a']; subj=o['subject']
    summ=holding(a)
    table=R.build_table(q,a,refdate=refdate_of(o),default_law=DEFLAW,supp=supp_fn)
    add=("<p><small>※ ‘본문 인용’은 질의·답변에 나온 조항을, ‘연계 법령’은 그 조항이 다시 인용하는 조항을, "
         "‘보충’은 인허가 서대리가 이해를 돕기 위해 덧붙인 조항을 정리한 것입니다. "
         "조문은 회신 당시와 현행이 다르면 함께 표기하였으며, 실제 적용 시 국가법령정보센터의 현행 조문 전문을 확인하시기 바랍니다.</small></p>")
    content=f"""<table>
<thead>
<tr><th>※ 요약</th></tr>
</thead>
<tbody>
<tr><td>{esc(summ)}</td></tr>
</tbody>
</table>

<hr>

<h2>1. 질의</h2>
<blockquote>
<p>{esc(q)}</p>
</blockquote>

<p>&nbsp;</p>
<h2>2. 답변</h2>
<p>{esc(a)}</p>

<p>&nbsp;</p>
<h2>3. 관련 법령</h2>
{table}

<p>&nbsp;</p>
<h2>4. 추가 정보 <small>(인허가 서대리 확인 · 참고용)</small></h2>
{add}

<hr>

<p><small><strong>출처</strong> · 폐기물재활용 질의·회신 사례집(환경부), 2017. 12.{(' ['+str(o['page'])+'페이지]') if o.get('page') else ''}</small></p>
<p><small><em>본 사례집은 환경부가 회신한 폐기물 재활용 관련 질의·회신 사례를 정리한 것입니다. 행정상 확정의 효력이나 쟁송 시 법적 대항력이 없으며, 제도·지침 변경에 따라 해석이 달라질 수 있습니다. ※ 참고용으로만 활용하시기 바랍니다.</em></small></p>"""
    return {"title":subj,"content":content.strip(),"categorySlug":"질의회신",
            "tags":tags_of(o),"excerpt":summ[:200],"published":False}

if __name__=="__main__":
    import time
    N=int(os.environ.get("N","173")); S=int(os.environ.get("S","0"))
    posts=[]
    for i in range(S,min(S+N,len(qa))):
        posts.append(build(qa[i]))
        if (i+1)%10==0: R.E.save_cache(); print("  ..",i+1,"건",flush=True)
    R.E.save_cache()
    bad=[i for i,p in enumerate(posts) if EMDASH in (p['title']+p['content']+p['excerpt'])]
    assert not bad, f"em-dash {bad[:5]}"
    if S==0 and N>=len(qa):
        json.dump(posts,open(os.path.join(OUT,'posts_질의회신_all.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
        print(f"저장 posts_질의회신_all.json {len(posts)}건")
    else:
        json.dump(posts,open(os.path.join(SC,'_qa_v2_sample.json'),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
        print(f"샘플 저장 {len(posts)}건 (S={S})")
