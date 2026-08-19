# Graph Report - airspace  (2026-08-19)

## Corpus Check
- Corpus is ~45,464 words - fits in a single context window. You may not need a graph.

## Summary
- 494 nodes · 779 edges · 48 communities (25 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API data models
- React API client
- Extraction error handling
- PLATEAU data extraction
- Frontend build tooling
- Streamlit viewer
- Altitude assessment
- Vite runtime
- TypeScript configuration
- Geometry intersection
- Building data conversion
- Graphify project workflow
- Remote ZIP access
- JavaScript linting
- Agent review workflow
- ODS service ecosystem
- TypeScript project references
- Progress logging workflow
- ODS research documents
- DIPS proxy integration
- ODS platform architecture
- Project instructions
- Building layer improvement
- GIS PoC specification
- Implementation task list
- Project progress log
- Render deployment guide
- PoC overview
- Render service blueprint
- BFF dependencies
- Hero visual asset
- React visual asset
- Vite visual asset
- React HTML entry
- Favicon asset
- Icon sprite asset
- React Vite guide
- Streamlit dependencies
- Streamlit guide

## God Nodes (most connected - your core abstractions)
1. `DigitalTwinApiClient` - 23 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `fetch_entry_bytes()` - 13 edges
5. `judge_route_features()` - 12 edges
6. `mesh3_codes_in_bbox()` - 12 edges
7. `App()` - 11 edges
8. `load_codelist()` - 10 edges
9. `_CachedRegionFile` - 10 edges
10. `RemoteZipIndex` - 10 edges

## Surprising Connections (you probably didn't know these)
- `query_prohibited_areas_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `register_route_endpoint()` --uses--> `ApiError`  [INFERRED]
  viewer_api/app.py → viewer/src/api_client.py
- `query_features_endpoint()` --calls--> `evaluate_agl_legal_limit()`  [EXTRACTED]
  viewer_api/app.py → viewer/src/altitude.py
- `_client()` --calls--> `DigitalTwinApiClient`  [EXTRACTED]
  viewer_api/app.py → viewer/src/api_client.py
- `buildings_endpoint()` --uses--> `BboxTooLargeError`  [INFERRED]
  viewer_api/app.py → viewer/src/plateau_buildings.py

## Import Cycles
- None detected.

## Communities (48 total, 23 thin omitted)

### Community 0 - "API data models"
Cohesion: 0.05
Nodes (65): BaseModel, get, post, Request, _base_url(), _bbox(), _bbox_overlap(), buildings_endpoint() (+57 more)

### Community 1 - "React API client"
Cohesion: 0.07
Nodes (59): react, ApiResponse, BboxFeatureResult, ConnectionStatus, describeError(), DroneRoute, getBuildingsInBbox(), getConnectionStatus() (+51 more)

### Community 2 - "Extraction error handling"
Cohesion: 0.05
Nodes (46): Exception, Response, extract_building_id(), extract_prohibited_area_id(), lookup_building_footprint(), lookup_building_height(), lookup_prohibited_area_geometry(), voxelBitFileName（`flight_prohibited_area/{flightProhibitedAreaId}.json`）から… (+38 more)

### Community 3 - "PLATEAU data extraction"
Cohesion: 0.08
Nodes (53): Pattern, load_codelist(), parse_codelist(), PLATEAU CityGMLのコードリスト（`codelists/*.xml`）を読み、コード→日本語名の辞書にする。…, gml:Dictionaryのbytesから{コード値: 日本語名}を返す。, `codelists/{codelist_name}.xml`を取得してパースする。, _clip_and_collect(), _clip_edge() (+45 more)

### Community 4 - "Frontend build tooling"
Cohesion: 0.05
Nodes (39): autoprefixer, maplibre-gl, oxlint, postcss, react, react-dom, @types/geojson, @types/node (+31 more)

### Community 5 - "Streamlit viewer"
Cohesion: 0.09
Nodes (19): 空域デジタルツインGIS Viewer（PoC） design.md（v1.2）のレイアウト・カラー・タイポグラフィ・状態表示規定と、 `ドローン航路GIS-…, 簡易アクセスゲート。 仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」に対応する。…, design.md §7, §8: 地図表示。 レイヤ色は design.md §5-3 のトークンをそのまま使用する。ただし塗りパターン…, design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。, design.md §9-1: 左設定パネル最上部に常時表示。色だけに依存せず状態文字列を併記する。, design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。…, design.md §9-3: 画面右上に常時表示（仕様書§6-1）。, render_altitude_verification_status() (+11 more)

### Community 6 - "Altitude assessment"
Cohesion: 0.12
Nodes (22): DataFrame, evaluate_agl_legal_limit(), evaluate_building_vertical(), _load_json(), Path, 仕様書§5-3: 高度基準の統一。 前提条件（§5-3の1〜3）の記録: 1. 座標参照系・単位・時点 -…, 建物のmeasuredHeightとAGLを比較し、交差・詳細表の「交差判定」文言を返す。…, AGLが航空法上の150m高度制限に抵触するかを判定する（空間データ不要）。 (+14 more)

### Community 7 - "Vite runtime"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 8 - "TypeScript configuration"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 9 - "Geometry intersection"
Cohesion: 0.25
Nodes (14): Point, _cross(), _on_segment(), _point_in_ring(), _point_in_rings(), 線分（航路）とGeoJSON Polygon/MultiPolygonの実交差判定。…, p・r と共線であることが分かっている点qが、線分p-r上（bbox内）にあるか。, 線分p1-p2と線分p3-p4が交差するか（端点での接触・共線上の重なりも交差とみなす）。 (+6 more)

### Community 10 - "Building data conversion"
Cohesion: 0.31
Nodes (10): _building_to_feature(), _extract_building_geometry(), _extract_height_m(), extract_mesh_geojson(), main(), _parse_pos_list_ring(), Element, 改善タスク_秩父市周辺PLATEAU建物レイヤー.md 6-2: 建物データの再抽出。 PLATEAU秩父市2025のCityGML… (+2 more)

### Community 11 - "Graphify project workflow"
Cohesion: 0.20
Nodes (10): project knowledge graph, Graphify add and watch reference, Graphify exports reference, Graphify extraction specification, Graphify GitHub and merge reference, Graphify hooks reference, Graphify query reference, Graphify transcription reference (+2 more)

### Community 12 - "Remote ZIP access"
Cohesion: 0.22
Nodes (3): RawIOBase, _CachedRegionFile, ZIPの実サイズを保ったまま、キャッシュ済み領域だけを読める仮想ファイル。…

### Community 13 - "JavaScript linting"
Cohesion: 0.22
Nodes (8): oxc, typescript, warn, plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 14 - "Agent review workflow"
Cohesion: 0.67
Nodes (3): low-level-designer, reviewer, design

### Community 15 - "ODS service ecosystem"
Cohesion: 0.67
Nodes (3): airway-design, airway-reservation, safety-management

## Knowledge Gaps
- **109 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DigitalTwinApiClient` connect `Extraction error handling` to `API data models`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `mesh3_codes_in_bbox()` connect `PLATEAU data extraction` to `API data models`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `_CachedRegionFile` connect `Remote ZIP access` to `PLATEAU data extraction`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API data models` be split into smaller, more focused modules?**
  _Cohesion score 0.052313883299798795 - nodes in this community are weakly interconnected._
- **Should `React API client` be split into smaller, more focused modules?**
  _Cohesion score 0.06526806526806526 - nodes in this community are weakly interconnected._
- **Should `Extraction error handling` be split into smaller, more focused modules?**
  _Cohesion score 0.05432692307692308 - nodes in this community are weakly interconnected._