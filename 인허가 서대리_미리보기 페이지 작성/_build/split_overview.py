# -*- coding: utf-8 -*-
"""card_04_overview.html 을 섹션별 컷으로 나눈다.

`<!-- 01 개요 -->` 같은 주석을 경계로 잘라, 각 섹션을 독립 flow 파일로 만든다.
내용·디자인은 그대로 두고 마커컷 파이프라인에 태우기 위한 분리다.
design.css 는 절대경로로 바꿔, 임시 폴더에서 렌더해도 스타일이 적용되게 한다.
"""
import io, os, re, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))

# 섹션 번호 → 만들 flow 파일 이름
NAMES = {'01': 'flow_overview.html', '02': 'flow_docs.html', '03': 'flow_guide.html',
         '04': 'flow_how.html', '05': 'flow_result.html'}

s = open(os.path.join(HERE, 'card_04_overview.html'), encoding='utf-8').read()
head, rest = s.split('<div class="stack">', 1)
body, tail = rest.rsplit('</div>', 1)

css = os.path.join(HERE, 'design.css').replace(os.sep, '/')
head = head.replace('href="design.css"', 'href="file:///%s"' % css)
head = head.replace('</head>', '<style>body{background:#FFFFFF;padding:30px}</style>\n</head>')

marks = [(m.start(), m.group(1)) for m in re.finditer(r'<!--\s*(\d{2})\s', body)]
if not marks:
    sys.exit('섹션 주석(<!-- 01 … -->)을 찾지 못했습니다.')

# 웹 페이지에 이미 '01 개요' 같은 제목이 있으므로, 카드 안의 헤더 밴드는 뺀다
HEAD_RE = re.compile(r'\s*<div class="sbox-head">.*?</div>\s*</div>', re.S)


def strip_head(sec):
    m = re.search(r'<div class="sbox-head">.*?<div class="t">.*?</div>\s*</div>', sec, re.S)
    return sec[:m.start()] + sec[m.end():] if m else sec


for i, (pos, no) in enumerate(marks):
    end = marks[i + 1][0] if i + 1 < len(marks) else len(body)
    name = NAMES.get(no)
    if not name:
        print('건너뜀: %s (이름 미지정)' % no)
        continue
    out = os.path.join(HERE, name)
    open(out, 'w', encoding='utf-8').write(head + '<div class="stack">' + strip_head(body[pos:end]) + '</div>' + tail)
    print('생성 %-22s 섹션 %s · %d바이트' % (name, no, end - pos))
