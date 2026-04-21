"""
Answer 슬롯 시스템 추가 스크립트
수집운반업 허가서류 인입 데이터 기준으로 별표5, 별표7 항목에 slots 필드 추가

인입 데이터 구조 (document.formData):
  vehicles[].vehicleType, maxPayload, vehicleCount
  wasteTargetItems[].wasteCode, wasteName
  technicalPersonnel[].name, birthdate, license
  wasteCollectionType  (지정폐기물 / 생활폐기물 / 사업장일반폐기물)
  wasteStateType       (액상 / 고상)
  parkingLot, carWashFacility, offices, disinfectionEquipment

슬롯 타입:
  filter_join : from 배열에서 display 필드를 추출해 join으로 연결
  person_set  : from 배열에서 fields 세트를 추출 (이름+생년월일+자격)
"""

import json, os

BASE = "c:/Users/USER/OneDrive/바탕 화면/py/tools/tools/compliance-builder/data/검토사항/시행규칙"

# ── 슬롯 템플릿 정의 ──────────────────────────────────────────────

def vehicles_slot(label="보유 차량", filter_key=None, filter_val=None):
    s = {
        "key": "vehicles",
        "label": label,
        "type": "filter_join",
        "from": "document.formData.vehicles",
        "display": "vehicleType",
        "join": ", "
    }
    if filter_key:
        s["filter"] = {filter_key: filter_val}
    return s

def waste_types_slot(label="수집운반 폐기물 종류", wasteClass=None):
    s = {
        "key": "waste_types",
        "label": label,
        "type": "filter_join",
        "from": "document.formData.wasteTargetItems",
        "display": "wasteName",
        "join": ", "
    }
    if wasteClass:
        s["filter"] = {"wasteClass": wasteClass}
    return s

def technical_staff_slot():
    return {
        "key": "technical_staff",
        "label": "기술인력",
        "type": "person_set",
        "from": "document.formData.technicalPersonnel",
        "fields": ["name", "birthdate", "license"],
        "join": "\n"
    }

def facility_slot(key, label, from_path):
    return {
        "key": key,
        "label": label,
        "type": "filter_join",
        "from": from_path,
        "display": "facilityType",
        "join": ", "
    }

# ── 별표5 수정 정의 ──────────────────────────────────────────────
# {idx: {answer?: str, slots: [...]}}

BYEOLTABLE5_SLOTS = {
    # 고체상태 생활폐기물 → 밀폐형 차량
    9: {
        "answer": "고체상태의 생활폐기물은 {{vehicles}}(밀폐형 차량)으로 수집·운반하겠음",
        "slots": [vehicles_slot("밀폐형 압축·압착·암롤차량")]
    },
    # 밀폐형 덮개 설치차량 예외 항목
    10: {
        "slots": [vehicles_slot("밀폐형 덮개 설치차량")]
    },
    # 액체상태 생활폐기물 → 탱크로리
    16: {
        "answer": "액체상태(수분 함량 85% 초과)의 생활폐기물은 {{vehicles}}으로 수집·운반하겠음. 다만, 밀폐된 전용 수거용기에 담아 운반하는 경우에는 덮개가 설치되고 방지턱이 있는 차량으로 수집·운반하겠음",
        "slots": [vehicles_slot("탱크로리")]
    },
    # 사업장일반폐기물 차량 (상위 항목)
    65: {
        "slots": [
            vehicles_slot("수집운반 차량"),
            waste_types_slot("사업장일반폐기물 종류", wasteClass="G")
        ]
    },
    # 고상 사업장일반폐기물 → 밀폐형 차량
    67: {
        "answer": "고상의 사업장일반폐기물은 {{vehicles}}으로 수집·운반하겠음",
        "slots": [vehicles_slot("밀폐형 차량")]
    },
    # 밀폐형 덮개 설치차량 예외
    68: {
        "slots": [vehicles_slot("밀폐형 덮개 설치차량")]
    },
    # 액상 사업장일반폐기물 → 탱크로리
    74: {
        "answer": "액상의 사업장일반폐기물은 {{vehicles}}으로 수집·운반하겠음. 다만, 밀폐된 전용 수거용기에 담아 운반하는 경우에는 합성수지 덮개와 방지턱이 설치된 차량으로 수집·운반하겠음",
        "slots": [vehicles_slot("탱크로리")]
    },
    # 지정폐기물 차량 (상위 항목)
    169: {
        "slots": [
            vehicles_slot("수집운반 차량"),
            waste_types_slot("지정폐기물 종류", wasteClass="D")
        ]
    },
    # 고상 지정폐기물 → 밀폐형 차량
    170: {
        "answer": "고상의 지정폐기물은 {{vehicles}}으로 수집·운반하겠음. 다만, 밀폐된 전용 수거용기에 담아 운반하는 경우에는 규정 재질의 밀폐형 덮개와 방지턱이 설치된 차량으로 수집·운반하겠음",
        "slots": [vehicles_slot("밀폐형 차량")]
    },
    # 액상 지정폐기물 → 탱크로리
    171: {
        "answer": "액상의 지정폐기물은 {{vehicles}}으로 수집·운반하겠음. 다만, 밀폐된 전용 수거용기에 담아 운반하는 경우에는 규정 기준의 밀폐형 덮개와 방지턱이 설치된 차량으로 수집·운반하겠음",
        "slots": [vehicles_slot("탱크로리")]
    },
    # 지정폐기물 차량 노란색 도색
    177: {
        "slots": [vehicles_slot("지정폐기물 수집운반 차량")]
    },
    # 의료폐기물 전용 운반차량
    397: {
        "slots": [vehicles_slot("의료폐기물 전용 운반차량")]
    },
    # 의료폐기물 냉장설비 (섭씨 4도 이하)
    398: {
        "answer": "의료폐기물의 수집·운반차량({{vehicles}})은 섭씨 4도 이하의 냉장설비가 설치되고, 수집·운반 중에는 적재함의 내부온도를 섭씨 4도 이하로 유지하겠음. 다만, 적재함을 열고 의료폐기물을 싣거나 내릴 때에는 그러하지 아니하다",
        "slots": [vehicles_slot("의료폐기물 냉장차량")]
    },
    # 의료폐기물 밀폐 적재함 차량
    399: {
        "slots": [vehicles_slot("의료폐기물 전용 운반차량")]
    },
}

# ── 별표7 수정 정의 ──────────────────────────────────────────────

BYEOLTABLE7_SLOTS = {
    # 가. 생활/사업장비배출시설계 장비
    4: {  # 밀폐형 압축·압착차량
        "slots": [vehicles_slot("밀폐형 압축·압착차량")]
    },
    5: {  # 밀폐형 차량 또는 밀폐형 덮개 설치차량
        "slots": [vehicles_slot("밀폐형 차량 또는 밀폐형 덮개 설치차량")]
    },
    6: {  # 냉장 적재함 차량 (의료기관 일회용기저귀)
        "slots": [vehicles_slot("냉장 적재함 차량")]
    },
    # 나. 사업장배출시설계 폐기물 장비
    10: {  # 액체상태: 탱크로리 + 밀폐형차량
        "slots": [vehicles_slot("탱크로리, 밀폐형 차량")]
    },
    11: {  # 고체상태: 밀폐형 차량 또는 밀폐형 덮개 설치차량
        "slots": [vehicles_slot("밀폐형 차량 또는 밀폐형 덮개 설치차량")]
    },
    # 다. 지정폐기물 장비
    15: {  # 액체상태: 탱크로리 + 밀폐형차량
        "slots": [vehicles_slot("탱크로리, 밀폐형 차량")]
    },
    16: {  # 고체상태: 밀폐형 차량 + 밀폐형 덮개 설치차량
        "slots": [vehicles_slot("밀폐형 차량, 밀폐형 덮개 설치차량")]
    },
    18: {  # 주차장
        "slots": [facility_slot("parking_lot", "주차장", "document.formData.parkingLot")]
    },
    19: {  # 세차시설
        "slots": [facility_slot("car_wash", "세차시설", "document.formData.carWashFacility")]
    },
    20: {  # 기술능력 (지정폐기물 수집운반)
        "slots": [technical_staff_slot()]
    },
    # 라. 의료폐기물 장비
    24: {  # 냉장차량 3대 이상
        "slots": [vehicles_slot("의료폐기물 냉장차량")]
    },
}


def apply_slots(json_path, slot_map, label):
    with open(json_path, encoding='utf-8') as f:
        data = json.load(f)

    items = data if isinstance(data, list) else data.get('별표내용', [])
    if not isinstance(items, list):
        print(f"[{label}] 별표내용 없음")
        return

    updated = 0
    for idx, patch in slot_map.items():
        if idx >= len(items):
            print(f"[{label}] idx={idx} 범위 초과 (total={len(items)})")
            continue
        item = items[idx]
        if not isinstance(item, dict):
            continue

        if "answer" in patch:
            item["answer"] = patch["answer"]
        item["slots"] = patch["slots"]
        updated += 1

    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[{label}] {updated}개 항목 슬롯 추가 완료")


if __name__ == "__main__":
    apply_slots(
        os.path.join(BASE, "별표5_처리구체적기준및방법.json"),
        BYEOLTABLE5_SLOTS,
        "별표5"
    )
    apply_slots(
        os.path.join(BASE, "별표7_처리업시설장비기술능력기준.json"),
        BYEOLTABLE7_SLOTS,
        "별표7"
    )
    print("완료")
