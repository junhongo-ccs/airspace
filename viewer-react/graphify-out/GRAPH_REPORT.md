# Graph Report - viewer-react  (2026-08-19)

## Corpus Check
- 23 files · ~10,171 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 244 nodes · 323 edges · 18 communities (15 shown, 3 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `296e69fe`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- devDependencies
- App.tsx
- MapContainer.tsx
- compilerOptions
- ResultsPanel.stories.tsx
- SettingsPanel.stories.tsx
- package.json
- compilerOptions
- plugins
- React + TypeScript + Vite
- tsconfig.json
- main.ts
- preview.tsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 18 edges
2. `compilerOptions` - 15 edges
3. `App()` - 11 edges
4. `MapContainer()` - 10 edges
5. `QueryResult` - 8 edges
6. `describeError()` - 8 edges
7. `react` - 7 edges
8. `scripts` - 7 edges
9. `PlateauDatasetMeta` - 6 edges
10. `MapContainerProps` - 6 edges

## Surprising Connections (you probably didn't know these)
- `QueryResult` --references--> `PlateauDatasetMeta`  [EXTRACTED]
  src/App.tsx → src/api/client.ts
- `ResultsPanelProps` --references--> `QueryResult`  [EXTRACTED]
  src/components/ResultsPanel.tsx → src/App.tsx
- `SettingsPanelProps` --references--> `ConnectionStatus`  [EXTRACTED]
  src/components/SettingsPanel.tsx → src/api/client.ts
- `QueryResult` --references--> `GroundFeature`  [EXTRACTED]
  src/App.tsx → src/api/client.ts
- `QueryResult` --references--> `NearbyFeatureSummary`  [EXTRACTED]
  src/App.tsx → src/api/client.ts

## Import Cycles
- None detected.

## Communities (18 total, 3 thin omitted)

### Community 0 - "devDependencies"
Cohesion: 0.04
Nodes (45): autoprefixer, @chromatic-com/storybook, oxlint, devDependencies, autoprefixer, @chromatic-com/storybook, oxlint, playwright (+37 more)

### Community 1 - "App.tsx"
Cohesion: 0.17
Nodes (25): react, ApiResponse, BboxFeatureResult, describeError(), DroneRoute, getBuildingsInBbox(), getConnectionStatus(), getFlightProhibitedAreas() (+17 more)

### Community 2 - "MapContainer.tsx"
Cohesion: 0.10
Nodes (23): ALL_LAYERS_VISIBLE, BUILDING_LAYER_IDS, BUILDING_SOURCE_IDS, EMPTY_GROUND_FEATURES, ensureDiagonalHatchPattern(), ensureHatchPattern(), GROUND_FEATURE_LAYER_KEYS, GROUND_LAYER_STYLE (+15 more)

### Community 3 - "compilerOptions"
Cohesion: 0.08
Nodes (23): DOM, src, vite/client, compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx (+15 more)

### Community 4 - "ResultsPanel.stories.tsx"
Cohesion: 0.11
Nodes (21): GroundFeature, GroundFeatureGroup, NearbyFeatureSummary, ProhibitedArea, QueryResult, GROUP_LABELS, GROUP_ORDER, LAYER_LABELS (+13 more)

### Community 5 - "SettingsPanel.stories.tsx"
Cohesion: 0.08
Nodes (25): ConnectionStatus, CollapsibleSidebar(), CollapsibleSidebarProps, FilterPanel, meta, Story, ToggleHandle, describeConnection() (+17 more)

### Community 6 - "package.json"
Cohesion: 0.10
Nodes (20): maplibre-gl, dependencies, maplibre-gl, react, react-dom, react-icons, name, private (+12 more)

### Community 7 - "compilerOptions"
Cohesion: 0.10
Nodes (19): node, vite.config.ts, compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection (+11 more)

### Community 8 - "plugins"
Cohesion: 0.22
Nodes (8): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema, oxc, typescript, warn

### Community 9 - "React + TypeScript + Vite"
Cohesion: 0.50
Nodes (3): Expanding the Oxlint configuration, React Compiler, React + TypeScript + Vite

## Knowledge Gaps
- **135 isolated node(s):** `$schema`, `typescript`, `oxc`, `react/rules-of-hooks`, `warn` (+130 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Why does `react` connect `App.tsx` to `plugins`, `MapContainer.tsx`, `ResultsPanel.stories.tsx`, `SettingsPanel.stories.tsx`?**
  _High betweenness centrality (0.038) - this node is a cross-community bridge._
- **Why does `plugins` connect `plugins` to `App.tsx`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `$schema`, `typescript`, `oxc` to the rest of the system?**
  _135 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `devDependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.044444444444444446 - nodes in this community are weakly interconnected._
- **Should `MapContainer.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10461538461538461 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._