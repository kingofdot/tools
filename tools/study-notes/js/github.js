// === GITHUB ===
// prisma-architect 스타일: 단일 JSON 파일로 전체 노트 저장/로드.
// 저장소는 이미 존재하는 것을 쓰므로 404 걱정 없음.
// 저장 위치: {ghOwner}/{ghRepo}/{ghPath}

function ghHeaders() {
  return {
    'Authorization': `token ${settings.ghToken}`,
    'Accept': 'application/vnd.github.v3+json',
  };
}

function ghApiUrl() {
  const { ghOwner, ghRepo, ghPath } = settings;
  return `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${ghPath}`;
}

function b64encode(str) { return btoa(unescape(encodeURIComponent(str))); }
function b64decode(str) { return decodeURIComponent(escape(atob(str.replace(/\n/g, '')))); }

// 원격 파일 전체 읽기 (없으면 null)
async function ghFetchAll() {
  const res = await fetch(ghApiUrl(), { headers: ghHeaders() });
  if (res.status === 404) return null;   // 파일이 아직 없음 — 정상
  if (!res.ok) throw new Error(`GET ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  localStorage.setItem(SHA_KEY, json.sha || '');
  const data = JSON.parse(b64decode(json.content));
  return data;
}

// 전체 노트를 단일 파일로 PUT (생성 또는 갱신)
async function ghPutAll(payload) {
  // 항상 최신 sha를 먼저 조회 (다른 기기에서 쓰여도 대응)
  let sha = localStorage.getItem(SHA_KEY) || null;
  try {
    const check = await fetch(ghApiUrl(), { headers: ghHeaders() });
    if (check.ok) {
      const d = await check.json();
      sha = d.sha || null;
    } else if (check.status === 404) {
      sha = null;
    }
  } catch (_) { /* 네트워크 오류는 PUT에서 한 번 더 드러남 */ }

  const body = {
    message: `chore: update study-notes (${new Date().toLocaleString('ko-KR')})`,
    content: b64encode(JSON.stringify(payload, null, 2)),
  };
  if (sha) body.sha = sha;

  const res = await fetch(ghApiUrl(), {
    method: 'PUT',
    headers: { ...ghHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`PUT ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const result = await res.json();
  if (result.content?.sha) localStorage.setItem(SHA_KEY, result.content.sha);
}
