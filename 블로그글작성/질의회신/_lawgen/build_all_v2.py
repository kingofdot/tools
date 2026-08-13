# -*- coding: utf-8 -*-
# 나머지 질의회신 소스 전수 → posts (관련법령 v3: 본문+연계+보충, 조/항/호/목+별표)
import io,sys,os,re,json
import lawrefs as R, lawengine as E
sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
SC=os.path.dirname(os.path.abspath(__file__))
GLUE=r"c:\Users\USER\OneDrive\바탕 화면\py\tools\블로그글작성\질의회신"
OUT=r"c:\Users\USER\OneDrive\바탕 화면\py\tools\인허가 서대리 블로그"
LC=json.load(open(os.path.join(SC,'lawcache_qa.json'),encoding='utf-8'))
TYPEMAP=LC['typemap']; JO13=LC.get('jo13_2','')
EMDASH=chr(0x2014)

def norm(s):
    s=s or ''
    for a,b in ((chr(0xFF62),chr(0x300C)),(chr(0xFF63),chr(0x300D)),(chr(0x300E),chr(0x300C)),(chr(0x300F),chr(0x300D)),
                (chr(0x2024),chr(0xB7)),(chr(0x2027),chr(0xB7)),(chr(0x200B),''),(chr(0x2014),chr(0xB7)),(chr(0x2015),chr(0xB7)),(chr(0x2013),'-')):
        s=s.replace(a,b)
    s=re.sub('['+chr(0xE000)+'-'+chr(0xF8FF)+']','',s)
    return re.sub(r'[ \t]+',' ',s).strip()

def parse(it):
    c=it['content']
    subj=norm(re.sub(r'^\[[^\]]+\]\s*','',it['subject']).strip())
    def grab(pat):
        m=re.search(pat,c,re.S); return norm(re.sub(r'<[^>]+>','',m.group(1))) if m else ''
    q=grab(r'질의</h3>(.*?)<br><br><h3>')
    a=grab(r'답변</h3>(.*?)<br><br><small>')
    if not a: a=grab(r'답변</h3>(.*?)$')
    return subj,q,a

def sents(a): return [p.strip() for p in re.split(r'(?<=니다\.)\s+|(?<=음\.)\s+|(?<=함\.)\s+|(?<=요\.)\s+',a.strip()) if p.strip()]
def holding(a):
    ss=sents(a)
    for s in reversed(ss):
        if re.search(r'(가능|불가|할 수 (있|없)|해당|하여야|받아야|아닙니다|됩니다|제외|합니다)',s) and len(s)>=12:
            return re.sub(r'^(아울러|다만|또한|따라서|그러나|한편|이에|참고로|○|-)[,\s]*','',s)
    return ss[0] if ss else a

def supp_waste(a,seen):
    out=[]
    def has(p): return any(p(k) for k in seen)
    def add_jo(law,jo,ji,hang,ho,mok,small):
        if has(lambda k:k[0]=='조' and k[1]==law and k[2]==jo and str(k[3])==str(ji)): return
        c=E.jo_get(law,jo,ji)
        if not c: return
        lab=R.label_of({'kind':'조','jo':jo,'ji':ji,'hang':hang,'ho':ho,'mok':mok})
        out.append((f"「{law}」 {lab}<br><small>{small}</small>", E.unit_text(c,hang,ho,mok)))
    if re.search(r'폐기물이란|폐기물에 해당|폐기물의 정의|폐기물인지|제품인지|폐기물이 아닌|폐기물 여부',a):
        add_jo('폐기물관리법','2','0',None,'1',None,'정의 · 폐기물')
    apc=re.search(r'\((\d{2}-\d{2}-\d{2})\)',a)
    if apc and TYPEMAP.get(apc.group(1)) and not has(lambda k:'4의3' in str(k)):
        cur=TYPEMAP[apc.group(1)]
        out.append(("「폐기물관리법 시행규칙」 [별표 4의3]<br><small>폐기물의 종류별 재활용 가능 유형</small>",
                    f"{cur['name']}({apc.group(1)})의 재활용 가능 유형 : "+", ".join(cur['types'])))
    if ('재활용' in a) and JO13 and not has(lambda k:k[0]=='조' and k[2]=='13' and str(k[3])=='2'):
        out.append(("「폐기물관리법」 제13조의2<br><small>폐기물의 재활용 원칙 및 준수사항</small>", R.E.trim(JO13,300)))
    if not out and not any(k[0] in ('조','별표') for k in seen):
        add_jo('폐기물관리법','2','0',None,'1',None,'정의 · 폐기물')
    return out[:3]

def supp_none(a,seen): return []

def tags_base(subj,a,extra):
    base=["질의회신","환경인허가","인허가서대리"]+extra
    km=[("재활용","폐기물재활용"),("보관","폐기물보관"),("소각","소각"),("매립","매립"),("지정폐기물","지정폐기물"),
        ("사업장","사업장폐기물"),("환경영향평가","환경영향평가"),("전략환경","전략환경영향평가"),("대기","대기"),
        ("수질","수질"),("폐수","폐수"),("소음","소음진동"),("악취","악취")]
    t=list(base)
    for k,tag in km:
        if k in subj+a and tag not in t: t.append(tag)
    return t[:11]

SRCS=[
 dict(glue="_사업장폐기물_글감.json", out="posts_사업장폐기물.json", deflaw="폐기물관리법 시행규칙",
      refdate=None, supp=supp_waste, tags=["폐기물관리법","사업장폐기물"],
      source="사업장폐기물 질의·회신 사례집(환경부)"),
 dict(glue="_지정폐기물_글감.json", out="posts_지정폐기물.json", deflaw="폐기물관리법 시행규칙",
      refdate=None, supp=supp_waste, tags=["폐기물관리법","지정폐기물"],
      source="지정폐기물 질의·회신 사례집(환경부)"),
 dict(glue="_환경영향평가_글감.json", out="posts_환경영향평가.json", deflaw="환경영향평가법",
      refdate=None, supp=supp_none, tags=["환경영향평가법","환경영향평가"],
      source="환경영향평가 질의·회신 사례집(환경부)"),
 dict(glue="_2017사례집_글감.json", out="posts_2017사례집.json", deflaw=None,
      refdate="20171101", supp=supp_none, tags=[],
      source="환경 질의·회신 사례집(환경부, 2017)"),
 dict(glue="_2010사례집_글감.json", out="posts_2010사례집.json", deflaw=None,
      refdate="20101101", supp=supp_none, tags=[],
      source="환경 질의·회신 사례집(환경부, 2010.11)"),
]

def build_post(it,cfg):
    subj,q,a=parse(it)
    if len(a)<8: return None
    summ=holding(a)
    table=R.build_table(q,a,refdate=cfg['refdate'],default_law=cfg['deflaw'],supp=cfg['supp'])
    add=("<p><small>※ ‘본문 인용’은 질의·답변에 나온 조항을, ‘연계 법령’은 그 조항이 다시 인용하는 조항을, "
         "‘보충’은 인허가 서대리가 덧붙인 조항을 정리한 것입니다. 조문은 회신 당시와 현행이 다르면 함께 표기하였습니다. "
         "실제 적용 시 국가법령정보센터의 현행 조문 전문을 확인하시기 바랍니다.</small></p>")
    page=it.get('page','')
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

<p>&nbsp;</p>
<h2>3. 관련 법령</h2>
{table}

<p>&nbsp;</p>
<h2>4. 추가 정보 <small>(인허가 서대리 확인 · 참고용)</small></h2>
{add}

<hr>

<p><small><strong>출처</strong> · {R.esc(cfg['source'])}{(' ['+str(page)+'페이지]') if page else ''}</small></p>
<p><small><em>본 자료는 환경부 질의·회신 사례를 정리한 것으로, 행정상 확정의 효력이나 법적 대항력이 없으며 제도·지침 변경에 따라 해석이 달라질 수 있습니다. ※ 참고용으로만 활용하시기 바랍니다.</em></small></p>"""
    title=subj if subj.endswith(('지','까','요','음','함','부','가','나')) or '?' not in subj else subj
    return {"title":subj,"content":content.strip(),"categorySlug":"질의회신",
            "tags":tags_base(subj,a,cfg['tags']),"excerpt":summ[:200],"published":False}

if __name__=="__main__":
    only=os.environ.get("ONLY")
    for cfg in SRCS:
        if only and only not in cfg['glue']: continue
        data=json.load(open(os.path.join(GLUE,cfg['glue']),encoding='utf-8'))
        posts=[]; seen_t=set()
        for i,it in enumerate(data):
            p=build_post(it,cfg)
            if not p: continue
            if p['title'] in seen_t: continue
            seen_t.add(p['title']); posts.append(p)
            if len(posts)%25==0: E.save_cache(); print(f"  {cfg['out']} .. {len(posts)}",flush=True)
        bad=[i for i,p in enumerate(posts) if EMDASH in p['title']+p['content']+p['excerpt']]
        assert not bad, f"em-dash {cfg['out']} {bad[:3]}"
        json.dump(posts,open(os.path.join(OUT,cfg['out']),'w',encoding='utf-8'),ensure_ascii=False,indent=1)
        E.save_cache()
        rows=[p['content'].count('<tr>')-1 for p in posts]
        import statistics
        print(f"[완료] {cfg['out']} {len(posts)}건 · 평균행 {statistics.mean(rows):.1f} · em-dash 0",flush=True)
