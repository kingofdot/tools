# -*- coding: utf-8 -*-
"""결과물 예시 서류의 개인정보 값을 모자이크한다.

상호명과 대표자 성명만 남기고 등록번호·생년월일·주소·연락처는 가린다.
원본 PNG 는 건드리지 않고 `갑지/결과물/_모자이크/` 에 사본을 쓴다.
좌표는 각 서류에서 글자 덩어리를 픽셀로 재서 넣은 값이며 라벨은 피해 값만 덮는다.

  python _build/mask_docs.py
"""
import os

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = os.path.join(ROOT, '갑지', '결과물')
DST = os.path.join(SRC, '_모자이크')

# 파일명 앞머리 : [(x0, x1, y0, y1, 무엇), ...]   값 영역만. 라벨은 남긴다.
SPEC = {
    '예시1': [
        (1081, 1214, 436, 457, '사업자등록번호'),
        (1015, 1176, 492, 514, '생년월일'),
        (292, 426, 551, 568, '전화번호'),
        (1057, 1201, 551, 568, '휴대전화번호'),
        (253, 627, 607, 628, '주소'),
        (1175, 1313, 644, 665, '전화번호'),
        (333, 708, 689, 710, '사업장소재지'),
        (1023, 1157, 689, 710, '전화번호'),
    ],
    '예시2': [
        (1043, 1183, 486, 508, '사업자등록번호'),
        (975, 1131, 539, 559, '생년월일'),
        (402, 778, 599, 622, '주소(사업장)'),
        (1186, 1335, 633, 654, '전화번호'),
    ],
    '예시3': [
        (886, 1052, 506, 526, '생년월일'),
        (308, 699, 565, 586, '주소'),
        (1165, 1316, 598, 619, '전화번호'),
        (327, 718, 647, 668, '사업장 소재지'),
        (1165, 1316, 680, 701, '전화번호'),
    ],
    '예시4': [
        (988, 1128, 452, 475, '사업자등록번호'),
        (969, 1140, 545, 568, '주민등록번호'),
        (284, 660, 584, 607, '주소'),
        (1164, 1313, 618, 639, '전화번호'),
        (350, 726, 803, 829, '영업소 소재지'),
        (350, 726, 834, 860, '사무실 소재지'),
    ],
    '예시5': [
        (996, 1138, 386, 403, '사업자등록번호'),
        (293, 684, 519, 540, '주소'),
        (1157, 1308, 552, 573, '전화번호'),
        (365, 756, 599, 620, '사업장 소재지'),
        (1157, 1308, 631, 652, '전화번호'),
    ],
}

PAD = 4      # 값 둘레 여유
CELL = 7     # 모자이크 한 칸


def pixelate(img, box, cell=CELL):
    patch = img.crop(box)
    nx, ny = max(1, patch.width // cell), max(1, patch.height // cell)
    img.paste(patch.resize((nx, ny), Image.BILINEAR)
                   .resize(patch.size, Image.NEAREST), box)


def main():
    os.makedirs(DST, exist_ok=True)
    for fn in sorted(os.listdir(SRC)):
        if not fn.lower().endswith('.png'):
            continue
        key = next((k for k in SPEC if fn.startswith(k)), None)
        if not key:
            print('  건너뜀(좌표 없음):', fn)
            continue
        img = Image.open(os.path.join(SRC, fn)).convert('RGB')
        for x0, x1, y0, y1, what in SPEC[key]:
            box = (max(0, x0 - PAD), max(0, y0 - PAD),
                   min(img.width, x1 + PAD), min(img.height, y1 + PAD))
            pixelate(img, box)
        img.save(os.path.join(DST, fn))
        print('  %-40s %d곳' % (fn, len(SPEC[key])))
    print('완료 →', DST)


if __name__ == '__main__':
    main()
