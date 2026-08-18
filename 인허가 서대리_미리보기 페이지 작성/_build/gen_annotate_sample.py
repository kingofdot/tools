# -*- coding: utf-8 -*-
r"""annotate/handoff 시안을 그대로 실행해 샘플 한 장을 뽑고, 좌표계를 검증한다.

handoff 는 fetch 로 JSON 을 읽어 file:// 로 열면 동작하지 않는다.
여기서는 CSS·JS·데이터를 한 파일에 인라인하고 이미지 경로만 절대경로로 바꿔
의존성 없이 렌더한다. 렌더 전에 데이터 자체의 정합성도 같이 검사한다.

  python gen_annotate_sample.py            → s1(서류 선택) 카드
  python gen_annotate_sample.py s2         → 다른 섹션
"""
import io, json, os, subprocess, sys

import numpy as np
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
ANN = os.path.join(ROOT, '갑지', '자료', '화면캡처', 'annotate')
HAND = os.path.join(ANN, 'handoff')          # 받은 원본 · 건드리지 않는다
WORK = os.path.join(ANN, 'work')             # 수정본 · 있으면 이쪽을 쓴다
SRC = WORK if os.path.exists(os.path.join(WORK, 'annotation-guide.js')) else HAND
OUT = os.path.join(ANN, '샘플')
TMP = os.path.join(ROOT, '갑지', '_tmp_annotate')

CHROME = next((c for c in [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe"),
] if os.path.exists(c)), None)

CARD_W, PANEL_PAD = 1010, 30          # annotation-guide.css 값
SIDE = dict(IW=600, GAP=22, CW=326, IX=0, CPL=34)


def verify(sec):
    """데이터가 스스로 모순되지 않는지 확인한다. 눈으로 보기 전에 숫자로 거른다."""
    print('■ %s %s · 섹션 좌표계 %dx%d · 항목 %d · 패널 %d'
          % (sec['step'], sec['title'], sec['cw'], sec['ch'], len(sec['f']), len(sec['g'])))
    inner = CARD_W - 2 - PANEL_PAD * 2
    bad = 0
    for gi, g in enumerate(sec['g'], 1):
        cx, cy, cwd, chg = g['crop']
        p = os.path.join(HAND, 'img', g['img'])
        im = Image.open(p)
        k_src = im.width / cwd                       # 원본 스크린샷 배율
        exp_h = round(chg * k_src)
        note = [] if abs(exp_h - im.height) <= 1 else ['crop 높이 불일치 %d≠%d' % (exp_h, im.height)]

        if g['mode'] == 'side':
            k = SIDE['IW'] / cwd
            stage = SIDE['IX'] + SIDE['IW'] + SIDE['GAP'] + SIDE['CW']
            if stage > inner:
                note.append('스테이지 %dpx > 카드 안쪽 %dpx (오른쪽 %dpx 잘림)'
                            % (stage, inner, stage - inner))
        else:
            k = 940 / cwd

        for idx in g['f']:
            b = sec['f'][idx]['b']
            if not (cx <= b[0] and b[0] + b[2] <= cx + cwd and
                    cy <= b[1] and b[1] + b[3] <= cy + chg):
                note.append('박스 %d 이 crop 밖' % (idx + 1))
                bad += 1
        print('  g%d %-5s %-14s img %4dx%-4d ×%.3f  표시배율 %.3f  %s'
              % (gi, g['mode'], g['img'], im.width, im.height, k_src, k,
                 ' / '.join(note) if note else 'OK'))
    return bad


# 번호 표기 변형 · (파일명 꼬리, 렌더 전 JS, 덧붙일 CSS)
VARIANTS = {
    '': ('', '', ''),
    'outside': ('_숫자바깥', 'AG_NUM.place="outside";', ''),
}


def sample_html(sec, pre='', extra_css=''):
    css = open(os.path.join(SRC, 'annotation-guide.css'), encoding='utf-8').read() + '\n' + extra_css
    js = open(os.path.join(SRC, 'annotation-guide.js'), encoding='utf-8').read()
    sec = dict(sec, imgBase='file:///%s/' % os.path.join(HAND, 'img').replace('\\', '/'))
    return ('<!doctype html><html lang="ko"><head><meta charset="utf-8">\n'
            '<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/'
            'pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">\n'
            '<style>\n%s\n'
            'html,body{margin:0;padding:36px;background:#fff}\n'
            '</style></head><body><div id="root"></div>\n'
            '<script>\n%s\n</script>\n'
            '<script>%sdocument.getElementById("root").innerHTML='
            'renderGuideSection(%s);'
            'if(window.AG_fixWires)AG_fixWires();</script>\n</body></html>\n'
            % (css, js, pre, json.dumps(sec, ensure_ascii=False)))


def shoot(html, png, w=1300, h=4200):
    os.makedirs(TMP, exist_ok=True)
    src = os.path.join(TMP, '_x.html')
    open(src, 'w', encoding='utf-8').write(html)
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--hide-scrollbars',
                    '--force-device-scale-factor=2', '--virtual-time-budget=20000',
                    '--window-size=%d,%d' % (w, h), '--screenshot=' + png,
                    'file:///' + src.replace('\\', '/')],
                   check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    im = Image.open(png).convert('RGB')
    a = np.asarray(im).astype(int)
    m = np.abs(a - 255).sum(axis=2) > 12
    ys, xs = np.where(m)
    if len(xs):
        pad = 36
        im = im.crop((max(0, xs.min() - pad), max(0, ys.min() - pad),
                      min(im.width, xs.max() + pad), min(im.height, ys.max() + pad)))
        im.save(png)
    return im


def main():
    args = sys.argv[1:]
    key = args[0] if args else 's1'
    var = args[1] if len(args) > 1 else ''
    if var not in VARIANTS:
        sys.exit('없는 변형: %s (가능: %s)' % (var, ', '.join(k for k in VARIANTS if k)))
    suffix, pre, extra = VARIANTS[var]
    data = json.load(open(os.path.join(SRC, 'guide-data.json'), encoding='utf-8'))
    sec = next((s for s in data if s['key'] == key), None)
    if sec is None:
        sys.exit('없는 섹션: %s (가능: %s)' % (key, ', '.join(s['key'] for s in data)))
    if not CHROME:
        sys.exit('Chrome 을 찾지 못했습니다.')

    bad = verify(sec)
    os.makedirs(OUT, exist_ok=True)
    dst = os.path.join(OUT, '%s_%s%s.png' % (key, sec['title'], suffix))
    im = shoot(sample_html(sec, pre, extra), dst)
    print('→ %s  %dx%d%s' % (dst, im.width, im.height,
                             '' if not bad else '  (crop 밖 박스 %d개)' % bad))


if __name__ == '__main__':
    main()
