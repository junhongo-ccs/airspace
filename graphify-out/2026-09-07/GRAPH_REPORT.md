# Graph Report - airspace  (2026-09-07)

## Corpus Check
- 101 files · ~93,421 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1021 nodes · 1429 edges · 97 communities (65 shown, 32 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 42 edges (avg confidence: 0.71)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2915b1c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- extract_ground_features.py
- viewer_api/app.py
- DigitalTwinApiClient
- 空域デジタルツインGIS Viewer デザインガイドライン
- 空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト
- SettingsPanel.tsx
- 空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書
- status_panel.py
- CLAUDE.md
- ドローン航路システム（ODS-IS-UASL）調査メモ
- What You Must Do When Invoked
- results_table.py
- compilerOptions
- ODS-IS-UASL コード実装調査
- MapContainer.tsx
- package.json
- compilerOptions
- Full-Height Filter Sidebar Panel
- graphify reference: query, path, explain
- 実装進捗ログ
- ResultsOverlay.stories.tsx
- devDependencies
- geometry.py
- App.tsx
- 改善タスク：秩父市周辺PLATEAU地物レイヤーと航路影響表示の拡張
- SettingsPanel.stories.tsx
- What You Must Do When Invoked
- resultsContent.tsx
- plugins
- MapContainer Delayed Loading State (Storybook Screenshot)
- graphify reference: extra exports and benchmark
- graphify Skill (SKILL.md)
- graphify reference: extra exports and benchmark
- /graphify
- Streamlit Viewer（PoC）
- graphify reference: query, path, explain
- reviewer.md
- Q: 照会結果・判定結果の アコーディオンについて graphifyで確認して
- ApiError
- low-level-designer.md
- task-check.md
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Step 3 - Extract entities and relationships
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- Map Canvas (OpenStreetMap/MapLibre view)
- Collapse Toggle Button
- React + TypeScript + Vite
- log-today.md
- graphify Video/Audio Transcription Reference
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- MapContainer Component (Storybook Story)
- tsconfig.json
- AGENTS.md
- .codex/skills/graphify/references/extraction-spec.md
- React Version Fixed-Footer Removal Exception (2026-08-07)
- oxlint
- postcss
- playwright
- @storybook/addon-vitest
- api_client.py
- @types/geojson
- @chromatic-com/storybook
- @types/react
- @types/react-dom
- vite
- @vitejs/plugin-react
- vitest
- @storybook/addon-mcp
- main.ts
- preview.tsx
- Progress Log Writing Rules
- Design Decision Priority Order (design.md §11)
- Left Panel / Map / Results Layout (design.md §4)
- Task 7: Route List Feature (Future)
- airspace PoC
- LeftPaneFlow.stories.tsx
- route_form.py
- @storybook/react-vite
- config.py
- typescript
- tailwindcss
- @vitest/browser-playwright

## God Nodes (most connected - your core abstractions)
1. `DigitalTwinApiClient` - 23 edges
2. `compilerOptions` - 18 edges
3. `空域デジタルツインGIS Viewer デザインガイドライン` - 18 edges
4. `compilerOptions` - 15 edges
5. `空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書` - 15 edges
6. `QueryResult` - 14 edges
7. `fetch_entry_bytes()` - 13 edges
8. `judge_route_features()` - 12 edges
9. `mesh3_codes_in_bbox()` - 12 edges
10. `What You Must Do When Invoked` - 12 edges

## Surprising Connections (you probably didn't know these)
- `MapContainer Delayed Loading State (Storybook Screenshot)` --conceptually_related_to--> `storybook`  [EXTRACTED]
  storybook-mapcontainer-delayed.png → viewer-react/package.json
- `query_prohibited_areas_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `register_route_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `Commit Message Rules` --conceptually_related_to--> `Improvement Task: Chichibu PLATEAU Building Layer`  [INFERRED]
  CLAUDE.md → docs/改善タスク_秩父市周辺PLATEAU建物レイヤー.md
- `Known Pitfalls (Recurrence Prevention)` --conceptually_related_to--> `Progress Log Entry 2026-08-19 (cache/abort bug fixes, CORS, rate limiting)`  [INFERRED]
  CLAUDE.md → docs/進捗ログ.md

## Import Cycles
- 3-file cycle: `viewer-react/src/App.tsx -> viewer-react/src/components/ResultsOverlay.tsx -> viewer-react/src/components/resultsContent.tsx -> viewer-react/src/App.tsx`

## Hyperedges (group relationships)
- **Airspace Project Documentation Governance System** — claude_document_roles, docs_progress_log, docs_design, docs_implementation_task_list, docs_improvement_task_chichibu_plateau_building_layer [EXTRACTED 1.00]
- **Landuse Layer Color Token Design-to-Implementation Flow** — docs_design_map_landuse_token, docs_improvement_task_chichibu_plateau_building_layer_task_6_6a, docs_progress_log_20260820 [EXTRACTED 1.00]
- **graphify save-result Work-Memory Loop** — claude_skills_graphify_references_query_save_result, graphify_out_memory_query_20260819_034046_why_does_digitaltwinapiclient_connect_extraction_e, graphify_out_memory_query_20260819_080515_accordion_query_judgment_results, graphify_out_memory_query_20260819_082319_when_the_application_is_loading_map_layers_show_a [INFERRED 0.85]

## Communities (97 total, 32 thin omitted)

### Community 0 - "extract_ground_features.py"
Cohesion: 0.05
Nodes (66): Pattern, RawIOBase, load_codelist(), parse_codelist(), PLATEAU CityGMLのコードリスト（`codelists/*.xml`）を読み、コード→日本語名の辞書にする。…, gml:Dictionaryのbytesから{コード値: 日本語名}を返す。, `codelists/{codelist_name}.xml`を取得してパースする。, _building_to_feature() (+58 more)

### Community 1 - "viewer_api/app.py"
Cohesion: 0.05
Nodes (65): BaseModel, get, post, Request, _base_url(), _bbox(), _bbox_overlap(), buildings_endpoint() (+57 more)

### Community 2 - "DigitalTwinApiClient"
Cohesion: 0.13
Nodes (13): Response, _center_spatial_id(), DigitalTwinApiClient, _now_mysql_datetime(), ('connected' / 'disconnected' / 'error', 理由) を返す。 実コード確認済み: GET /drone_route は…, connected' / 'disconnected' / 'error' のいずれかを返す。, bbox = (min_lat, min_lon, max_lat, max_lon) Phase…, 実コード確認済み（AreaObjectController::set_area_object_masters）。 featuresはGeoJSON… (+5 more)

### Community 3 - "空域デジタルツインGIS Viewer デザインガイドライン"
Cohesion: 0.05
Nodes (44): 10-1. 空状態・エラー・処理中, 10. フォームと操作, 11. 判断基準, 12. アクセシビリティ, 13-1. カード, 13-2. アイコン, 13. カード・アイコンの利用, 14. Streamlit実装時の許容差 (+36 more)

### Community 4 - "空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト"
Cohesion: 0.05
Nodes (39): 1. Blueprintを同期する, 2. 環境変数を設定する, 3. マイグレーションの確認, 4. 動作確認, 5. 既知の制約・今後の課題, airspace-drone-web, airspace-mysql, airspace-viewer (+31 more)

### Community 5 - "SettingsPanel.tsx"
Cohesion: 0.15
Nodes (18): 左ペイン結果オーバーレイ改善計画 (Left Pane Results Overlay Improvement Plan), App.tsx relative h-full wrapper with SettingsPanel and ResultsOverlay as sibling elements, CollapsibleSidebar.tsx requires no changes (existing relative/overflow-hidden suffices), Overlay positioning: absolute inset-0 within existing relative/overflow-hidden clip region (no position:fixed), ResultsOverlay.tsx (planned new left-pane-specific overlay component), SettingsPanel: parent-container inert/aria-hidden approach (no disabled prop on SettingsPanel), Verification: Tab key focus must not reach background form controls while results overlay is shown, View state management: input/loading/result view states replace showResults boolean (+10 more)

### Community 6 - "空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書"
Cohesion: 0.05
Nodes (37): 10-1. ローカル検証, 10-2. Render配備, 10-3. フォールバックと撤退基準, 10. 配備方針, 11. 受入基準, 12. 未決定事項と事前調査項目, 13. 参照先, 14-1. 初回コードリーディングによる根拠 (+29 more)

### Community 7 - "status_panel.py"
Cohesion: 0.15
Nodes (15): design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。, design.md §9-1: 左設定パネル最上部に常時表示。色だけに依存せず状態文字列を併記する。, design.md §9-1: 対象空間ID／ボクセル解像度を表示する。ユーザー入力ではなく、 始点・終点・AGLから算出した値を表示する（仕様書§8）。…, design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。…, design.md §9-3: 画面右上に常時表示（仕様書§6-1）。, render_altitude_verification_status(), render_connection_status(), render_poc_badge() (+7 more)

### Community 8 - "CLAUDE.md"
Cohesion: 0.11
Nodes (25): 1. セッション開始時に必ずやること, 2. ドキュメントの役割と更新ルール, 3. システム構成（詳細は仕様書 §4）, 4. 開発コマンド, 5. 既知の落とし穴（再発防止）, 6. やらないこと, Commit Message Rules, Development Commands (+17 more)

### Community 9 - "ドローン航路システム（ODS-IS-UASL）調査メモ"
Cohesion: 0.08
Nodes (25): 0. 3行サマリ, 10. 出典, 1-1. 推進体制, 1-2. 用語, 1-3. ODS-RAM の構成（GitHub `open-dataspaces` の記載より）, 1. 背景 — ウラノス・エコシステムとOpen Data Spaces, 2. ODS-IS-UASL の基本情報, 3. 全18リポジトリ (+17 more)

### Community 10 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 11 - "results_table.py"
Cohesion: 0.14
Nodes (19): DataFrame, evaluate_agl_legal_limit(), evaluate_building_vertical(), 建物のmeasuredHeightとAGLを比較し、交差・詳細表の「交差判定」文言を返す。…, AGLが航空法上の150m高度制限に抵触するかを判定する（空間データ不要）。, _bbox(), _bbox_overlap(), build_result_rows() (+11 more)

### Community 12 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 13 - "ODS-IS-UASL コード実装調査"
Cohesion: 0.09
Nodes (22): 1. 結論, 2. 実装上の全体像, 3-1. 航路予約：`airway-reservation`, 3-2. 航路画定：`airway-design`, 3-3. 安全管理：`safety-management`, 3-4. 機体・離着陸場資産：`asset`, 3-5. 外部連携：`external`, 3-6. ユーザ・事業者管理：`user-management` (+14 more)

### Community 14 - "MapContainer.tsx"
Cohesion: 0.10
Nodes (24): ALL_LAYERS_VISIBLE, BUILDING_LAYER_IDS, BUILDING_SOURCE_IDS, EMPTY_GROUND_FEATURES, ensureDiagonalHatchPattern(), ensureHatchPattern(), GROUND_FEATURE_LAYER_KEYS, GROUND_LAYER_STYLE (+16 more)

### Community 15 - "package.json"
Cohesion: 0.10
Nodes (20): maplibre-gl, react, react-dom, react-icons, dependencies, maplibre-gl, react, react-dom (+12 more)

### Community 16 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 17 - "Full-Height Filter Sidebar Panel"
Cohesion: 0.14
Nodes (20): Flight Altitude Input (飛行高度 AGL, m), Altitude Validation Message (150m未満・ほかの要件は未確認), Connection Status Indicator (接続済み / http://localhost:8001), End Point Latitude/Longitude (終点), Route Filter Sidebar Panel, Altitude Requirement Note (150m未満・ほかの要件は未確認), End Point Lat/Lng Fields (終点 緯度・経度), Flight Altitude Input (飛行高度 AGL・地上高) (+12 more)

### Community 18 - "graphify reference: query, path, explain"
Cohesion: 0.11
Nodes (19): graphify Query/Path/Explain Reference, For /graphify explain, For /graphify path, graphify reference: query, path, explain, graphify save-result Work-Memory Loop, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal, System Architecture (PLATEAU to BFF to React, Laravel API) (+11 more)

### Community 19 - "実装進捗ログ"
Cohesion: 0.31
Nodes (17): 2026-08-05, 2026-08-06, 2026-08-06（続き）, 2026-08-06（続き・その2）, 2026-08-06（続き・その3）, 2026-08-06（続き・その4）, 2026-08-07, 2026-08-17 (+9 more)

### Community 20 - "ResultsOverlay.stories.tsx"
Cohesion: 0.08
Nodes (29): GroundFeature, NearbyFeatureSummary, ProhibitedArea, QueryResult, datasetMeta, EmptyResult, ErrorState, features (+21 more)

### Community 21 - "devDependencies"
Cohesion: 0.18
Nodes (11): autoprefixer, @storybook/addon-a11y, @storybook/addon-docs, @types/node, devDependencies, autoprefixer, @storybook/addon-a11y, @storybook/addon-docs (+3 more)

### Community 22 - "geometry.py"
Cohesion: 0.25
Nodes (14): Point, _cross(), _on_segment(), _point_in_ring(), _point_in_rings(), 線分（航路）とGeoJSON Polygon/MultiPolygonの実交差判定。…, p・r と共線であることが分かっている点qが、線分p-r上（bbox内）にあるか。, 線分p1-p2と線分p3-p4が交差するか（端点での接触・共線上の重なりも交差とみなす）。 (+6 more)

### Community 23 - "App.tsx"
Cohesion: 0.17
Nodes (25): react, ApiResponse, BboxFeatureResult, describeError(), DroneRoute, getBuildingsInBbox(), getConnectionStatus(), getFlightProhibitedAreas() (+17 more)

### Community 24 - "改善タスク：秩父市周辺PLATEAU地物レイヤーと航路影響表示の拡張"
Cohesion: 0.15
Nodes (12): 1. 背景, 2. 目的, 3. 完了後の利用イメージ, 4. 対象範囲, 5. 着手前に決めること, 6. 実装タスク, 7. 受入条件, 8. 技術方針と留意点 (+4 more)

### Community 25 - "SettingsPanel.stories.tsx"
Cohesion: 0.12
Nodes (16): Connected, connectedStatus, ConnectionChecking, ConnectionError, CssCheck, errorStatus, HighAltitudeWarning, Loading (+8 more)

### Community 26 - "What You Must Do When Invoked"
Cohesion: 0.18
Nodes (11): Step 0 - GitHub repos and multi-path merge (only if a URL or several paths), Step 1 - Ensure graphify is installed, Step 2.5 - Video and audio (only if video files detected), Step 2 - Detect files, Step 4.5 - Graph health check (read-only integrity gate), Step 4 - Build graph, cluster, analyze, generate outputs, Step 5 - Label communities, Step 6 - Generate Obsidian vault (opt-in) + HTML (+3 more)

### Community 27 - "resultsContent.tsx"
Cohesion: 0.26
Nodes (11): GroundFeatureGroup, buildingHeightSummary(), GROUP_LABELS, GROUP_ORDER, LAYER_LABELS, AccordionIcon(), JudgmentDetailBody(), JudgmentDetailBodyProps (+3 more)

### Community 28 - "plugins"
Cohesion: 0.22
Nodes (8): oxc, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 29 - "MapContainer Delayed Loading State (Storybook Screenshot)"
Cohesion: 0.27
Nodes (10): storybook, MapContainer Delayed Loading State (Storybook Screenshot), Chichibu, Saitama, Japan (Map Location), Delayed Loading State, Legend Dropdown Control (凡例), MapContainer Component, MapLibre, OpenStreetMap Contributors (+2 more)

### Community 30 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (9): graphify Exports Reference, graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag) (+1 more)

### Community 31 - "graphify Skill (SKILL.md)"
Cohesion: 0.22
Nodes (9): graphify Extraction Subagent Prompt Spec, graphify reference: extraction subagent prompt (compact), graphify GitHub Clone & Cross-Repo Merge Reference, graphify reference: GitHub clone and cross-repo merge, Step 0 - Clone GitHub repo(s) (only if a GitHub URL was given), graphify Skill (SKILL.md), graphify Extraction Pipeline (AST + Semantic, Step 3), Honesty Rules (+1 more)

### Community 32 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 33 - "/graphify"
Cohesion: 0.25
Nodes (8): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Interpreter guard for subcommands, Usage, What graphify is for

### Community 34 - "Streamlit Viewer（PoC）"
Cohesion: 0.29
Nodes (6): Streamlit Viewer（PoC）, セットアップ, ディレクトリ構成, 未実装・既知の制約（`docs/実装タスクリスト.md` 参照）, 現在の状態, 起動

### Community 35 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 36 - "reviewer.md"
Cohesion: 0.40
Nodes (4): 一般観点, 出力形式, 手順, 観点（本プロジェクト固有・優先）

### Community 37 - "Q: 照会結果・判定結果の アコーディオンについて graphifyで確認して"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 照会結果・判定結果の アコーディオンについて graphifyで確認して, Source Nodes

### Community 39 - "low-level-designer.md"
Cohesion: 0.50
Nodes (3): 出力形式, 守るべき構造上の制約, 手順

### Community 40 - "task-check.md"
Cohesion: 0.50
Nodes (3): 出力形式, 報告する乖離, 手順

### Community 41 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (4): graphify add & --watch Reference, For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 42 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 43 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 44 - "Step 3 - Extract entities and relationships"
Cohesion: 0.50
Nodes (4): Part A - Structural extraction for code files, Part B - Semantic extraction (parallel subagents), Part C - Merge AST + semantic into final extraction, Step 3 - Extract entities and relationships

### Community 45 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 46 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 47 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 48 - "Map Canvas (OpenStreetMap/MapLibre view)"
Cohesion: 0.50
Nodes (4): OpenStreetMap/MapLibre Attribution Footer, Legend Dropdown Control (凡例), Map Canvas (OpenStreetMap/MapLibre view), Collapsed Sidebar Toggle Button

### Community 49 - "Collapse Toggle Button"
Cohesion: 1.00
Nodes (4): Collapse Toggle Button, Filter Pane (フィルタ / Left Pane), Map Area (地図領域), Collapsible Sidebar Storybook Screenshot

### Community 50 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

### Community 52 - "graphify Video/Audio Transcription Reference"
Cohesion: 0.67
Nodes (3): graphify Video/Audio Transcription Reference, graphify reference: transcribe video and audio, Step 2.5 - Transcribe video / audio files (only if video files detected)

### Community 64 - "api_client.py"
Cohesion: 0.13
Nodes (18): extract_building_id(), extract_prohibited_area_id(), _load_json(), lookup_building_footprint(), lookup_building_height(), lookup_prohibited_area_geometry(), Path, 仕様書§5-3: 高度基準の統一。 前提条件（§5-3の1〜3）の記録: 1. 座標参照系・単位・時点 -… (+10 more)

### Community 89 - "LeftPaneFlow.stories.tsx"
Cohesion: 0.12
Nodes (18): buildResult(), ConfirmedRoute, datasetMeta, ErrorOutcome, FullFlow, LeftPaneDemo(), meta, Outcome (+10 more)

### Community 90 - "route_form.py"
Cohesion: 0.23
Nodes (11): _bbox_from_route(), _default_base_url(), _handle_query(), _handle_register(), _handle_register_area(), design.md §4-1・§10: 左設定パネル（API状態・評価状態・航路設定・レイヤ選択・登録・照会）。, design.md §10: 実行前の件数・対象レイヤはサイドバーのcaptionで既に明示済み。 ここでは実行後の結果件数とAPI応答時刻を記録する。, 4つの取得元（航路・地物ボクセル・注意区域・禁止区域）はそれぞれ独立したAPI… (+3 more)

### Community 92 - "config.py"
Cohesion: 0.13
Nodes (9): 空域デジタルツインGIS Viewer（PoC） design.md（v1.2）のレイアウト・カラー・タイポグラフィ・状態表示規定と、 `ドローン航路GIS-…, 簡易アクセスゲート。 仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」に対応する。…, design.md §7, §8: 地図表示。 レイヤ色は design.md §5-3 のトークンをそのまま使用する。ただし塗りパターン…, アプリ全体の定数。 免責文言は `ドローン航路GIS-PoC_仕様書.md` §2-2 を正文とする。 design.md §9-4…, disclaimer_footer_html(), disclaimer_inline_html(), design.md のカラートークン・タイポグラフィ・レイアウトをCSSとして注入する。 対応表： - §5-1〜§5-4 カラートークン - §6…, design.md §9-4: 仕様書§2-2の文言をそのまま表示する。文言の保持は config.py の1箇所のみ。 (+1 more)

## Ambiguous Edges - Review These
- `MapContainer Component (Storybook Story)` → `Storybook Loading Spinner State`  [AMBIGUOUS]
  storybook-mapcontainer.png · relation: conceptually_related_to
- `Task 6-11: Route Impact Text + Real Line-Polygon Intersection` → `Progress Log Entry 2026-08-18 (CLAUDE.md, hooks, subagents, accordion aggregation)`  [AMBIGUOUS]
  docs/改善タスク_秩父市周辺PLATEAU建物レイヤー.md · relation: conceptually_related_to

## Knowledge Gaps
- **437 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+432 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `MapContainer Component (Storybook Story)` and `Storybook Loading Spinner State`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Task 6-11: Route Impact Text + Real Line-Polygon Intersection` and `Progress Log Entry 2026-08-18 (CLAUDE.md, hooks, subagents, accordion aggregation)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Implementation Task List (実装タスクリスト.md)` connect `CLAUDE.md` to `SettingsPanel.tsx`?**
  _High betweenness centrality (0.066) - this node is a cross-community bridge._
- **Why does `左ペイン結果オーバーレイ改善計画 (Left Pane Results Overlay Improvement Plan)` connect `SettingsPanel.tsx` to `CLAUDE.md`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `airspace/README.md` connect `空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト` to `CLAUDE.md`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _437 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `extract_ground_features.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05297334244702666 - nodes in this community are weakly interconnected._