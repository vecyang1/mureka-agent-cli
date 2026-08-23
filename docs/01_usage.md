# Usage

Install locally:

```bash
npm link
```

Set a key for the current shell:

```bash
export MUREKA_API_KEY="..."
```

Read-only billing check:

```bash
mureka billing --format json
```

Generate lyrics:

```bash
mureka lyrics generate --prompt "A bittersweet song about leaving Hong Kong at dawn"
```

Generate a song:

```bash
mureka song generate --model auto --lyrics @lyrics.txt --prompt "indie rock, raw vocal, live drums" --wait --download-dir outputs/song-001
```

Upload your own audio:

```bash
mureka upload ./demo.mp3 --purpose audio
```

Generate a complementary track:

```bash
mureka track generate --type Instrumental --upload-audio-id FILE_ID --prompt "warm acoustic band, intimate, live room" --wait --download-dir outputs/track-001
```

The OpenAPI schema uses `generate_type`, while one official cURL sample uses `type`.
The CLI defaults to `generate_type`; if the API rejects that field, retry with:

```bash
mureka track generate --type Instrumental --type-field type --upload-audio-id FILE_ID --prompt "warm acoustic band, intimate, live room" --wait
```

Remix a song:

```bash
mureka song remix --upload-audio-id FILE_ID --prompt "city pop, bright bass, 1980s synths" --lyrics @lyrics.txt --wait
```

Region edit:

```bash
mureka song region-edit --song-id SONG_ID --start 30000 --end 50000 --lyrics @bridge.txt --wait
```

Prepend or append extension:

```bash
mureka song extend --song-id SONG_ID --direction head --model mureka-8 --extend-at 8000 --lyrics @intro.txt --wait
mureka song extend --song-id SONG_ID --direction tail --model mureka-8 --extend-at 180000 --lyrics @outro.txt --wait
```

Stem extraction:

```bash
mureka song stem --url "https://cdn.example/song.mp3" --model audio-separation-2 --download-dir outputs/stems
```

Generic endpoint escape hatch:

```bash
mureka api POST /v1/song/generate --data @body.json
```
