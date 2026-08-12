# -*- coding: utf-8 -*-
"""통합환경허가 검토결과서 '2.2 대분류 공정 설명' 원문 → (공정번호·공정명·설명) 레코드.

PDF 표를 텍스트로 뽑으면서 셀이 줄바꿈되어 열 순서가 뒤엉켜 있다.
표의 한 행은 대체로 다음 형태로 흩어진다.

    폐기물                       ← 공정명 앞부분(윗줄로 밀림)  + 설명 첫 불릿
    PU-02                        ← 공정번호
    저장공정  전처리하여 저장     ← 공정명 뒷부분 + 설명 이어짐

따라서 공정번호가 있는 줄을 앵커로 잡고, 바로 위/아래 줄에서 '짧은 이름 조각'만
끌어와 공정명을 복원한다. 설명은 행 범위 안의 불릿을 모아 붙인다.
"""
import io, os, sys, re, json, glob

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DATA = r'd:\dev\tools\블로그글작성\자료분석\_data'

BULLET = '\x01'
# 원문에서 실제로 쓰인 불릿: ▪(396) §(111) ○(74) ∙(34) •(15) Ÿ ․
# ·(0xB7)와 ‧(0x2027)은 '반입‧보관' 같은 낱말 구분자라 불릿에서 제외한다.
BULLETS = 'Ÿ▪§○∙•■□◦․'
NO = re.compile(r'\b(P|PU|PW|PA|PS|PT|PE)-\d{1,2}\b')

# 구분(첫 열) 및 표 머리글 조각 — 공정명으로 오인하면 안 된다
GUBUN = ['환경오염물질처리공정', '환경오염물질 처리공정', '오염물질처리공정',
         '유틸리티공정', '제품제조공정', '생산공정', '유틸리티', '제품제조',
         '환경오염', '물질처리', '오염물질', '처리공정', '대분류공정명', '대분류 공정명',
         '공정번호', '공정설명', '공정 설명', '대분류', '공정명', '구 분', '구분',
         '번호', '비고', '공정']
# 문장(설명) 임을 알려주는 어미·조사
SENT = re.compile(r'(하여|하는|되어|되는|한다|시킨|에서|으로|로서|등을|등의|및 |를 |을 |은 |는 |이 |가 )')


def norm(s):
    s = s.replace('‧', '·').replace('ㆍ', '·')
    for b in BULLETS:
        s = s.replace(b, BULLET)
    return s


def clean(s):
    return re.sub(r'\s+', ' ', s).strip(' ·,')


def strip_gubun(t):
    t = clean(t)
    changed = True
    while changed and t:
        changed = False
        for g in GUBUN:
            if t == g:
                return ''
            if t.startswith(g + ' '):
                t = t[len(g):].strip()
                changed = True
                break
            if t.endswith(' ' + g):
                t = t[:-len(g)].strip()
                changed = True
                break
    return t


NAME_TAIL = re.compile(r'(공정|시설|설비|공장)$')


def peel_name(t):
    """문장 앞머리에 붙은 공정명을 떼어낸다.

    '사용물질 저장공정 제거제, 요소수, …' → ('사용물질 저장공정', '제거제, 요소수, …')
    이름은 '…공정/시설/설비'로 끝나는 토큰까지이며, 16자 이내여야 한다.
    """
    toks = t.split()
    for i, tk in enumerate(toks[:4]):
        if NAME_TAIL.search(tk):
            cand = ' '.join(toks[:i + 1])
            if len(cand) <= 16 and i + 1 < len(toks) and strip_gubun(cand):
                return strip_gubun(cand), ' '.join(toks[i + 1:])
            break
    return '', t


def split_name_rest(t):
    """비불릿 텍스트를 (공정명 조각, 설명 이어짐)으로 나눈다."""
    t = strip_gubun(t)
    if not t:
        return '', ''
    # 통째로 짧고 문장 같지 않으면 전부 이름 조각
    if len(t) <= 16 and not SENT.search(t):
        return t, ''
    return peel_name(t)


def parse(text):
    text = norm(text)
    lines = [l.strip() for l in text.split('\n')]

    # 헤더/꼬리 컷
    start = 0
    for i, l in enumerate(lines[:10]):
        if '공정설명' in l.replace(' ', ''):
            start = i + 1
    end = len(lines)
    for i, l in enumerate(lines):
        if re.match(r'^\s*2\.\s*(허가대상|3)', l) or re.match(r'^\s*2\.3', l):
            end = i
            break
    lines = [l for l in lines[start:end]]

    # 줄별 (공정번호, 비불릿, 불릿목록) 분해
    parsed = []
    for l in lines:
        if not l:
            parsed.append((None, '', []))
            continue
        bi = l.find(BULLET)
        pre = l[:bi] if bi >= 0 else l
        posts = [clean(p) for p in l[bi + 1:].split(BULLET)] if bi >= 0 else []
        m = NO.search(pre)
        no = m.group(0) if m else None
        if m:
            pre = pre[:m.start()] + ' ' + pre[m.end():]
        parsed.append((no, pre, [p for p in posts if p]))

    anchors = [i for i, (no, _, _) in enumerate(parsed) if no]
    if not anchors:
        return []

    # 각 행의 시작 줄: 바로 윗줄이 '이름 조각'을 갖고 있으면 거기서 시작
    starts = []
    for k, i in enumerate(anchors):
        s = i
        if i - 1 >= 0 and (k == 0 or i - 1 > anchors[k - 1]):
            nm, rest = split_name_rest(parsed[i - 1][1])
            if nm and not rest:
                s = i - 1
        starts.append(s)

    recs = []
    for k, i in enumerate(anchors):
        s = starts[k]
        e = (starts[k + 1] - 1) if k + 1 < len(anchors) else len(parsed) - 1
        name_parts, desc = [], []
        for j in range(s, e + 1):
            no, pre, posts = parsed[j]
            nm, rest = split_name_rest(pre)
            if nm:
                name_parts.append(nm)
            if rest:
                if desc:
                    desc[-1] = clean(desc[-1] + ' ' + rest)
                else:
                    desc.append(rest)
            for p in posts:
                desc.append(p)
        name = clean(' '.join(name_parts))
        desc = [d for d in (clean(x) for x in desc) if d]
        # 이름이 첫 설명 앞머리로 흡수된 경우 되찾는다
        if not name and desc:
            nm, rest = peel_name(desc[0])
            if nm:
                name, desc[0] = nm, rest
                desc = [d for d in desc if d]
        name = re.sub(r'공\s+정', '공정', name)
        recs.append({'공정번호': parsed[i][0], '공정명': name, '설명': desc})

    # 병합 셀(공정번호 여럿이 공정명 하나를 공유)은 이웃에서 상속
    for k, r in enumerate(recs):
        if r['공정명']:
            continue
        src = ''
        for j in range(k + 1, len(recs)):
            if recs[j]['공정명']:
                src = recs[j]['공정명']
                break
        if not src:
            for j in range(k - 1, -1, -1):
                if recs[j]['공정명']:
                    src = recs[j]['공정명']
                    break
        if src:
            r['공정명'] = src
            r['_이름추정'] = True
    return recs


def main():
    allrecs, stat = [], []
    for f in sorted(glob.glob(os.path.join(DATA, '*.json'))):
        base = os.path.basename(f)
        if base.startswith('_'):
            continue
        d = json.load(open(f, encoding='utf-8'))
        recs = parse(d.get('공정_설명') or '')
        nn = sum(1 for r in recs if not r['공정명'])
        nd = sum(1 for r in recs if not r['설명'])
        stat.append((base, len(recs), nn, nd))
        for r in recs:
            r['사업장'] = d.get('사업장명') or base
            r['파일'] = base
            r['업종'] = d.get('업종', '')
            allrecs.append(r)

    bad = [s for s in stat if s[2] or s[3]]
    for b, n, nn, nd in bad:
        print(f'!! {b:<32} 공정{n:>3}  명없음{nn:>2}  설명없음{nd:>2}')
    print(f'\n총 {len(allrecs)}개 공정 / {len(stat)}개 사업장')
    print('공정명 누락', sum(s[2] for s in stat), '/ 설명 누락', sum(s[3] for s in stat))

    outp = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'gj_raw.json')
    json.dump(allrecs, open(outp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('→', outp)


if __name__ == '__main__':
    main()
