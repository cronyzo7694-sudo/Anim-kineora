# v3.4 Usage Stats Button

## Added safely
A new top header stats button shows usage information without disturbing existing chat/message/translator code.

## New UI
- Header button: `0 online`, `1 online`, etc.
- Click button to open stats modal.
- Modal shows:
  - Current Online
  - Today
  - This Month
  - This Year
  - All Time Users
  - Total Visits

## Backend
Added `/api/stats` routed through the existing ChatRoom Durable Object.

- `GET /api/stats` returns stats.
- `POST /api/stats` registers a browser visitor and returns stats.

## Counting logic
- Unique all-time user is counted by browser `visitorId` stored in localStorage.
- Today/month/year are unique browser counts per UTC day/month/year.
- Total visits increments on every app load/register.
- Current online uses active WebSocket session count.

## Verified
- `npm run check` passed.
- `GET /api/stats` passed.
- `POST /api/stats` passed.
- Duplicate visitor does not increase unique counts again.
- WebSocket online count changed from 0 -> 1 -> 0 correctly.
