// 빌드 버전 — GitHub Actions의 deploy-pages.yml 에서 __BUILD_SHA__ / __BUILD_TIME__ 을 실제 값으로 치환
// 로컬 서빙 중이면 치환 안 된 상태 그대로 보임 = "dev" 표시
const APP_BUILD = {
  sha:  '__BUILD_SHA__',
  time: '__BUILD_TIME__',
};

(function renderBuildBadge() {
  const el = document.getElementById('buildVersion');
  if (!el) return;
  const isDev = APP_BUILD.sha.startsWith('__') || APP_BUILD.time.startsWith('__');
  if (isDev) {
    el.textContent = 'dev (로컬)';
    el.style.color = 'var(--warning, #e0a500)';
  } else {
    el.textContent = `${APP_BUILD.sha.slice(0, 7)} · ${APP_BUILD.time}`;
    el.style.color = 'var(--accent)';
  }
})();
