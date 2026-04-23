// === AUTH ===
// 비밀번호 체크

const PWD_KEY = 'pa_authed';

function checkPwd() {
  if (document.getElementById('pwdInput').value === 'ohyes999#') {
    localStorage.setItem(PWD_KEY, '1');
    document.getElementById('passwordOverlay').style.display = 'none';
    tryAutoGithubLoad();
  } else {
    alert('비밀번호가 틀렸습니다.');
    document.getElementById('pwdInput').value = '';
    document.getElementById('pwdInput').focus();
  }
}

// 페이지 로드 시, GitHub 설정이 있고 토큰이 있으면 자동 불러오기
function tryAutoGithubLoad() {
  try {
    const cfg = JSON.parse(localStorage.getItem('gh_cfg') || 'null');
    if (cfg?.token && cfg?.owner && cfg?.repo && cfg?.path && typeof githubLoad === 'function') {
      githubLoad();
    }
  } catch (_) {}
}

document.addEventListener('DOMContentLoaded', function () {
  // 이전에 암호 통과했으면 오버레이 스킵 + 자동 로드
  if (localStorage.getItem(PWD_KEY) === '1') {
    const ov = document.getElementById('passwordOverlay');
    if (ov) ov.style.display = 'none';
    setTimeout(tryAutoGithubLoad, 200);
    return;
  }
  const pwdInput = document.getElementById('pwdInput');
  if (pwdInput) {
    pwdInput.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') checkPwd();
    });
    setTimeout(function () { pwdInput.focus(); }, 100);
  }
});
