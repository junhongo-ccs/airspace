# CLAUDE.md

空域デジタルツイン活用・ドローン航路GIS-PoC のリポジトリ。Claude Code は毎セッション、このファイルを自動で読む。

**このファイルに仕様・設計の内容そのものを書かない。** 本プロジェクトは二重管理を禁止している（典型例：免責文言は `docs/ドローン航路GIS-PoC_仕様書.md` §2-2 の文字列を参照するだけとし、他ドキュメントに転記しない）。事実の正は常に `docs/` 配下にある。ここには「どこを見るか」「どう作業するか」だけを書く。

---

## 1. セッション開始時に必ずやること

1. **`docs/進捗ログ.md` の先頭エントリを読む。** 「既知の問題・未解決事項」と「次回タスク」が現在地であり、その日の作業の起点。
2. 着手するタスクの**根拠セクション**（仕様書 or `docs/design.md` の節番号）を `docs/実装タスクリスト.md` または `docs/改善タスク_*.md` で確認し、**その節を読んでから**実装する。
3. 実装判断に迷ったら根拠セクションへ戻る。**仕様書・design.md に無い判断を勝手に確定しない。**割り切りが必要ならユーザーに確認し、決めた内容を「ユーザー決定」として進捗ログに残す。

## 2. ドキュメントの役割と更新ルール

| ファイル | 役割 | 更新ルール |
|---|---|---|
| `docs/ドローン航路GIS-PoC_仕様書.md` | 要件定義。全ての正 | 仕様に影響する変更をしたら**版を上げ、冒頭の変更履歴テーブルに1行追加**し、ステータス行を更新する |
| `docs/design.md` | デザインガイドライン（ハイレベル設計）。判断基準は §11 に一本化 | 同上（変更履歴テーブルあり） |
| `docs/実装タスクリスト.md` | マイクロ要件。各タスクに根拠セクションを付す | 完了時にチェックボックスを `[x]` にし、**実装場所・実測値・見送り理由を同じ行に追記**する |
| `docs/改善タスク_*.md` | 個別テーマの改善計画 | 同上。冒頭の「状態」行も更新する |
| `docs/進捗ログ.md` | **日付ごとの作業記録＝気づきの置き場** | 下記のルール（最重要） |
| `docs/research/` | 外部実装の調査メモ | 調査時に追記 |
| `docs/Render配備手順.md` | 配備手順 | 配備構成を変えたら更新 |

### 進捗ログの書き方（厳守）

- **既存の内容を書き換えない。** ファイル先頭寄り（最新エントリの直後）に `## YYYY-MM-DD` 節を新規追加する。最新の日付が一番上。
- 各エントリは必ず次の3節を持つ：**実施内容** / **既知の問題・未解決事項** / **次回タスク**。
- 「実施内容」には結果だけでなく**判断の経緯と踏んだバグ**を書く。次のセッションの自分が同じ壁にぶつからないためのファイルであり、コミットログの写しではない。
- 同日に追記する場合は、その日の既存エントリの中に追記する（新しい節を重複して作らない）。

### コミット

- コミットメッセージは日本語。`docs:` 接頭辞は文書のみの変更に使う。機能変更は「対象レイヤー・機能名: 何をしたか」の形（例：`秩父市周辺PLATEAU建物レイヤー: 手動ドラッグのたびの再取得・再描画を解消`）。
- コミット・プッシュはユーザーが指示したときだけ行う。

## 3. システム構成（詳細は仕様書 §4）

```
PLATEAU秩父市2025 CityGML
  → scripts/plateau/（HTTP Range抽出・GeoJSON化）
  → viewer/src/data/plateau/{bldg,road,landslide,flood,landuse}/{3次メッシュコード}.geojson
  → viewer_api/（FastAPI BFF）→ viewer-react/（React + MapLibre GL）

Laravel API（別リポジトリ junhongo-ccs/airway-digitaltwin-db、Render Private Service）
  ← viewer/src/api_client.py（DigitalTwinApiClient）← BFF のみが呼ぶ
```

| ディレクトリ | 役割 | 備考 |
|---|---|---|
| `viewer-react/` | **主系統の Viewer**（React + TS + Vite + Tailwind + MapLibre GL） | 接続先は BFF のみ。`VITE_` 変数はブラウザに埋め込まれるので秘密情報を置かない |
| `viewer_api/` | FastAPI BFF。React からの唯一の接続先 | **Streamlit 非依存を維持する。**判定ロジックは `viewer/src/` から import して共有する（移植・複製しない） |
| `viewer/src/` | 判定・データロジックの本体（Streamlit 版と BFF の共有層） | `altitude.py`（高度判定）`plateau_*.py`（PLATEAU データ）`api_client.py`（Laravel）`target_area.py`（メッシュ計算） |
| `viewer/` (app.py, components/) | 旧 Streamlit Viewer | **廃止方針は未決定。**React 側の変更に自動追随しない。触る前に必要性を確認する |
| `scripts/plateau/` | CityGML 抽出バッチ | `remote_zip.py` が HTTP Range で 580MB ZIP から必要ファイルだけ取得 |
| `_analysis/` | 外部リポジトリのクローン置き場 | `.gitignore` 済み。ライセンスが別なのでコミットしない |

## 4. 開発コマンド

Python はリポジトリ直下から `viewer/.venv` の実行ファイルを直接叩く（`activate` しない）。

```bash
# Python（構文確認・スクリプト実行）
./viewer/.venv/Scripts/python.exe -c "..."

# BFF をローカル起動（React の .env.local が :8001 を見る）
./viewer/.venv/Scripts/python.exe -m uvicorn viewer_api.app:app --reload --port 8001

# Streamlit 版（旧系統）
cd viewer && ./.venv/Scripts/streamlit run app.py   # http://localhost:8501

# React
cd viewer-react && npm run dev      # :5173（Claude Code からは .claude/launch.json の preview を使う）
cd viewer-react && npm run lint     # oxlint
cd viewer-react && npm run build    # tsc -b && vite build
```

- 依存は `viewer/requirements.txt` で**推移的依存まで固定**している。Render のビルド時だけ新しい版が解決されて環境差分バグを踏んだ実績があるため、勝手に緩めない。
- 配備は Render（`render.yaml` の Blueprint）。`airspace-viewer-react` / `airspace-viewer-api` / `airspace-viewer` / `airspace-drone-web` / `airspace-mysql`。

## 5. 既知の落とし穴（再発防止）

実際に踏んで時間を溶かしたもの。詳細と根拠は進捗ログの該当日エントリにある。

- **Laravel API のタイムゾーンは `Asia/Tokyo`。** `timing` パラメータを `now()` で作ると9時間ずれて0件になる。`now('UTC')` を使う。
- **`GET /ground_feature_voxel` は空間IDの完全一致検索のみ**で、分類も外形も返さない（1レイヤ最大1件）。航路判定の根拠には使わない（改善タスク §9 の決定）。判定は `viewer/src/plateau_route_judgment.py` が抽出済み GeoJSON を使って行う。
- **空間IDはズーム17固定の Web Mercator タイル形式 `"z/0/x/y"`。** 航路の bbox は始点だけでなく**始点・終点の両方**から作る（片側だけだと1タイルずれて常に0件）。
- **PLATEAU の高さ欠測値は `-9999` センチネル**（実データの約18%）。`null` に正規化する。
- **MapLibre**：地図の bbox 通知は `style.load` を使う（`load` は環境によって発火しない）。レイヤー更新は `removeLayer`→`addLayer` ではなく `setData()` の差分更新。React 側の state はオブジェクト参照が毎回変わると無駄な再取得を招くので `useMemo` 等で安定させる。
- **Claude Code のブラウザ自動化タブは `visibilityState=hidden`** のため `requestAnimationFrame` が発火せず、**MapLibre の実描画は確認できない。** 描画系の検証は「API・コンソール・ネットワークまで自分で確認 → 実描画はユーザーに確認を依頼」と明示的に切り分ける。確認できていないことを確認できたと書かない。
- **C ドライブの空き容量が枯渇しやすい。** ビルド・HMR を繰り返す作業の前に空き容量を確認する。

## 6. やらないこと

- 仕様書・design.md の記述を他ファイルへ転記する（二重管理禁止）。参照させる。
- 飛行可否・法令適合性・安全性を判断する表現を UI や出力に足す（仕様書 §2-2 の対象外）。
- 土砂災害・洪水浸水を「飛行禁止区域」と同じ意味で扱う（改善タスク §2：これらは**航路活用の可能性**の側の情報）。
- 交差有無の分からない単独件数表示（例：「土砂災害 1件」）。必ず「交差N件」「交差なし（付近にN件）」と明示する。
- 検証していない値を検証済みとして書く。未検証は「未検証」とラベルする（例：建物垂直判定の許容差 ±2m は実測未検証）。
