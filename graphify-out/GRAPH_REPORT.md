# Graph Report - airspace  (2026-08-19)

## Corpus Check
- 85 files · ~56,048 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 558 nodes · 831 edges · 56 communities (30 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4479767b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- viewer_api/app.py
- MapContainer.tsx
- DigitalTwinApiClient
- extract_ground_features.py
- devDependencies
- status_panel.py
- altitude.py
- compilerOptions
- compilerOptions
- geometry.py
- What You Must Do When Invoked
- graphify skill
- _CachedRegionFile
- plugins
- design
- airway-reservation
- tsconfig.json
- log-today
- ODS-IS-UASL implementation research
- DIPS 2.0
- ODS-IS-UASL
- project guidance
- 秩父市周辺PLATEAU建物レイヤー改善タスク
- 空域デジタルツイン活用・ドローン航路GIS-PoC 仕様書
- 空域デジタルツイン活用・ドローン航路GIS-PoC 実装タスクリスト
- 進捗ログ
- Render deployment
- airspace PoC
- Render Blueprint
- graphify reference: extra exports and benchmark
- FastAPI BFF Python Dependencies
- Layered isometric platform illustration
- React logo
- Vite logo
- React Viewer HTML Entry
- Vite favicon
- Social and documentation icon sprite
- React + TypeScript + Vite README
- Streamlit Viewer Python Dependencies
- Streamlit Viewer README
- graphify reference: query, path, explain
- Q: Why does DigitalTwinApiClient connect Extraction error handling to API data models?
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- extraction-spec.md

## God Nodes (most connected - your core abstractions)
1. `DigitalTwinApiClient` - 23 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `fetch_entry_bytes()` - 13 edges
5. `What You Must Do When Invoked` - 12 edges
6. `judge_route_features()` - 12 edges
7. `mesh3_codes_in_bbox()` - 12 edges
8. `App()` - 11 edges
9. `/graphify` - 10 edges
10. `_CachedRegionFile` - 10 edges

## Surprising Connections (you probably didn't know these)
- `query_prohibited_areas_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `register_route_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `buildings_endpoint()` --uses--> `BboxTooLargeError`  [INFERRED]
  viewer_api/app.py → viewer/src/plateau_buildings.py
- `query_features_endpoint()` --uses--> `BboxTooLargeError`  [INFERRED]
  viewer_api/app.py → viewer/src/plateau_buildings.py
- `ground_features_bbox_endpoint()` --uses--> `BboxTooLargeError`  [INFERRED]
  viewer_api/app.py → viewer/src/plateau_ground_features.py

## Import Cycles
- None detected.

## Communities (56 total, 26 thin omitted)

### Community 0 - "viewer_api/app.py"
Cohesion: 0.06
Nodes (55): BaseModel, get, post, Request, _base_url(), _bbox(), _bbox_overlap(), buildings_endpoint() (+47 more)

### Community 1 - "MapContainer.tsx"
Cohesion: 0.06
Nodes (58): react, ApiResponse, BboxFeatureResult, ConnectionStatus, describeError(), DroneRoute, getBuildingsInBbox(), getConnectionStatus() (+50 more)

### Community 2 - "DigitalTwinApiClient"
Cohesion: 0.05
Nodes (46): Exception, Response, extract_building_id(), extract_prohibited_area_id(), lookup_building_footprint(), lookup_building_height(), lookup_prohibited_area_geometry(), voxelBitFileName（`flight_prohibited_area/{flightProhibitedAreaId}.json`）から… (+38 more)

### Community 3 - "extract_ground_features.py"
Cohesion: 0.06
Nodes (63): Pattern, load_codelist(), parse_codelist(), PLATEAU CityGMLのコードリスト（`codelists/*.xml`）を読み、コード→日本語名の辞書にする。…, gml:Dictionaryのbytesから{コード値: 日本語名}を返す。, `codelists/{codelist_name}.xml`を取得してパースする。, _building_to_feature(), _extract_building_geometry() (+55 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (39): autoprefixer, maplibre-gl, oxlint, postcss, react, react-dom, @types/geojson, @types/node (+31 more)

### Community 5 - "status_panel.py"
Cohesion: 0.09
Nodes (19): 空域デジタルツインGIS Viewer（PoC） design.md（v1.2）のレイアウト・カラー・タイポグラフィ・状態表示規定と、 `ドローン航路GIS-…, 簡易アクセスゲート。 仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」に対応する。…, design.md §7, §8: 地図表示。 レイヤ色は design.md §5-3 のトークンをそのまま使用する。ただし塗りパターン…, design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。, design.md §9-1: 左設定パネル最上部に常時表示。色だけに依存せず状態文字列を併記する。, design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。…, design.md §9-3: 画面右上に常時表示（仕様書§6-1）。, render_altitude_verification_status() (+11 more)

### Community 6 - "altitude.py"
Cohesion: 0.08
Nodes (32): DataFrame, evaluate_agl_legal_limit(), evaluate_building_vertical(), _load_json(), Path, 仕様書§5-3: 高度基準の統一。 前提条件（§5-3の1〜3）の記録: 1. 座標参照系・単位・時点 -…, 建物のmeasuredHeightとAGLを比較し、交差・詳細表の「交差判定」文言を返す。…, AGLが航空法上の150m高度制限に抵触するかを判定する（空間データ不要）。 (+24 more)

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

### Community 11 - "graphify skill"
Cohesion: 0.20
Nodes (10): project knowledge graph, Graphify add and watch reference, Graphify exports reference, Graphify extraction specification, Graphify GitHub and merge reference, Graphify hooks reference, Graphify query reference, Graphify transcription reference (+2 more)

### Community 12 - "_CachedRegionFile"
Cohesion: 0.22
Nodes (3): RawIOBase, _CachedRegionFile, ZIPの実サイズを保ったまま、キャッシュ済み領域だけを読める仮想ファイル。…

### Community 13 - "plugins"
Cohesion: 0.22
Nodes (8): oxc, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 14 - "design"
Cohesion: 0.67
Nodes (3): low-level-designer, reviewer, design

### Community 15 - "airway-reservation"
Cohesion: 0.67
Nodes (3): airway-design, airway-reservation, safety-management

### Community 32 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

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

## Knowledge Gaps
- **153 isolated node(s):** `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)`, `Step 1 - Ensure graphify is installed`, `Step 2 - Detect files` (+148 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DigitalTwinApiClient` connect `DigitalTwinApiClient` to `viewer_api/app.py`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `mesh3_codes_in_bbox()` connect `extract_ground_features.py` to `viewer_api/app.py`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `_CachedRegionFile` connect `_CachedRegionFile` to `extract_ground_features.py`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `Usage`, `What graphify is for`, `Step 0 - GitHub repos and multi-path merge (only if a URL or several paths)` to the rest of the system?**
  _153 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `viewer_api/app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.060451977401129946 - nodes in this community are weakly interconnected._
- **Should `MapContainer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06386946386946386 - nodes in this community are weakly interconnected._
- **Should `DigitalTwinApiClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05432692307692308 - nodes in this community are weakly interconnected._