# Translation Fix v3.1.3

## Problem
Language switching was not reliably showing translated messages.

Root cause: `GET /api/messages?lang=...` was only warming translation in the background and returned messages before translation was guaranteed. Also, multiple parallel `ensureTranslation()` calls could read and write the same Durable Object messages list with stale copies, causing translated values to be overwritten/lost.

## Fix
- `GET /api/messages?lang=...` now translates missing selected messages before returning the response, with a hard timeout so UI does not hang.
- Added batch translation method `ensureTranslationsForMessages()` that translates selected messages and saves once, avoiding Durable Object storage race conditions.
- Strengthened translation providers:
  1. Google Translate public endpoint with `sl=auto`.
  2. Google Translate retry with detected source language.
  3. MyMemory fallback.
- Added translation quality checks so HTML/error pages are not stored as translations.

## Verified locally
Using `npx wrangler dev --ip 0.0.0.0 --port 8787`:

- Hindi seed message -> English translated successfully.
- New English message -> Hindi translated successfully.
- Spanish seed message -> Hindi translated successfully.

Examples observed:

- Hindi -> English: `Hello friends! Welcome to this forum...`
- English -> Hindi: `नमस्ते विश्व, आज आप कैसे हैं?`
- Spanish -> Hindi: `सभी को नमस्कार! यह एक अद्भुत ऐप है...`

## Deploy
Commit/push updated `worker.js` and deploy normally:

```bash
npm run check
npx wrangler deploy
```
