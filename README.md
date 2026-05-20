# Market News App

Single phone app combining the Forex Factory economic calendar, FF-style oil events, and the Nasdaq earnings calendar. **Magnificent Seven earnings (AAPL, MSFT, GOOGL, GOOG, AMZN, META, NVDA, TSLA) are rendered red like FF high-impact folders.**

```
backend/   Fastify + node:sqlite. Fetches FF XML + Nasdaq earnings every 15 min.
mobile/    Expo / React Native. Calendar list + event detail. Sideload via Expo Go or EAS APK.
```

## Backend

### Run locally

```powershell
cd backend
npm install
npm run dev
```

Server listens on `http://localhost:8080`. The scheduler fires immediately, so logs should show `[forex] ok, N events` within a few seconds.

Smoke tests:
- `curl http://localhost:8080/healthz` → `{"ok":true}`
- `curl "http://localhost:8080/api/events?from=2026-05-12&to=2026-05-19"` → events array
- `curl http://localhost:8080/api/status` → per-source last refresh + which earnings tier was used

### Deploy to Fly.io

```powershell
cd backend
flyctl launch --no-deploy   # accepts the existing fly.toml — pick app name "market-news" or edit fly.toml
flyctl volumes create market_news_data --size 1
flyctl deploy
```

After deploy:
- `curl https://<your-app>.fly.dev/healthz`
- Update `mobile/app.json` → `extra.apiBaseUrl` to your Fly URL.

### Data sources

- **Forex Factory**: `https://nfs.faireconomy.media/ff_calendar_thisweek.xml` and `_nextweek.xml`. Confirmed working.
- **Oil**: same FF feed, filtered by title regex (`backend/src/sources/oil.ts`).
- **Nasdaq earnings**: three-tier fallback in `backend/src/sources/nasdaq.ts`:
  1. `https://api.nasdaq.com/api/calendar/earnings?date=…` with browser headers
  2. HTML scrape of `nasdaq.com/market-activity/earnings` (`__NEXT_DATA__` blob)
  3. Yahoo Finance earnings calendar HTML

`GET /api/status` reports which tier last succeeded so you can swap if Nasdaq starts blocking Fly's IPs.

## Mobile

### Run on your phone (dev)

```powershell
cd mobile
npm install
npx expo start
```

Install **Expo Go** on your phone, scan the QR code shown in the terminal. The phone needs to be on the same Wi-Fi as your PC (or use `--tunnel` if not).

To point at the local backend, edit `mobile/app.json` → `extra.apiBaseUrl` to `http://<your-PC-LAN-IP>:8080` for dev.

### Sideloadable Android APK (no app store)

```powershell
cd mobile
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

EAS emails a download link. Open it on the phone, install the APK, done.

### iOS

```powershell
eas build -p ios --profile preview
```

Requires Apple Developer account ($99/yr) for ad-hoc / TestFlight install.

## Verification checklist

- [ ] Backend deployed; `/healthz` returns ok
- [ ] `/api/events` returns non-empty array; spot-check at least one event per day
- [ ] Oil events have `source:"oil"` (e.g., Crude Oil Inventories)
- [ ] Mag 7 earnings rows have `isMag7:true` AND `impact:"high"`
- [ ] Mobile app loads list; pull-to-refresh works; filter chips toggle correctly
- [ ] Mag 7 earnings render with the **red** impact bar + a "MAG 7" pill (visual check during AAPL/MSFT/etc. earnings week)
- [ ] Airplane-mode the phone, reopen — cached events appear immediately
- [ ] APK installs and runs without Expo Go

## Notes

- FF times are US Eastern. Backend converts to UTC on ingest; client renders in local time.
- The Mag 7 list lives in `backend/src/mag7.ts`. Edit there if you want to add/remove tickers — the client doesn't duplicate that list, it just reads `event.isMag7`.
- Backend cache is SQLite on a Fly volume. Survives restarts; refreshes every 15 min via `node-cron`.
- Push notifications are intentionally not in v1.
