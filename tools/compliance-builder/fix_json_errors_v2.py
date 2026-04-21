#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
폐기물관리법 JSON 파싱 오류 수정 스크립트 v2
- 각 JSON 항목의 text를 TXT에서 검색하여 완전한 텍스트로 교체
- 소수점 분리 오류 처리
"""
import json
import re
import os
import sys

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
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/법/제13의2조_폐기물의 재활용 원칙 및 준수사항.json"),
        "txt":  os.path.join(REF_DIR, "폐기물관리법(법률)(제21065호)(20260326).txt"),
        "json_list_key": "항",
        "text_field": "항내용",
    },
    {
        "json": os.path.join(BASE_DIR, "검토사항/시행령/제7조_폐기물의 처리기준 등.json"),
        "txt":  os.path.join(REF_DIR, "폐기물관리법 시행령(대통령령)(제36217호)(20260326).txt"),
        "json_list_key": "항",
        "text_field": "항내용",
    },
]

# ──────────────────────────────────────────────
# TXT 파싱: 줄 단위로 마커와 내용 분리
# ──────────────────────────────────────────────

# 마커 패턴 (TXT 줄 앞부분)
MARKER_RE = re.compile(
    r'^(\s*)'           # 들여쓰기
    r'('
    r'\d+\.'            # "1."
    r'|[가나다라마바사아자차카타파하]\.'  # "가."
    r'|\d+\)'           # "1)"
    r'|[가나다라마바사아자차카타파하]\)'  # "가)"
    r'|[①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮]'  # 원문자
    r'|\(\d+\)'         # "(1)"
    r'|\([가나다라마바사아자차카타파하]\)'  # "(가)"
    r')?'
    r'\s*'
    r'(.*)'
)

def load_txt(path):
    """TXT 파일 로드"""
    for enc in ['utf-8-sig', 'utf-8', 'euc-kr']:
        try:
            with open(path, encoding=enc) as f:
                return f.read()
        except Exception:
            continue
    raise RuntimeError(f"TXT 로드 실패: {path}")

def normalize(s):
    """공백/줄바꿈 정규화"""
    return re.sub(r'\s+', '', str(s))

def extract_line_content(line):
    """TXT 줄에서 마커를 제거하고 내용만 반환"""
    m = MARKER_RE.match(line)
    if m:
        content = m.group(3) or ''
        return content.strip()
    return line.strip()

def build_txt_index(txt):
    """
    TXT를 줄 단위로 분석하여
    각 줄의 content(마커 제거) 의 정규화 형태 → 원본 content 매핑 구성
    """
    lines = txt.split('\n')
    index = []  # [(normalized_content, original_content, line_num)]

    for i, line in enumerate(lines):
        content = extract_line_content(line)
        if not content:
            continue
        norm = normalize(content)
        if len(norm) >= 5:  # 너무 짧은 건 제외
            index.append((norm, content, i))

    return index

def find_best_match(json_text, txt_index, min_query_len=10):
    """
    JSON text의 앞부분을 TXT 인덱스에서 검색.
    가장 길게 매칭되는 TXT 줄을 반환.
    """
    if not json_text or len(normalize(json_text)) < min_query_len:
        return None

    json_norm = normalize(json_text)

    # 앞에서 다양한 길이로 검색 시도 (20→15→12글자)
    for q_len in [20, 15, 12, 10]:
        query = json_norm[:q_len]
        if len(query) < 8:
            break

        candidates = []
        for norm_content, orig_content, line_num in txt_index:
            if norm_content.startswith(query):
                candidates.append((len(norm_content), orig_content, line_num))

        if candidates:
            # 가장 긴 것 선택 (완전한 텍스트)
            candidates.sort(key=lambda x: -x[0])
            return candidates[0][1]  # orig_content

    return None

def get_items(data, file_cfg):
    """JSON에서 항목 리스트 반환"""
    key = file_cfg.get("json_list_key", "별표내용")
    if isinstance(data, list):
        return data
    elif isinstance(data, dict) and key in data:
        return data[key]
    else:
        # dict에서 list를 찾기
        for k, v in data.items():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
    return []

def get_marker(item):
    """항목에서 마커 값 반환"""
    for field in ['marker', '항번호', '호번호', '목번호']:
        if field in item:
            return field, item[field]
    return None, ''

# ──────────────────────────────────────────────
# 소수점 분리 오류 처리
# ──────────────────────────────────────────────

def fix_decimal_split(items, text_field, txt, report_lines):
    """
    소수점 분리 오류:
    marker="N." text="" + 다음항목 text="M ..."
    → TXT에 "N.M" 이 있는 경우 합치고 다음 항목 삭제
    """
    to_delete = []
    fix_count = 0

    for i in range(len(items) - 1):
        item = items[i]
        next_item = items[i + 1]

        m_field, cur_marker = get_marker(item)
        _, next_marker = get_marker(next_item)
        cur_text = item.get(text_field, '')
        next_text = next_item.get(text_field, '')

        # 패턴: marker="N." + text 비어있거나 다음 text가 숫자로 시작
        if not re.match(r'^\d+\.$', str(cur_marker).strip()):
            continue

        if cur_text:  # 현재 text가 있으면 소수점 분리 아님
            continue

        if not next_text:
            continue

        # 다음 text가 숫자로 시작하면 소수점 가능성
        n_part = re.match(r'^(\d+)\.$', str(cur_marker).strip())
        if not n_part:
            continue
        n = n_part.group(1)

        # TXT에서 "N.숫자" 형태 확인
        m_match = re.match(r'^(\d+)', next_text.strip())
        if m_match:
            m = m_match.group(1)
            decimal_val = f"{n}.{m}"
            # TXT에서 이 소수점이 있는지 확인
            if decimal_val in txt:
                merged = decimal_val + next_text[len(m):]
                item[text_field] = merged
                to_delete.append(i + 1)
                report_lines.append(f"  [소수점합치기] [{i}]↔[{i+1}]: '{cur_marker}' + '{next_text[:50]}' → '{merged[:80]}'")
                fix_count += 1

    return to_delete, fix_count

# ──────────────────────────────────────────────
# 텍스트 절단 오류 처리 (핵심 로직)
# ──────────────────────────────────────────────

def fix_text_truncation(items, text_field, txt_index, txt, report_lines):
    """
    각 항목의 text를 TXT에서 검색하여 완전한 텍스트로 교체.
    TXT에서 찾은 텍스트가 JSON보다 길고 앞부분이 일치하면 교체.
    """
    fix_count = 0
    no_match_count = 0

    for i, item in enumerate(items):
        text = item.get(text_field, '')
        if not text or len(normalize(text)) < 10:
            continue

        # TXT에서 검색
        txt_content = find_best_match(text, txt_index, min_query_len=10)

        if txt_content is None:
            no_match_count += 1
            continue

        txt_norm = normalize(txt_content)
        json_norm = normalize(text)

        # 앞부분 일치 확인 (검색 결과가 정확한지)
        if not txt_norm.startswith(json_norm[:min(10, len(json_norm))]):
            continue

        # 텍스트가 다르면 교체 (TXT가 원본이므로 길이와 무관하게 교체)
        if txt_norm != json_norm:
            old_text = text
            item[text_field] = txt_content
            if len(txt_content) > len(text):
                label = "텍스트수정(복원)"
            elif len(txt_content) < len(text) - 5:
                label = "텍스트수정(축약)"
            else:
                label = "텍스트수정(공백/오자)"
            report_lines.append(f"  [{label}] [{i}] marker='{get_marker(item)[1]}'")
            report_lines.append(f"    이전({len(old_text)}자): '{old_text[:100]}'")
            report_lines.append(f"    이후({len(txt_content)}자): '{txt_content[:100]}'")
            fix_count += 1

    if no_match_count > 0:
        report_lines.append(f"  [참고] TXT 미매칭 항목: {no_match_count}건 (내용이 너무 짧거나 표 내용 등)")

    return fix_count

# ──────────────────────────────────────────────
# 법/시행령 파일 처리
# ──────────────────────────────────────────────

def process_law_items_recursive(items, txt_index, txt, text_field, report_lines, depth=0):
    """법/시행령 JSON의 중첩 구조 처리"""
    fix_count = 0
    if not isinstance(items, list):
        return fix_count

    for i, item in enumerate(items):
        if not isinstance(item, dict):
            continue

        # 텍스트 필드 처리
        for field in [text_field, 'text', '항내용', '내용', '호내용', '목내용']:
            if field not in item:
                continue
            text = item[field]
            if not isinstance(text, str) or len(normalize(text)) < 10:
                continue

            txt_content = find_best_match(text, txt_index, min_query_len=10)
            if txt_content is None:
                continue

            txt_norm = normalize(txt_content)
            json_norm = normalize(text)

            if not txt_norm.startswith(json_norm[:min(10, len(json_norm))]):
                continue

            if txt_norm != json_norm:
                old_text = text
                item[field] = txt_content
                report_lines.append(f"  [텍스트수정] depth={depth} [{i}] field='{field}'")
                report_lines.append(f"    이전({len(old_text)}자): '{old_text[:100]}'")
                report_lines.append(f"    이후({len(txt_content)}자): '{txt_content[:100]}'")
                fix_count += 1

        # 재귀 처리
        for k, v in item.items():
            if isinstance(v, list):
                fix_count += process_law_items_recursive(v, txt_index, txt, text_field, report_lines, depth + 1)

    return fix_count

# ──────────────────────────────────────────────
# 메인 처리
# ──────────────────────────────────────────────

def process_byultable_file(file_cfg, report_lines):
    """별표 파일 처리"""
    json_path = file_cfg["json"]
    txt_path = file_cfg["txt"]
    text_field = file_cfg.get("text_field", "text")
    list_key = file_cfg.get("json_list_key", "별표내용")

    fname = os.path.basename(json_path)
    report_lines.append(f"\n{'='*60}")
    report_lines.append(f"파일: {fname}")

    if not os.path.exists(json_path):
        report_lines.append(f"  [SKIP] JSON 없음")
        return 0
    if not os.path.exists(txt_path):
        report_lines.append(f"  [SKIP] TXT 없음: {os.path.basename(txt_path)}")
        return 0

    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    txt = load_txt(txt_path)
    txt_index = build_txt_index(txt)

    items = get_items(data, file_cfg)
    if not items:
        report_lines.append(f"  [SKIP] 항목 없음")
        return 0

    report_lines.append(f"  항목 수: {len(items)}, TXT 인덱스: {len(txt_index)}줄")

    total_fixes = 0

    # 1. 소수점 분리 오류
    to_delete, n = fix_decimal_split(items, text_field, txt, report_lines)
    total_fixes += n

    # 소수점 분리된 항목 삭제 (역순)
    for idx in sorted(to_delete, reverse=True):
        items.pop(idx)

    # 2. 텍스트 절단 오류
    n = fix_text_truncation(items, text_field, txt_index, txt, report_lines)
    total_fixes += n

    # 저장
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    report_lines.append(f"  ➤ 총 {total_fixes}건 수정, {len(to_delete)}건 삭제")
    return total_fixes


def process_law_file(file_cfg, report_lines):
    """법/시행령 파일 처리"""
    json_path = file_cfg["json"]
    txt_path = file_cfg["txt"]
    text_field = file_cfg.get("text_field", "항내용")

    fname = os.path.basename(json_path)
    report_lines.append(f"\n{'='*60}")
    report_lines.append(f"파일: {fname}")

    if not os.path.exists(json_path):
        report_lines.append(f"  [SKIP] JSON 없음")
        return 0
    if not os.path.exists(txt_path):
        report_lines.append(f"  [SKIP] TXT 없음")
        return 0

    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    txt = load_txt(txt_path)
    txt_index = build_txt_index(txt)

    report_lines.append(f"  TXT 인덱스: {len(txt_index)}줄")

    fix_count = 0

    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, list):
                fix_count += process_law_items_recursive(v, txt_index, txt, text_field, report_lines)
            elif isinstance(v, str) and len(normalize(v)) >= 10:
                txt_content = find_best_match(v, txt_index)
                if txt_content and txt_content != v and len(txt_content) > len(v) - 5:
                    report_lines.append(f"  [텍스트수정] key='{k}': '{v[:60]}' → '{txt_content[:60]}'")
                    data[k] = txt_content
                    fix_count += 1
    elif isinstance(data, list):
        fix_count += process_law_items_recursive(data, txt_index, txt, text_field, report_lines)

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    report_lines.append(f"  ➤ 총 {fix_count}건 수정")
    return fix_count


def main():
    report_lines = []
    report_lines.append("폐기물관리법 JSON 파싱 오류 수정 결과")
    report_lines.append("=" * 60)
    report_lines.append("처리 일시: 2026-04-21")
    report_lines.append("")

    total_fixes = 0

    for file_cfg in FILE_MAP:
        json_path = file_cfg["json"]
        is_law = ("법/" in json_path or "시행령/" in json_path)

        try:
            if is_law:
                n = process_law_file(file_cfg, report_lines)
            else:
                n = process_byultable_file(file_cfg, report_lines)
            total_fixes += n
        except Exception as e:
            import traceback
            report_lines.append(f"\n[ERROR] {os.path.basename(json_path)}: {e}")
            report_lines.append(traceback.format_exc())

    report_lines.append(f"\n{'='*60}")
    report_lines.append(f"전체 수정 건수: {total_fixes}건")

    result_path = os.path.join(BASE_DIR, "참고자료/파싱오류_수정결과.txt")
    os.makedirs(os.path.dirname(result_path), exist_ok=True)
    with open(result_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))

    # 결과 출력 (stderr로)
    for line in report_lines:
        sys.stderr.write(line + '\n')

    print(f"\n결과 저장 완료: {result_path}")
    print(f"전체 수정 건수: {total_fixes}건")


if __name__ == '__main__':
    main()
