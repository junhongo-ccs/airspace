---
type: "query"
date: "2026-08-19T03:40:46.703389+00:00"
question: "Why does DigitalTwinApiClient connect Extraction error handling to API data models?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["DigitalTwinApiClient", "ApiError", "_client"]
---

# Q: Why does DigitalTwinApiClient connect Extraction error handling to API data models?

## Answer

Expanded from original query via vocab: [digital, twin, api, client, error]. DigitalTwinApiClient is imported by viewer_api/app.py and instantiated by _client(). Its _get() method calls ApiError, so BFF endpoint code reaches API errors through the shared client. This explains the bridge between API data models and extraction error handling.

## Outcome

- Signal: useful

## Source Nodes

- DigitalTwinApiClient
- ApiError
- _client