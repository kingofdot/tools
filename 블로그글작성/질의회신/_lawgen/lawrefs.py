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

# ---- 별표 excerpt: 인용 호로 점프 + 답변 힌트 ----
def byl_excerpt_hinted(bt,ref,ans):
    text=bt.get('text','') if bt else ''
    if not text: return ""
    # 앞머리 헤더/시행일 노트 제거
    text=re.sub(r'^■[^0-9]*?\(제\d+조[^)]*관련\)\s*','',text)
    text=re.sub(r'\[시행일\][^0-9]*?(?=\d+\.\s)','',text,count=1)
    ho=ref.get('ho'); mok=ref.get('mok')
    seg=text
    if ho:
        # 최상위 호 'N. ' 경계로 분할(1)2) 같은 sub는 제외 = 뒤에 ')' 아닌 '.')
        marks=[(int(m.group(1)),m.start()) for m in re.finditer(r'(?<![\d)])(\d{1,2})\.\s',text)]
        # 오름차순 최상위만: 번호가 증가하는 시퀀스 위치
        starts={}
        prev=0
        for n,pos in marks:
            if n==prev+1 or (n>prev and n<=int(ho)+2):
                starts.setdefault(n,pos); prev=n
        if int(ho) in starts:
            s=starts[int(ho)]
            nxt=starts.get(int(ho)+1,len(text))
            seg=text[s:nxt]
    if mok and seg:
        mm=re.search(rf'{mok}\.\s.*',seg)
        if mm: seg=mm.group(0)
    # 답변 힌트 키워드로 추가 정렬
    m=re.search(r'별표\s*'+re.escape(ref['byl'])+r'[^.]{0,40}?에\s*따라\s*[가-힣]*?\s*([가-힣]{2,6})',ans)
    if m and m.group(1) in seg:
        i=seg.find(m.group(1)); seg=seg[max(0,i-4):]
    return E.trim(sp(seg),440) if seg else E.byl_excerpt(text)

def sp(s): return re.sub(r'\s+',' ',s or '').strip()

# ---- 관련법령 3계층 표 ----
def esc(s): return re.sub(r'\s+',' ',s or '').strip().replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def _row(badge,title,moon):
    b={"본문":"본문 인용","연계":"연계 법령","보충":"보충(인허가 서대리)"}[badge]
    lab=f'<small><strong>[{b}]</strong></small> {title}'
    return f"<tr><td>{esc_rich(lab)}</td><td>{esc_rich(moon)}</td></tr>"
def esc_rich(s):
    ok={'<br>','<small>','</small>','<strong>','</strong>'}
    return ''.join(p if p in ok else esc(p) for p in re.split(r'(<br>|<small>|</small>|<strong>|</strong>)',s))

def build_table(q,a,refdate=None,default_law=None,supp=None):
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
            if not c:
                rows.append(("본문",f"「{r['law']}」 {label_of(r)}","국가법령정보센터에서 현행 조문을 확인하시기 바랍니다.")); continue
            ti=E.jo_title(c); cur=E.unit_text(c,r['hang'],r['ho'],r['mok']); old=''
            if refdate:
                co=E.jo_get_asof(r['law'],r['jo'],r['ji'],refdate)
                if co: old=E.unit_text(co,r['hang'],r['ho'],r['mok'])
            moon=(f"<strong>[현행]</strong> {cur}<br><strong>[당시 {refdate[:4]}년]</strong> {old}"
                  if (old and E.sp(old)!=E.sp(cur)) else cur)
            title=f"「{r['law']}」 {label_of(r)}"+(f"<br><small>{ti}</small>" if ti else "")
            rows.append(("본문",title,moon))
            linked_all += _linked(E.full_text(c), r['law'])
        else:
            bt=E.byl_fetch(r['law'],r['byl'])
            moon=byl_excerpt_hinted(bt,r,a) if bt else ""
            ti=(bt.get('title','') if bt else '')
            title=f"「{r['law']}」 {label_of(r)}"+(f"<br><small>{ti}</small>" if ti else "")
            if not moon: moon="국가법령정보센터의 해당 별표 원문을 확인하시기 바랍니다."
            rows.append(("본문",title,moon))
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
        title=f"「{r['law']}」 {label_of(r)}"+(f"<br><small>{ti}</small>" if ti else "")
        rows.append(("연계",title,moon))
        if lk>=4: break
    # 3) 보충
    if supp:
        for title,moon in supp(a,seen):
            rows.append(("보충",title,moon))
    if not rows: return ""
    tr="\n".join(_row(b,t,m) for b,t,m in rows)
    return ("<table>\n<thead>\n<tr><th>구분 · 조항</th><th>적용 문구</th></tr>\n</thead>\n<tbody>\n"+tr+"\n</tbody>\n</table>")
