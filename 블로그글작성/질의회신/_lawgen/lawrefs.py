# -*- coding: utf-8 -*-
# 인용 파서(법령명 상속) + 연계 + 보충 → 관련법령 3계층 표
import re
import lawengine as E

GBLOCK={'방법','위법','불법','적법','준법','편법','탈법','수법','기법','용법','어법','문법','상법','민법','형법','헌법','세법','약법','작법','서법','화법','타법','현행법','실정법','절차법','특별법','일반법','모법','국내법','관계법','해당법'}
LAWFAM=(r'폐기물관리법 시행규칙|폐기물관리법 시행령|폐기물관리법|'
        r'자원의 절약과 재활용촉진에 관한 법률 시행규칙|자원의 절약과 재활용촉진에 관한 법률 시행령|자원의 절약과 재활용촉진에 관한 법률|'
        r'자원의 절약과 재활용에 관한 법률 시행규칙|자원의 절약과 재활용에 관한 법률|'
        r'건설폐기물의 재활용촉진에 관한 법률 시행규칙|건설폐기물의 재활용촉진에 관한 법률|'
        r'환경영향평가법 시행령|환경영향평가법 시행규칙|환경영향평가법')
GEN=r'([가-힣][가-힣·]{1,22}법(?:\s*시행규칙|\s*시행령)?)'

def base_of(law):
    return re.sub(r'\s*(시행규칙|시행령)$','',law).strip()
def norm_law(law):
    return re.sub(r'\s+',' ',law).replace('「','').replace('」','').strip()

# 조문 라벨 파싱
def _parse_jo(law,s):
    jm=re.match(r'제(\d+)조(?:의(\d+))?',s)
    hang=re.search(r'제(\d+)항',s); ho=re.search(r'제(\d+)호(?:의(\d+))?',s); mok=re.search(r'([가-하])목',s)
    return {"kind":"조","law":norm_law(law),"jo":jm.group(1),"ji":jm.group(2) or '0',
            "hang":(hang.group(1) if hang else None),
            "ho":(ho.group(1) if ho else None),"mok":(mok.group(1) if mok else None),
            "label":s.strip()}
def _parse_byl(law,s):
    bm=re.search(r'별표\s*(\d+(?:의\d+)?)',s);
    ho=re.search(r'제(\d+)호',s); mok=re.search(r'([가-하])목',s); sub=re.search(r'(\d+)\)',s)
    return {"kind":"별표","law":norm_law(law),"byl":bm.group(1) if bm else '',
            "ho":(ho.group(1) if ho else None),"mok":(mok.group(1) if mok else None),
            "sub":(sub.group(1) if sub else None),"label":re.sub(r'\s+',' ',s).strip()}

TOKEN=re.compile(
    r'「([^」]+)」'                                                     # 1 「법령명」
    + r'|(' + LAWFAM + r')'                                           # 2 알려진 법령명
    + r'|같은\s*(법\s*시행규칙|법\s*시행령|영|규칙|법)'                   # 3 같은 X (상속)
    + r'|' + GEN                                                      # 4 일반 법령명
    + r'|(제\d+조(?:의\d+)?(?:\s*제\d+항)?(?:\s*제\d+호(?:의\d+)?)?(?:\s*[가-하]목)?)'  # 5 조문
    + r'|(\[?\s*별표\s*\d+(?:의\d+)?\s*\]?(?:\s*제\d+호)?(?:\s*[가-하]목)?(?:\s*\d+\))?)'  # 6 별표
)

GENSET=re.compile(GEN)
def parse_refs(text,default_law=None):
    # cur=직전 인용 대상, anchor=‘같은 법’ 기준. default_law 있으면 그 base가 기본 anchor(주법령 고정).
    refs=[]; cur=default_law; anchor=(base_of(default_law) if default_law else None)
    fixed=bool(default_law)   # default 있으면 anchor를 그 주법령으로 고정
    for m in TOKEN.finditer(text):
        if m.group(1):
            cur=norm_law(m.group(1))
            if not fixed: anchor=base_of(cur)
        elif m.group(2):
            cur=norm_law(m.group(2))
            if not fixed: anchor=base_of(cur)
        elif m.group(3):
            g=m.group(3).replace(' ','')
            if not anchor: continue
            cur = anchor+' 시행규칙' if '시행규칙' in g or g=='규칙' else (anchor+' 시행령' if '시행령' in g or g=='영' else anchor)
        elif m.group(4):
            law=re.sub(r'\s+',' ',m.group(4)).strip()
            b0=base_of(law).split(' ')[0]
            if b0 in GBLOCK: continue
            if re.search(r'(방법|기준|규정|지침|요령|고시|계획|사업|제도|절차|방식|기법|공법)$',b0): continue  # 고시·용어 오탐
            cur=norm_law(law)   # 일반법(예: 건축법)은 cur만 갱신, anchor는 유지
        elif m.group(5):
            if cur: refs.append(_parse_jo(cur,re.sub(r'\s+','',m.group(5))))
        elif m.group(6):
            if cur: refs.append(_parse_byl(cur,m.group(6)))
    # dedup 유지순서
    seen=set(); out=[]
    for r in refs:
        k=(r['kind'],r['law'],r.get('jo'),r.get('ji'),r.get('hang'),r.get('ho'),r.get('mok'),r.get('byl'),r.get('sub'))
        if k in seen: continue
        seen.add(k); out.append(r)
    return out

def label_of(r):
    if r['kind']=='조':
        s=f"제{r['jo']}조"+(f"의{r['ji']}" if r['ji'] and r['ji']!='0' else '')
        if r['hang']: s+=f"제{r['hang']}항"
        if r['ho']: s+=f"제{r['ho']}호"
        if r['mok']: s+=f"{r['mok']}목"
        return s
    else:
        s=f"[별표 {r['byl']}]"
        if r['ho']: s+=f" 제{r['ho']}호"
        if r['mok']: s+=f" {r['mok']}목"
        if r['sub']: s+=f" {r['sub']})"
        return s

# ---- 조문/별표 문구 fetch ----
def text_of(r,refdate=None):
    if r['kind']=='조':
        c=E.jo_get(r['law'],r['jo'],r['ji'])
        if not c: return "","",[]
        title=E.jo_title(c)
        cur=E.unit_text(c,r['hang'],r['ho'],r['mok'])
        old=''
        if refdate:
            co=E.jo_get_asof(r['law'],r['jo'],r['ji'],refdate)
            if co: old=E.unit_text(co,r['hang'],r['ho'],r['mok'])
        # 연계 refs (fetch된 문구 내부의 '법 제N조', '별표 N')
        linked=_linked(cur+" "+(E._txt(c.get('조문내용',''))),r['law'])
        if old and E.sp(old)!=E.sp(cur):
            moon=f"<strong>[현행]</strong> {cur}<br><strong>[당시 {refdate[:4]}년]</strong> {old}"
        else: moon=cur
        return title,moon,linked
    else:
        bt=E.byl_fetch(r['law'],r['byl'])
        if bt and bt.get('text'):
            title=bt.get('title','')
            kw=None
            moon=E.byl_excerpt(bt['text'],r.get('ho'),r.get('mok'))
            return title,moon,[]
        return "","",[]

def _linked(text,cur_law):
    out=[]; base=base_of(cur_law)
    # '법 제N조' → 모법(법률)
    for m in re.finditer(r'(?<![가-힣])법\s*제(\d+)조(?:의(\d+))?(?:제(\d+)항)?(?:제(\d+)호)?',text):
        out.append({"kind":"조","law":base,"jo":m.group(1),"ji":m.group(2) or '0',
                    "hang":m.group(3),"ho":m.group(4),"mok":None,"label":""})
    # '영 제N조' → 시행령
    for m in re.finditer(r'(?<![가-힣])영\s*제(\d+)조(?:의(\d+))?',text):
        out.append({"kind":"조","law":base+' 시행령',"jo":m.group(1),"ji":m.group(2) or '0',
                    "hang":None,"ho":None,"mok":None,"label":""})
    # '별표 N' (같은 법령)
    for m in re.finditer(r'별표\s*(\d+(?:의\d+)?)',text):
        out.append({"kind":"별표","law":cur_law,"byl":m.group(1),"ho":None,"mok":None,"sub":None,"label":""})
    return out[:4]

def sp(s): return re.sub(r'\s+',' ',s or '').strip()

# ---- 별표 excerpt: 인용 호로 점프, 없으면 답변 앵커, 그래도 없으면 비움(제목만) ----
STOP={'폐기물','재활용','시행규칙','폐기물관리법','관리법','기준','경우','따라','대상','해당','이하','이상',
      '규모','시설','장비','기술능력','폐기물처리업','처리업','다음','관련','포함','사항','방법','종류','설치','운영'}
def _answer_anchor(ans,byl,text):
    # 답변에서 '별표 N' 인용 뒤 구절을 우선, 없으면 답변 전체를 키워드원으로
    m=re.search(r'별표\s*'+re.escape(byl)+r'\]?(.{0,200})',ans)
    clause=(m.group(1) if m else '')+' '+ans
    nums=re.findall(r'\d+일분|\d+톤|\d+퍼센트|\d+세제곱미터|\d+세제곱|\d+킬로|\d+개월|\d+미터',clause)
    nouns=[w for w in re.findall(r'[가-힣]{3,10}',clause) if w not in STOP]
    cands=sorted(set(nouns),key=len,reverse=True)+nums
    for c in cands:
        p=text.find(c)
        if p>40: return p
    return None
def _byl_clean(text):
    text=re.sub(r'^■[^0-9]*?\(제\d+조[^)]*관련\)\s*','',text)
    text=re.sub(r'\[시행일\][^0-9]*?(?=\d+\.\s)','',text,count=1)
    text=re.sub(r'\s*[·…]{2,}\s*',' ',text)   # PDF 점선 리더 제거
    return text
def byl_excerpt_hinted(bt,ref,ans):
    text=bt.get('text','') if bt else ''
    if not text: return ""
    text=_byl_clean(text)
    ho=ref.get('ho'); mok=ref.get('mok'); seg=None
    # (1) 호 지정 → 최상위 호 경계로 점프
    if ho:
        marks=[(int(m.group(1)),m.start()) for m in re.finditer(r'(?<![\d)])(\d{1,2})\.\s',text)]
        starts={}; prev=0
        for n,pos in marks:
            if n==prev+1 or (n>prev and n<=int(ho)+2):
                starts.setdefault(n,pos); prev=n
        if int(ho) in starts:
            s=starts[int(ho)]; seg=text[s:starts.get(int(ho)+1,len(text))]
            if mok:
                mm=re.search(rf'(?<![가-힣0-9]){mok}\.\s.*',seg)
                if mm: seg=mm.group(0)
    # (2) 호 없음/탐지실패 → 답변 앵커, 그래도 없으면 별표 시작부(내용 우선)
    if seg is None:
        p=_answer_anchor(ans,ref['byl'],text)
        seg=text[max(0,p-6):] if p is not None else text
    return E.trim(sp(seg),440)

# ---- 관련법령 3계층 표 ----
def esc(s): return re.sub(r'\s+',' ',s or '').strip().replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def _head(badge,lawref,subtitle):
    b={"본문":"본문 인용","연계":"연계","보충":"보충"}[badge]
    tail=" · ".join(x for x in [subtitle,f'[{b}]'] if x)
    return f'<strong>{esc(lawref)}</strong>'+(f'　<small>{esc(tail)}</small>' if tail else '')
def _row(badge,lawref,subtitle,moon):        # 표 셀
    return f'<tr><td>{_head(badge,lawref,subtitle)}<br>{esc_rich(fmt_moon(moon))}</td></tr>'
def _quote(badge,lawref,subtitle,moon):      # blockquote 박스(테마가 td를 볼드로 렌더할 때 대안)
    return f'<blockquote>\n<p>{_head(badge,lawref,subtitle)}<br>{esc_rich(fmt_moon(moon))}</p>\n</blockquote>'
def esc_rich(s):
    ok={'<br>','<small>','</small>','<strong>','</strong>'}
    return ''.join(p if p in ok else esc(p) for p in re.split(r'(<br>|<small>|</small>|<strong>|</strong>)',s))
CIRC2="②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
def fmt_moon(s):
    # 항(②~) · 호(숫자.) 앞에 줄바꿈. [현행]/[당시] 기존 <br>는 유지.
    parts=re.split(r'(<br><small>\[당시[^<]*</small>)',s)  # 구법병기 경계 보존
    def brk(t):
        t=re.sub(r'\s+(['+CIRC2+r'])',r'<br>\1',t)             # 항 ②~
        t=re.sub(r'(?<!\d)\s+(\d{1,2}\.)\s(?=[가-힣])',r'<br>\1 ',t)  # 호 N.
        t=re.sub(r'^\s*<br>','',t)
        return t
    return ''.join(brk(p) if not p.startswith('<br><small>[당시') else p for p in parts)

NAME_GBLOCK={'방법','위법','불법','적법','준법','편법','탈법','수법','기법','용법','어법','문법','상법','민법','형법','헌법','세법','현행법','실정법','특별법','일반법','국내법','관계법','해당법','여과법','건식법','습식법','소각법','매립법'}
def _law_names(text):
    out=[]
    for m in re.finditer(r'「([^」]+)」',text):
        nm=re.sub(r'\s+',' ',m.group(1)).strip()
        if nm and nm not in out: out.append(nm)
    if not out:
        for m in re.finditer(r'([가-힣][가-힣·]{1,22}(?:법|법률)(?:\s*시행령|\s*시행규칙)?)',text):
            nm=re.sub(r'\s+',' ',m.group(1)).strip()
            if nm.replace(' 시행령','').replace(' 시행규칙','') in NAME_GBLOCK: continue
            if nm.rstrip('법률')[-1:] and nm not in out: out.append(nm)
    return out[:6]
def _no_ref_note(text):
    names=_law_names(text)
    if names:
        return ('<p>○ 이 회신은 특정 조문을 직접 인용하지 않은 해석성 답변입니다. '
                '본문에서 언급된 법령: '+esc(', '.join(names))+'.</p>')
    return '<p>○ 이 회신은 특정 법령 조항을 인용하지 않은 해석성 답변입니다.</p>'
CIRCLED="①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳"
ASTOP=set("폐기물 재활용 시행규칙 시행령 관리법 대상 경우 해당 이하 이상 규정 사항 방법 종류 관련 포함 제외 위하 위한 따라 또는 있는 없는 하는 되는 이란 여부 하여 대하 관하 정하 필요 다음 각호 각목 신고 허가 변경 처리 시설 장비 물질 발생 기준".split())
def _anchor_hang(c,ans,jo,ji):
    hangs=E._hang_list(c)
    if len(hangs)<=1: return None,None       # 항 1개 이하 → 그대로(=그 항)
    pat=r'제'+re.escape(jo)+r'조'+(r'의'+re.escape(ji) if ji and ji!='0' else '')+r'(.{0,160})'
    m=re.search(pat,ans); clause=m.group(1) if m else ans
    cands=set(w for w in re.findall(r'[가-힣]{3,10}',clause) if w not in ASTOP)
    best=None;bs=0
    for h in hangs:
        ht=E._txt(h.get('항내용',''))+' '+' '.join(E._txt(x.get('호내용','')) for x in E._ho_list(h))
        sc=sum(1 for w in cands if w in ht)
        if sc>bs: bs=sc;best=h
    if best is not None and bs>=1:
        hn=str(best.get('항번호','')).strip()
        num=str(CIRCLED.find(hn)+1) if hn in CIRCLED else hn.strip('.')
        return hn,(num or None)
    return "①",None                           # 못 찾으면 제1항(통째 dump 금지)

def build_table(q,a,refdate=None,default_law=None,supp=None,style="table"):
    text=q+" \n "+a
    body=parse_refs(text,default_law)
    rows=[]; seen=set()
    def key(r): return (r['kind'],r['law'],r.get('jo'),r.get('ji'),r.get('hang'),r.get('ho'),r.get('mok'),r.get('byl'),r.get('sub'))
    linked_all=[]
    # 1) 본문 인용
    for r in body[:10]:
        k=key(r)
        if k in seen: continue
        seen.add(k)
        if r['kind']=='조':
            c=E.jo_get(r['law'],r['jo'],r['ji'])
            if not c: continue          # 조 없음(오파싱·고시 등) → 행 자체 생략
            ti=E.jo_title(c)
            hang=r['hang']; anch=None
            if not (r['hang'] or r['ho'] or r['mok']):
                hang,anch=_anchor_hang(c,a,r['jo'],r['ji'])   # bare 조 → 답변 문맥으로 관련 항
            cur=E.unit_text(c,hang,r['ho'],r['mok']); old=''
            if refdate:
                co=E.jo_get_asof(r['law'],r['jo'],r['ji'],refdate)
                if co: old=E.unit_text(co,hang,r['ho'],r['mok'])
            moon=(f"<small>[현행]</small> {cur}<br><small>[당시 {refdate[:4]}년]</small> {old}"
                  if _substantive_diff(old,cur) else cur)
            lab=label_of(r)+(f"제{anch}항" if anch else "")
            rows.append(("본문",f"「{r['law']}」 {lab}",ti,moon))
            linked_all += _linked(E.full_text(c), r['law'])
        else:
            bt,law_used=E.byl_fetch_any(r['law'],r['byl'])
            if not bt: continue          # 별표 fetch 실패 → 행 생략(보일러플레이트 금지)
            moon=byl_excerpt_hinted(bt,r,a)
            if not moon: continue
            ti=bt.get('title','')
            rows.append(("본문",f"「{law_used}」 {label_of(r)}",ti,moon))
    # 2) 연계 법령
    lk=0
    for r in linked_all:
        k=key(r)
        if k in seen: continue
        if r['kind']!='조': continue
        c=E.jo_get(r['law'],r['jo'],r['ji'])
        if not c: continue
        seen.add(k); lk+=1
        ti=E.jo_title(c); moon=E.unit_text(c,r['hang'],r['ho'],r['mok'])
        rows.append(("연계",f"「{r['law']}」 {label_of(r)}",ti,moon))
        if lk>=4: break
    # 3) 보충
    if supp:
        for lawref,subtitle,moon in supp(a,seen):
            rows.append(("보충",lawref,subtitle,moon))
    if not rows:
        return _no_ref_note(text)
    if style=="quote":
        return "\n".join(_quote(b,lr,st,m) for b,lr,st,m in rows)
    tr="\n".join(_row(b,lr,st,m) for b,lr,st,m in rows)
    return '<table>\n<tbody>\n'+tr+'\n</tbody>\n</table>'

def _substantive_diff(old,cur):
    # 부처명 변경만인 경우는 실질 차이 아님 → 현행만. trim 절단점 차이는 공통prefix로 무시.
    if not old or not cur: return False
    def norm(s):
        s=s.replace('기후에너지환경부','환경부').replace('…','')
        return re.sub(r'\s+','',s)
    a,b=norm(old),norm(cur); n=min(len(a),len(b))
    return n>0 and a[:n]!=b[:n]
