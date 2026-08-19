---
type: "query"
date: "2026-08-19T08:23:19.303343+00:00"
question: "When the application is loading map layers, show a loading indicator in the center of the map area."
contributor: "graphify"
outcome: "useful"
source_nodes: ["MapContainer()", "App()"]
---

# Q: When the application is loading map layers, show a loading indicator in the center of the map area.

## Answer

Expanded from graph vocabulary: [map, container, layer, loading]. Implemented a centered FiLoader overlay in MapContainer. It remains visible until the parent marks initial prohibited-area, building, and enabled ground-feature requests complete and MapLibre reaches loaded/idle; it fades out over 200ms. Added the LoadingLayers Storybook story.

## Outcome

- Signal: useful

## Source Nodes

- MapContainer()
- App()