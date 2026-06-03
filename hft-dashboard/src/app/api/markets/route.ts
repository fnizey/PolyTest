import { NextResponse } from 'next/server'
import {
  fetchActiveMarkets,
  fetchOrderBook,
  fetchTrades,
  computeSpread,
  computeOFI,
  computeVPIN,
  asQuotes,
  type Market,
} from '@/lib/polymarket'

export const revalidate = 15

export async function GET() {
  try {
    const markets = await fetchActiveMarkets(12)

    const enriched = await Promise.allSettled(
      markets
        .filter(m => {
          // clobTokenIds is a JSON string like "[\"123\", \"456\"]"
          const ids = parseClobTokenIds(m)
          return ids.length > 0 && m.enableOrderBook
        })
        .slice(0, 8)
        .map(async m => {
          const tokenIds = parseClobTokenIds(m)
          const tokenId = tokenIds[0]

          const [book, trades] = await Promise.allSettled([
            fetchOrderBook(tokenId),
            fetchTrades(tokenId, 100),
          ])

          const bookData = book.status === 'fulfilled' ? book.value : null
          const tradesData = trades.status === 'fulfilled' ? trades.value : []

          const spread = bookData ? computeSpread(bookData) : null

          // Fall back to bestBid/bestAsk from gamma if CLOB book is empty
          const bestBid = spread?.bid ?? parseFloat(m.bestBid ?? '0')
          const bestAsk = spread?.ask ?? parseFloat(m.bestAsk ?? '1')
          const midprice = spread?.midprice ?? (bestBid + bestAsk) / 2
          const microprice = spread?.microprice ?? midprice
          const spreadBps = midprice > 0 ? ((bestAsk - bestBid) / midprice) * 10000 : 0

          const ofi = computeOFI(tradesData)
          const vpin = computeVPIN(tradesData)

          const asData = asQuotes({
            midprice,
            inventory: 0,
            gamma: 0.1,
            sigma: 0.02,
            kappa: 1.5,
            T: 1,
            t: 0,
          })

          // Parse outcomes
          let outcomes: string[] = []
          try { outcomes = JSON.parse(m.outcomes ?? '[]') } catch {}
          let outcomePrices: string[] = []
          try { outcomePrices = JSON.parse(m.outcomePrices ?? '[]') } catch {}

          return {
            condition_id: m.conditionId,
            question: m.question,
            slug: m.slug,
            category: m.feeType?.replace(/_fees$/, '').replace(/_/g, ' ') ?? 'other',
            volume24hr: m.volume24hr ?? 0,
            liquidity: m.liquidityNum ?? parseFloat(m.liquidity ?? '0'),
            token_id: tokenId,
            outcome: outcomes[0] ?? 'YES',
            end_date: m.endDateIso ?? m.endDate,
            spread: {
              bid: bestBid,
              ask: bestAsk,
              midprice,
              microprice,
              spread_bps: spreadBps,
            },
            signals: {
              ofi: parseFloat(ofi.toFixed(2)),
              vpin: parseFloat(vpin.toFixed(4)),
              as_bid: parseFloat(asData.bid.toFixed(4)),
              as_ask: parseFloat(asData.ask.toFixed(4)),
              as_half_spread: parseFloat(asData.halfSpread.toFixed(4)),
            },
            book_depth: bookData
              ? { bids: bookData.bids.slice(0, 5), asks: bookData.asks.slice(0, 5) }
              : null,
            last_trade_price: m.lastTradePrice,
            one_day_change: m.oneDayPriceChange,
          }
        })
    )

    const results = enriched
      .filter(r => r.status === 'fulfilled')
      .map(r => (r as PromiseFulfilledResult<unknown>).value)

    return NextResponse.json({ markets: results, fetched_at: new Date().toISOString() })
  } catch (err) {
    console.error('markets route error:', err)
    return NextResponse.json({ error: 'Failed to fetch markets' }, { status: 500 })
  }
}

// clobTokenIds comes back as a JSON string: "[\"123\", \"456\"]"
function parseClobTokenIds(m: Market): string[] {
  const raw = m.clobTokenIds
  if (!raw) return []
  if (Array.isArray(raw)) return raw as string[]
  try { return JSON.parse(raw as string) } catch { return [] }
}
