# Graph Report - airspace  (2026-08-19)

## Corpus Check
- 91 files · ~57,233 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 906 nodes · 1196 edges · 70 communities (58 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 16 edges (avg confidence: 0.56)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ecb048e7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- viewer_api/app.py
- MapContainer.tsx
- DigitalTwinApiClient
- extract_ground_features.py
- devDependencies
- status_panel.py
- query_features_endpoint
- compilerOptions
- compilerOptions
- geometry.py
- What You Must Do When Invoked
- What You Must Do When Invoked
- 空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト
- plugins
- 空域デジタルツインGIS Viewer デザインガイドライン
- 実装進捗ログ
- tsconfig.json
- 空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書
- ドローン航路システム（ODS-IS-UASL）調査メモ
- ODS-IS-UASL コード実装調査
- 改善タスク：秩父市周辺PLATEAU地物レイヤーと航路影響表示の拡張
- App.tsx
- CLAUDE.md
- graphify reference: extra exports and benchmark
- altitude.py
- Streamlit Viewer（PoC）
- graphify reference: query, path, explain
- airspace PoC
- reviewer.md
- graphify reference: extra exports and benchmark
- low-level-designer.md
- task-check.md
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- log-today.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- AGENTS.md
- .codex/skills/graphify/references/extraction-spec.md
- graphify reference: query, path, explain
- Q: Why does DigitalTwinApiClient connect Extraction error handling to API data models?
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md
- client.ts
- ResultsPanel.stories.tsx
- SettingsPanel.stories.tsx
- package.json
- main.ts
- preview.tsx
- results_table.py
- SettingsPanel.tsx
- get
- get_ground_features_in_bbox
- get_buildings_in_bbox
- React + TypeScript + Vite

## God Nodes (most connected - your core abstractions)
1. `DigitalTwinApiClient` - 23 edges
2. `compilerOptions` - 18 edges
3. `空域デジタルツインGIS Viewer デザインガイドライン` - 18 edges
4. `compilerOptions` - 15 edges
5. `空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書` - 15 edges
6. `fetch_entry_bytes()` - 13 edges
7. `judge_route_features()` - 12 edges
8. `mesh3_codes_in_bbox()` - 12 edges
9. `What You Must Do When Invoked` - 12 edges
10. `What You Must Do When Invoked` - 12 edges

## Surprising Connections (you probably didn't know these)
- `query_features_endpoint()` --uses--> `BboxTooLargeError`  [INFERRED]
  viewer_api/app.py → viewer/src/plateau_buildings.py
- `query_features_endpoint()` --uses--> `BboxTooLargeError`  [INFERRED]
  viewer_api/app.py → viewer/src/plateau_ground_features.py
- `query_prohibited_areas_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `register_route_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `_client()` --calls--> `DigitalTwinApiClient`  [EXTRACTED]
  viewer_api/app.py → viewer/src/api_client.py

## Import Cycles
- None detected.

## Communities (70 total, 12 thin omitted)

### Community 0 - "viewer_api/app.py"
Cohesion: 0.12
Nodes (26): BaseModel, Exception, Request, _base_url(), _bbox(), _bbox_overlap(), _client(), connection_status_endpoint() (+18 more)

### Community 1 - "MapContainer.tsx"
Cohesion: 0.10
Nodes (23): ALL_LAYERS_VISIBLE, BUILDING_LAYER_IDS, BUILDING_SOURCE_IDS, EMPTY_GROUND_FEATURES, ensureDiagonalHatchPattern(), ensureHatchPattern(), GROUND_FEATURE_LAYER_KEYS, GROUND_LAYER_STYLE (+15 more)

### Community 2 - "DigitalTwinApiClient"
Cohesion: 0.05
Nodes (44): Response, extract_building_id(), extract_prohibited_area_id(), lookup_building_footprint(), lookup_building_height(), lookup_prohibited_area_geometry(), voxelBitFileName（`flight_prohibited_area/{flightProhibitedAreaId}.json`）から…, flightProhibitedAreaIdから[lat, lon]の閉じたリングのリスト（MultiPolygon、… (+36 more)

### Community 3 - "extract_ground_features.py"
Cohesion: 0.05
Nodes (66): Pattern, RawIOBase, load_codelist(), parse_codelist(), PLATEAU CityGMLのコードリスト（`codelists/*.xml`）を読み、コード→日本語名の辞書にする。…, gml:Dictionaryのbytesから{コード値: 日本語名}を返す。, `codelists/{codelist_name}.xml`を取得してパースする。, _building_to_feature() (+58 more)

### Community 4 - "devDependencies"
Cohesion: 0.04
Nodes (45): autoprefixer, @chromatic-com/storybook, oxlint, playwright, postcss, storybook, @storybook/addon-a11y, @storybook/addon-docs (+37 more)

### Community 5 - "status_panel.py"
Cohesion: 0.09
Nodes (19): 空域デジタルツインGIS Viewer（PoC） design.md（v1.2）のレイアウト・カラー・タイポグラフィ・状態表示規定と、 `ドローン航路GIS-…, 簡易アクセスゲート。 仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」に対応する。…, design.md §7, §8: 地図表示。 レイヤ色は design.md §5-3 のトークンをそのまま使用する。ただし塗りパターン…, design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。, design.md §9-1: 左設定パネル最上部に常時表示。色だけに依存せず状態文字列を併記する。, design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。…, design.md §9-3: 画面右上に常時表示（仕様書§6-1）。, render_altitude_verification_status() (+11 more)

### Community 6 - "query_features_endpoint"
Cohesion: 0.25
Nodes (7): post, query_features_endpoint(), 航路（始点・終点）周辺の建物・道路・土砂災害・洪水浸水・土地利用を判定する（6-11）。…, evaluate_agl_legal_limit(), AGLが航空法上の150m高度制限に抵触するかを判定する（空間データ不要）。, plateau_dataset_meta(), 6-6a/6-10: PLATEAU秩父市2025データセットの出典・データ時点。…

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 9 - "geometry.py"
Cohesion: 0.25
Nodes (14): Point, _cross(), _on_segment(), _point_in_ring(), _point_in_rings(), 線分（航路）とGeoJSON Polygon/MultiPolygonの実交差判定。…, p・r と共線であることが分かっている点qが、線分p-r上（bbox内）にあるか。, 線分p1-p2と線分p3-p4が交差するか（端点での接触・共線上の重なりも交差とみなす）。 (+6 more)

### Community 10 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 11 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 12 - "空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト"
Cohesion: 0.05
Nodes (38): 1. Blueprintを同期する, 2. 環境変数を設定する, 3. マイグレーションの確認, 4. 動作確認, 5. 既知の制約・今後の課題, airspace-drone-web, airspace-mysql, airspace-viewer (+30 more)

### Community 13 - "plugins"
Cohesion: 0.22
Nodes (8): oxc, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 14 - "空域デジタルツインGIS Viewer デザインガイドライン"
Cohesion: 0.05
Nodes (44): 10-1. 空状態・エラー・処理中, 10. フォームと操作, 11. 判断基準, 12. アクセシビリティ, 13-1. カード, 13-2. アイコン, 13. カード・アイコンの利用, 14. Streamlit実装時の許容差 (+36 more)

### Community 15 - "実装進捗ログ"
Cohesion: 0.05
Nodes (39): 2026-08-05, 2026-08-06, 2026-08-06（続き）, 2026-08-06（続き・その2）, 2026-08-06（続き・その3）, 2026-08-06（続き・その4）, 2026-08-07, 2026-08-17 (+31 more)

### Community 17 - "空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書"
Cohesion: 0.05
Nodes (37): 10-1. ローカル検証, 10-2. Render配備, 10-3. フォールバックと撤退基準, 10. 配備方針, 11. 受入基準, 12. 未決定事項と事前調査項目, 13. 参照先, 14-1. 初回コードリーディングによる根拠 (+29 more)

### Community 18 - "ドローン航路システム（ODS-IS-UASL）調査メモ"
Cohesion: 0.08
Nodes (25): 0. 3行サマリ, 10. 出典, 1-1. 推進体制, 1-2. 用語, 1-3. ODS-RAM の構成（GitHub `open-dataspaces` の記載より）, 1. 背景 — ウラノス・エコシステムとOpen Data Spaces, 2. ODS-IS-UASL の基本情報, 3. 全18リポジトリ (+17 more)

### Community 19 - "ODS-IS-UASL コード実装調査"
Cohesion: 0.09
Nodes (22): 1. 結論, 2. 実装上の全体像, 3-1. 航路予約：`airway-reservation`, 3-2. 航路画定：`airway-design`, 3-3. 安全管理：`safety-management`, 3-4. 機体・離着陸場資産：`asset`, 3-5. 外部連携：`external`, 3-6. ユーザ・事業者管理：`user-management` (+14 more)

### Community 20 - "改善タスク：秩父市周辺PLATEAU地物レイヤーと航路影響表示の拡張"
Cohesion: 0.15
Nodes (12): 1. 背景, 2. 目的, 3. 完了後の利用イメージ, 4. 対象範囲, 5. 着手前に決めること, 6. 実装タスク, 7. 受入条件, 8. 技術方針と留意点 (+4 more)

### Community 24 - "App.tsx"
Cohesion: 0.29
Nodes (9): GroundFeatureLayerKey, KnownProhibitedArea, PlateauBuildingFeature, PlateauDatasetMeta, PlateauGroundFeature, boundsContain(), GROUND_FEATURE_LAYERS, padBounds() (+1 more)

### Community 25 - "CLAUDE.md"
Cohesion: 0.20
Nodes (8): 1. セッション開始時に必ずやること, 2. ドキュメントの役割と更新ルール, 3. システム構成（詳細は仕様書 §4）, 4. 開発コマンド, 5. 既知の落とし穴（再発防止）, 6. やらないこと, コミット, 進捗ログの書き方（厳守）

### Community 26 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 27 - "altitude.py"
Cohesion: 0.16
Nodes (15): evaluate_building_vertical(), _load_json(), Path, 仕様書§5-3: 高度基準の統一。 前提条件（§5-3の1〜3）の記録: 1. 座標参照系・単位・時点 -…, 建物のmeasuredHeightとAGLを比較し、交差・詳細表の「交差判定」文言を返す。…, _bbox_overlap(), _ground_feature_sentence(), judge_route_features() (+7 more)

### Community 28 - "Streamlit Viewer（PoC）"
Cohesion: 0.29
Nodes (6): Streamlit Viewer（PoC）, セットアップ, ディレクトリ構成, 未実装・既知の制約（`docs/実装タスクリスト.md` 参照）, 現在の状態, 起動

### Community 29 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 31 - "reviewer.md"
Cohesion: 0.40
Nodes (4): 一般観点, 出力形式, 手順, 観点（本プロジェクト固有・優先）

### Community 32 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 34 - "low-level-designer.md"
Cohesion: 0.50
Nodes (3): 出力形式, 守るべき構造上の制約, 手順

### Community 36 - "task-check.md"
Cohesion: 0.50
Nodes (3): 出力形式, 報告する乖離, 手順

### Community 37 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 38 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 39 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 48 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 49 - "Q: Why does DigitalTwinApiClient connect Extraction error handling to API data models?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Why does DigitalTwinApiClient connect Extraction error handling to API data models?, Source Nodes

### Community 50 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 51 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 52 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 56 - "client.ts"
Cohesion: 0.26
Nodes (15): ApiResponse, BboxFeatureResult, describeError(), DroneRoute, getBuildingsInBbox(), getConnectionStatus(), getFlightProhibitedAreas(), getGroundFeatures() (+7 more)

### Community 57 - "ResultsPanel.stories.tsx"
Cohesion: 0.11
Nodes (21): GroundFeature, GroundFeatureGroup, NearbyFeatureSummary, ProhibitedArea, QueryResult, GROUP_LABELS, GROUP_ORDER, LAYER_LABELS (+13 more)

### Community 58 - "SettingsPanel.stories.tsx"
Cohesion: 0.13
Nodes (14): Connected, connectedStatus, ConnectionChecking, ConnectionError, CssCheck, errorStatus, HighAltitudeWarning, Loading (+6 more)

### Community 59 - "package.json"
Cohesion: 0.10
Nodes (20): maplibre-gl, react, react-dom, react-icons, dependencies, maplibre-gl, react, react-dom (+12 more)

### Community 63 - "results_table.py"
Cohesion: 0.17
Nodes (15): DataFrame, _bbox(), _bbox_overlap(), build_result_rows(), design.md §7・§7-1: 結果テーブル。§10-1: 空状態・エラー・処理中表示。 §4-1:…, design.md §4-1「交差・詳細表／ダウンロード」エリア。, design.md §9-4: ダウンロード出力にも免責文言を同一文字列で含める。, design.md §4-1「登録・照会結果」エリア（登録側）。 (+7 more)

### Community 65 - "SettingsPanel.tsx"
Cohesion: 0.38
Nodes (5): react, ConnectionStatus, describeConnection(), SettingsPanel(), SettingsPanelProps

### Community 67 - "get"
Cohesion: 0.18
Nodes (11): get, health_check(), known_buildings_endpoint(), known_prohibited_areas_endpoint(), Render のヘルスチェック用。Laravel には触らない。, ジオメトリを再取得済みの飛行禁止区域を、Laravelへの照会なしで返す。 航路を登録・照会する前から地図に危険区域を表示できるようにするための…, 地図描画可能な建物を、Laravelへの照会なしで返す。 PLATEAU秩父市2025から抽出したPhase B投入分29件（mesh…, list_known_buildings() (+3 more)

### Community 71 - "get_ground_features_in_bbox"
Cohesion: 0.39
Nodes (8): ground_features_bbox_endpoint(), 地図表示範囲（bbox）内の道路・土砂災害・洪水浸水・土地利用を返す（6-6a）。…, BboxTooLargeError, get_ground_features_in_bbox(), ValueError, 6-6a: 地図表示範囲（bbox）に対応した道路・土砂災害・洪水浸水・土地利用の読み込み。 `plateau_buildings.py`（6-…, bboxと交差する3次メッシュの指定レイヤーGeoJSON Featureを結合して返す。, UnknownLayerError

### Community 72 - "get_buildings_in_bbox"
Cohesion: 0.36
Nodes (7): buildings_endpoint(), 地図表示範囲（bbox）内の建物を返す（6-5）。 `/known_buildings`（固定29件、mesh 53397062限定）を置き換える、秩父市周辺…, BboxTooLargeError, get_buildings_in_bbox(), ValueError, 6-5: 地図表示範囲（bbox）に対応した建物データの読み込み。 `scripts/plateau/extract_buildings.py`が生成した…, bboxと交差する3次メッシュの建物GeoJSON Featureを結合して返す。

### Community 73 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **408 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+403 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DigitalTwinApiClient` connect `DigitalTwinApiClient` to `viewer_api/app.py`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `空域デジタルツインGIS Viewer デザインガイドライン` connect `空域デジタルツインGIS Viewer デザインガイドライン` to `空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `実装進捗ログ` connect `実装進捗ログ` to `空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _408 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `viewer_api/app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `MapContainer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10461538461538461 - nodes in this community are weakly interconnected._
- **Should `DigitalTwinApiClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05478750640040963 - nodes in this community are weakly interconnected._