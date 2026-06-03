# hft-pm dashboard

Live market making dashboard for Polymarket CLOB. Built with Next.js 14 App Router, deployed to Vercel.

Pulls live data from Polymarket public REST APIs — no API key required for read-only data.

## What it shows

- **Top markets by 24h volume** — question, outcome, live midprice
- **Spread in bps** — color-coded: green (<80), amber (80–200), red (>200)
- **OFI** — order flow imbalance from recent trades (directional pressure signal)
- **VPIN** — volume-synchronized probability of informed trading (toxicity proxy)
- **Avellaneda-Stoikov model quotes** — reservation price, half-spread, AS bid/ask
- **Microprice** — imbalance-weighted fair value
- **Order book depth** — top 5 levels, visual bar chart
- **7-day price chart** — area chart with trend color

Click any market card to expand the book + chart view.

## Deploy to Vercel (3 steps)

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "init"
gh repo create hft-pm-dashboard --public --push --source=.

# 2. Import on Vercel
# Go to https://vercel.com/new → Import Git Repository → select this repo
# Framework preset: Next.js (auto-detected)
# No environment variables needed for read-only data

# 3. Done — Vercel builds and deploys automatically on every push
```

## Local dev

```bash
npm install
npm run dev
# → http://localhost:3000
```

## Filters

| Filter | Description |
|--------|-------------|
| all markets | everything |
| tight spread | spread_bps < 100 |
| high vol | 24h volume > $100k |
| high toxicity | VPIN > 0.4 — consider widening or withdrawing |

## Architecture

```
src/
  app/
    api/
      markets/route.ts   ← server-side: fetches Polymarket REST, computes signals
      signals/route.ts   ← server-side: price history for a token
    dashboard/page.tsx   ← client: auto-refreshes every 30s
  components/
    MarketCard.tsx        ← per-market expandable panel
    charts/
      PriceChart.tsx      ← recharts area chart
      OrderBookDepth.tsx  ← custom book visualizer
    ui/
      StatCard.tsx
      SignalBadge.tsx
  lib/
    polymarket.ts         ← all API calls + signal math (OFI, VPIN, AS)
```

## Data sources

| Endpoint | Used for |
|----------|----------|
| `gamma-api.polymarket.com/markets` | Active market list, volume, liquidity |
| `clob.polymarket.com/book` | Live order book |
| `clob.polymarket.com/prices-history` | Price chart |
| `data-api.polymarket.com/trades` | OFI + VPIN calculation |

All public. No auth. Rate limits: be reasonable — the app revalidates every 15–30s on the server.

## Connecting a live trading bot

When you have a trading bot running separately, expose its state as a JSON endpoint and add a `/api/positions/route.ts` that fetches from it. The `StatCard` and `SignalBadge` components are already built to display PnL, inventory, and fill counts — just wire in real data.

## Extending

- **Add wallet positions**: implement `/api/positions/route.ts` using the CLOB V2 authenticated endpoints
- **Add Kalshi**: same component tree, different API client in `lib/kalshi.ts`
- **Add alerts**: POST to a Telegram/Slack webhook from the API routes when VPIN spikes
- **Add backtester output**: write backtest results to a Vercel KV store and display them in a new route
