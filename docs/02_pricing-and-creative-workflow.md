# Pricing And Creative Workflow

## Current Pricing Snapshot

This is based on the official pricing/docs pages checked on 2026-06-05.

- Trial recharge: USD 30, 1 concurrent request, 12-month validity.
- Song generation V8/V9: about USD 0.045 per song.
- Song generation V7.6: about USD 0.03 per song.
- Single track generation V8: about USD 0.09 per song.
- Stem extraction V1: about USD 0.06 per song.
- Stem extraction V2: about USD 0.70 per song with up to 12 stems and MIDI export.
- Lyrics generation: about USD 0.009 per full lyric, or USD 0.002 per line.
- Vocal cloning: about USD 5 per voice.

## Recommendation

Start with the USD 30 API recharge if API access is active. Do not buy a higher web/monthly plan just to experiment.

If the consumer web plan is USD 30/month for about 2,000 pure song generations, the web plan is cheaper for bulk manual song drafting. That works out to about USD 0.015 per raw generation, versus the official API price of about USD 0.045 for V8/V9 song generation.

The API becomes more affordable when you do not need thousands of raw generations every month, or when automation saves more time than the price difference:

- You generate fewer than about 667 V8/V9 API songs per month.
- You need credits to last across months; API recharge balance is valid for 12 months from recharge.
- You want scripts/agents to upload references, generate, poll, download, and organize files automatically.
- You need API-only workflows such as batch runs, reproducible payloads, integration with local folders/DAW prep, or future app/product use.
- You want to avoid a recurring monthly subscription while experimenting slowly.

Use the web subscription when you are manually exploring lots of ideas and will actually consume the monthly quota. Use the API when you are building a repeatable production pipeline.

For a TikTok songwriter workflow, use a tight budget loop:

1. Write or draft the song yourself.
2. Use lyrics generation sparingly for variants, not every idea.
3. Use full song generation for 2-3 candidate productions.
4. Use track generation when you already have a vocal/accompaniment and need one missing layer.
5. Use stem V1 for normal practice/remix separation.
6. Use stem V2 only when you really need 12 stems or MIDI.

## Charging Your Own Work

For early client/test pricing, do not charge only the API cost. Charge for taste, selection, editing, iteration, and delivery.

Suggested starting floor:

- Personal demo arrangement: USD 25-60 per song.
- TikTok-ready AI-produced draft with 2-3 revisions: USD 80-180 per song.
- Stem/MIDI prep or accompaniment generation for another creator: USD 20-80 depending on complexity.

For your own TikTok songs, keep cost per finished candidate under USD 1-3 until you know which formats perform.

## Verification Status

Local verification completed on 2026-06-05:

- `npm run check`
- `node --check scripts/mirror-docs.mjs`
- `opencli verify mureka`
- `opencli mureka docs --format json`
- `opencli mureka costs --format json`

Paid live API E2E generation was not run because `MUREKA_API_KEY` was not set in the shell and the account was not recharged. Run a low-cost billing check first after setting the key:

```bash
export MUREKA_API_KEY
mureka billing --format json
```

Then use a tiny paid smoke test only after confirming balance:

```bash
mureka lyrics generate --prompt "A four-line chorus about practicing guitar at midnight"
```
