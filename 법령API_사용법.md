# 국가법령정보 OPEN API 사용법

본 저장소의 도구들이 사용하는 [국가법령정보 OPEN API](https://www.law.go.kr/) 호출 규칙 정리.

## OC 키

본 프로젝트의 OC 값: **`123`**

코드 내 박혀있는 위치 (참고용):
- `tools/study-notes/js/lawapi.js:17` — `const OC = '123';`
- `tools/law-api-browser/index.html` — `<input id="ocInput">` 에 사용자가 입력 (localStorage에 저장)

> OC 는 국가법령정보 OPEN API 사용자 식별값. 없으면 `사용자 정보 검증에 실패하였습니다` 응답.

---

## 엔드포인트

### 1) 법령 검색

```
https://www.law.go.kr/DRF/lawSearch.do
  ?OC=123
  &target=law
  &type=JSON|XML
  &search=1            # 1=법령명, 2=본문 검색
  &display=20
  &query=폐기물관리법
```

응답 (XML 예시):
```xml
<LawSearch>
  <law id="2">
    <법령일련번호>276797</법령일련번호>   <!-- MST -->
    <법령ID>001771</법령ID>                <!-- LID -->
    <법령명한글><![CDATA[폐기물관리법]]></법령명한글>
    <시행일자>20260326</시행일자>
    ...
  </law>
</LawSearch>
```

- `법령일련번호(MST)`: 본문 호출 시 사용 (시행 시점 특정 가능)
- `법령ID(LID)`: 항상 같은 법령을 가리키는 영구 ID

**주의**: `search=1` 인데도 부분 일치로 잡힐 수 있음. 정확한 매칭은 클라이언트에서 `법령명한글` 비교 필요. 예: `폐기물관리법` 검색 시 `방사성폐기물 관리법` 도 결과에 포함됨.

### 2) 법령 본문

```
https://www.law.go.kr/DRF/lawService.do
  ?OC=123
  &target=eflaw        # eflaw = 시행일자 기준 (현행)
  &type=JSON|XML
  &MST=276797          # 또는 ID=001771
  &JO=003300           # 6자리 조 코드 (옵션) — 미지정 시 전체 본문
  &efYd=20260326       # 시행일자 (옵션, MST 와 함께 쓸 때)
```

#### JO 파라미터 형식 (6자리)

```
NNNN  XX
조번호 가지번호
```

- 4자리 조번호 + 2자리 가지번호
- 예시:
  - 제33조        → `003300`
  - 제13조의2     → `001302`
  - 제2조의2      → `000202`

---

## Node 에서 호출 예제

```js
const fs = require('fs');
const https = require('https');

function fetch(url) {
  return new Promise((res, rej) => {
    https.get(url, r => {
      let d = ''; r.on('data', c => d += c); r.on('end', () => res(d));
    }).on('error', rej);
  });
}

(async () => {
  // 1) 검색 — 정확 매칭 필터
  const sUrl = 'https://www.law.go.kr/DRF/lawSearch.do?OC=123&target=law&type=XML&search=1&query=' + encodeURIComponent('폐기물관리법');
  const xml = await fetch(sUrl);
  const blocks = xml.split(/<law id=/);
  let mst;
  for (const b of blocks) {
    const nm = (b.match(/<법령명한글><!\[CDATA\[([^\]]+)\]/) || [])[1];
    if (nm === '폐기물관리법') {
      mst = (b.match(/<법령일련번호>(\d+)</) || [])[1];
      break;
    }
  }

  // 2) 제33조 본문 (JO=003300)
  const bUrl = `https://www.law.go.kr/DRF/lawService.do?OC=123&target=eflaw&type=JSON&MST=${mst}&JO=003300`;
  const json = JSON.parse(await fetch(bUrl));
  const art = json.법령.조문.조문단위;   // 단일 조 호출 시 객체, 전체 호출 시 배열
  console.log(art.조문제목);              // "권리ㆍ의무의 승계 등"
  art.항.forEach(h => console.log(h.항번호, h.항내용.slice(0, 50)));
})();
```

브라우저(CORS) 사용은 `tools/law-api-browser/index.html` 참고.

---

## 응답 구조 (본문 JSON)

```
{
  "법령": {
    "법령키": "0017712026032621065",
    "기본정보": {
      "법령명_한글": "폐기물관리법",
      "법령ID": "001771",
      "법령일련번호": "276797",
      "시행일자": "20260326",
      "공포번호": "21065",
      ...
    },
    "조문": {
      "조문단위": [           // 또는 단일 호출 시 object
        {
          "조문번호": "33",
          "조문가지번호": "",   // "2" 등 (의N)
          "조문제목": "권리ㆍ의무의 승계 등",
          "조문내용": "제33조(권리ㆍ의무의 승계 등)",
          "조문시행일자": "20260326",
          "조문여부": "조문",   // "조문" | "전문" 등
          "항": [
            {
              "항번호": "① ",
              "항내용": "①...",
              "호": [
                { "호번호": "1.", "호내용": "1. ..." }
              ]
            }
          ]
        }
      ]
    },
    "부칙": { ... },
    "별표": { ... }
  }
}
```

- `조문단위`: 단일 JO 호출 시 객체, 전체 호출 시 배열
- 단일 조항 내 `항`은 객체일 수도 배열일 수도 있음 (1개일 때 객체) — 항상 배열로 정규화 권장
- `호`도 동일

---

## 자주 쓰는 법령 MST/LID (현행, 2026-03-26 시행 기준)

| 법령명 | MST | LID |
|---|---|---|
| 폐기물관리법 | 276797 | 001771 |
| 폐기물관리법 시행령 | — | — |
| 폐기물관리법 시행규칙 | — | 008567 |

(필요 시 검색 API로 매번 최신 MST 확인 권장)

---

## 트러블슈팅

- **`{}` 빈 응답 (JSON)**: 잘 안됨. XML 로 시도해 보세요 (`type=XML`).
- **`사용자 정보 검증에 실패하였습니다`**: OC 누락 또는 잘못된 값.
- **부분 매칭 노이즈**: `search=1` 도 substring 매칭. 클라이언트에서 `법령명한글 === '<원하는 이름>'` 으로 필터.
- **CORS** (브라우저): `law.go.kr` 가 CORS 허용. `Accept: application/json` 헤더로 호출.
