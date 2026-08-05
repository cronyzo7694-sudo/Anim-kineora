# UI Message Cards v3.2

## Fixed
Messages were visually mixing together and hard to read. The chat now uses a YouTube-comment style card layout.

## Added
- Every message is inside its own clear card/box.
- Avatar is always visible on the left.
- Sender name, time, sent tick, language badge are separated in header.
- Translated text is large and readable.
- Original text opens in a separate boxed section.
- Like, Dislike, Reply actions added.
- Reaction state is saved locally in browser localStorage.
- Reply button pre-fills the input with @username.
- Mobile layout optimized.

## Files changed
- `static/app.js`
- `static/style.css`
- `static/index.html`

## Verification
- `node --check static/app.js` passed.
- Full `npm run check` passed.
