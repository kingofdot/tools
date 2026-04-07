# UI생성테스트 설계 문서
> 압축 메모. 구현 진행하며 계속 업데이트.

---

## 개념
UI관리 탭에서 정의한 메타(metaStore)를 기반으로 실제 UI를 렌더링해서 미리보기.
"이 모델의 입력폼은 실제로 어떻게 생겼나?" 를 바로 확인하는 플레이그라운드.

---

## 레이아웃
```
[왼쪽 패널]          [오른쪽 영역]
- 모델 목록          - 선택 모델의 UI 렌더링
- 뷰 모드 선택       - 실제 폼처럼 인터랙션 가능
```

---

## 뷰 모드 (좌측 선택)
| 모드 | 조건 | 설명 |
|------|------|------|
| 생성폼 | initialCreation = true | 최초 생성 시 입력 폼 |
| 목록뷰 | showNode = true | 테이블/카드 목록 |
| 상세뷰 | showNodeDetail = true | 클릭 후 상세 화면 |

---

## 필드 → 입력 컴포넌트 매핑 (초안)
| variableType / systemType | 렌더 컴포넌트 |
|--------------------------|--------------|
| 미정 / text | `<input type="text">` |
| 미정 / combo | `<select>` (comboboxName 기준) |
| 미정 / date | `<input type="date">` |
| 미정 / number | `<input type="number">` |
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

## 미결 사항 (토론 필요)
- [ ] variableType/systemType 정확한 값 목록 확정
- [ ] comboboxName → 실제 옵션 데이터 어디서 오는가?
- [ ] 외부 모델 참조(dataSource) 렌더 방식 (드롭다운? 검색모달?)
- [ ] 조건부 표시(creationConditions) 문법 정의
- [ ] 레이아웃: 1열 / 2열 / width 기반 자동 배치?
- [ ] 저장 버튼 동작 (실제 API 연결? 더미?)
