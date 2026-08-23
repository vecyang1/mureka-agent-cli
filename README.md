# Mureka Agent CLI

Unofficial community CLI for the official Mureka API, built for local and agent-driven music workflows.

This project was created because the available SDKs/adapters did not fully cover the newer Mureka API surface: complementary track generation, prepend/append song extension, region editing, remix, upgraded stems, and V9-era controls.

This repository is not affiliated with or endorsed by Mureka. Mureka is the owner of its own marks, API, documentation, and service.

## Quick Start

```bash
npm link
export MUREKA_API_KEY="..."
mureka billing --format json
```

Run through OpenCLI after registration:

```bash
opencli mureka billing --format json
```

## Docs

The official docs can be mirrored locally:

```bash
npm run mirror:docs
mureka docs
```

The mirror writes raw official pages plus an extracted OpenAPI contract to `vendor/mureka-docs/openapi.json`. The public repository intentionally does not redistribute that generated mirror; run the script locally when you need it.

## Useful Commands

```bash
mureka costs --format pretty
mureka lyrics generate --prompt "A song about a quiet city morning"
mureka song generate --lyrics @lyrics.txt --prompt "indie rock, live drums" --wait --download-dir outputs/song
mureka upload ./voice.mp3 --purpose audio
mureka track generate --type Instrumental --upload-audio-id FILE_ID --prompt "warm acoustic pop" --wait
mureka song stem --url "https://cdn.example/song.mp3" --model audio-separation-2 --download-dir outputs/stems
mureka song remix --upload-audio-id FILE_ID --prompt "city pop" --lyrics @lyrics.txt --wait
```

Live generation costs money. Start with `mureka billing` and `mureka costs`.
