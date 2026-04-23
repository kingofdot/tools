// === STATE ===
// 전역 공유 상태

let notes = [];
let currentId = null;
let dirty = false;
let searchQuery = '';
let viewMode = 'study';   // 'study' | 'edit'

// prisma-architect 패턴: kingofdot/tools 저장소의 tools/study-notes/notes-data.json 에
// 모든 노트를 단일 파일로 저장. 별도 저장소 생성 불필요.
let settings = {
  ghOwner: 'kingofdot',
  ghRepo: 'tools',
  ghPath: 'tools/study-notes/notes-data.json',
  ghToken: '',
  ghAutoSync: true,
};

const SETTINGS_KEY = 'study-notes:settings';
const NOTES_KEY = 'study-notes:notes';
const SHA_KEY = 'study-notes:sha';
