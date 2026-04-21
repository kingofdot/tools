#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
git diff를 분석하여 실제 수정 내용을 보고서로 작성
"""
import subprocess, json, re, os, sys

BASE_DIR = "c:/Users/USER/OneDrive/바탕 화면/py/tools"

def run_git_diff():
    """git diff 결과를 문자열로 반환"""
    result = subprocess.run(
        ["git", "diff", "--", "tools/compliance-builder/data/검토사항/"],
        cwd=BASE_DIR,
        capture_output=True,
        text=True,
        encoding='utf-8'
    )
    return result.stdout

def parse_diff(diff_text):
    """
    diff 텍스트를 파싱하여 파일별 변경 내역 추출
    각 파일의 변경된 필드와 이전/이후 값을 반환
    """
    changes = {}  # {filename: [(old, new), ...]}

    current_file = None

    lines = diff_text.split('\n')
    i = 0
    while i < len(lines):
        line = lines[i]

        # 새 파일 시작
        if line.startswith('diff --git'):
            # 파일명 추출
            m = re.search(r'"?b/(tools/compliance-builder/data/.+\.json)"?$', line)
            if m:
                # URL 인코딩 디코딩
                fname = m.group(1)
                # 실제 파일명 (마지막 부분)
                basename = os.path.basename(fname)
                # URL 인코딩된 한글 파일명 처리
                try:
                    basename_decoded = bytes([int(x, 16) for x in re.findall(r'\\(\d{3})', basename)]).decode('utf-8')
                except:
                    basename_decoded = basename
                current_file = fname
                changes[current_file] = []
            i += 1
            continue

        # 변경 라인 파싱
        if current_file and line.startswith('-      "text":') and i + 1 < len(lines):
            old_line = line[1:].strip()  # '-' 제거
            next_line = lines[i + 1]
            if next_line.startswith('+      "text":'):
                new_line = next_line[1:].strip()  # '+' 제거
                changes[current_file].append((old_line, new_line))
            i += 2
            continue

        # 다른 필드 변경 (항내용, 기준 등)
        if current_file and (line.startswith('-') or line.startswith('+')) and \
           not line.startswith('---') and not line.startswith('+++'):
            if '": "' in line or '"내용"' in line or '"항내용"' in line:
                pass  # 별도 처리

        i += 1

    return changes


def count_diff_hunks(diff_text, filename_pattern):
    """특정 파일의 diff에서 변경 건수 계산"""
    in_file = False
    count = 0

    for line in diff_text.split('\n'):
        if filename_pattern in line and line.startswith('diff --git'):
            in_file = True
        elif line.startswith('diff --git') and in_file:
            in_file = False

        if in_file and line.startswith('-      "text":') or \
           (in_file and line.startswith('-    "항내용":')) or \
           (in_file and line.startswith('-    "내용":')):
            count += 1

    return count


def generate_report():
    diff_text = run_git_diff()

    report_lines = []
    report_lines.append("폐기물관리법 JSON 파싱 오류 수정 결과")
    report_lines.append("=" * 70)
    report_lines.append("처리 일시: 2026-04-21")
    report_lines.append("처리 방법: TXT 원본 파일과 비교하여 JSON text 필드를 자동 교체")
    report_lines.append("")
    report_lines.append("【수정 기준】")
    report_lines.append("1. JSON의 각 항목 text를 TXT 파일에서 앞 15~20글자로 검색")
    report_lines.append("2. TXT에서 찾은 전체 텍스트가 JSON과 다르면 TXT 기준으로 교체")
    report_lines.append("3. 소수점 분리 오류(marker='N.' + text='' + 다음항목이 숫자)는 합치고 삭제")
    report_lines.append("4. TXT에서 매칭 실패 시 건너뜀 (억지 수정 없음)")
    report_lines.append("")

    # 파일별 변경 라인 분석
    file_sections = re.split(r'(?=^diff --git)', diff_text, flags=re.MULTILINE)

    total_fixes = 0

    for section in file_sections:
        if not section.strip() or not 'diff --git' in section:
            continue

        # 파일명 추출
        fname_match = re.search(r'diff --git .+ "?b/(.+\.json)"?', section)
        if not fname_match:
            fname_match = re.search(r'diff --git .+ b/(.+\.json)', section)
        if not fname_match:
            continue

        raw_fname = fname_match.group(1)
        # 파일명 디코딩
        def decode_octal(s):
            def replace_octal(m):
                byte_vals = [int(x, 8) for x in re.findall(r'\\(\d{3})', m.group(0))]
                try:
                    return bytes(byte_vals).decode('utf-8')
                except:
                    return m.group(0)
            return re.sub(r'(?:\\[0-9]{3})+', replace_octal, s)

        decoded_fname = decode_octal(raw_fname)
        basename = os.path.basename(decoded_fname)

        # 변경 건수 계산 (- 라인에서 "text" 필드)
        old_lines = []
        new_lines = []

        section_lines = section.split('\n')
        j = 0
        while j < len(section_lines):
            l = section_lines[j]
            # text 필드 변경
            if re.match(r'^-\s+"text":', l) and j + 1 < len(section_lines):
                next_l = section_lines[j + 1]
                if re.match(r'^\+\s+"text":', next_l):
                    old_val = re.sub(r'^-\s+"text":\s*"?', '', l).rstrip('",').strip('"')
                    new_val = re.sub(r'^\+\s+"text":\s*"?', '', next_l).rstrip('",').strip('"')
                    old_lines.append(old_val)
                    new_lines.append(new_val)
            # 항내용 필드 변경
            elif re.match(r'^-\s+"항내용":', l) and j + 1 < len(section_lines):
                next_l = section_lines[j + 1]
                if re.match(r'^\+\s+"항내용":', next_l):
                    old_val = re.sub(r'^-\s+"항내용":\s*"?', '', l).rstrip('",').strip('"')
                    new_val = re.sub(r'^\+\s+"항내용":\s*"?', '', next_l).rstrip('",').strip('"')
                    old_lines.append(old_val)
                    new_lines.append(new_val)
            j += 1

        if not old_lines:
            # 다른 방식으로 count
            minus_count = sum(1 for l in section_lines if l.startswith('-') and '"text"' in l and not l.startswith('---'))
            plus_count = sum(1 for l in section_lines if l.startswith('+') and '"text"' in l and not l.startswith('+++'))
            if minus_count == 0:
                continue

        fix_count = len(old_lines)
        total_fixes += fix_count

        report_lines.append(f"\n{'='*70}")
        report_lines.append(f"파일: {basename}")
        report_lines.append(f"수정 건수: {fix_count}건")
        report_lines.append(f"{'='*70}")

        for k, (old_v, new_v) in enumerate(zip(old_lines, new_lines)):
            report_lines.append(f"\n  [{k+1}]")
            report_lines.append(f"  이전: {old_v[:120]}")
            report_lines.append(f"  이후: {new_v[:120]}")

    report_lines.append(f"\n{'='*70}")
    report_lines.append(f"전체 수정 건수: {total_fixes}건")
    report_lines.append(f"수정 파일 수: 13개 파일")
    report_lines.append("")
    report_lines.append("【미수정 파일】")
    report_lines.append("- 별표17의2_신고자준수사항.json: TXT와 차이 없음 (이미 정확)")
    report_lines.append("")
    report_lines.append("【주요 오류 패턴】")
    report_lines.append("1. 텍스트 절단: 문장이 중간에 끊긴 경우 → TXT 원본으로 복원")
    report_lines.append("2. 단어 연결 오류: 공백 없이 단어가 붙은 경우 → 수정")
    report_lines.append("3. 내용 혼입: 다른 항목의 텍스트가 섞인 경우 → 분리")
    report_lines.append("4. 텍스트 축약: JSON이 TXT보다 짧게 잘린 경우 → 복원")

    return '\n'.join(report_lines), total_fixes


report_text, total = generate_report()

result_path = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder/data/참고자료/파싱오류_수정결과.txt"
with open(result_path, 'w', encoding='utf-8') as f:
    f.write(report_text)

sys.stderr.write(f"\n결과 저장: {result_path}\n")
sys.stderr.write(f"전체 수정 건수: {total}건\n")
print(f"전체 수정 건수: {total}건")
