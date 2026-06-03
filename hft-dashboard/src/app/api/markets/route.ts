import { NextResponse } from 'next/server'
import {
  fetchActiveMarkets,
  fetchOrderBook,
  fetchTrades,
  computeSpread,
  computeOFI,
  computeVPIN,
  asQuotes,
} from '@/lib/polymarket'

export const revalidate = 15

export async function GET() {
  try {
    const markets = await fetchActiveMarkets(12)

    const enriched = await Promise.allSettled(
      markets
        .filter(m => m.tokens?.length > 0)
        .slice(0, 8)
        .map(async m => {
          const token = m.tokens[0]
          const [book, trades] = await Promise.allSettled([
            fetchOrderBook(token.token_id),
            fetchTrades(token.token_id, 100),
          ])

          const bookData = book.status === 'fulfilled' ? book.value : null
          const tradesData = trades.status === 'fulfilled' ? trades.value : []

          const spread = bookData ? computeSpread(bookData) : null
          const ofi = computeOFI(tradesData)
          const vpin = computeVPIN(tradesData)

          const asData =
            spread
              ? asQuotes({
                  midprice: spread.midprice,
                  inventory: 0,
                  gamma: 0.1,
                  sigma: 0.02,
                  kappa: 1.5,
                  T: 1,
                  t: 0,
                })
              : null

          return {
            condition_id: m.condition_id,
            question: m.question,
            slug: m.market_slug,
            category: m.category ?? 'unknown',
            volume24hr: m.volume24hr ?? 0,
            liquidity: parseFloat(m.liquidity ?? '0'),
            token_id: token.token_id,
            outcome: token.outcome,
            end_date: m.end_date_iso,
            spread: spread
              ? {
                  bid: spread.bid,
                  ask: spread.ask,
                  midprice: spread.midprice,
                  microprice: spread.microprice,
                  spread_bps: spread.spreadBps,
                }
              : null,
            signals: {
              ofi: parseFloat(ofi.toFixed(2)),
              vpin: parseFloat(vpin.toFixed(4)),
              as_bid: asData ? parseFloat(asData.bid.toFixed(4)) : null,
              as_ask: asData ? parseFloat(asData.ask.toFixed(4)) : null,
              as_half_spread: asData ? parseFloat(asData.halfSpread.toFixed(4)) : null,
            },
            book_depth: bookData
              ? {
                  bids: bookData.bids.slice(0, 5),
                  asks: bookData.asks.slice(0, 5),
                }
              : null,
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
