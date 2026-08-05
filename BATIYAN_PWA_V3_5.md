# Batiyan v3.5 — PWA + Play Store Ready Base

## Changed
- App name changed to **Batiyan**.
- Browser-installable PWA support added.
- Added manifest: `/manifest.webmanifest`.
- Added service worker: `/service-worker.js`.
- Added app icons: `/icons/icon-192.png`, `/icons/icon-512.png`.
- Added install button in the header.
- Added message Report button and `/api/report` endpoint for UGC safety.
- Added `PLAYSTORE_GUIDE_BATIYAN.md`.

## Verified
- `npm run check` passed.
- `/manifest.webmanifest` returns 200.
- `/service-worker.js` returns 200.
- `/icons/icon-192.png` returns 200.
- `/api/report` returns 200.

## Important
For Play Store approval, you still need a real privacy policy URL, terms/community guidelines, support email, and moderation process.
