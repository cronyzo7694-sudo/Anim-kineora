# Batiyan v3.8 — Mobile Footer Send Box Fix

## Problem
On narrow phones, the identity/name area could take too much width and the message input / rocket send button could hide or squeeze badly.

## Fixed
- Identity name auto-hides on phones.
- Added a small `Show` button to reveal/hide the nickname only when needed.
- Input box now has width priority and uses `min-width: 0` correctly.
- Fixed layout by using `flex-shrink: 0` for identity/send controls.
- Reduced mobile footer gaps/padding.
- Rocket send channel is smaller on narrow phones but still visible.
- Very narrow phones hide the Show button to protect the send box.

## Files changed
- `static/index.html`
- `static/app.js`
- `static/style.css`
- `static/service-worker.js`

## Verified
- `npm run check` passed.
