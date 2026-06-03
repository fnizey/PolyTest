'use client'
import { useEffect, useState } from 'react'
import { PriceChart } from './charts/PriceChart'
import { OrderBookDepth } from './charts/OrderBookDepth'
import { SignalBadge } from './ui/SignalBadge'
import { ExternalLink, RefreshCw } from 'lucide-react'
import clsx from 'clsx'

interface Market {
  condition_id: string
  question: string
  slug: string
  category: string
  volume24hr: number
  liquidity: number
  token_id: string
  outcome: string
  end_date: string
  spread: {
    bid: number; ask: number; midprice: number
    microprice: number; spread_bps: number
  } | null
  signals: {
    ofi: number; vpin: number
    as_bid: number | null; as_ask: number | null; as_half_spread: number | null
  }
  book_depth: {
    bids: { price: string; size: string }[]
    asks: { price: string; size: string }[]
  } | null
}

function vpinVariant(v: number): 'green' | 'amber' | 'red' {
  if (v < 0.3) return 'green'
  if (v < 0.6) return 'amber'
  return 'red'
}

function ofiVariant(v: number): 'green' | 'red' | 'neutral' {
  if (v > 50) return 'green'
  if (v < -50) return 'red'
  return 'neutral'
}

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`
  return `$${v.toFixed(0)}`
}

export function MarketCard({ market }: { market: Market }) {
  const [history, setHistory] = useState<{ t: number; p: number }[]>([])
  const [loadingChart, setLoadingChart] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    setLoadingChart(true)
    fetch(`/api/signals?token_id=${market.token_id}&interval=1w`)
      .then(r => r.json())
      .then(d => setHistory(d.history ?? []))
      .catch(() => setHistory([]))
      .finally(() => setLoadingChart(false))
  }, [market.token_id])

  const mid = market.spread?.midprice
  const midPct = mid !== undefined ? `${(mid * 100).toFixed(1)}¢` : '—'
  const spreadBps = market.spread?.spread_bps
  const spreadColor = spreadBps === undefined ? '' :
    spreadBps > 200 ? 'text-accent-red' :
    spreadBps > 80  ? 'text-accent-amber' : 'text-accent-green'

  return (
    <div className="rounded-xl border border-border bg-surface-1 overflow-hidden hover:border-zinc-700 transition-colors">
      {/* Header */}
      <div
        className="flex items-start justify-between gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-zinc-600 uppercase tracking-wider">
              {market.category}
            </span>
            <span className="text-xs text-zinc-700">·</span>
            <span className="text-xs text-zinc-600">{market.outcome}</span>
          </div>
          <p className="text-sm text-zinc-200 leading-snug line-clamp-2">
            {market.question}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-mono font-semibold text-zinc-100">{midPct}</div>
          <div className={clsx('text-xs font-mono', spreadColor)}>
            {spreadBps !== undefined ? `${spreadBps.toFixed(0)} bps` : '—'}
          </div>
        </div>
      </div>

      {/* Signals row */}
      <div className="flex flex-wrap gap-1.5 px-4 pb-3">
        <SignalBadge label="vol24h" value={fmtVol(market.volume24hr)} variant="neutral" />
        <SignalBadge label="OFI" value={market.signals.ofi > 0 ? `+${market.signals.ofi}` : `${market.signals.ofi}`} variant={ofiVariant(market.signals.ofi)} />
        <SignalBadge label="VPIN" value={market.signals.vpin.toFixed(3)} variant={vpinVariant(market.signals.vpin)} />
        {market.signals.as_half_spread !== null && (
          <SignalBadge label="AS δ*" value={market.signals.as_half_spread.toFixed(4)} variant="purple" />
        )}
        {market.spread?.microprice !== undefined && market.spread.midprice !== undefined && (
          <SignalBadge
            label="μprice"
            value={market.spread.microprice.toFixed(4)}
            variant={market.spread.microprice > market.spread.midprice ? 'blue' : 'amber'}
          />
        )}
      </div>

      {/* Expanded: chart + book */}
      {expanded && (
        <div className="border-t border-border">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Price chart */}
            <div className="p-4">
              <div className="text-xs text-zinc-600 mb-2 uppercase tracking-wider">7d price</div>
              <div className="h-40">
                {loadingChart ? (
                  <div className="flex items-center justify-center h-full text-zinc-700 text-sm">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <PriceChart data={history} midprice={mid} />
                )}
              </div>
            </div>

            {/* Order book */}
            <div className="p-4">
              <div className="text-xs text-zinc-600 mb-2 uppercase tracking-wider">order book</div>
              {market.book_depth ? (
                <OrderBookDepth
                  bids={market.book_depth.bids}
                  asks={market.book_depth.asks}
                  midprice={mid}
                />
              ) : (
                <div className="text-xs text-zinc-600">no book data</div>
              )}
            </div>
          </div>

          {/* AS model row */}
          {market.signals.as_bid !== null && (
            <div className="border-t border-border px-4 py-3 flex flex-wrap gap-3 items-center">
              <span className="text-xs text-zinc-600 uppercase tracking-wider">AS model</span>
              <div className="font-mono text-xs">
                <span className="text-zinc-600">bid </span>
                <span className="text-accent-green">{market.signals.as_bid?.toFixed(4)}</span>
                <span className="text-zinc-700 mx-2">|</span>
                <span className="text-zinc-600">ask </span>
                <span className="text-accent-red">{market.signals.as_ask?.toFixed(4)}</span>
                <span className="text-zinc-700 mx-2">|</span>
                <span className="text-zinc-600">mid </span>
                <span className="text-zinc-300">{mid?.toFixed(4)}</span>
              </div>
              <a
                href={`https://polymarket.com/market/${market.slug}`}
                target="_blank"
                rel="noreferrer"
                className="ml-auto flex items-center gap-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                onClick={e => e.stopPropagation()}
              >
                polymarket <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
