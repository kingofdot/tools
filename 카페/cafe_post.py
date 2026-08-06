# -*- coding: utf-8 -*-
# 네이버 카페 글쓰기 유틸. config.local.py(비밀, git제외)에서 토큰/카페정보 로드.
# 사용: post_article(menuid, subject, content, openyn=False)
# 인코딩: 카페 API가 본문을 EUC-KR로 해석 -> subject/content를 euc-kr로 percent-encode 해야 한글 안 깨짐.
import urllib.request, urllib.parse, json, os, io, sys, re
import importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
CFG_PATH = os.path.join(HERE, "config.local.py")

def load_cfg():
    spec = importlib.util.spec_from_file_location("cfg", CFG_PATH)
    m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
    return m

def _save_tokens(access, refresh):
    txt = open(CFG_PATH, encoding="utf-8").read()
    txt = re.sub(r'ACCESS_TOKEN = ".*?"',  f'ACCESS_TOKEN = "{access}"',  txt)
    if refresh:
        txt = re.sub(r'REFRESH_TOKEN = ".*?"', f'REFRESH_TOKEN = "{refresh}"', txt)
    open(CFG_PATH, "w", encoding="utf-8").write(txt)

def refresh_token():
    cfg = load_cfg()
    url = "https://nid.naver.com/oauth2.0/token?" + urllib.parse.urlencode({
        "grant_type": "refresh_token",
        "client_id": cfg.CLIENT_ID, "client_secret": cfg.CLIENT_SECRET,
        "refresh_token": cfg.REFRESH_TOKEN,
    })
    j = json.load(urllib.request.urlopen(url, timeout=15))
    if "access_token" in j:
        _save_tokens(j["access_token"], j.get("refresh_token"))
        return j["access_token"]
    raise RuntimeError("refresh 실패: " + json.dumps(j, ensure_ascii=False))

def _do_post(token, clubid, menuid, subject, content, openyn, search, tags):
    url = f"https://openapi.naver.com/v1/cafe/{clubid}/menu/{menuid}/articles"
    # 카페 API는 UTF-8 이중 URL 인코딩 필요: quote() 1차 + urlencode() 2차.
    fields = {"subject": urllib.parse.quote(subject),
              "content": urllib.parse.quote(content)}
    if openyn:                       # 지정하면 전체공개, 미지정 시 회원(멤버)공개
        fields["openyn"] = "true"
    if search:                       # 검색 허용
        fields["searchopenyn"] = "true"
    if tags:                         # 태그: 리스트/튜플이면 콤마로 합침
        fields["tagList"] = ",".join(tags) if isinstance(tags, (list, tuple)) else str(tags)
    data = urllib.parse.urlencode(fields).encode("ascii")
    req = urllib.request.Request(url, data=data)
    req.add_header("Authorization", "Bearer " + token)
    req.add_header("Content-Type", "application/x-www-form-urlencoded")
    r = urllib.request.urlopen(req, timeout=25)
    return r.getcode(), r.read().decode("utf-8", "replace")

def post_article(menuid, subject, content, tags=None, openyn=False, search=True):
    """카페 글쓰기. tags=리스트, openyn=False(회원공개)/True(전체공개), search=검색허용."""
    cfg = load_cfg()
    token = cfg.ACCESS_TOKEN
    try:
        code, body = _do_post(token, cfg.CLUBID, menuid, subject, content, openyn, search, tags)
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        if e.code == 401 and cfg.REFRESH_TOKEN:   # 토큰 만료 -> 갱신 후 재시도
            token = refresh_token()
            code, body = _do_post(token, cfg.CLUBID, menuid, subject, content, openyn, search, tags)
        else:
            return e.code, body
    return code, body

# 사용 예:
#   from cafe_post import post_article
#   post_article("28", "제목", "<b>본문</b>...",
#                tags=["지정폐기물","질의회신"], openyn=False, search=True)
# 삭제/수정/읽기 API는 없음. 태그=tagList(콤마), 회원공개=openyn 생략, 검색허용=search=True.
