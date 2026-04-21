"""
파싱 오류 수정 스크립트 v4 — 핵심 원칙
  1. TXT 줄에서 마커 접두어 제거 후 text 필드에 적용
  2. 절단 판정: 문장이 명확히 끊긴 것 (괄호 미닫힘, 단위 앞 절단)만 대상
  3. TABLE 기준 절단도 동일하게 처리
  4. 소수점 분리: 이전 text가 "합계" 또는 "(" 바로 앞에서 끝난 경우만
"""
import json, os, re

JSON_DIR = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder/data/검토사항"
TXT_DIR  = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder/data/참고자료/검토사항의 보완자료"

PAIRS = [
    ("시행규칙/별표5_처리구체적기준및방법.json",     "[별표 5] 폐기물의 처리에 관한 구체적 기준 및 방법(제14조 관련)(폐기물관리법 시행규칙) (8).txt"),
    ("시행규칙/별표5의3_재활용기준.json",             "[별표 5의3] 폐기물의 재활용 기준(제14조의3제1항 관련)(폐기물관리법 시행규칙) (2).txt"),
    ("시행규칙/별표5의4_재활용자준수사항.json",       "[별표 5의4] 폐기물을 재활용하는 자의 준수사항(제14조의3제5항 관련)(폐기물관리법 시행규칙) (2).txt"),
    ("시행규칙/별표6_폐기물인계인수입력방법.json",    "[별표 6] 폐기물 인계ㆍ인수 사항과 폐기물처리현장정보의 입력 방법 및 절차(제20조제3항 관련)(폐기물관리법 시행규칙) (1).txt"),
    ("시행규칙/별표7_처리업시설장비기술능력기준.json","[별표 7] 폐기물처리업의 시설ㆍ장비ㆍ기술능력의 기준(제28조제6항 관련)(폐기물관리법 시행규칙) (3).txt"),
    ("시행규칙/별표8_처리업자준수사항.json",          "[별표 8] 폐기물처리업자의 준수사항(제32조 관련)(폐기물관리법 시행규칙) (2).txt"),
    ("시행규칙/별표9_처리시설설치기준.json",          "[별표 9] 폐기물 처분시설 또는 재활용시설의 설치기준(제35조 관련)(폐기물관리법 시행규칙) (5).txt"),
    ("시행규칙/별표11_처리시설관리기준.json",         "[별표 11] 폐기물 처분시설 또는 재활용시설의 관리기준(제42조제1항 관련)(폐기물관리법 시행규칙) (3).txt"),
    ("시행규칙/별표17_신고자시설기준.json",           "[별표 17] 폐기물처리 신고자가 갖추어야 할 보관시설 및 재활용시설(제66조제1항 관련)(폐기물관리법 시행규칙) (2).txt"),
    ("시행규칙/별표17의2_신고자준수사항.json",        "[별표 17의2] 폐기물처리 신고자의 준수사항(제67조의2 관련)(폐기물관리법 시행규칙).txt"),
    ("시행규칙/별표19_사후관리기준및방법.json",       "[별표 19] 사후관리기준 및 방법(제70조 관련)(폐기물관리법 시행규칙).txt"),
    ("법/제13조_폐기물의 처리 기준 등.json",          "폐기물관리법(법률)(제21065호)(20260326).txt"),
    ("법/제13의2조_폐기물의 재활용 원칙 및 준수사항.json", "폐기물관리법(법률)(제21065호)(20260326).txt"),
    ("시행령/제7조_폐기물의 처리기준 등.json",        "폐기물관리법 시행령(대통령령)(제36217호)(20260326).txt"),
]

# TXT 줄에서 마커 접두어 제거 패턴 (가., 나., 가), 나), (가), (나), 1), 2), (1), (2), ■, 1. 2. 등)
MARKER_PREFIX = re.compile(
    r'^(?:[■①-⑳]\s*|'
    r'[가-하]\.\s*|'               # 가. 나.
    r'[가-하]\)\s*|'               # 가) 나)
    r'\([가-하]\)\s*|'             # (가) (나)
    r'\d+\)\s*|'                   # 1) 2)
    r'\(\d+\)\s*|'                 # (1) (2)
    r'\d+\.\s*(?!\d)|'             # 1. 2. (소수점 제외)
    r'비고\s*\d*\.\s*|'            # 비고 1.
    r'[○△▲•·]\s*)'
)

def strip_marker(text):
    """TXT 줄의 마커 접두어 제거"""
    return MARKER_PREFIX.sub('', text).strip()

# 문장이 명확히 절단된 패턴 (괄호 미닫힘, 단위 앞 절단)
CLEARLY_TRUNCATED = re.compile(
    r'\($|합계$|합계\s$|이상\($|이하\($|동력$|시설로서$|시설로서\s+$|'
    r'\d+세제$|세제곱$|킬로칼로리$|킬로그램$|킬로리터$|킬로와트$|'
    r'산출한$|분석한$|으로부터$|제거하는$|분리하는$|'
    r'분리하는\s*$|를\s*$|을\s*$|이\s*$|의\s*$'
)

def is_clearly_truncated(v):
    """명확하게 절단된 텍스트인지 판단 (괄호 미닫힘 or 단위 앞 절단)"""
    if not isinstance(v, str):
        return False
    v = v.strip()
    if len(v) < 8:
        return False
    # 여는 괄호가 닫히지 않은 경우
    if v.count('(') > v.count(')'):
        return True
    # 명확한 절단 패턴
    return bool(CLEARLY_TRUNCATED.search(v))

def find_and_strip(truncated_val, txt_lines_list):
    """
    잘린 값 끝 25자를 TXT에서 찾아 마커 제거 후 반환.
    앞 15자도 해당 줄에 포함돼야 함 (같은 조항 확인).
    """
    v = truncated_val.strip()
    tail = v[-25:].strip()
    head = v[:15].strip()

    if len(tail) < 8:
        return None

    for line in txt_lines_list:
        ls = line.strip()
        if not ls:
            continue
        if tail in ls and head[:8] in ls:
            result = strip_marker(ls)
            if len(result) > len(v):
                return result
    return None

def is_decimal_split(prev_item, this_item):
    """
    소수점 분리: 이전 text가 "합계" 또는 숫자+단위 직전에서 끊기고
    다음 marker='N.' + text가 숫자로 시작하는 경우
    """
    prev_text  = prev_item.get('text', '')
    this_marker = this_item.get('marker', '')
    this_text  = this_item.get('text', '')

    if not re.match(r'^\d+\.$', this_marker):
        return False
    # 이 항목 텍스트가 "숫자+단위" 또는 "). 다만"으로 시작해야 함
    if not re.match(r'^\d+[가-힣.\s]|^[톤킬세]|^\)\.|^이상\)|^이하\)', this_text):
        return False
    # 이전 항목 text가 합계/열린괄호로 끝나야 함
    return bool(re.search(r'합계\s*$|\(\s*$|\d\s*$', prev_text.rstrip()))

def process_file(json_path, txt_path, report_lines):
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    with open(txt_path, encoding='utf-8') as f:
        txt_lines_list = [l.rstrip() for l in f.readlines()]

    items = data if isinstance(data, list) else data.get('별표내용', [])
    if not isinstance(items, list):
        return 0

    fname = os.path.basename(json_path)
    fixes = []
    to_delete = []

    i = 0
    while i < len(items):
        item = items[i]
        if not isinstance(item, dict):
            i += 1
            continue

        # 1) 소수점 분리 (엄격한 조건)
        if i > 0 and is_decimal_split(items[i-1], item):
            prev = items[i-1]
            prev_text = prev.get('text', '')
            full = find_and_strip(prev_text, txt_lines_list)
            merged = full if full else (prev_text.rstrip() + item['marker'] + item.get('text', ''))
            fixes.append({
                'type': 'DECIMAL_SPLIT',
                'idx': i,
                'before': f'prev={prev_text[-40:]!r} + [{item["marker"]}]{item.get("text","")[:30]!r}',
                'after': merged[:120],
            })
            prev['text'] = merged
            to_delete.append(i)
            i += 1
            continue

        # 2) text 절단 (명확한 절단만)
        val = item.get('text', '')
        if is_clearly_truncated(val):
            full = find_and_strip(val, txt_lines_list)
            if full:
                fixes.append({'type': 'TEXT', 'idx': i, 'before': val[:100], 'after': full[:120]})
                item['text'] = full

        # 3) TABLE 기준 절단 (명확한 절단만)
        for trow in item.get('table', []):
            if not isinstance(trow, dict):
                continue
            for key in ['기준', '내용', '방법']:
                val = trow.get(key, '')
                if not is_clearly_truncated(val):
                    continue
                full = find_and_strip(val, txt_lines_list)
                if full:
                    label = trow.get('시설', trow.get('구분', trow.get('항목', '-')))
                    fixes.append({
                        'type': f'TABLE/{label}/{key}',
                        'idx': i,
                        'before': val[:100],
                        'after': full[:120],
                    })
                    trow[key] = full

        i += 1

    for idx in sorted(to_delete, reverse=True):
        del items[idx]

    if fixes:
        report_lines.append(f'\n{"="*68}')
        report_lines.append(f'파일: {fname}  ({len(fixes)}건)')
        report_lines.append('='*68)
        for n, fix in enumerate(fixes, 1):
            report_lines.append(f'  [{n}] {fix["type"]}  idx={fix["idx"]}')
            report_lines.append(f'    이전: {fix["before"]}')
            report_lines.append(f'    이후: {fix["after"]}')
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

    return len(fixes)

# ── 실행 ──────────────────────────────────────────────────────────
report_lines = []
total = 0
for json_rel, txt_name in PAIRS:
    json_path = os.path.join(JSON_DIR, json_rel)
    txt_path  = os.path.join(TXT_DIR, txt_name)
    if not os.path.exists(json_path) or not os.path.exists(txt_path):
        print(f"없음: {txt_name}")
        continue
    n = process_file(json_path, txt_path, report_lines)
    total += n

result_path = os.path.join(TXT_DIR, "파싱오류_수정결과.txt")
with open(result_path, 'w', encoding='utf-8') as f:
    f.write(f"총 {total}건 수정\n")
    for line in report_lines:
        f.write(line + '\n')

print(f"완료: 총 {total}건")
