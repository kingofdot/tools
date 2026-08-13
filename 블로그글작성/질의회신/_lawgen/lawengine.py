# -*- coding: utf-8 -*-
# 법령 세밀 fetch 엔진: 조/항/호/목 + 별표. 인용파싱(법령명 상속) + 연계 + 캐시.
import io,sys,os,re,json,urllib.request,urllib.parse,time
SC=os.path.dirname(os.path.abspath(__file__))
def _p(f): return os.path.join(SC,f)

# ---- 캐시 ----
GLC=_p('generic_lawcache.json')
try: _g=json.load(open(GLC,encoding='utf-8'))
except Exception: _g={'mst':{},'body':{}}
MSTC=_g.get('mst',{}); BODYC=_g.get('body',{})
BYLC_F=_p('byl_textcache.json')
try: BYLC=json.load(open(BYLC_F,encoding='utf-8'))
except Exception: BYLC={}
JOMUN={}  # mst -> {(jo,ji):c}
def save_cache():
    json.dump({'mst':MSTC,'body':BODYC},open(GLC,'w',encoding='utf-8'),ensure_ascii=False)
    json.dump(BYLC,open(BYLC_F,'w',encoding='utf-8'),ensure_ascii=False)

def get(u):
    r=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
    return urllib.request.urlopen(r,timeout=40).read().decode('utf-8')
def get_bytes(u):
    r=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
    return urllib.request.urlopen(r,timeout=60).read()
def sp(s): return re.sub(r'\s+',' ',s or '').strip()
CIRC="①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕"

def trim(s,n=430):
    s=sp(s); s=re.sub(r'\s*<(?:개정|신설|전문개정|본조신설|제목개정|본조제목개정)[^>]*>','',s).strip()
    return s if len(s)<=n else s[:n].rstrip()+" …"

def _txt(o):
    if o is None: return ""
    if isinstance(o,str): return o
    if isinstance(o,(list,tuple)): return " ".join(_txt(x) for x in o)
    if isinstance(o,dict): return " ".join(_txt(v) for v in o.values())
    return str(o)

def law_mst(name):
    key=re.sub(r'^구\s+','',name).replace('「','').replace('」','').split('(')[0].strip()
    if key in MSTC: return MSTC[key]
    mst=None
    try:
        xml=get("http://www.law.go.kr/DRF/lawSearch.do?OC=123&target=law&type=XML&display=20&query="+urllib.parse.quote(key))
        exact=first=None
        for lw in re.findall(r'<law[\s>].*?</law>',xml,re.S):
            sn=re.search(r'<법령일련번호>(\d+)</법령일련번호>',lw)
            nm=re.search(r'<법령명한글>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</법령명한글>',lw)
            if not sn: continue
            if first is None: first=sn.group(1)
            if nm and nm.group(1).strip()==key: exact=sn.group(1); break
        mst=exact or first
    except Exception: mst=None
    MSTC[key]=mst; return mst

def law_body(mst):
    if not mst: return {}
    if mst in JOMUN: return JOMUN[mst]
    raw=BODYC.get(mst)
    if raw is None:
        try: raw=get(f"http://www.law.go.kr/DRF/lawService.do?OC=123&target=eflaw&MST={mst}&type=JSON")
        except Exception: raw=""
        BODYC[mst]=raw
    d={}
    try:
        arr=json.loads(raw)['법령']['조문']['조문단위']
        if isinstance(arr,dict): arr=[arr]
        for c in arr:
            d[(str(c.get('조문번호','')),str(c.get('조문가지번호','') or '0'))]=c
    except Exception: pass
    JOMUN[mst]=d; return d

def jo_get(law,jo,ji='0'):
    b=law_body(law_mst(law))
    return b.get((str(jo),str(ji))) or b.get((str(jo),'0'))

# ---- 과거버전(회신 당시) ----
def law_versions(law):
    key='VER|'+law.replace(' ','')
    if key in MSTC: return MSTC[key]
    out=[]
    try:
        xml=get("http://www.law.go.kr/DRF/lawSearch.do?OC=123&target=eflaw&type=XML&display=300&search=1&query="+urllib.parse.quote(law))
        for lw in re.findall(r'<law[\s>].*?</law>',xml,re.S):
            nm=re.search(r'<법령명한글>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*</법령명한글>',lw)
            sd=re.search(r'<시행일자>(\d{8})</시행일자>',lw); m=re.search(r'<법령일련번호>(\d+)</법령일련번호>',lw)
            if nm and sd and m and nm.group(1).strip()==law: out.append((sd.group(1),m.group(1)))
        out=sorted(set(out),reverse=True)
    except Exception: out=[]
    MSTC[key]=out; return out
def law_body_hist(mst):
    if not mst: return {}
    kk='H'+mst
    if kk in JOMUN: return JOMUN[kk]
    raw=BODYC.get(kk)
    if raw is None:
        try: raw=get(f"http://www.law.go.kr/DRF/lawService.do?OC=123&target=law&MST={mst}&type=JSON")
        except Exception: raw=""
        BODYC[kk]=raw
    d={}
    try:
        arr=json.loads(raw)['법령']['조문']['조문단위']
        if isinstance(arr,dict): arr=[arr]
        for c in arr: d[(str(c.get('조문번호','')),str(c.get('조문가지번호','') or '0'))]=c
    except Exception: pass
    JOMUN[kk]=d; return d
def jo_get_asof(law,jo,ji,date):
    if not date: return None
    for sd,mst in law_versions(law):
        if sd<=date:
            b=law_body_hist(mst); return b.get((str(jo),str(ji))) or b.get((str(jo),'0'))
    return None

def jo_title(c):
    m=re.match(r'제\d+조(?:의\d+)?\s*\(([^)]*)\)',_txt(c.get('조문내용','')))
    return m.group(1) if m else ''
def full_text(c):
    """조문 전체(조문내용+모든 항/호/목) 평문."""
    parts=[_txt(c.get('조문내용',''))]
    for h in _hang_list(c):
        parts.append(_txt(h.get('항내용','')))
        for x in _ho_list(h): parts.append(_txt(x.get('호내용','')))
        mk=h.get('목'); mk=[mk] if isinstance(mk,dict) else (mk or [])
        for m in mk: parts.append(_txt(m.get('목내용','')))
    return sp(" ".join(parts))

def dedup_prefix(s):
    s=sp(s)
    # "3. 3. ..." / "아. 아. ..." / "5의2. 5의2." 중복 접두 제거
    s=re.sub(r'^([0-9]+(?:의[0-9]+)?[.)]|[가-힣][.)])\s*\1\s*',r'\1 ',s)
    return s.strip()

def _hang_list(c):
    hs=c.get('항') or []
    return [hs] if isinstance(hs,dict) else hs
def _ho_list(h):
    hs=h.get('호') or []
    return [hs] if isinstance(hs,dict) else hs
def _mok_list(ho):
    ms=ho.get('목') or []
    return [ms] if isinstance(ms,dict) else ms

def _mok_flat(H,ho,mok):
    """항 밑 flat 목 리스트를 호 경계(가 리셋)로 그룹핑 → 해당 호 그룹에서 mok 찾기."""
    moks=H.get('목'); moks=[moks] if isinstance(moks,dict) else (moks or [])
    if not moks: return None
    groups=[]; cur=[]
    for m in moks:
        num=re.sub(r'[.\s]','',str(m.get('목번호','')))
        if num=='가' and cur: groups.append(cur); cur=[]
        cur.append(m)
    if cur: groups.append(cur)
    live=[re.sub(r'[.\s]','',str(x.get('호번호',''))) for x in _ho_list(H)
          if '삭제' not in _txt(x.get('호내용',''))]
    gi=live.index(str(ho)) if str(ho) in live else int(ho)-1
    if 0<=gi<len(groups):
        for m in groups[gi]:
            if re.sub(r'[.\s]','',str(m.get('목번호','')))==str(mok):
                return dedup_prefix(_txt(m.get('목내용','')))
    return None

def unit_text(c,hang=None,ho=None,mok=None):
    """조문단위 c에서 인용된 항/호/목의 실제 문구를 반환(깊을수록 그 단위)."""
    hangs=_hang_list(c)
    # 항 찾기
    H=None
    if hang and hangs:
        cand={str(hang)}
        if str(hang).isdigit() and int(hang)<=len(CIRC): cand.add(CIRC[int(hang)-1])
        H=next((h for h in hangs if str(h.get('항번호','')).strip() in cand),None)
    if H is None and (ho or mok) and len(hangs)==1:
        H=hangs[0]  # 항 하나뿐이면 그걸로
    # 호 찾기 (항 지정 없이 호만 인용된 경우 전 항 횡단)
    HO=None
    def _find_ho(hh):
        for x in _ho_list(hh):
            n=re.sub(r'[.\s]','',str(x.get('호번호','')))
            if n==str(ho) or n==str(ho)+'의': return x
        for x in _ho_list(hh):
            if re.match(rf'\s*{ho}\s*[.)]',_txt(x.get('호내용',''))): return x
        return None
    if ho:
        if H is not None:
            HO=_find_ho(H)
        if HO is None:
            for hh in hangs:
                HO=_find_ho(hh)
                if HO is not None: H=hh; break
    # 목 찾기 (1) 호 밑 중첩 목  (2) 항 밑 flat 목(호마다 가 리셋 → 그룹핑)
    if mok:
        if HO is not None:
            for x in _mok_list(HO):
                if re.match(rf'\s*{mok}\s*[.)]',_txt(x.get('목내용',''))):
                    return dedup_prefix(_txt(x.get('목내용','')))
        if H is not None and ho:
            got=_mok_flat(H,ho,mok)
            if got: return got
    if HO is not None:
        t=dedup_prefix(_txt(HO.get('호내용','')))
        mks=[dedup_prefix(_txt(m.get('목내용',''))) for m in _mok_list(HO)]
        if mks: t=t+" "+" ".join(mks)
        return trim(t)
    if H is not None:
        t=dedup_prefix(_txt(H.get('항내용','')))
        hos=[dedup_prefix(_txt(x.get('호내용',''))) for x in _ho_list(H)]
        if hos and len(sp(t))<80: t=t+" "+" ".join(hos)
        return trim(t)
    # 항 지정 없음 → 조 전체(항 + 각 호 내용 포함)
    if hangs:
        parts=[]
        for h in hangs[:3]:
            parts.append(_txt(h.get('항내용','')))
            for x in _ho_list(h)[:8]:
                ht=_txt(x.get('호내용',''))
                if ht and '삭제' not in ht: parts.append(dedup_prefix(ht))
        t=sp(" ".join(parts))
        if t: return trim(t,540)
    head=re.sub(r'^제\d+조(의\d+)?\([^)]*\)\s*','',sp(_txt(c.get('조문내용',''))))
    return trim(head)

# ---- 별표 ----
def byl_num_code(num):
    m=re.match(r'(\d+)(?:의(\d+))?',num.replace(' ',''))
    return f"00{int(m.group(1)):02d}{int(m.group(2) or 0):02d}" if m else None
def byl_fetch(law,num):
    lawc=law.replace(' ',''); key=lawc+'|'+num
    if key in BYLC: return BYLC[key]
    res=None
    try:
        import pdfplumber
        code=byl_num_code(num); link=None; bname=''
        for page in range(1,6):
            xml=get(f"http://www.law.go.kr/DRF/lawSearch.do?OC=123&target=licbyl&type=XML&search=2&display=100&page={page}&query="+urllib.parse.quote(law.strip()))
            items=re.findall(r'<licbyl [^>]*>.*?</licbyl>',xml,re.S)
            if not items: break
            for b in items:
                def g(t):
                    mm=re.search(rf'<{t}>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</{t}>',b,re.S); return (mm.group(1).strip() if mm else '')
                if g('별표종류')!='별표' or g('별표번호')!=code: continue
                if g('관련법령명').replace(' ','')!=lawc: continue
                link=g('별표서식PDF파일링크') or g('별표서식파일링크'); bname=g('별표명'); break
            if link: break
        if link:
            with pdfplumber.open(io.BytesIO(get_bytes("https://www.law.go.kr"+link))) as pdf:
                txt=' '.join((pg.extract_text() or '') for pg in pdf.pages[:20])
            res={"title":bname,"text":sp(txt)[:12000]}
    except Exception: res=None
    BYLC[key]=res; return res

HO_KR="가나다라마바사아자차카타파하"
def byl_excerpt(text,ho=None,mok=None,keyword=None):
    if keyword:
        m=re.search(re.escape(keyword)+r'.{10,480}',text)
        if m: return trim(m.group(0),440)
    return trim(text,440)

if __name__=="__main__":
    sys.stdout=io.TextIOWrapper(sys.stdout.buffer,encoding='utf-8')
    law="폐기물관리법 시행규칙"; D="20171201"
    print("[현행] 제29조제1항제3호아목:")
    print("  ",unit_text(jo_get(law,'29'),'1','3','아'))
    ca=jo_get_asof(law,'29','0',D)
    print(f"[당시 2017] 제29조제1항제3호아목:")
    print("  ",unit_text(ca,'1','3','아') if ca else "(당시버전 못찾음)")
    print("[현행] 제31조제1항제3호:")
    print("  ",unit_text(jo_get(law,'31'),'1','3',None))
    print("건축법 제20조제3호:")
    print("  ",unit_text(jo_get('건축법','20'),None,'3',None))
    save_cache()
