# Tool Collection

서로 다른 성격의 HTML 툴을 한 저장소에서 관리하고, GitHub에 push하면 GitHub Pages에 바로 반영되도록 만든 시작 구조입니다.

## 폴더 구조

```text
.
├─ index.html
├─ tools/
│  └─ document-builder/
│     └─ index.html
│  └─ item-builder/
│     └─ index.html
│  └─ magic-builder/
│     └─ index.html
└─ .github/
   └─ workflows/
      └─ deploy-pages.yml
```

## 새 툴 추가 방법

1. `tools/새-툴-이름/index.html` 생성
2. 필요하면 HTML의 `<head>`에 아래 메타 태그 추가
3. GitHub 저장소에 push

```html
<meta name="tool-name" content="Item Builder">
<meta name="tool-tag" content="Item">
<meta name="tool-description" content="아이템 데이터와 정의를 편집하는 툴">
```

메타 태그가 없으면 폴더명과 기본 설명으로 자동 등록됩니다.

## GitHub Pages 연결 순서

1. 이 폴더를 Git 저장소로 초기화
2. GitHub에 새 저장소 생성
3. 원격 저장소 연결 후 `main` 브랜치 push
4. GitHub 저장소의 `Settings > Pages`에서 `Build and deployment`가 `GitHub Actions`인지 확인

## 추천 운영 방식

- 툴 하나당 폴더 하나
- 툴 내부에 필요한 `css`, `js`, `assets`도 해당 툴 폴더 안에 같이 보관
- 이름 충돌 방지를 위해 URL 슬러그는 영어 소문자와 하이픈 사용
- 공용 소개 페이지는 루트 `index.html`에서 자동 목록을 읽어 표시
- `scripts/build-tool-catalog.ps1`가 `tools/*/index.html`을 스캔해 `tools/catalog.json`을 생성

## 참고

현재 `document_builder_v3.html` 원본은 그대로 두고, 배포용 경로는 `tools/document-builder/index.html`로 복사해두었습니다.
