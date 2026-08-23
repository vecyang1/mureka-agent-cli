# Mureka Agent CLI

This project wraps the official Mureka API for agent and human use.

## Source of Truth

- Local docs mirror: `vendor/mureka-docs/`
- Extracted OpenAPI contract: `vendor/mureka-docs/openapi.json`
- Official docs URL: `https://platform.mureka.ai/docs/`

Refresh docs with:

```bash
npm run mirror:docs
```

## Secret Handling

Do not commit API keys. Use `MUREKA_API_KEY` in the shell, 1Password injection, or another local secret source. Keep `.env` ignored.

## Verification

Run before claiming changes are ready:

```bash
npm run check
```

Live API checks can cost money. Use read-only billing checks first:

```bash
mureka billing --format json
```
