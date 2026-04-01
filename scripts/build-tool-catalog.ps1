$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$toolsRoot = Join-Path $repoRoot 'tools'
$catalogPath = Join-Path $toolsRoot 'catalog.json'

function Get-MetaContent {
  param(
    [string]$Html,
    [string]$Name
  )

  $pattern = '<meta\s+name=["'']' + [regex]::Escape($Name) + '["'']\s+content=["'']([^"'']+)["'']'
  $match = [regex]::Match($Html, $pattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if ($match.Success) {
    return $match.Groups[1].Value.Trim()
  }
  return $null
}

function Normalize-Text {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  return ($Value -replace '\s+', ' ').Trim()
}

$toolDirs = Get-ChildItem -Path $toolsRoot -Directory |
  Where-Object { Test-Path (Join-Path $_.FullName 'index.html') } |
  Sort-Object Name

$catalog = foreach ($entry in $toolDirs | ForEach-Object {
    [pscustomobject]@{
      Slug = $_.Name
      IndexPath = Join-Path $_.FullName 'index.html'
      Path = "./tools/$($_.Name)/"
    }
  } | Sort-Object Slug) {
  $indexPath = $entry.IndexPath
  $html = Get-Content -LiteralPath $indexPath -Raw -Encoding UTF8

  $titleMatch = [regex]::Match($html, '<title>(.*?)</title>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase -bor [System.Text.RegularExpressions.RegexOptions]::Singleline)
  $title = if ($titleMatch.Success) { Normalize-Text $titleMatch.Groups[1].Value } else { $null }

  $metaName = Normalize-Text (Get-MetaContent -Html $html -Name 'tool-name')
  $metaTag = Normalize-Text (Get-MetaContent -Html $html -Name 'tool-tag')
  $metaDescription = Normalize-Text (Get-MetaContent -Html $html -Name 'tool-description')

  $defaultName = ($entry.Slug -split '[-_ ]+' | ForEach-Object {
    if ($_.Length -gt 0) { $_.Substring(0, 1).ToUpper() + $_.Substring(1) }
  }) -join ' '

  [pscustomobject]@{
    slug = $entry.Slug
    name = if ($metaName) { $metaName } elseif ($title) { $title } else { $defaultName }
    tag = if ($metaTag) { $metaTag } else { 'Tool' }
    description = if ($metaDescription) { $metaDescription } else { '새로 추가된 독립형 HTML 툴입니다.' }
    path = $entry.Path
  }
}

$catalog | ConvertTo-Json -Depth 4 | Set-Content -LiteralPath $catalogPath -Encoding UTF8
Write-Host "Generated $catalogPath with $($catalog.Count) tools."
