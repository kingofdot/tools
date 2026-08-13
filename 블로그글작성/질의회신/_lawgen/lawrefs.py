# -*- coding: utf-8 -*-
# 인용 파서(법령명 상속) + 연계 + 보충 → 관련법령 3계층 표
import re, difflib
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
def _prenorm(text):
    # OCR 줄바꿈으로 갈린 법령명 재결합(레벨 오결합 방지). '시행 규칙'→'시행규칙' 등.
    text=re.sub(r'시행\s+규칙','시행규칙',text)
    text=re.sub(r'시행\s+령','시행령',text)
    text=re.sub(r'환경영향\s+평가','환경영향평가',text)
    text=re.sub(r'물\s*환경\s*보전\s*법','물환경보전법',text)
    text=re.sub(r'같은\s*법\s*시행\s*규칙','같은 법 시행규칙',text)
    text=re.sub(r'같은\s*법\s*시행\s*령','같은 법 시행령',text)
    return text
def parse_refs(text,default_law=None):
    # cur=직전 인용 대상, anchor=‘같은 법’ 기준. default_law 있으면 그 base가 기본 anchor(주법령 고정).
    text=_prenorm(text)
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
      '규모','시설','장비','기술능력','폐기물처리업','처리업','다음','관련','포함','사항','방법','종류','설치','운영',
      '있는','없는','하는','되는','따른','위한','또는','대한','등의','같은','기후에너지','에너지환경부','환경부령'}
_JOSA=re.compile(r'(으로써|으로서|으로|에서는|에서|에게서|에게|께서|부터|까지|보다|처럼|만큼|마다|이라도|이나마|이나|나마'
                 r'|은|는|이|가|을|를|의|에|와|과|도|만|나|고|며|라|로|한|할|하여|하는|하고|하되|하며)$')
def _kw(text,minlen=2,extra=None):
    # 조사 제거 명사 키워드 집합(폐의류의→폐의류). STOP·extra 제외.
    st=STOP|(extra or set())
    out=set()
    for w in re.findall(r'[가-힣]{2,12}',text):
        s=_JOSA.sub('',_JOSA.sub('',w))
        if len(s)>=minlen and s not in st: out.add(s)
    return out
_MIDDOT=chr(0x318D)   # ㆍ 국가법령 표준 중점(조문 렌더와 통일)
# PDF 줄바꿈으로 낱글자 갈린 상용 법령어 재결합(단어 내부만 결합, 단어 경계 공백은 보존)
_DESPACE=['지정폐기물','사업장폐기물','생활폐기물','폐기물','재활용업','재활용','시행규칙','시행령',
 '합성수지','폐합성수지','유기성오니','무기성오니','폐수처리오니','폐수처리','처리시설',
 '환경부장관','기후에너지환경부','성토재','보조기층재','도로기층재','재활용업자','수집ㆍ운반']
_DESPACE_PATS=[(re.compile(r'\s*'.join(map(re.escape,w))),w) for w in sorted(_DESPACE,key=len,reverse=True)]
def _despace(s):
    for pat,w in _DESPACE_PATS: s=pat.sub(w,s)
    return s
def _byl_norm(s):
    s=(s or '').replace(chr(0x119E),_MIDDOT).replace(chr(0x00B7),_MIDDOT)  # ᆞ, · → ㆍ 통일
    s=re.sub(r'\s*'+_MIDDOT+r'\s*',_MIDDOT,s)                              # 중점 주변 공백 제거
    s=re.sub(r'별표\s*(\d+)의\s+(\d+)',r'별표 \1의\2',s)                    # '4의 2' → '4의2'
    s=re.sub(r'제\s*(\d+)\s*호',r'제\1호',s)
    s=re.sub(r'또\s+는','또는',s)
    s=_despace(s)
    return s
def _byl_clean(text):
    text=_byl_norm(text)
    text=re.sub(r'^■.*?\(제\d+조[^)]*관련\)\s*','',text,count=1,flags=re.S)  # 머리말+반복제목 제거
    text=re.sub(r'<(?:개정|신설|전문개정|본조신설)[^>]*>','',text)
    text=re.sub(r'\[시행[^\]]*\]','',text)
    text=re.sub(r'\s*[.·]{3,}\s*',' ',text)     # PDF 점선 리더
    text=re.sub(r'\s*…+\s*',' ',text)
    return re.sub(r'[ \t]+',' ',text).strip()
def _byl_items(text):
    # 최상위 호 분해: '1. ' '4의2. ' '20. ' (가.나. 목·연도·수량 배제)
    marks=[(m.group(1),m.start()) for m in re.finditer(r'(?<![\d)가-힣의])(\d{1,2}(?:의\d+)?)\.\s',text)]
    kept=[]; prev=0
    for lab,pos in marks:
        base=int(lab.split('의')[0])
        if base>=1 and prev<=base<=prev+2:
            kept.append((lab,pos)); prev=base
    out=[]
    for i,(lab,pos) in enumerate(kept):
        end=kept[i+1][1] if i+1<len(kept) else len(text)
        out.append((lab,sp(text[pos:end])))
    return out
def _byl_trim(s,n=460):
    return E.trim(sp(s),n)   # 공통 경계 로직(문장끝·호·목·종결어) 사용
def _answer_anchor(ans,byl,text):
    m=re.search(r'별표\s*'+re.escape(byl)+r'\]?(.{0,200})',ans)
    clause=(m.group(1) if m else '')+' '+ans
    nums=re.findall(r'\d+일분|\d+톤|\d+퍼센트|\d+세제곱미터|\d+세제곱|\d+킬로|\d+개월|\d+미터',clause)
    for c in sorted(_kw(clause,3),key=len,reverse=True)+nums:
        p=text.find(c)
        if p>=0: return p
    return None
def _looks_garbled(s):
    # 2단 표가 컬럼 뒤섞여 추출된 판독불가 텍스트 감지 → 게시 금지
    if not s: return False
    if s.count('「')>=3: return True
    names=re.findall(r'「([^」]+)」',s)
    if names and len(names)!=len(set(names)): return True   # 동일 법령명 반복 = 컬럼 splice
    if re.search(r'제\s+「',s): return True                   # '제 「법」' 조번호 분리
    if len(re.findall(r'조제\d+항에 따라',s))>=2 and '협의하는 때' in s: return True
    # 낱글자(양쪽 공백) 다발 = 컬럼 블리드
    if len(re.findall(r'(?<=\s)[가-힣](?=\s)',s))>=5: return True
    # 행정처분표 근거법령 열 뒤섞임 신호
    if len(re.findall(r'법 제\d+조',s))>=3 and ('행정처분' in s or '위반' in s or '영업정지' in s): return True
    return False
def byl_excerpt_hinted(bt,ref,ans):
    # 별표4의3(폐기물 종류별 재활용 가능 유형)은 2단 OCR로 raw 부정확 → 보충(TYPEMAP)이 코드별 정확 대체
    if ref.get('byl')=='4의3': return ""
    res=_byl_excerpt_raw(bt,ref,ans)
    return "" if _looks_garbled(res) else res     # 깨진 표 별표는 행 생략
def _byl_excerpt_raw(bt,ref,ans):
    text=_byl_clean(bt.get('text','') if bt else '')
    if not text: return ""
    ho=ref.get('ho'); mok=ref.get('mok')
    # 별표 뒤 제목이 낀 '제N호' 답변서 복구(예: '[별표 16] …할 수 있는 자 제13호에 해당')
    if not ho:
        mh=re.search(r'별표\s*'+re.escape(ref['byl'])+r'\D{0,80}?제(\d+)호',ans)
        if mh: ho=mh.group(1)
    # (0) 답변의 R코드/폐기물코드로 해당 행 타겟팅(별표4의2·5의3 등 유형 표)
    codes=re.findall(r'R-\d(?:-\d)?|\d\d-\d\d-\d\d',ans)
    for code in sorted(set(codes),key=len,reverse=True):
        p=text.find(code)
        if p>=0:
            st=text.rfind('. ',0,p); st2=text.rfind(') ',0,p)
            st=max(st,st2); st=st+2 if st>=0 and p-st<120 else p
            return _byl_trim(text[st:])
    items=_byl_items(text)
    # (1) 호 지정 → 그 호 단일 항목만(하위 4의2 등 안 삼킴)
    if ho and items:
        for lab,it in items:
            if lab==str(ho):
                if mok:
                    mm=re.search(r'(?<![가-힣0-9])'+re.escape(mok)+r'\.\s.*?(?=[가-힣]\.\s|$)',it)
                    if mm: return _byl_trim(sp(mm.group(0)))
                return _byl_trim(it)
    # (2) 열거형(호 3개+) → 답변 키워드로 가장 관련된 단일 호 선택
    if len(items)>=3:
        kws=_kw(ans)
        best=None; bs=0
        for lab,it in items:
            sc=sum(it.count(w)*len(w) for w in kws)
            if sc>bs: bs=sc; best=it
        if best and bs>0: return _byl_trim(best)
        return _byl_trim(items[0][1])
    # (3) 비열거형 문단 → 답변 앵커(문장 시작으로 되감기, 쓰레기 접두 없음)
    p=_answer_anchor(ans,ref['byl'],text)
    if p is not None:
        st=text.rfind('. ',0,p); st=st+2 if st>=0 else 0
        return _byl_trim(text[st:])
    return _byl_trim(text)

# ---- 관련법령 3계층 표 ----
def _law_clean(s):
    # 조문 노이즈 제거: '삭제<날짜>', 빈 '삭제' 호, 중점·공백 정리
    s=(s or '').replace(chr(0x119E),chr(0x318D)).replace(chr(0x00B7),chr(0x318D))
    s=re.sub(r'\s*\d{1,2}\.\s*삭제\s*<[^>]*>','',s)   # '1. 삭제<2012.7.3>'
    s=re.sub(r'\s*삭제\s*<[^>]*>','',s)               # 남은 '삭제<..>'
    s=re.sub(r'\s*<(?:개정|신설|전문개정|본조신설)[^>]*>','',s)
    s=_despace(s)
    return re.sub(r'\s+',' ',s).strip()
def _empty_law(s):
    # 내용 없는 조문(빈 문자열, '제N조'만, '삭제'만) 판별 → 행 생략용
    s=(s or '').strip()
    if not s: return True
    return bool(re.fullmatch(r'(?:제\d+조(?:의\d+)?)?\s*(?:삭제)?\s*',s))
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
def _hang_score(h,cands):
    ht=E._txt(h.get('항내용',''))+' '+' '.join(E._txt(x.get('호내용','')) for x in E._ho_list(h))
    return sum(len(w) for w in cands if w in ht)
def _anchor_hang(c,ans,jo,ji):
    hangs=E._hang_list(c)
    if len(hangs)<=1: return None,None       # 항 1개 이하 → 그대로(=그 항)
    pat=r'제'+re.escape(jo)+r'조'+(r'의'+re.escape(ji) if ji and ji!='0' else '')+r'(.{0,160})'
    m=re.search(pat,ans); clause=m.group(1) if m else ans
    cands=_kw(clause,3,ASTOP)                 # 조사 제거 키워드(길이 가중)
    scored=sorted(((_hang_score(h,cands),i,h) for i,h in enumerate(hangs)),key=lambda x:(-x[0],x[1]))
    bsc,_,best=scored[0]
    first_sc=_hang_score(hangs[0],cands)
    # 강한 신호(길이합 6+ & ①보다 4+ 우세)일 때만 비-① 항 선택, 아니면 제1항 기본
    if best is hangs[0] or bsc<6 or bsc<first_sc+4:
        best=hangs[0]
    hn=str(best.get('항번호','')).strip()
    num=str(CIRCLED.find(hn)+1) if hn in CIRCLED else hn.strip('.')
    return hn,(num or None)

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
            cur=_law_clean(E.unit_text(c,hang,r['ho'],r['mok'])); old=''
            if refdate:
                co=E.jo_get_asof(r['law'],r['jo'],r['ji'],refdate)
                if co: old=_law_clean(E.unit_text(co,hang,r['ho'],r['mok']))
            ce,oe=_empty_law(cur),_empty_law(old)
            if ce and oe: continue                                   # 현행·당시 모두 빈/삭제 → 행 생략
            yr=(refdate[:4] if refdate else '')
            if ce and not oe:                                        # 현행 삭제/이동 → 회신 당시 조문만
                moon=f"<small>[회신 당시 {yr}년]</small> {old}"
            elif _substantive_diff(old,cur):                         # 현행 먼저, 구법(당시) 아래
                moon=f"<small>[현행]</small> {cur}<br><small>[회신 당시 {yr}년]</small> {old}"
            else:
                moon=cur
            lab=label_of(r)+(f"제{anch}항" if anch else "")
            rows.append(("본문",f"「{r['law']}」 {lab}",ti,moon))
            linked_all += _linked(E.full_text(c), r['law'])
        else:
            bt,law_used=E.byl_fetch_any(r['law'],r['byl'])
            moon=byl_excerpt_hinted(bt,r,a) if bt else ''
            if not moon: seen.discard(k); continue   # fetch실패/깨짐 → 보충(TYPEMAP)이 채우게 seen에서 제외
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
        ti=E.jo_title(c); moon=_law_clean(E.unit_text(c,r['hang'],r['ho'],r['mok']))
        if _empty_law(moon): continue
        seen.add(k); lk+=1
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
    # thead 헤더행: 플랫폼 테마가 표 첫 행을 헤더(볼드+음영)로 렌더 → 실제 조항행이 볼드되지 않게 흡수
    return '<table>\n<thead>\n<tr><th>조항 · 적용 문구</th></tr>\n</thead>\n<tbody>\n'+tr+'\n</tbody>\n</table>'

def _substantive_diff(old,cur):
    # 실질 차이 있을 때만 구법 병기. 부처명 변경·사소한 용어차(유사도 90%+)는 현행만.
    if not old or not cur: return False
    def norm(s):
        s=s.replace('기후에너지환경부','환경부').replace('…','')
        s=s.replace(chr(0x119E),chr(0x318D)).replace(chr(0x00B7),chr(0x318D))
        return re.sub(r'\s+','',s)
    a,b=norm(old),norm(cur)
    if a==b: return False
    return difflib.SequenceMatcher(None,a,b).ratio()<0.90
