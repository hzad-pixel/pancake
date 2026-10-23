# TikTok Tools API

Calculator-style TikTok tools as a simple JSON API — the kind of tools on
elev8or.io (calculators) and tik.tools (gifter levels), in API form.
Zero dependencies, Node.js only.

## Run

```bash
node index.js
# listens on 0.0.0.0, port = SERVER_PORT (Botkeep) -> PORT -> 3000
```

Optional auth: set env `API_KEY` — clients must then send header
`x-api-key: <key>` (root `/` and `/health` stay open).

## Endpoints

| Path | What it does |
|---|---|
| `/coins?amount=1000` | Coins → USD: web cost, app cost, creator payout |
| `/diamonds?amount=10000` | Diamonds → USD payout value |
| `/gifter-levels` | Full gifter level table L1–L50 (coins + USD thresholds) |
| `/gifter-level?coins=144000` | Level for a lifetime coin amount + progress to next |
| `/money?monthly_views=1000000` | Monthly Creator Rewards earnings estimate |
| `/creator-rewards?monthly_views=1000000` | Same as /money |
| `/shop-commission?price=20&rate=10&sales=100` | TikTok Shop affiliate commission |
| `/engagement?views=100000&likes=8000&comments=300&shares=200` | Engagement rate % |
| `/pricing?followers=100000&avg_views=50000` | Sponsored post price range (estimate) |
| `/username-ideas?word=fitness` | Username ideas from a keyword |
| `/follower-count?username=tiktok` | Live follower/following/video counts (tikwm source) |
| `/average-views?username=tiktok` | Average views/likes over recent videos (tikwm source) |

Rates are US 2026 estimates and are labeled as estimates in the responses.

## Botkeep deploy

1. Create an app on botkeep.cloud, connect this repo/folder.
2. Runtime Node 20. Start command: `node index.js`.
3. The app reads the port from `SERVER_PORT` automatically (Botkeep rule).
4. Set secret `API_KEY` in the Environment panel if you want the API locked.
5. Use the Domains tab for an HTTPS custom domain.

## Phase 2 (not in this build)

Live-data tools from tik.tools (Creators/Gifters Leaderboards, Popular LIVE,
gift firehose) need a 24/7 LIVE collector + a TikTok LIVE signing key
(e.g. Euler Stream free plan). They plug into this same API later as
`/leaderboard/...` and `/live/...` routes.
