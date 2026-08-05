# Batiyan — Play Store / App Conversion Guide

## What was added
Batiyan is now PWA-installable from supported browsers:

- `manifest.webmanifest`
- `service-worker.js`
- app icons: `192x192` and `512x512`
- install button in the header
- app name changed to **Batiyan**
- report button added on messages for user-generated-content safety
- `/api/report` endpoint stores the last 500 reports in Durable Object storage

## Browser install
After deploying on HTTPS Cloudflare URL:

1. Open Batiyan in Chrome/Edge/Android browser.
2. Wait for install icon/button.
3. Click the install/download button in the header, or use browser menu → Install app.

Note: iPhone Safari uses Share → Add to Home Screen.

## Play Store conversion options

### Option A — Trusted Web Activity (recommended for PWA)
Use Bubblewrap or PWABuilder to wrap the PWA as an Android app.

Basic flow:

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR_DOMAIN/manifest.webmanifest
bubblewrap build
```

Then upload the generated Android App Bundle `.aab` to Google Play Console.

### Option B — PWABuilder
1. Go to https://www.pwabuilder.com/
2. Enter your deployed Batiyan URL.
3. Generate Android package.
4. Download `.aab`.
5. Upload to Play Console.

### Option C — Capacitor
Use if you want native Android features later.

## Very important: avoid Play Store rejection/ban
Batiyan is a chat app with user-generated content. Google Play is strict. Do these before publishing:

1. Add a real **Privacy Policy URL**.
2. Add **Terms of Use / Community Guidelines**.
3. Keep the in-app **Report** button active.
4. Add a support/contact email.
5. Add moderation process: review reports and remove abusive content.
6. Add spam/rate-limit rules, already partially present.
7. Do not allow illegal, sexual, hateful, harassment, or child-safety violating content.
8. In Play Console, accurately declare user-generated content and data collection.
9. Do not claim end-to-end encryption unless actually implemented.
10. Do not use misleading app name/icons/descriptions.

## Recommended store listing

App name: **Batiyan**
Short description: **Chat globally with instant translation.**
Category: Social / Communication
Content rating: Complete questionnaire honestly.
Data safety: Declare approximate data and user-generated messages if stored/processed.

## Extra recommendation before public launch
For stronger Play Store safety, add:

- block user locally
- admin report review page
- message delete/moderation API
- privacy policy page hosted at `/privacy`
- terms page hosted at `/terms`
