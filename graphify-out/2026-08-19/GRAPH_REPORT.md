# Graph Report - airspace  (2026-08-19)

## Corpus Check
- 85 files · ~56,048 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 493 nodes · 776 edges · 47 communities (24 shown, 23 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.55)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `90d690d8`
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
- extract_buildings.py
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

## God Nodes (most connected - your core abstractions)
1. `DigitalTwinApiClient` - 23 edges
2. `compilerOptions` - 18 edges
3. `compilerOptions` - 15 edges
4. `fetch_entry_bytes()` - 13 edges
5. `judge_route_features()` - 12 edges
6. `mesh3_codes_in_bbox()` - 12 edges
7. `App()` - 11 edges
8. `_CachedRegionFile` - 10 edges
9. `RemoteZipIndex` - 10 edges
10. `get_ground_features_in_bbox()` - 10 edges

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

## Communities (47 total, 23 thin omitted)

### Community 0 - "viewer_api/app.py"
Cohesion: 0.05
Nodes (65): BaseModel, get, post, Request, _base_url(), _bbox(), _bbox_overlap(), buildings_endpoint() (+57 more)

### Community 1 - "MapContainer.tsx"
Cohesion: 0.06
Nodes (58): react, ApiResponse, BboxFeatureResult, ConnectionStatus, describeError(), DroneRoute, getBuildingsInBbox(), getConnectionStatus() (+50 more)

### Community 2 - "DigitalTwinApiClient"
Cohesion: 0.05
Nodes (46): Exception, Response, extract_building_id(), extract_prohibited_area_id(), lookup_building_footprint(), lookup_building_height(), lookup_prohibited_area_geometry(), voxelBitFileName（`flight_prohibited_area/{flightProhibitedAreaId}.json`）から… (+38 more)

### Community 3 - "extract_ground_features.py"
Cohesion: 0.08
Nodes (53): Pattern, load_codelist(), parse_codelist(), PLATEAU CityGMLのコードリスト（`codelists/*.xml`）を読み、コード→日本語名の辞書にする。…, gml:Dictionaryのbytesから{コード値: 日本語名}を返す。, `codelists/{codelist_name}.xml`を取得してパースする。, _clip_and_collect(), _clip_edge() (+45 more)

### Community 4 - "devDependencies"
Cohesion: 0.05
Nodes (39): autoprefixer, maplibre-gl, oxlint, postcss, react, react-dom, @types/geojson, @types/node (+31 more)

### Community 5 - "status_panel.py"
Cohesion: 0.09
Nodes (19): 空域デジタルツインGIS Viewer（PoC） design.md（v1.2）のレイアウト・カラー・タイポグラフィ・状態表示規定と、 `ドローン航路GIS-…, 簡易アクセスゲート。 仕様書§9「公開範囲：初期はアクセス制限を掛けた検証環境とする」に対応する。…, design.md §7, §8: 地図表示。 レイヤ色は design.md §5-3 のトークンをそのまま使用する。ただし塗りパターン…, design.md §9-1〜§9-3: API接続状態／空間ID表示／評価状態（高度基準）／PoC識別バッジ。, design.md §9-1: 左設定パネル最上部に常時表示。色だけに依存せず状態文字列を併記する。, design.md §9-2: 仕様書§5-3の高度基準統一と受入基準#9に対応する。…, design.md §9-3: 画面右上に常時表示（仕様書§6-1）。, render_altitude_verification_status() (+11 more)

### Community 6 - "altitude.py"
Cohesion: 0.12
Nodes (22): DataFrame, evaluate_agl_legal_limit(), evaluate_building_vertical(), _load_json(), Path, 仕様書§5-3: 高度基準の統一。 前提条件（§5-3の1〜3）の記録: 1. 座標参照系・単位・時点 -…, 建物のmeasuredHeightとAGLを比較し、交差・詳細表の「交差判定」文言を返す。…, AGLが航空法上の150m高度制限に抵触するかを判定する（空間データ不要）。 (+14 more)

### Community 7 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 8 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 9 - "geometry.py"
Cohesion: 0.25
Nodes (14): Point, _cross(), _on_segment(), _point_in_ring(), _point_in_rings(), 線分（航路）とGeoJSON Polygon/MultiPolygonの実交差判定。…, p・r と共線であることが分かっている点qが、線分p-r上（bbox内）にあるか。, 線分p1-p2と線分p3-p4が交差するか（端点での接触・共線上の重なりも交差とみなす）。 (+6 more)

### Community 10 - "extract_buildings.py"
Cohesion: 0.31
Nodes (10): _building_to_feature(), _extract_building_geometry(), _extract_height_m(), extract_mesh_geojson(), main(), _parse_pos_list_ring(), Element, 改善タスク_秩父市周辺PLATEAU建物レイヤー.md 6-2: 建物データの再抽出。 PLATEAU秩父市2025のCityGML… (+2 more)

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

## Knowledge Gaps
- **109 isolated node(s):** `GROUND_FEATURE_LAYERS`, `DroneRoute`, `GroundFeatureResult`, `ApiResponse`, `PlateauBuildingGeometry` (+104 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **23 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `DigitalTwinApiClient` connect `DigitalTwinApiClient` to `viewer_api/app.py`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Why does `mesh3_codes_in_bbox()` connect `extract_ground_features.py` to `viewer_api/app.py`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `_CachedRegionFile` connect `_CachedRegionFile` to `extract_ground_features.py`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `GROUND_FEATURE_LAYERS`, `DroneRoute`, `GroundFeatureResult` to the rest of the system?**
  _109 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `viewer_api/app.py` be split into smaller, more focused modules?**
  _Cohesion score 0.052313883299798795 - nodes in this community are weakly interconnected._
- **Should `MapContainer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06386946386946386 - nodes in this community are weakly interconnected._
- **Should `DigitalTwinApiClient` be split into smaller, more focused modules?**
  _Cohesion score 0.05432692307692308 - nodes in this community are weakly interconnected._