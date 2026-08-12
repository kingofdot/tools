# -*- coding: utf-8 -*-
"""공정명·설명을 표준 공정유형으로 분류하고 유형별 설명 문장을 모아 본다."""
import io, os, sys, re, json, collections

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))

# (표준 공정유형, 구분, 공정명 매칭 정규식) — 위에서부터 먼저 맞는 것으로 확정
RULES = [
    ('보조보일러 공정',    '유틸리티', r'보조\s*보일러|난방'),
    ('순수·연수 제조공정',  '유틸리티', r'순수|연수|정수|탈염|역삼투|RO'),
    ('압축공기 공급공정',   '유틸리티', r'압축공기|공기\s*압축|계장용\s*공기|공기\s*공급|공기저장'),
    ('사용물질 저장공정',   '유틸리티', r'사용물질|약품|기타물질|첨가제|소석회|활성탄|요소수'),

    ('용융공정',         '생산',   r'용융|용해'),
    ('고형화·안정화공정',   '생산',   r'고형화|고화|안정화'),
    ('증발농축공정',      '생산',   r'증발|농축'),
    ('퇴비화공정',       '생산',   r'퇴비|부숙|발효|자원화'),
    ('혐기성 소화공정',    '생산',   r'소화|바이오가스|메탄'),
    ('정제·증류공정',     '생산',   r'정제|증류|재생유|재생연료유|추출|유수\s*분리'),
    ('파쇄·분쇄공정',     '생산',   r'파쇄|분쇄|절단|해체|멸균'),
    ('선별공정',         '생산',   r'선별|자력|비중분리'),
    ('고형연료제품 제조공정', '생산',  r'고형연료|SRF|성형|펠릿|연료화'),
    ('탈수공정',         '생산',   r'탈수'),
    ('건조공정',         '생산',   r'건조'),
    ('중화·물리화학 처리공정', '생산', r'중화|물리화학|응집|산화|환원|반응'),
    ('발전공정',         '생산',   r'발전|전기\s*생산'),
    ('매립공정',         '생산',   r'매립'),
    ('소각공정',         '생산',   r'소각|연소|열분해'),
    ('증기 생산·회수공정',  '생산',   r'증기|스팀|폐열|열원|온수|보일러'),
    ('재활용제품 제조공정',  '생산',   r'벽돌|아스콘|골재|시멘트|슬래그|블록|제품\s*제조|재활용'),
    ('반입·전처리공정',    '생산',   r'반입|전처리|투입|하역|수집'),

    ('용수 공급공정',     '유틸리티', r'용수|공정수|시수|냉각수|급수|생활용수'),
    ('연료·원료 저장공정',  '유틸리티', r'연료|원료|유류|경유|등유|LNG|폐기물\s*저장|폐기물\s*보관'),
    ('저장·공급공정',     '유틸리티', r'저장|보관|공급'),

    ('비점오염 저감공정',   '환경',   r'비점오염|초기우수|강우'),
    ('악취 저감공정',     '환경',   r'악취|탈취|세정'),
    ('대기오염 방지공정',   '환경',   r'대기오염|방지시설|집진|탈질|탈황|배가스|연소가스'),
    ('잔재물 처리공정',    '환경',   r'바닥재|비산재|소각재|잔재|재처리|폐기물\s*처리|폐기물처리'),
    ('폐수처리공정',      '환경',   r'폐수|배수|침출수|하수'),
]
COMPILED = [(n, g, re.compile(p)) for n, g, p in RULES]


def classify(name, desc):
    for n, g, p in COMPILED:
        if p.search(name):
            return n, g
    blob = ' '.join(desc)[:200]
    for n, g, p in COMPILED:
        if p.search(blob):
            return n, g
    return '기타공정', '기타'


def main():
    recs = json.load(open(os.path.join(HERE, 'gj_raw.json'), encoding='utf-8'))
    groups = collections.defaultdict(list)
    for r in recs:
        t, g = classify(r['공정명'], r['설명'])
        r['유형'], r['구분'] = t, g
        groups[t].append(r)

    json.dump(recs, open(os.path.join(HERE, 'gj_cls.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)

    order = [n for n, _, _ in RULES] + ['기타공정']
    print(f'{"표준 공정유형":<22} {"건수":>4}  {"사업장":>4}')
    for t in order:
        if t in groups:
            print(f'{t:<22} {len(groups[t]):>4}  {len(set(x["파일"] for x in groups[t])):>4}')
    print('\n총', len(recs), '/ 유형', len(groups))

    want = sys.argv[1:] or []
    for t in want:
        print('\n' + '=' * 90)
        print('###', t, f'({len(groups[t])}건)')
        seen = set()
        for r in groups[t]:
            for d in r['설명']:
                k = d[:28]
                if k in seen:
                    continue
                seen.add(k)
                print(f'  [{r["공정명"][:18]}] {d[:130]}')


if __name__ == '__main__':
    main()
