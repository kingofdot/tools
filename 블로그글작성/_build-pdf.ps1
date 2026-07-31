# 블로그 자료 빌드 스크립트
#   - HTML 원본에서 "한 장짜리" PDF 와 섹션별 PNG 를 다시 만든다.
#   - 언제 몇 번을 돌려도 같은 결과가 나온다(멱등). 중간에 끊기면 그냥 다시 실행하면 된다.
#   - 진행 상황은 _build-pdf.log 에 남는다.
#
# 사용법:
#   powershell -File "d:\dev\tools\블로그글작성\_build-pdf.ps1"
#   powershell -File "...\_build-pdf.ps1" -SkipImages      # PDF 만
#   powershell -File "...\_build-pdf.ps1" -Only 폐기물      # 이름에 해당 문자열이 든 것만

param(
  [switch]$SkipImages,
  [switch]$SkipWord,
  [string]$Only = ""
)

$ErrorActionPreference = 'Continue'
$root = Split-Path $MyInvocation.MyCommand.Path -Parent
$log  = Join-Path $root "_build-pdf.log"
$work = Join-Path $env:TEMP "blogbuild"
if (-not (Test-Path $work)) { New-Item -ItemType Directory -Path $work -Force | Out-Null }

function Say($msg) {
  $line = "{0}  {1}" -f (Get-Date -Format "HH:mm:ss"), $msg
  Write-Output $line
  Add-Content -Path $log -Value $line -Encoding UTF8
}

# Chrome 찾기
$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Say "!! Chrome/Edge 를 찾지 못했습니다."; exit 1 }

# 대상 문서
$DOCS = @(
  @{ name = "환경기술인 자격기준"; html = "기술인력\환경기술인_자격기준_정리.html"; pdf = "기술인력\환경기술인_자격기준_정리.pdf"; images = $null },
  @{ name = "환경기술인 교육";     html = "기술인력\교육\환경기술인_교육_정리.html"; pdf = "기술인력\교육\환경기술인_교육_정리.pdf"; images = $null },
  @{ name = "폐기물 기술인력";     html = "폐기물기술인력\폐기물_기술인력_정리.html"; pdf = "폐기물기술인력\폐기물_기술인력_정리.pdf"; images = "폐기물기술인력\images" }
)

$MTop = 5.0; $MBottom = 9.0; $MSide = 6.0
$PageW = 210.0

# 주의: $args 는 PowerShell 예약 변수라 매개변수 이름으로 쓸 수 없다.
function Run-Chrome([string[]]$argList, [string]$stdout) {
  if ($stdout) {
    Start-Process -FilePath $chrome -ArgumentList $argList -Wait -NoNewWindow -RedirectStandardOutput $stdout | Out-Null
  } else {
    Start-Process -FilePath $chrome -ArgumentList $argList -Wait -NoNewWindow | Out-Null
  }
}

# 뷰어가 PDF 를 잡고 있으면 창을 닫고 재시도
function Copy-WithRetry($from, $to) {
  for ($i = 0; $i -lt 15; $i++) {
    try { Copy-Item $from $to -Force -ErrorAction Stop; return $true }
    catch {
      if ($i -eq 0) {
        $leaf = [System.IO.Path]::GetFileNameWithoutExtension($to)
        Get-Process -ErrorAction SilentlyContinue |
          Where-Object { $_.MainWindowTitle -like ("*" + $leaf + "*") } |
          ForEach-Object { $_.CloseMainWindow() | Out-Null }
      }
      Start-Sleep -Milliseconds 500
    }
  }
  return $false
}

# HTML 을 Word(.docx) 로 변환. Word 가 없으면 조용히 건너뛴다.
function Export-Docx($htmlText, $docxPath, $workDir) {
  if (-not [Type]::GetTypeFromProgID("Word.Application")) { return "Word 없음" }

  $fix = '<style id="wordfix">' +
         'body{background:#fff;}' +
         '.toolbar{display:none;}' +
         '.page{max-width:none; width:auto; padding:0; margin:0; box-shadow:none;}' +
         '.runfoot{position:static;}' +
         '</style>'
  # PDF 용 @page 는 210mm x 1700mm 같은 초장문 페이지다.
  # Word 는 페이지 높이 한계(약 558mm)를 넘는 값을 만나면 조판이 폭주하므로 A4 로 바꾼다.
  $wordHtml = [regex]::Replace($htmlText, '@page\{[^}]*\}', '@page{ size:A4; margin:15mm 14mm; }')
  $wf = Join-Path $workDir "word.html"
  Set-Content $wf ($wordHtml -replace '</head>', ($fix + '</head>')) -Encoding UTF8

  # 순서가 중요하다.
  # (1) 만들려는 .docx 가 Word 에 열려 있으면 저장이 막히므로 그 문서만 닫는다.
  #     (편집 중이면 건드리지 않는다)
  try {
    $running = [System.Runtime.InteropServices.Marshal]::GetActiveObject("Word.Application")
    foreach ($d in @($running.Documents)) {
      if ($d.FullName -eq $docxPath -and $d.Saved) { $d.Close(0) }
    }
    $running = $null
  } catch { }

  # (2) 마지막 문서를 닫으면 Word 가 스스로 종료된다. 종료 중에 새 COM 을 만들면 멈추므로
  #     완전히 사라질 때까지 기다린 뒤, 남아 있는 창 없는 인스턴스(자동화 잔여)를 정리한다.
  for ($w = 0; $w -lt 20; $w++) {
    $ghost = Get-Process WINWORD -ErrorAction SilentlyContinue | Where-Object { -not $_.MainWindowTitle }
    if (-not $ghost) { break }
    Start-Sleep -Milliseconds 500
  }
  Get-Process WINWORD -ErrorAction SilentlyContinue |
    Where-Object { -not $_.MainWindowTitle } |
    ForEach-Object { Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue }
  Start-Sleep -Milliseconds 800

  Remove-Item 'HKCU:\Software\Microsoft\Office\16.0\Word\Resiliency' -Recurse -Force -ErrorAction SilentlyContinue

  $word = $null; $doc = $null
  try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $doc = $word.Documents.Open($wf, $false, $true)   # ConfirmConversions=false, ReadOnly=true

    # 표 테두리 통일: 바깥은 두꺼운 줄, 안은 얇은 줄
    # (Word 는 HTML 의 border-collapse 를 제멋대로 해석하므로 직접 지정한다)
    $STYLE_SINGLE = 1        # wdLineStyleSingle
    $W_THICK      = 12       # wdLineWidth150pt (1.5pt)
    $W_THIN       = 4        # wdLineWidth050pt (0.5pt)
    $GRAY         = 12632256 # 밝은 회색
    foreach ($tb in $doc.Tables) {
      foreach ($i in -1, -2, -3, -4) {          # 위/왼쪽/아래/오른쪽
        $b = $tb.Borders.Item($i)
        $b.LineStyle = $STYLE_SINGLE; $b.LineWidth = $W_THICK; $b.Color = 0
      }
      foreach ($i in -5, -6) {                  # 안쪽 가로/세로
        $b = $tb.Borders.Item($i)
        $b.LineStyle = $STYLE_SINGLE; $b.LineWidth = $W_THIN; $b.Color = $GRAY
      }
    }

    # 대상 파일이 Word 로 열려 있으면 저장이 실패하므로, 임시 파일로 저장한 뒤 복사한다.
    $stage = Join-Path $workDir "stage.docx"
    if (Test-Path $stage) { Remove-Item $stage -Force -ErrorAction SilentlyContinue }
    $doc.SaveAs2($stage, 16)                           # 16 = wdFormatDocumentDefault (.docx)
    $pages = "변환"
    $doc.Close(0); $doc = $null
    if (Copy-WithRetry $stage $docxPath) { return $pages }
    return "대상 파일이 잠겨 있어 교체 실패 (Word 를 닫고 다시 실행하세요)"
  }
  catch { return ("실패: " + $_.Exception.Message) }
  finally {
    if ($doc)  { try { $doc.Close(0) }  catch {} }
    if ($word) { try { $word.Quit() }   catch {} }
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null 2>$null
    [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  }
}

$probeTpl = @'
<style id="probe">
  body{background:#fff !important;}
  .toolbar{display:none !important;}
  .page{max-width:none !important; width:__W__mm !important; padding:0 !important; margin:0 !important;}
</style>
<script>
window.addEventListener('load', function () {
  var p = document.querySelector('.page');
  document.title = String(Math.ceil(p.getBoundingClientRect().height));
});
</script>
'@

$shotTpl = @'
<style id="shotfix">
  body{background:#fff !important;}
  .toolbar,.doc-head,footer{display:none !important;}
  section{display:none !important;}
  section#__ID__{display:block !important; margin-bottom:0 !important;}
  section#__ID__ h2{margin-top:0 !important;}
  .mark{display:none !important;}
  .page{max-width:none !important; width:780px !important; padding:14px 16px 10px !important; margin:0 !important;}
  .runfoot{margin-top:12px !important;}
</style>
<script>
window.addEventListener('load', function () {
  var p = document.querySelector('.page');
  document.title = String(Math.ceil(p.getBoundingClientRect().height));
});
</script>
'@

Say "===== 빌드 시작 ====="

foreach ($d in $DOCS) {
  if ($Only -and ($d.name -notlike ("*" + $Only + "*"))) { continue }
  $srcPath = Join-Path $root $d.html
  $pdfPath = Join-Path $root $d.pdf
  if (-not (Test-Path $srcPath)) { Say ("!! 원본 없음: " + $d.html); continue }

  try {
    Say ("[" + $d.name + "] 시작")
    $html = Get-Content $srcPath -Raw -Encoding UTF8
    $contentW = $PageW - ($MSide * 2)

    # 1) 인쇄 폭과 같은 조건으로 전체 높이 측정
    $probe = $probeTpl.Replace('__W__', $contentW.ToString())
    $mf = Join-Path $work "measure.html"
    Set-Content $mf ($html -replace '</body>', ($probe + '</body>')) -Encoding UTF8
    $dumpFile = Join-Path $work "measure.dump"
    Run-Chrome @("--headless","--disable-gpu","--no-sandbox","--hide-scrollbars",
                 "--window-size=900,800","--virtual-time-budget=6000",
                 "--user-data-dir=$work\cdp",
                 "--dump-dom", ("file:///" + ($mf -replace '\\','/'))) $dumpFile
    $mm = [regex]::Match((Get-Content $dumpFile -Raw -Encoding UTF8), '<title>(\d+)</title>')
    if (-not $mm.Success) { throw "높이 측정 실패" }
    $px = [double]$mm.Groups[1].Value
    $pageH = [math]::Ceiling($px / 96.0 * 25.4 + $MTop + $MBottom + 4)
    $pageRule = "@page{ size:" + $PageW + "mm " + $pageH + "mm; margin:" + $MTop + "mm " + $MSide + "mm " + $MBottom + "mm; }"
    Say ("  높이 {0:N0}px -> 페이지 {1}mm x {2}mm" -f $px, $PageW, $pageH)

    # 2) 원본 HTML 의 @page 를 갱신 (브라우저 인쇄 버튼도 같은 결과가 나오도록)
    $updated = [regex]::Replace($html, '@page\{[^}]*\}', $pageRule)
    if ($updated -ne $html) {
      [System.IO.File]::WriteAllText($srcPath, $updated, (New-Object System.Text.UTF8Encoding($false)))
    }

    # 3) 단일 페이지 PDF 생성
    $of = Join-Path $work "one.html"
    Set-Content $of $updated -Encoding UTF8
    $tmpPdf = Join-Path $work "one.pdf"
    if (Test-Path $tmpPdf) { Remove-Item $tmpPdf -Force }
    Run-Chrome @("--headless","--disable-gpu","--no-sandbox","--no-pdf-header-footer",
                 "--run-all-compositor-stages-before-draw","--virtual-time-budget=6000",
                 "--user-data-dir=$work\cdp","--print-to-pdf=$tmpPdf",
                 ("file:///" + ($of -replace '\\','/'))) $null
    if (-not (Test-Path $tmpPdf)) { throw "PDF 생성 실패" }

    $bytes = [System.IO.File]::ReadAllBytes($tmpPdf)
    $txt = [System.Text.Encoding]::GetEncoding(28591).GetString($bytes)
    $pages = ([regex]::Matches($txt, '/Type\s*/Page[^s]')).Count
    if ($pages -ne 1) { Say ("  ! 경고: " + $pages + "쪽으로 생성됨 (한 장이 아님)") }

    if (Copy-WithRetry $tmpPdf $pdfPath) {
      Say ("  PDF 완료: " + $pages + "쪽, " + [math]::Round((Get-Item $pdfPath).Length / 1KB) + " KB")
    } else {
      Say "  !! PDF 파일이 잠겨 있어 교체하지 못했습니다. 뷰어를 닫고 다시 실행하세요."
    }

    # 3-2) Word(.docx)
    if (-not $SkipWord) {
      $docxPath = [System.IO.Path]::ChangeExtension($pdfPath, ".docx")
      $r = Export-Docx $updated $docxPath $work
      if (Test-Path $docxPath) {
        Say ("  DOCX 완료: " + $r + ", " + [math]::Round((Get-Item $docxPath).Length / 1KB) + " KB")
      } else {
        Say ("  ! DOCX 건너뜀 (" + $r + ")")
      }
    }

    # 4) 섹션별 PNG
    if ($d.images -and -not $SkipImages) {
      $outDir = Join-Path $root $d.images
      if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
      $ids = [regex]::Matches($updated, '<section id="([^"]+)"') | ForEach-Object { $_.Groups[1].Value }
      foreach ($id in $ids) {
        $css = $shotTpl.Replace('__ID__', $id)
        $sf = Join-Path $work ("shot_" + $id + ".html")
        Set-Content $sf ($updated -replace '</body>', ($css + '</body>')) -Encoding UTF8
        $uri = "file:///" + ($sf -replace '\\','/')
        $sd = Join-Path $work ("shot_" + $id + ".dump")
        Run-Chrome @("--headless","--disable-gpu","--no-sandbox","--hide-scrollbars",
                     "--window-size=780,600","--virtual-time-budget=5000",
                     "--user-data-dir=$work\cdpshot","--dump-dom",$uri) $sd
        $hm = [regex]::Match((Get-Content $sd -Raw -Encoding UTF8), '<title>(\d+)</title>')
        $h = 1200; if ($hm.Success) { $h = [int]$hm.Groups[1].Value }
        $png = Join-Path $outDir ($id + ".png")
        Run-Chrome @("--headless","--disable-gpu","--no-sandbox","--hide-scrollbars",
                     "--window-size=780,$h","--force-device-scale-factor=2","--virtual-time-budget=5000",
                     "--user-data-dir=$work\cdpshot","--screenshot=$png",$uri) $null
      }
      Say ("  이미지 완료: " + $ids.Count + "장 -> " + $d.images)
    }
  }
  catch {
    Say ("  !! 실패: " + $_.Exception.Message)
  }
}

Say "===== 빌드 끝 ====="
