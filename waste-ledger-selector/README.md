# waste-ledger-selector

폐기물 **업종·신고 선택 → 써야 할 대장(별지서식) 출력** 프로그램용 DB.

- 데이터: [data.json](data.json)
- 출처: 국가법령정보 OPEN API(law.go.kr) — 폐기물관리법(MST 276797) / 시행규칙(MST 287445)
- 근거 사슬: **법 제36조 → 시행규칙 제58조 제1항 → 별지서식**

## 데이터 구조

```
{
  "meta":   { 법령 출처, 근거, retention/allbaro 규칙, schema 설명 },
  "forms":  { form_id → 별지서식 상세(번호·명칭·종류·다운로드 URL·시행일) },
  "subjects": [ 업종·신고 주체(=사용자 선택지) ]
}
```

### subjects[] (선택지)
| 필드 | 설명 |
|---|---|
| `id` | 고유 키 |
| `group` | 대분류(UI 그룹핑용) — 배출자·신고 / 공동처리 운영기구 / 폐기물처리업(법 제25조 허가) / 폐기물처리시설 설치·관리자 / 기타 업·제조 |
| `label` | 화면 표시 명칭 |
| `trigger` | `{kind: 허가/신고/확인, basis: 근거 조문}` |
| `rule58` | 시행규칙 제58조 내 위치 |
| `retention_years` | 보존기간(년) — 대부분 3, 음식물류 발생억제신고자만 2 |
| `allbaro_required` | `true`=올바로 의무입력 / `false`=대상아님 / `null`=처리업 겸영 여부에 따라 |
| `branches` | (선택) 추가 질문. 있으면 답변받아 `ledgers` 필터 |
| `ledgers` | 사용 대장 목록. 각 항목 `{form, required, when?, note?}` |

### ledgers[].when (조건 분기)
- 키가 **없으면** 항상 포함.
- `{"branch":"recycle_type","value":"r7"}` 처럼 있으면 → 해당 branch 답변이 그 value일 때만 포함.
- 예: 재활용업/처리신고자는 `recycle_type` 질문(일반 vs R-7)에 따라 45호 또는 45호의2 중 택1.

### forms{} (출력 대상)
```json
"40": {
  "no": "제40호",
  "name": "폐기물 중간처분시설 운영·관리대장",
  "kind": "시설운영·관리대장",
  "download_url": "https://www.law.go.kr/LSW/flDownload.do?flSeq=...",
  "form_effective": "20260622"
}
```

## 사용(resolve) 로직

```js
function resolveLedgers(db, subjectId, answers = {}) {
  const s = db.subjects.find(x => x.id === subjectId);
  const forms = s.ledgers
    .filter(l => !l.when || answers[l.when.branch] === l.when.value)
    .map(l => ({ ...db.forms[l.form], note: l.note }));
  return {
    subject: s.label,
    basis: s.trigger.basis,
    retention_years: s.retention_years,
    allbaro_required: s.allbaro_required,
    forms,                 // 출력할 대장 목록(다운로드 URL 포함)
    notes: s.notes || [],
  };
}
```

동작:
1. `subjects` 를 `group` 별로 묶어 선택 UI 렌더.
2. 선택한 subject 에 `branches` 가 있으면 그 질문을 추가로 물어 `answers` 채움.
3. `resolveLedgers()` 로 최종 대장 목록 + 다운로드 링크 + 보존/올바로 안내 출력.

## 예시 결과

- **폐기물 중간처분업자** 선택 → 제39호(중간처분대장) + 제40호(중간처분시설 운영·관리대장), 보존 3년, 올바로 의무 ○
- **폐기물 재활용업자** 선택 → 질문(일반/R-7) → 일반이면 제45호, R-7이면 제45호의2

## 참고
- `21-9`(검사기관 관리대장)은 국립환경과학원장 관리 서식이라 subjects 에서 제외(`admin_forms_note` 참조).
- 원문 해설: [../폐기물관리법_업종별_대장_완전정리.md](../폐기물관리법_업종별_대장_완전정리.md)
