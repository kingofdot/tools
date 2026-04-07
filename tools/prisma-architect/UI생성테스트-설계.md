# UI생성테스트 설계 문서
> 압축 메모. 구현 진행하며 계속 업데이트.

---

## 개념
UI관리 탭에서 정의한 메타(metaStore)를 기반으로 실제 UI를 렌더링해서 미리보기.
"이 모델의 입력폼은 실제로 어떻게 생겼나?" 를 바로 확인하는 플레이그라운드.

---

## 데이터 소스
- **DB 스키마(schema.models) 아님**
- **UI관리의 metaStore가 소스** — metaStore에 등록된 모델만 표시
- 즉, UI관리 탭에서 필드 설정을 마쳐야 생성테스트에서 보임

---

## 레이아웃
```
[왼쪽 패널]                    [오른쪽 영역]
- UI관리 모델 목록              - 체크된 모델들의 UI 렌더링
  ☑ ModelA                    - 뷰 모드에 따라 다르게 표시
  ☑ ModelB
  ☐ ModelC
- 뷰 모드 선택 (생성/목록/상세)
```

---

## 핵심 동작
1. 왼쪽: metaStore에 등록된 모델 목록 + **체크박스**
2. 체크된 모델만 우측에 렌더링
3. 뷰 모드 (생성폼 / 목록뷰 / 상세뷰) 선택 → 해당 조건 필드만 표시

---

## 뷰 모드 (우측 상단 선택)
| 모드 | 조건 필드 | 설명 |
|------|-----------|------|
| 생성폼 | initialCreation = true | 최초 생성 시 입력 폼 |
| 목록뷰 | showNode = true | 테이블/카드 목록 |
| 상세뷰 | showNodeDetail = true | 클릭 후 상세 화면 |

---

## 필드 → 입력 컴포넌트 매핑 (초안, 확정 필요)
| variableType / systemType | 렌더 컴포넌트 |
|--------------------------|--------------|
| text | `<input type="text">` |
| combo | `<select>` (comboboxName 기준) |
| date | `<input type="date">` |
| number / int / float | `<input type="number">` |
| bool | true/false `<select>` |
| dataSource 있음 | 외부 모델 참조 → 드롭다운 또는 검색 |

---

## metaStore 활용 필드
- `label` → 라벨 텍스트
- `commentary` → 설명/placeholder
- `isRequired` → 필수 표시 (*)
- `width` → 컴포넌트 너비
- `comboboxName` → 콤보박스 옵션 그룹명
- `dataSource` → 외부 모델 참조
- `creationConditions` → 조건부 표시 (추후)
- `fnTriggerEvent/fnName` → 이벤트 함수 연결 (추후)

---

## 워크플로우
```
UI관리 탭에서 모델 필드 메타 설정
    ↓
UI생성테스트 탭으로 이동
    ↓
왼쪽에서 보고 싶은 모델 체크
    ↓
뷰 모드 선택 (생성/목록/상세)
    ↓
우측에서 실제 UI 미리보기
    ↓
(반복) 맘에 안들면 UI관리로 돌아가 수정
```

---

## 미결 사항 (토론 필요)
- [ ] variableType 정확한 값 목록 확정 (사용자가 전달 예정)
- [ ] comboboxName → 실제 옵션 데이터 어디서 오는가?
- [ ] 외부 모델 참조(dataSource) 렌더 방식 (드롭다운? 검색모달?)
- [ ] 조건부 표시(creationConditions) 문법 정의
- [ ] 레이아웃: 1열 / 2열 / width 기반 자동 배치?
- [ ] 체크된 모델 여러 개일 때 우측 배치 방식 (탭? 순서대로 쌓기?)
- [ ] 저장 버튼 동작 (실제 API 연결? 더미?)
