// Polymarket public REST endpoints (no auth required for read-only data)
const CLOB_HOST = 'https://clob.polymarket.com'
const GAMMA_HOST = 'https://gamma-api.polymarket.com'
const DATA_HOST = 'https://data-api.polymarket.com'

export interface Market {
  condition_id: string
  question: string
  market_slug: string
  end_date_iso: string
  game_start_time?: string
  tokens: { token_id: string; outcome: string }[]
  active: boolean
  closed: boolean
  archived: boolean
  enable_order_book: boolean
  minimum_order_size: number
  minimum_tick_size: number
  category?: string
  volume: string
  volume24hr: number
  liquidity: string
}

export interface OrderBook {
  market: string
  asset_id: string
  bids: { price: string; size: string }[]
  asks: { price: string; size: string }[]
  hash: string
  timestamp: string
}

export interface Trade {
  id: string
  taker_order_id: string
  market: string
  asset_id: string
  side: 'BUY' | 'SELL'
  size: string
  fee_rate_bps: string
  price: string
  status: string
  match_time: string
  last_update: string
  outcome: string
  bucket_index: number
  owner: string
  maker_orders: { order_id: string; maker_address: string; matched_amount: string }[]
  transaction_hash: string
}

export interface PriceHistory {
  history: { t: number; p: number }[]
}

// ── Active markets ────────────────────────────────────────────────────────────
export async function fetchActiveMarkets(limit = 20): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA_HOST}/markets?active=true&closed=false&archived=false&limit=${limit}&order=volume24hr&ascending=false`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) throw new Error(`fetchActiveMarkets: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : data.markets ?? []
}

// ── Order book for one token ──────────────────────────────────────────────────
export async function fetchOrderBook(tokenId: string): Promise<OrderBook> {
  const res = await fetch(
    `${CLOB_HOST}/book?token_id=${tokenId}`,
    { next: { revalidate: 5 } }
  )
  if (!res.ok) throw new Error(`fetchOrderBook: ${res.status}`)
  return res.json()
}

// ── Recent trades for one token ───────────────────────────────────────────────
export async function fetchTrades(tokenId: string, limit = 50): Promise<Trade[]> {
  const res = await fetch(
    `${DATA_HOST}/trades?market=${tokenId}&limit=${limit}`,
    { next: { revalidate: 10 } }
  )
  if (!res.ok) throw new Error(`fetchTrades: ${res.status}`)
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

// ── Price history (CLOB timeseries) ──────────────────────────────────────────
export async function fetchPriceHistory(
  tokenId: string,
  interval: 'max' | '1d' | '1w' | '1m' = '1w'
): Promise<PriceHistory> {
  const res = await fetch(
    `${CLOB_HOST}/prices-history?market=${tokenId}&interval=${interval}&fidelity=60`,
    { next: { revalidate: 30 } }
  )
  if (!res.ok) return { history: [] }
  return res.json()
}

// ── Market search ─────────────────────────────────────────────────────────────
export async function searchMarkets(query: string, limit = 10): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA_HOST}/markets?active=true&closed=false&limit=${limit}&order=volume24hr&ascending=false&search=${encodeURIComponent(query)}`,
    { next: { revalidate: 30 } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : data.markets ?? []
}

// ── Spread + microprice helpers ───────────────────────────────────────────────
export function computeSpread(book: OrderBook): {
  bid: number
  ask: number
  spread: number
  spreadBps: number
  midprice: number
  microprice: number
} {
  const bids = book.bids.map(b => ({ p: parseFloat(b.price), s: parseFloat(b.size) }))
  const asks = book.asks.map(a => ({ p: parseFloat(a.price), s: parseFloat(a.size) }))

  const bestBid = bids.length > 0 ? Math.max(...bids.map(b => b.p)) : 0
  const bestAsk = asks.length > 0 ? Math.min(...asks.map(a => a.p)) : 1

  const bidSz = bids.find(b => b.p === bestBid)?.s ?? 0
  const askSz = asks.find(a => a.p === bestAsk)?.s ?? 0

  const midprice = (bestBid + bestAsk) / 2
  const microprice =
    bidSz + askSz > 0
      ? (askSz * bestBid + bidSz * bestAsk) / (bidSz + askSz)
      : midprice

  const spread = bestAsk - bestBid
  const spreadBps = midprice > 0 ? (spread / midprice) * 10000 : 0

  return { bid: bestBid, ask: bestAsk, spread, spreadBps, midprice, microprice }
}

// ── OFI from recent trades ────────────────────────────────────────────────────
export function computeOFI(trades: Trade[]): number {
  return trades.reduce((acc, t) => {
    const vol = parseFloat(t.size)
    return acc + (t.side === 'BUY' ? vol : -vol)
  }, 0)
}

// ── VPIN approximation from trade buckets ─────────────────────────────────────
export function computeVPIN(trades: Trade[], bucketSize = 1000): number {
  if (trades.length === 0) return 0
  let buyVol = 0, sellVol = 0, buckets: number[] = []
  let bucketTotal = 0

  for (const t of trades) {
    const vol = parseFloat(t.size)
    if (t.side === 'BUY') buyVol += vol
    else sellVol += vol
    bucketTotal += vol

    if (bucketTotal >= bucketSize) {
      buckets.push(Math.abs(buyVol - sellVol) / bucketTotal)
      buyVol = 0; sellVol = 0; bucketTotal = 0
    }
  }

  if (buckets.length === 0) {
    const total = buyVol + sellVol
    return total > 0 ? Math.abs(buyVol - sellVol) / total : 0
  }
  return buckets.reduce((a, b) => a + b, 0) / buckets.length
}

// ── Avellaneda-Stoikov reservation price & spread ─────────────────────────────
export function asQuotes(params: {
  midprice: number
  inventory: number
  gamma: number
  sigma: number
  kappa: number
  T: number
  t: number
}): { reservationPrice: number; halfSpread: number; bid: number; ask: number } {
  const { midprice, inventory, gamma, sigma, kappa, T, t } = params
  const tau = T - t
  const reservationPrice = midprice - inventory * gamma * sigma ** 2 * tau
  const halfSpread =
    gamma * sigma ** 2 * tau + (2 / gamma) * Math.log(1 + gamma / kappa)
  return {
    reservationPrice,
    halfSpread,
    bid: reservationPrice - halfSpread,
    ask: reservationPrice + halfSpread,
  }
}
