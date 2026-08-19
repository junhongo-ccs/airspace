# Stop フック：実装ファイルを変更したのに docs/進捗ログ.md を更新せず終了しようとしたら、
# 終了をブロックして追記を促す。exit 2 の標準エラー出力が Claude へ渡る。
# stop_hook_active（=既にこのフックで継続中）のときは無限ループ防止のため何もしない。

[Console]::OutputEncoding = [Text.Encoding]::UTF8
[Console]::InputEncoding = [Text.Encoding]::UTF8
$ErrorActionPreference = 'SilentlyContinue'

$raw = [Console]::In.ReadToEnd()
if ($raw) {
    $payload = $raw | ConvertFrom-Json
    if ($payload -and $payload.stop_hook_active) { exit 0 }
}

$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Set-Location -LiteralPath $root

$status = & git -c core.quotepath=false status --porcelain 2>$null
if (-not $status) { exit 0 }

$paths = @($status | ForEach-Object { ($_ -replace '^.{3}', '').Trim('"') })

# 実装・データ・配備設定の変更を「記録すべき作業」とみなす
$codePattern = '^(viewer/|viewer-react/src/|viewer-react/package|viewer_api/|scripts/|render\.yaml|CLAUDE\.md|\.claude/)'
$changedCode = @($paths | Where-Object { $_ -match $codePattern -and $_ -notmatch '(node_modules|dist/|\.venv|__pycache__|\.claude/worktrees|settings\.local\.json)' })
if ($changedCode.Count -eq 0) { exit 0 }

$logTouched = @($paths | Where-Object { $_ -like '*進捗ログ.md*' })
if ($logTouched.Count -gt 0) { exit 0 }

$sample = ($changedCode | Select-Object -First 8) -join ', '
$more = if ($changedCode.Count -gt 8) { " ほか$($changedCode.Count - 8)件" } else { '' }

$msg = @"
docs/進捗ログ.md が未更新のまま終了しようとしている。

今回の変更: $sample$more

CLAUDE.md §2 のルールに従い、docs/進捗ログ.md の先頭（最新エントリの直後、既存の記述は書き換えない）に
本日の ## YYYY-MM-DD 節を追加するか、本日の既存エントリへ追記すること。必ず次の3節を書く。

- 実施内容（結果だけでなく判断の経緯と踏んだバグ）
- 既知の問題・未解決事項
- 次回タスク

該当タスクのチェックボックス（docs/実装タスクリスト.md または docs/改善タスク_*.md）の更新も忘れないこと。
記録が不要な変更（調査のみ・一時ファイル等）であれば、その旨をユーザーに一言伝えてから終了してよい。
"@

[Console]::Error.WriteLine($msg)
exit 2
