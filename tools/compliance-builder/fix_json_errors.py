#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
폐기물관리법 JSON 파싱 오류 수정 스크립트
- 소수점 분리 오류: marker="숫자." + text가 숫자로 시작 → 앞 항목과 합치고 삭제
- 텍스트 절단 오류: text가 중간에 끊어짐 → TXT에서 완전한 텍스트 검색하여 교체
"""
import json
import re
import os
import sys

# ──────────────────────────────────────────────
# 파일 매핑: JSON 파일 → TXT 참고파일
# ──────────────────────────────────────────────
BASE_DIR = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder/data"
REF_DIR = os.path.join(BASE_DIR, "참고자료/검토사항의 보완자료")

FILE_MAP = [
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표5_처리구체적기준및방법.json"),
        "txt":  os.path.join(REF_DIR, "[별표 5] 폐기물의 처리에 관한 구체적 기준 및 방법(제14조 관련)(폐기물관리법 시행규칙) (8).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표5의3_재활용기준.json"),
        "txt":  os.path.join(REF_DIR, "[별표 5의3] 폐기물의 재활용 기준(제14조의3제1항 관련)(폐기물관리법 시행규칙) (2).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표5의4_재활용자준수사항.json"),
        "txt":  os.path.join(REF_DIR, "[별표 5의4] 폐기물을 재활용하는 자의 준수사항(제14조의3제5항 관련)(폐기물관리법 시행규칙) (2).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표6_폐기물인계인수입력방법.json"),
        "txt":  os.path.join(REF_DIR, "[별표 6] 폐기물 인계ㆍ인수 사항과 폐기물처리현장정보의 입력 방법 및 절차(제20조제3항 관련)(폐기물관리법 시행규칙) (1).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표7_처리업시설장비기술능력기준.json"),
        "txt":  os.path.join(REF_DIR, "[별표 7] 폐기물처리업의 시설ㆍ장비ㆍ기술능력의 기준(제28조제6항 관련)(폐기물관리법 시행규칙) (3).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표8_처리업자준수사항.json"),
        "txt":  os.path.join(REF_DIR, "[별표 8] 폐기물처리업자의 준수사항(제32조 관련)(폐기물관리법 시행규칙) (2).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표9_처리시설설치기준.json"),
        "txt":  os.path.join(REF_DIR, "[별표 9] 폐기물 처분시설 또는 재활용시설의 설치기준(제35조 관련)(폐기물관리법 시행규칙) (5).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표11_처리시설관리기준.json"),
        "txt":  os.path.join(REF_DIR, "[별표 11] 폐기물 처분시설 또는 재활용시설의 관리기준(제42조제1항 관련)(폐기물관리법 시행규칙) (3).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표17_신고자시설기준.json"),
        "txt":  os.path.join(REF_DIR, "[별표 17] 폐기물처리 신고자가 갖추어야 할 보관시설 및 재활용시설(제66조제1항 관련)(폐기물관리법 시행규칙) (2).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표17의2_신고자준수사항.json"),
        "txt":  os.path.join(REF_DIR, "[별표 17의2] 폐기물처리 신고자의 준수사항(제67조의2 관련)(폐기물관리법 시행규칙).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행규칙/별표19_사후관리기준및방법.json"),
        "txt":  os.path.join(REF_DIR, "[별표 19] 사후관리기준 및 방법(제70조 관련)(폐기물관리법 시행규칙).txt"),
        "json_list_key": "별표내용",
        "text_field": "text",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/법/제13조_폐기물의 처리 기준 등.json"),
        "txt":  os.path.join(REF_DIR, "폐기물관리법(법률)(제21065호)(20260326).txt"),
        "json_list_key": "항",
        "text_field": "항내용",
        "article_filter": "제13조",  # 법 파일은 전체 조문이 있으므로 해당 조 범위만
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/법/제13의2조_폐기물의 재활용 원칙 및 준수사항.json"),
        "txt":  os.path.join(REF_DIR, "폐기물관리법(법률)(제21065호)(20260326).txt"),
        "json_list_key": "항",
        "text_field": "항내용",
        "article_filter": "제13조의2",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행령/제7조_폐기물의 처리기준 등.json"),
        "txt":  os.path.join(REF_DIR, "폐기물관리법 시행령(대통령령)(제36217호)(20260326).txt"),
        "json_list_key": "항",
        "text_field": "항내용",
        "article_filter": "제7조",
    },
]

# ──────────────────────────────────────────────
# 유틸리티 함수
# ──────────────────────────────────────────────

def load_txt(path):
    """TXT 파일을 UTF-8-sig(BOM) 또는 UTF-8로 읽기"""
    try:
        with open(path, encoding='utf-8-sig') as f:
            return f.read()
    except Exception:
        try:
            with open(path, encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"  [ERROR] TXT 로드 실패: {path} — {e}", file=sys.stderr)
            return ""

def normalize(s):
    """공백/줄바꿈 제거"""
    return re.sub(r'\s+', '', s)

def find_in_txt(txt, search_text, min_len=15):
    """
    TXT에서 search_text(앞 min_len글자)를 검색하여
    해당 문장(줄 전체)을 반환. 공백을 제거하고 비교.
    """
    if not search_text or len(search_text) < min_len:
        return None

    query = normalize(search_text[:min_len])

    # TXT를 줄 단위로 분리
    lines = txt.split('\n')

    for line in lines:
        clean_line = normalize(line)
        if query in clean_line:
            # 줄 전체를 strip해서 반환
            stripped = line.strip()
            # 앞의 들여쓰기나 번호 마커 제거 없이 전체 반환
            return stripped

    return None

def find_full_sentence_in_txt(txt, search_text, min_len=20):
    """
    TXT에서 search_text 앞부분을 포함하는 텍스트 블록 전체를 찾기.
    여러 줄에 걸쳐 이어질 수 있는 경우 합쳐서 반환.
    """
    if not search_text or len(normalize(search_text)) < min_len:
        return None

    query = normalize(search_text[:min_len])
    txt_clean = normalize(txt)

    idx = txt_clean.find(query)
    if idx < 0:
        # 더 짧게 시도
        query2 = normalize(search_text[:12])
        if len(query2) < 8:
            return None
        idx = txt_clean.find(query2)
        if idx < 0:
            return None

    # 원본 txt에서 위치 찾기 (공백 없는 위치 → 원본 위치 역산)
    # 원본 txt를 스캔하면서 공백 제거 카운터와 원본 위치 매핑
    char_map = []  # (원본idx, char)
    for i, ch in enumerate(txt):
        if not re.match(r'\s', ch):
            char_map.append(i)

    if idx >= len(char_map):
        return None

    orig_start = char_map[idx]

    # orig_start 이전 줄의 시작부터 찾기
    line_start = txt.rfind('\n', 0, orig_start)
    line_start = line_start + 1 if line_start >= 0 else 0

    # 줄 끝 찾기
    line_end = txt.find('\n', orig_start)
    if line_end < 0:
        line_end = len(txt)

    result_line = txt[line_start:line_end].strip()
    return result_line if result_line else None

def is_truncated(text):
    """
    텍스트가 중간에 잘렸는지 판단.
    - 마침표, 닫는 괄호, 특수 종결 문자 등으로 끝나지 않으면 잘린 것
    - 소제목(짧고 단순), "삭제" 표시, 수식 등은 제외
    """
    if not text:
        return False

    text = text.strip()

    # 너무 짧은 텍스트 (소제목 등)
    if len(text) < 10:
        return False

    # "삭제" 또는 "<삭제>" 패턴
    if re.search(r'<?\s*삭제\s*>?$', text):
        return False

    # 수식/계산식 (등호/부등호로 끝나는 경우 등)
    if text.endswith(('=', '≤', '≥', '>', '<', '+', '-', '×', '÷')):
        return False

    # 정상 종결 문자들
    OK_ENDINGS = set('.),】』」\'"。;：:>ℓ%㎡㎥㎢㎝㎞㎲㎃㎏' +
                     '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮' +
                     '가나다라마바사아자차카타파하'  # 열거 소제목
                     )

    last = text[-1]

    # 한글 종결어미 패턴
    if text.endswith(('다.', '라.', '가.', '나.', '마.', '하.', '오.',
                      '함.', '임.', '것.', '임)', '것)',
                      '한다', '한다.', '아야 한다', '야야 한다',
                      '수 있다', '아야 한다.', '어야 한다.',
                      '없다', '없다.', '된다', '된다.',
                      '이다', '이다.', '한다)', '된다)',
                      '인다', '인다.', '겠다', '겠다.',
                      '아한다', '어한다')):
        return False

    # 숫자/단위로 끝나는 경우
    if re.search(r'[\d㎝㎞㎡㎥㎢ℓ%]\s*$', text):
        return False

    # "등", "외", "것", "함", "임" 으로 끝나는 경우 (소제목)
    if re.search(r'(등|외|것|함|임|중|간|용|형|법|식|예|건|항|안|자|자:|者)\s*$', text):
        return False

    # "~~~하는 경우", "~~~하는 때" 등으로 끝나는 경우
    if re.search(r'(경우|때|바|곳|데|자|처|거|절|설|전|후|항|호|목|조)\s*$', text):
        return False

    # 기타 단일 조사/어미로 끝나는 경우
    if re.search(r'[가-힣]\s*$', text):
        # 마지막 글자가 한글인 경우 - 대부분 정상 (명사, 조사 등)
        # 단, 접속사/연결어미로 끝나면 잘린 것
        last_word = text.rstrip()[-3:] if len(text) > 3 else text
        # "으로부터", "에서는" 등 연결어미 → 잘린 것
        truncation_endings = ('으로부터', '에서부터', '에서는', '으로는', '하거나', '하며', '하고',
                              '되거나', '되며', '되고', '이거나', '이며', '이고',
                              '하여서', '하여야', '하여도', '되어야', '되어서', '되어도',
                              '의하여', '에의한', '을위한', '를위한', '으로써', '로써',
                              '하였으', '되었으', '이었으', '하는등', '되는등',
                              '기준이', '방법이', '경우이', '경우로', '으로서')
        for end in truncation_endings:
            if text.rstrip().endswith(end):
                return True
        return False

    # 마지막이 영숫자나 구두점이 아닌 경우
    if last not in OK_ENDINGS and not last.isdigit():
        return True

    return False

def get_items_and_text_field(data, file_cfg):
    """JSON 데이터에서 항목 목록과 텍스트 필드명 반환"""
    key = file_cfg.get("json_list_key", "별표내용")
    text_field = file_cfg.get("text_field", "text")

    if isinstance(data, list):
        return data, text_field
    elif isinstance(data, dict) and key in data:
        return data[key], text_field
    else:
        # 다른 key 시도
        for k, v in data.items():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v, text_field
        return [], text_field

def get_marker_field(item):
    """항목에서 marker 또는 항번호 필드 반환"""
    if 'marker' in item:
        return 'marker', item.get('marker', '')
    elif '항번호' in item:
        return '항번호', item.get('항번호', '')
    elif '호번호' in item:
        return '호번호', item.get('호번호', '')
    return None, ''

def get_text_value(item, text_field):
    """항목에서 텍스트 값 반환"""
    return item.get(text_field, '')

def set_text_value(item, text_field, value):
    """항목의 텍스트 값 설정"""
    item[text_field] = value

# ──────────────────────────────────────────────
# 메인 처리 로직
# ──────────────────────────────────────────────

def process_file(file_cfg, report_lines):
    json_path = file_cfg["json"]
    txt_path = file_cfg["txt"]
    text_field = file_cfg.get("text_field", "text")

    fname = os.path.basename(json_path)
    report_lines.append(f"\n{'='*60}")
    report_lines.append(f"파일: {fname}")
    report_lines.append(f"{'='*60}")

    # JSON 로드
    if not os.path.exists(json_path):
        report_lines.append(f"  [SKIP] JSON 파일 없음: {json_path}")
        return 0

    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    # TXT 로드
    if not os.path.exists(txt_path):
        report_lines.append(f"  [SKIP] TXT 파일 없음: {txt_path}")
        return 0

    txt = load_txt(txt_path)

    # 항목 목록 추출
    items, text_field = get_items_and_text_field(data, file_cfg)
    if not items:
        report_lines.append(f"  [SKIP] 항목 없음")
        return 0

    fix_count = 0
    to_delete = []  # 삭제할 인덱스

    # ── Pass 1: 소수점 분리 오류 처리 ──
    # marker가 "숫자." 형태이고 text가 숫자로 시작하는 경우
    # 실제 오류: "4." + "5..." → 이전 항목과 "4.5..." 로 합쳐야 함
    # 그러나 더 일반적인 패턴: marker="4." text="" 이고 다음 항목의 text="5..."
    #
    # 정확한 소수점 분리 오류:
    # items[i].marker = "N."  items[i].text = ""  (또는 text가 없음)
    # items[i+1].marker = ""  items[i+1].text = "M..." (앞에 숫자가 있어야 할 것이 없음)
    #
    # 더 정확한 방법: 실제 TXT에서 "N.M"이 하나의 값으로 나오는지 확인
    #
    # 방법: marker가 "단독숫자." (예: "4.") 이고 바로 다음 항목의 marker가 빈 문자열이거나
    # 없는 경우, 현재 항목과 다음을 합쳐 검색

    # 실제 패턴 탐지: marker="숫자." + text가 숫자로 시작
    for i in range(len(items) - 1):
        item = items[i]
        next_item = items[i + 1]

        m_field, cur_marker = get_marker_field(item)
        _, next_marker = get_marker_field(next_item)
        cur_text = get_text_value(item, text_field)
        next_text = get_text_value(next_item, text_field)

        # 패턴: marker가 "N." 형태이고 다음 text가 숫자로 시작
        # 실제로 "N.M" 형태로 합쳐지는 경우
        # 예: marker="4." text="" + marker=None text="5. 이하여야..."
        # 이는 실제 소수점 값이 분리된 것

        if (cur_marker and re.match(r'^\d+\.$', cur_marker.strip()) and
                not cur_text and  # 현재 text가 비어있거나
                next_text and re.match(r'^\d+', next_text.strip())):

            # TXT에서 "N.M" 패턴 확인
            n_part = re.match(r'^(\d+)\.$', cur_marker.strip()).group(1)
            m_match = re.match(r'^(\d+)', next_text.strip())
            if m_match:
                m_part = m_match.group(1)
                combined_search = f"{n_part}.{m_part}"

                if txt.find(combined_search) >= 0:
                    # 실제 소수점 분리 오류
                    merged = cur_marker.strip() + next_text.strip()
                    set_text_value(item, text_field, merged)
                    if m_field:
                        item[m_field] = ""
                    to_delete.append(i + 1)
                    report_lines.append(f"  [소수점합치기] [{i}]↔[{i+1}]: marker='{cur_marker}' + text='{next_text[:50]}' → '{merged[:80]}'")
                    fix_count += 1

    # ── Pass 2: 텍스트 절단 오류 처리 ──
    for i, item in enumerate(items):
        if i in to_delete:
            continue

        text = get_text_value(item, text_field)

        if not text or not is_truncated(text):
            continue

        # TXT에서 전체 텍스트 검색
        # 앞 20글자로 검색
        search_len = min(25, len(text))
        full_text = find_full_sentence_in_txt(txt, text, min_len=12)

        if full_text and len(full_text) > len(text):
            # 더 긴 텍스트가 찾아진 경우만 교체
            # text 앞부분이 full_text에 포함되는지 확인
            if normalize(text[:10]) in normalize(full_text):
                old_text = text
                set_text_value(item, text_field, full_text)
                report_lines.append(f"  [텍스트수정] [{i}] marker='{get_marker_field(item)[1]}'")
                report_lines.append(f"    이전: '{old_text[:100]}'")
                report_lines.append(f"    이후: '{full_text[:100]}'")
                fix_count += 1
        elif full_text is None:
            report_lines.append(f"  [미매칭] [{i}] '{text[:60]}...' (TXT에서 찾지 못함)")

    # ── 삭제 처리 (역순으로) ──
    for idx in sorted(to_delete, reverse=True):
        items.pop(idx)

    # ── 저장 ──
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    report_lines.append(f"\n  총 {fix_count}건 수정, {len(to_delete)}건 항목 삭제")
    return fix_count


def process_law_file(file_cfg, report_lines):
    """법/시행령 파일 처리 (항 구조)"""
    json_path = file_cfg["json"]
    txt_path = file_cfg["txt"]
    text_field = file_cfg.get("text_field", "항내용")

    fname = os.path.basename(json_path)
    report_lines.append(f"\n{'='*60}")
    report_lines.append(f"파일: {fname}")
    report_lines.append(f"{'='*60}")

    if not os.path.exists(json_path):
        report_lines.append(f"  [SKIP] JSON 파일 없음: {json_path}")
        return 0

    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    if not os.path.exists(txt_path):
        report_lines.append(f"  [SKIP] TXT 파일 없음: {txt_path}")
        return 0

    txt = load_txt(txt_path)

    fix_count = 0

    def process_items_recursive(items, depth=0):
        nonlocal fix_count
        if not isinstance(items, list):
            return

        for i, item in enumerate(items):
            if not isinstance(item, dict):
                continue

            # text 필드 처리
            for field in [text_field, 'text', '항내용', '내용', '호내용']:
                if field in item:
                    text = item[field]
                    if isinstance(text, str) and is_truncated(text):
                        full_text = find_full_sentence_in_txt(txt, text, min_len=12)
                        if full_text and len(full_text) > len(text):
                            if normalize(text[:10]) in normalize(full_text):
                                report_lines.append(f"  [텍스트수정] depth={depth} [{i}] field='{field}'")
                                report_lines.append(f"    이전: '{text[:100]}'")
                                report_lines.append(f"    이후: '{full_text[:100]}'")
                                item[field] = full_text
                                fix_count += 1

            # 재귀적으로 하위 항목 처리
            for k, v in item.items():
                if isinstance(v, list):
                    process_items_recursive(v, depth + 1)

    # 최상위 처리
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, list):
                process_items_recursive(v)
            elif isinstance(v, str) and is_truncated(v):
                full_text = find_full_sentence_in_txt(txt, v, min_len=12)
                if full_text and len(full_text) > len(v):
                    report_lines.append(f"  [텍스트수정] key='{k}'")
                    report_lines.append(f"    이전: '{v[:100]}'")
                    report_lines.append(f"    이후: '{full_text[:100]}'")
                    data[k] = full_text
                    fix_count += 1

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    report_lines.append(f"\n  총 {fix_count}건 수정")
    return fix_count


def main():
    report_lines = []
    report_lines.append("폐기물관리법 JSON 파싱 오류 수정 결과")
    report_lines.append("=" * 60)
    report_lines.append(f"처리 일시: 2026-04-21")
    report_lines.append("")

    total_fixes = 0

    for file_cfg in FILE_MAP:
        json_path = file_cfg["json"]

        # 법/시행령 파일 여부 판단
        is_law = ("법/" in json_path or "시행령/" in json_path)

        try:
            if is_law:
                n = process_law_file(file_cfg, report_lines)
            else:
                n = process_file(file_cfg, report_lines)
            total_fixes += n
        except Exception as e:
            report_lines.append(f"\n  [ERROR] {os.path.basename(json_path)}: {e}")
            import traceback
            report_lines.append(traceback.format_exc())

    report_lines.append(f"\n{'='*60}")
    report_lines.append(f"전체 수정 건수: {total_fixes}건")

    # 결과 파일 저장
    result_path = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder/data/참고자료/파싱오류_수정결과.txt"
    os.makedirs(os.path.dirname(result_path), exist_ok=True)
    with open(result_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))

    print('\n'.join(report_lines))
    print(f"\n결과 저장: {result_path}")


if __name__ == '__main__':
    main()
