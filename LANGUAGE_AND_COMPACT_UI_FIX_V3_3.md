# v3.3 Fix: Language Search + Compact Message Cards

## Fixed
- Language modal/search was breaking because frontend used an undefined `LANG_CODE_TO_NAME` map.
- Added safe `getLangName()` helper based on loaded `/api/languages` data.
- Added `.hidden { display: none !important; }` because the app uses `hidden` class without Tailwind.
- Language modal now fetches languages again if opened before languages are loaded.
- Current selected language normalized to English if invalid/auto.

## UI compact changes
- Message cards made thinner and cleaner.
- Reduced avatar size, padding, gaps, header height, footer action height.
- `Original message:` now appears inline with the original text.
- Reduced card shadow/spacing so more messages fit on screen.
- Kept YouTube-comment style readability.

## Verified
- `npm run check` passed.
