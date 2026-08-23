# Mureka Agent CLI Overview

## Decision

Build a local `mureka` CLI around the official Mureka API and register it as an OpenCLI external command. This is cleaner than a browser/UI adapter because the platform exposes official bearer-token APIs, and it is more complete than the existing npm SDKs for the newer endpoints.

## Wheel Check

- `opencli list -f json` found a Suno music adapter, but no Mureka adapter.
- No existing local Mureka CLI/project was found in the local coding workspace.
- `@superbuilders/mureka` exists as a TypeScript SDK, but its public surface is older and does not cover the latest Track Generation, Region Editing, Remix, and upgraded stem workflows.
- `@xbrowser/mureka` exists, but it targets logged-in browser/CDP use on the consumer site rather than the official API platform.

## Strategy Note

Strategy: PUBLIC_API

Contract: stable official API docs and extracted OpenAPI bundle

Evidence:

- Base URL: `https://api.mureka.ai`
- Auth: `Authorization: Bearer $MUREKA_API_KEY`
- Docs: `https://platform.mureka.ai/docs/`
- Extracted local contract: `vendor/mureka-docs/openapi.json`

## Boundaries

The CLI does not store secrets. It reads `MUREKA_API_KEY` or accepts normal environment injection from tools like 1Password.
