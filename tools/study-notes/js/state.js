// === STATE ===
// 전역 공유 상태

let notes = [];
let currentId = null;
let dirty = false;
let searchQuery = '';

// 사용자 정의 과목 탭 순서 — 비어 있으면 기본 알파벳 순
let subjectOrder = [];

// 활성 소과목 — null 이면 "전체" (현재 과목의 모든 노트)
let activeSubTopic = null;

// prisma-architect 패턴: kingofdot/tools 저장소의 tools/study-notes/notes-data.json 에
// 모든 노트를 단일 파일로 저장. 별도 저장소 생성 불필요.
let settings = {
  ghOwner: 'kingofdot',
  ghRepo: 'tools',
  ghPath: 'tools/study-notes/notes-data.json',
  ghToken: '',
  ghAutoSync: true,
};

// 본문 패널 위/아래 분할 비율 (0~1, 위쪽 미리보기 영역 비율)
let editSplit = 0.5;

// 소과목 → 기본 법령 매핑. 구조: { [subject]: { [subTopic]: lawName } }
// 사용자 편집 가능 (노트 메타의 "기본 법령" 입력) + GitHub 동기화 대상.
let lawMap = {};

const SETTINGS_KEY  = 'study-notes:settings';
const NOTES_KEY     = 'study-notes:notes';
const SHA_KEY       = 'study-notes:sha';
const SUBJECT_ORDER_KEY = 'study-notes:subjectOrder';
const EDIT_SPLIT_KEY    = 'study-notes:editSplit';
const LAW_MAP_KEY       = 'study-notes:lawMap';
const LAST_VIEW_KEY     = 'study-notes:lastView';   // { subject, subTopic, noteId }
