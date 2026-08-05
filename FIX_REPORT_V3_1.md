# BhashaSetu v3.1 Fix Report

## Root cause found

The live Cloudflare Worker had these core breakages:

1. **POST `/api/messages` was unreachable**
   - Worker had `if (path === "/api/messages")` GET handler before the POST handler.
   - Because it did not check `request.method === "GET"`, POST requests were being handled like GET and messages were not saved correctly.

2. **`/ws` WebSocket endpoint was missing on Cloudflare Worker**
   - Frontend expected `/ws`, but live Worker returned 404.
   - Real-time messaging could not work.

3. **Cloudflare Worker used memory-only storage**
   - Messages could disappear on isolate restart.
   - No durable room sequencing.

4. **Frontend WebSocket URL had environment-specific e2b hack**
   - Could generate wrong WS URL in preview/proxy environments.

5. **Client message IDs used only `Date.now()`**
   - Possible duplicate collisions.

6. **`server.py` was syntactically broken**
   - It had a JavaScript-style `//` comment inside Python.
   - `translate_single_message` was called but not defined.

## What was fixed

### Cloudflare Worker
- Replaced old embedded Worker with module Worker.
- Added Cloudflare Static Assets binding for `./static`.
- Added Durable Object `ChatRoom`.
- Implemented:
  - `GET /health`
  - `GET /api/languages`
  - `GET /api/suggest-language?q=...`
  - `GET /api/messages?lang=...&after=...`
  - `POST /api/messages`
  - `GET /ws?room=global&lang=en`
- Added durable room messages storage.
- Added room sequence numbers.
- Added idempotency through `clientMessageId`.
- Added sender ACK packet.
- Added `NEW_MESSAGE` WebSocket broadcast.
- Added missed-message recovery using `lastSequence`.
- Added translation fallback and translation update broadcast.
- Added rate limit and message length validation.

### Frontend
- Fixed WebSocket URL:
  - Now uses `/ws?room=global&lang=<selected>` on the same host.
- Added room/session metadata to `CONNECT` packet.
- Replaced `Date.now()` client ID with `crypto.randomUUID()` fallback.
- Reduced polling fallback from 5s to 2.5s.
- Made messages fetch safer if backend response shape is unexpected.
- Updated cache busters to v3.1.

### Python local server
- Fixed syntax error.
- Added missing `translate_single_message`.
- Added normalization for old seed messages.
- Added `PING`/`PONG` handling for WebSocket heartbeat.

## Verification completed locally

Commands passed:

```bash
node --check worker.js
node --check static/app.js
python3 -m py_compile server.py
```

Wrangler local dev tested:

```bash
npx wrangler dev --ip 0.0.0.0 --port 8787
```

Smoke tests passed:

- `GET /` -> 200 HTML
- `GET /health` -> 200 JSON
- `GET /api/languages` -> 200 JSON
- `GET /api/suggest-language?q=namaste` -> Hindi suggestion
- `GET /api/messages?lang=en` -> messages returned
- `POST /api/messages` -> message saved and returned
- duplicate POST same `clientMessageId` -> same message returned, no duplicate
- `GET /ws` -> 101 Switching Protocols
- WebSocket `CONNECT` -> missed messages replayed
- WebSocket `SEND_MESSAGE` -> ACK + NEW_MESSAGE received

## Deploy

Use new/rotated Cloudflare token. Do not use old exposed token.

```bash
npm install
npm run check
npx wrangler deploy
```

If Cloudflare says migration tag already exists, change this in `wrangler.toml`:

```toml
tag = "v3_1_chatroom_core_2"
```

Then deploy again.
