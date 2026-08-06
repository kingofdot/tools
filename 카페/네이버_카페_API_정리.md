# 네이버 카페 API — 글쓰기 정리 (탐색 메모)

목표: 네이버 카페 게시판에 **프로그램으로 글 올리기**. 아래는 공식 문서(developers.naver.com/docs/login/cafe-api)와 여러 구현 사례를 종합한 정리.

---

## 1. 제공되는 카페 오픈 API (2종)

| API | 메서드 | 인증 | URL |
|---|---|---|---|
| 특정 카페 가입하기 | POST | 필요 | `https://openapi.naver.com/v1/cafe/{clubid}/members` |
| **카페 게시판에 글 쓰기** | POST | 필요 | `https://openapi.naver.com/v1/cafe/{clubid}/menu/{menuid}/articles` |

- 둘 다 **로그인 오픈 API**(사용자 access token 필요). 검색 API처럼 Client ID/Secret만으로는 안 됨.

---

## 2. 인증 구조 (중요)

카페 글쓰기는 **네이버 아이디로 로그인(OAuth 2.0)** 기반. 흐름:

```
① 애플리케이션 등록 (Client ID / Client Secret 발급)
② 사용자 동의 → 인가코드(code) 받기
③ 인가코드 → access_token 교환
④ access_token 을 헤더에 실어 카페 글쓰기 호출
```

### 2-1. 인가코드 받기 (사용자 브라우저)
```
GET https://nid.naver.com/oauth2.0/authorize
    ?response_type=code
    &client_id={CLIENT_ID}
    &redirect_uri={ENCODED_REDIRECT_URI}
    &state={임의문자열}
```
→ 동의 후 `redirect_uri?code=...&state=...` 로 리다이렉트. 이 `code`를 사용.

### 2-2. access_token 교환
```
GET https://nid.naver.com/oauth2.0/token
    ?grant_type=authorization_code
    &client_id={CLIENT_ID}
    &client_secret={CLIENT_SECRET}
    &code={인가코드}
    &state={2-1과 동일 state}
```
→ JSON 응답: `access_token`, `refresh_token`, `token_type=bearer`, `expires_in`(초, 보통 3600).
- access_token 만료 시 `grant_type=refresh_token` 으로 갱신.

### 2-3. 호출 헤더
```
Authorization: Bearer {access_token}
```

---

## 3. 글쓰기 API 상세

- **엔드포인트**: `POST https://openapi.naver.com/v1/cafe/{clubid}/menu/{menuid}/articles`
- **Content-Type**: `application/x-www-form-urlencoded`
- **바디 파라미터**:

| 파라미터 | 필수 | 설명 |
|---|---|---|
| `subject` | ✅ | 글 제목. **URL 인코딩(UTF-8) 필수** |
| `content` | ✅ | 글 본문(HTML 가능). **URL 인코딩(UTF-8) 필수** |
| `openyn` | ❌ | 공개여부. `true`=전체공개, 미지정/`false`=회원공개 |

- **응답**: **JSON**(문서엔 XML이라 되어 있으나 실제 JSON 반환). 성공 예:
  ```json
  {"message":{"status":"200","result":{"msg":"Success","cafeUrl":"seodaericom","articleId":2,"articleUrl":"https://cafe.naver.com/seodaericom/2"}}}
  ```
  → `result.articleUrl` 에 생성된 글 링크. 인증 실패 시 `{"errorCode":"028",...}`.
- **실측 확인(2026-08-06)**: clubid `31762412`(서대리 카페) 자유게시판(menuid 1) 글쓰기 성공. 한글 안 깨짐(UTF-8 quote).

### ⚠️ 한글 깨짐 이슈
- `subject`, `content`는 반드시 `urllib.parse.quote()` 로 **UTF-8 URL 인코딩**해서 바디에 넣는다. 인코딩 안 하면 한글이 깨져서 올라감(가장 흔한 실수).

---

## 4. clubid / menuid 확인 방법

- **clubid**: 카페의 숫자 고유 ID. 카페관리 페이지 URL이나 카페 소스에서 `clubid=` 값으로 확인. (내가 관리자/회원인 카페여야 글쓰기 가능)
- **menuid**: 글을 올릴 **게시판 ID**. 카페관리 → 메뉴 관리, 또는 해당 게시판 URL의 `menuid=` 파라미터로 확인.
- 두 값은 앱이 아니라 **대상 카페/게시판**에 종속. 카페마다 다름.

---

## 5. 이미지 첨부 (미확정 — 검증 필요)

- 공식 문서에 이미지 첨부 스펙이 명확히 안 나와 있음. 사례상 `multipart/form-data`로 `image` 파트를 함께 보내는 시도가 있으나 성공/실패 사례가 갈림.
- **1차 목표는 텍스트(HTML content) 글쓰기로 잡고**, 이미지가 필요하면 (a) 본문 HTML에 외부 이미지 URL `<img>` 삽입, (b) multipart image 파트, 두 방법을 실제로 테스트해 확인할 것.

---

## 6. 사전 준비 체크리스트

- [ ] developers.naver.com 에서 **애플리케이션 등록** → Client ID/Secret 발급
- [ ] 애플리케이션에 **"네이버 아이디로 로그인" + "카페" API 사용 추가**(이용신청)
- [ ] **redirect URI** 등록 (예: `http://localhost:8080/callback`)
- [ ] 글 올릴 **카페에 내 계정이 가입**되어 있고 글쓰기 권한(등업 등) 충족
- [ ] 대상 **clubid, menuid** 확보
- [ ] OAuth로 **access_token** 발급

---

## 7. 최소 동작 파이썬 뼈대 (텍스트 글쓰기)

> access_token은 2절 흐름으로 미리 발급해 둔 값을 사용.

```python
import urllib.request, urllib.parse

ACCESS_TOKEN = "발급받은_토큰"
CLUBID = "카페clubid"
MENUID = "게시판menuid"

subject = "테스트 제목"
content = "안녕하세요. API 테스트 글입니다.<br>둘째 줄."

url = f"https://openapi.naver.com/v1/cafe/{CLUBID}/menu/{MENUID}/articles"
# 반드시 UTF-8 URL 인코딩
data = "subject=" + urllib.parse.quote(subject) \
     + "&content=" + urllib.parse.quote(content) \
     + "&openyn=true"

req = urllib.request.Request(url, data=data.encode("utf-8"))
req.add_header("Authorization", "Bearer " + ACCESS_TOKEN)
req.add_header("Content-Type", "application/x-www-form-urlencoded")

resp = urllib.request.urlopen(req)
print(resp.getcode())
print(resp.read().decode("utf-8"))   # XML 응답
```

### access_token 발급 헬퍼(2-2) 뼈대
```python
import urllib.request, urllib.parse, json

def get_token(client_id, client_secret, code, state):
    url = "https://nid.naver.com/oauth2.0/token?" + urllib.parse.urlencode({
        "grant_type": "authorization_code",
        "client_id": client_id,
        "client_secret": client_secret,
        "code": code,
        "state": state,
    })
    return json.load(urllib.request.urlopen(url))   # access_token 포함
```

---

## 8. 주의/제약

- access_token 만료 짧음(≈1시간). 반복 작업이면 refresh_token 갱신 로직 필요.
- 글쓰기는 **해당 카페 가입·권한** 있는 계정만. 스팸/도배는 카페·네이버 정책 위반.
- subject/content 인코딩(UTF-8 quote) 안 하면 한글 깨짐.
- 응답이 XML이므로 파싱 시 `xml.etree.ElementTree` 사용.
- 이미지 첨부는 실제 테스트로 검증 필요(5절).

---

### 참고 출처
- 네이버 개발자센터 카페 API 문서: developers.naver.com/docs/login/cafe-api/cafe-api.md
- 네이버 오픈API 목록: naver.github.io/naver-openapi-guide/apilist.html
- 구현 사례: velog(@rkfksh Postman 정복기), blog.hangyeong.com/1360, OKKY 392250(이미지)
