# SessionStart フック：進捗ログ最新エントリの「既知の問題・未解決事項」「次回タスク」と
# Cドライブ空き容量を、セッション開始時にコンテキストへ流し込む。
# 標準出力は Claude のコンテキストへ追加される。エラーでセッションを止めないこと。

[Console]::OutputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$log = Join-Path $root 'docs/進捗ログ.md'

if (Test-Path -LiteralPath $log) {
    $lines = Get-Content -LiteralPath $log -Encoding UTF8

    # 最新の日付エントリ（ファイル内で最初に現れる "## 2..." 見出し）
    $entryIdx = -1
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i] -match '^##\s+\d{4}-\d{2}-\d{2}') { $entryIdx = $i; break }
    }

    if ($entryIdx -ge 0) {
        $date = ($lines[$entryIdx] -replace '^##\s+', '').Trim()

        # そのエントリ内の「### 既知の問題・未解決事項」から、次の "## " 見出し直前まで
        $startIdx = -1
        for ($i = $entryIdx; $i -lt $lines.Count; $i++) {
            if ($lines[$i] -match '^###\s+既知の問題') { $startIdx = $i; break }
            if ($i -gt $entryIdx -and $lines[$i] -match '^##\s') { break }
        }

        if ($startIdx -ge 0) {
            $endIdx = $lines.Count - 1
            for ($i = $startIdx + 1; $i -lt $lines.Count; $i++) {
                if ($lines[$i] -match '^##\s') { $endIdx = $i - 1; break }
            }
            $body = ($lines[$startIdx..$endIdx] -join "`n").TrimEnd()

            Write-Output "## 前回セッションからの引き継ぎ（docs/進捗ログ.md $date より自動抽出）"
            Write-Output ""
            Write-Output $body
            Write-Output ""
            Write-Output "上記は進捗ログの最新エントリの写しである。作業に入る前に、対象タスクの根拠セクション（仕様書／design.md／実装タスクリスト）を確認すること。"
            Write-Output ""
        }
    }
}

# 既知の問題：Cドライブの空き容量が枯渇しやすい（2026-08-17 に ENOSPC 実績あり）
$drive = Get-PSDrive -Name C
if ($drive -and $drive.Free) {
    $freeGB = [math]::Round($drive.Free / 1GB, 1)
    if ($freeGB -lt 10) {
        Write-Output "## 環境の注意"
        Write-Output ""
        Write-Output "Cドライブの空き容量は $freeGB GB。10GB を切っている。ビルド・npm install・データ抽出を伴う作業の前に容量を確保すること（過去に 47MB まで低下し ENOSPC でビルド失敗した実績あり）。"
    }
}

exit 0
