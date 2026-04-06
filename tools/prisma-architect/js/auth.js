// === AUTH ===
// 비밀번호 체크

function checkPwd() {
  if (document.getElementById('pwdInput').value === 'ohyes999#') {
    document.getElementById('passwordOverlay').style.display = 'none';
  } else {
    alert('비밀번호가 틀렸습니다.');
    document.getElementById('pwdInput').value = '';
    document.getElementById('pwdInput').focus();
  }
}

document.addEventListener('DOMContentLoaded', function () {
  const pwdInput = document.getElementById('pwdInput');
  if (pwdInput) {
    pwdInput.addEventListener('keyup', function (e) {
      if (e.key === 'Enter') checkPwd();
    });
    setTimeout(function () { pwdInput.focus(); }, 100);
  }
});
