# Batiyan v3.7 — Realtime Translation Patch Fix

## Problem
New messages were translated only after reload because the realtime WebSocket message arrived first and translation patch was not reliably sent/applied.

## Fixed
- New messages are now broadcast per connected user's selected language.
- Backend now batches active-language translations for a new message and broadcasts `TRANSLATION_UPDATED` patches.
- Cached translations are now also re-broadcast to online clients so reload is not needed.
- Frontend now silently syncs once if translation patch is missed.
- Frontend fallback sync now updates existing message text, not only newly inserted messages.

## Verified
Local realtime WebSocket test:
- Hindi user connected with `lang=hi`.
- English user sent English message.
- Hindi user received `NEW_MESSAGE` immediately.
- Hindi user then received `TRANSLATION_UPDATED` without reload:
  `नमस्कार मित्र, यह अनुवाद पुनः लोड किए बिना दिखाई देना चाहिए।`

## Note
Sub-0.3s translation depends on translation provider speed and cache. Cached/common translations can be very fast; first-time external translation may take longer, but now it updates automatically without reload.
