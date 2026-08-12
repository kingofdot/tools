# -*- coding: utf-8 -*-
"""공정 사전 조회·렌더 헬퍼.

  python helper.py            → 표준공정 30종 목록
  python helper.py 분쇄        → '분쇄'로 걸리는 공정의 설명·슬롯·원문예시
  python helper.py 분쇄 대상물=건설폐기물 입도="50mm 이하"
                              → 슬롯을 채운 완성 문장
"""
import io, os, re, sys, json

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, '공정사전.json'), encoding='utf-8'))
SLOT = D['슬롯사전']


def find(q):
    """공정유형·별칭·관련시설 어디서든 걸리면 반환."""
    return [p for p in D['공정']
            if q in p['공정유형'] or any(q in a for a in p['별칭'] + p['관련시설'])]


def render(p, **kw):
    """{슬롯}을 채워 설명을 완성한다. 안 채운 슬롯은 {그대로} 남는다."""
    return [re.sub(r'\{(\w+)\}', lambda m: kw.get(m.group(1), m.group(0)), s)
            for s in p['설명']]


def main():
    args = sys.argv[1:]
    if not args:
        print(f'표준공정 {D["표준공정수"]}종 (원천 {D["원천공정수"]}개)\n')
        cur = None
        for p in D['공정']:
            if p['구분'] != cur:
                cur = p['구분']
                print(f'[{cur}]')
            print(f'  {p["id"]:<11} {p["공정유형"]:<18} '
                  f'사업장 {p["사업장수"]:>2} · 공정 {p["수록공정수"]:>2}')
        return

    q = args[0]
    kw = {}
    for a in args[1:]:
        if '=' in a:
            k, v = a.split('=', 1)
            kw[k] = v

    hits = find(q)
    if not hits:
        print(f"'{q}' 에 해당하는 공정이 없습니다.")
        return
    for p in hits:
        print('=' * 78)
        print(f'{p["id"]}  {p["공정유형"]}  [{p["구분"]}]')
        if p['근거법령']:
            print(f'근거   {p["근거법령"]}')
        print(f'별칭   {" / ".join(p["별칭"])}')
        print(f'시설   {" / ".join(p["관련시설"])}')
        print(f'출처   {p["사업장수"]}개 사업장 · {p["수록공정수"]}개 공정')
        print('\n[설명]')
        for s in render(p, **kw):
            print('  -', s)
        miss = [s for s in p['슬롯'] if s not in kw]
        if miss:
            print('\n[남은 슬롯]')
            for s in miss:
                print(f'  {{{s}}} : {" / ".join(SLOT.get(s, [])[:8])}')
        if p['원문예시']:
            print('\n[검토결과서 원문 예시]')
            for e in p['원문예시']:
                print(f'  ({e["사업장"]} {e["공정번호"]}) {e["문장"]}')
        print()


if __name__ == '__main__':
    main()
