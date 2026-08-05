# Batiyan v3.9 — Hinglish Detection Fix

## Problem
Roman Hindi / Hinglish could be detected as English, causing wrong or no translation until provider guessed correctly.

## Fixed safely
Only the backend language detection/translation layer was changed. UI, chat, realtime, PWA, stats, and footer layout were not changed.

## Added
- `isLikelyHinglish(text)` detector.
- Hindi/Hinglish word scoring for Roman Hindi text.
- `normalizeHinglishForTranslation(text)` to help translation providers understand Roman Hindi phrase boundaries.
- Hinglish text now uses Hindi-source translation first for non-Hindi targets.
- Detected Hinglish messages show `Hindi (Hinglish)` as original language.

## Verified examples
- `kya kar raha hai bhai` -> `what are you doing brother`
- `mujhe tumse baat karni hai` -> `i want to talk to you`
- `abhi sab mast chal raha hai ise mat bigadna` -> `Now everything is going smoothly, don't spoil it.`

## Note
Hinglish is informal and can be ambiguous, so no translation engine is perfect. This update prevents the major issue: treating Hinglish as plain English.
