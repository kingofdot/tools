# -*- coding: utf-8 -*-
"""
fill_na_law.py — 법/시행령 JSON subject·condition 태그 기반 "해당사항 없음" 처리기

태그 체계:
  "subject": ["S-신고", ...]  → 해당 subject에 속하지 않으면 "해당사항 없음"
                               태그 없음 = 전체 공통 (누구든지)
  "condition": "의료폐기물취급" → selected_conditions에 없으면 "해당사항 없음"
  계층 상속: 항 subject 없으면 조문 레벨 subject 상속

사용 예시:
  python scripts/fill_na_law.py \\
    --subject S-허가-ID S-허가-FD \\
    --condition 지정폐기물100톤이상 \\
    --output 출력.json

  python scripts/fill_na_law.py --list-subjects   # 사용 가능한 subject 목록 출력

subject ID 목록 (준수사항_적용범위.json 기준):
  S-허가-TR       폐기물 수집·운반업 허가자
  S-허가-RTR      재활용 가능 폐기물 수집·운반업 허가자
  S-허가-ID       폐기물 중간처분업 허가자
  S-허가-FD       폐기물 최종처분업 허가자
  S-허가-RCY      폐기물 재활용업 허가자
  S-신고          폐기물처리 신고자
  S-자가처리-배출자 사업장폐기물 자가처리 배출자
  S-생활-처리자    생활폐기물 처리자 (지자체 등)
  S-중간가공       중간가공폐기물 처리자

condition 목록:
  의료폐기물취급          의료폐기물을 취급하는 경우
  화재폭발위험폐기물취급   장관 고시 화재·폭발·유독가스 우려 폐기물 취급
  지정폐기물100톤이상      지정폐기물을 연간 100톤 이상 배출하는 경우
"""

import json
import copy
import argparse
import sys
import io
from pathlib import Path

if hasattr(sys.stdout, "buffer"):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = Path(__file__).resolve().parent.parent
LAW_DIR = BASE / "data" / "검토사항" / "법"
령_DIR = BASE / "data" / "검토사항" / "시행령"

SUBJECT_LABELS = {
    "S-허가-TR":       "폐기물 수집·운반업 허가자",
    "S-허가-RTR":      "재활용 가능 폐기물 수집·운반업 허가자",
    "S-허가-ID":       "폐기물 중간처분업 허가자",
    "S-허가-FD":       "폐기물 최종처분업 허가자",
    "S-허가-RCY":      "폐기물 재활용업 허가자",
    "S-신고":          "폐기물처리 신고자",
    "S-자가처리-배출자": "사업장폐기물 자가처리 배출자",
    "S-생활-처리자":    "생활폐기물 처리자 (지자체 등)",
    "S-중간가공":       "중간가공폐기물 처리자",
}

CONDITION_LABELS = {
    "의료폐기물취급":        "의료폐기물을 취급하는 경우",
    "화재폭발위험폐기물취급": "장관 고시 화재·폭발·유독가스 우려 폐기물 취급",
    "지정폐기물100톤이상":   "지정폐기물을 연간 100톤 이상 배출하는 경우",
}

NA = "해당사항 없음"


def _matches(node, selected_subjects, selected_conditions, parent_subject):
    """해당 항/호/목이 선택된 subject/condition 에 매칭되는지 반환."""
    node_subject = node.get("subject", parent_subject)
    node_condition = node.get("condition")

    # subject 체크: 태그 없으면 전체 공통(통과), 있으면 교집합 확인
    if node_subject and not any(s in selected_subjects for s in node_subject):
        return False, node_subject

    # condition 체크: 태그 없으면 통과, 있으면 selected_conditions 에 포함 여부
    if node_condition and node_condition not in selected_conditions:
        return False, node_subject

    return True, node_subject


def _process_children(node, selected_subjects, selected_conditions, effective_subject):
    """항·호·목 재귀 처리. node 를 in-place 변경."""
    for child_key in ("항", "호", "목"):
        for child in node.get(child_key, []):
            matched, child_eff_subj = _matches(
                child, selected_subjects, selected_conditions, effective_subject
            )
            if not matched:
                child["_na"] = True
                child.pop("_na_reason", None)
            else:
                child.pop("_na", None)
            # 재귀
            _process_children(child, selected_subjects, selected_conditions, child_eff_subj)


def process_document(doc, selected_subjects, selected_conditions):
    """조문 JSON 전체를 처리하여 _na 플래그를 부여한 복사본 반환."""
    doc = copy.deepcopy(doc)
    doc_subject = doc.get("subject")  # 조문 레벨 subject

    for 항 in doc.get("항", []):
        matched, eff_subj = _matches(항, selected_subjects, selected_conditions, doc_subject)
        if not matched:
            항["_na"] = True
        else:
            항.pop("_na", None)
        _process_children(항, selected_subjects, selected_conditions, eff_subj)

    return doc


def render_item(node, level=0, prefix=""):
    """단일 항/호/목 노드를 텍스트로 렌더링."""
    indent = "  " * level
    is_na = node.get("_na", False)

    # 번호 결정
    번호_key = next((k for k in ("항번호", "호번호", "목번호") if k in node), None)
    번호 = node.get(번호_key, "")

    원문 = node.get("항내용") or node.get("호내용") or node.get("목내용") or ""
    answer = NA if is_na else (node.get("answer") or "")

    lines = []
    lines.append(f"{indent}[{번호}] {원문[:80]}{'...' if len(원문) > 80 else ''}")
    lines.append(f"{indent}  → {answer if answer else '(답변 미작성)'}")

    for child_key in ("호", "목"):
        for child in node.get(child_key, []):
            lines.extend(render_item(child, level + 1))

    return lines


def render_document(doc):
    """조문 전체를 텍스트로 렌더링."""
    lines = []
    title = f"제{doc.get('조문번호', '')}{'의'+doc['조문가지번호'] if doc.get('조문가지번호') else ''}조 {doc.get('조문제목', '')}"
    lines.append("=" * 60)
    lines.append(title)
    lines.append("=" * 60)

    for 항 in doc.get("항", []):
        lines.extend(render_item(항))
        lines.append("")

    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="법/시행령 JSON 해당없음 처리기")
    parser.add_argument("--subject", nargs="*", default=[], metavar="S-ID",
                        help="선택된 subject ID 목록 (예: S-허가-ID S-신고)")
    parser.add_argument("--condition", nargs="*", default=[], metavar="COND",
                        help="해당하는 condition 목록 (예: 의료폐기물취급 지정폐기물100톤이상)")
    parser.add_argument("--file", nargs="*", default=[], metavar="PATH",
                        help="처리할 JSON 파일 경로 (미지정 시 법+시행령 전체)")
    parser.add_argument("--output", metavar="PATH",
                        help="처리 결과 JSON 저장 경로 (미지정 시 stdout 텍스트 출력)")
    parser.add_argument("--list-subjects", action="store_true",
                        help="사용 가능한 subject 및 condition 목록 출력 후 종료")
    args = parser.parse_args()

    if args.list_subjects:
        print("▶ Subject ID 목록:")
        for k, v in SUBJECT_LABELS.items():
            print(f"  {k:<22} {v}")
        print()
        print("▶ Condition 목록:")
        for k, v in CONDITION_LABELS.items():
            print(f"  {k:<26} {v}")
        return

    selected_subjects = set(args.subject)
    selected_conditions = set(args.condition)

    # 대상 파일 수집
    if args.file:
        paths = [Path(p) for p in args.file]
    else:
        paths = sorted(LAW_DIR.glob("*.json")) + sorted(령_DIR.glob("*.json"))

    results = []
    for path in paths:
        doc = json.loads(path.read_text(encoding="utf-8"))
        processed = process_document(doc, selected_subjects, selected_conditions)
        results.append(processed)

    if args.output:
        out_path = Path(args.output)
        out_path.write_text(
            json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        print(f"저장 완료: {out_path}")
    else:
        for doc in results:
            print(render_document(doc))
            print()


if __name__ == "__main__":
    main()
