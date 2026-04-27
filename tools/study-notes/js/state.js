// === STATE ===
// 전역 공유 상태

let notes = [];
let currentId = null;
let dirty = false;
let searchQuery = '';
let viewMode = 'study';   // 'study' | 'edit'

// 사용자 정의 과목 탭 순서 — 비어 있으면 기본 알파벳 순
let subjectOrder = [];

// prisma-architect 패턴: kingofdot/tools 저장소의 tools/study-notes/notes-data.json 에
// 모든 노트를 단일 파일로 저장. 별도 저장소 생성 불필요.
let settings = {
  ghOwner: 'kingofdot',
  ghRepo: 'tools',
  ghPath: 'tools/study-notes/notes-data.json',
  ghToken: '',
  ghAutoSync: true,
};

// 편집 모드 좌:우 분할 비율 (0~1, textarea 영역 비율)
let editSplit = 0.5;

const SETTINGS_KEY  = 'study-notes:settings';
const NOTES_KEY     = 'study-notes:notes';
const SHA_KEY       = 'study-notes:sha';
const SUBJECT_ORDER_KEY = 'study-notes:subjectOrder';
const EDIT_SPLIT_KEY    = 'study-notes:editSplit';
