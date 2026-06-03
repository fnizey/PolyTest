'use client'
import { useEffect, useState, useCallback } from 'react'
import { MarketCard } from '@/components/MarketCard'
import { StatCard } from '@/components/ui/StatCard'
import { Activity, TrendingUp, Zap, RefreshCw, Clock } from 'lucide-react'
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

function timeSince(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${diff.toFixed(0)}s ago`
  if (diff < 3600) return `${(diff / 60).toFixed(0)}m ago`
  return `${(diff / 3600).toFixed(1)}h ago`
}

function fmtVol(v: number) {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}k`
  return `$${v.toFixed(0)}`
}

const REFRESH_INTERVAL_MS = 30_000

export default function Dashboard() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'high-vpin' | 'tight-spread' | 'high-vol'>('all')
  const [lastRefresh, setLastRefresh] = useState('')

  const load = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch('/api/markets', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setMarkets(data.markets ?? [])
      setFetchedAt(data.fetched_at)
      setLastRefresh(new Date().toLocaleTimeString())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, REFRESH_INTERVAL_MS)
    return () => clearInterval(id)
  }, [load])

  const filtered = markets.filter(m => {
    if (filter === 'high-vpin') return m.signals.vpin > 0.4
    if (filter === 'tight-spread') return m.spread && m.spread.spread_bps < 100
    if (filter === 'high-vol') return m.volume24hr > 100_000
    return true
  })

  // Aggregate stats
  const totalVol = markets.reduce((a, m) => a + (m.volume24hr ?? 0), 0)
  const avgSpread = markets
    .filter(m => m.spread)
    .reduce((a, m, _, arr) => a + (m.spread!.spread_bps / arr.length), 0)
  const avgVpin = markets
    .reduce((a, m, _, arr) => a + (m.signals.vpin / arr.length), 0)
  const highToxicity = markets.filter(m => m.signals.vpin > 0.5).length

  return (
    <div className="min-h-screen bg-surface-0">
      {/* Nav */}
      <header className="border-b border-border bg-surface-1 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="font-mono text-sm font-semibold text-zinc-200">hft-pm</span>
            <span className="text-zinc-700">·</span>
            <span className="text-xs text-zinc-600">polymarket live</span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-zinc-700 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {lastRefresh}
              </span>
            )}
            <button
              onClick={load}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw className={clsx('w-3 h-3', loading && 'animate-spin')} />
              refresh
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            label="24h volume"
            value={fmtVol(totalVol)}
            sub={`${markets.length} markets`}
            icon={<TrendingUp className="w-4 h-4" />}
            mono
          />
          <StatCard
            label="avg spread"
            value={`${avgSpread.toFixed(0)} bps`}
            sub="top markets"
            trend={avgSpread < 150 ? 'up' : 'down'}
            icon={<Activity className="w-4 h-4" />}
            mono
          />
          <StatCard
            label="avg VPIN"
            value={avgVpin.toFixed(3)}
            sub="toxicity proxy"
            trend={avgVpin < 0.35 ? 'up' : avgVpin < 0.55 ? 'neutral' : 'down'}
            icon={<Zap className="w-4 h-4" />}
            mono
          />
          <StatCard
            label="toxic markets"
            value={highToxicity}
            sub="VPIN > 0.5"
            trend={highToxicity === 0 ? 'up' : highToxicity < 3 ? 'neutral' : 'down'}
            icon={<Activity className="w-4 h-4" />}
          />
        </div>

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'tight-spread', 'high-vol', 'high-vpin'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'text-xs px-3 py-1.5 rounded-full border transition-colors',
                filter === f
                  ? 'border-zinc-500 bg-surface-3 text-zinc-200'
                  : 'border-border text-zinc-500 hover:text-zinc-300 hover:border-zinc-600',
              )}
            >
              {f === 'all' ? 'all markets' :
               f === 'tight-spread' ? 'tight spread (<100 bps)' :
               f === 'high-vol' ? 'high vol (>$100k)' :
               'high toxicity (VPIN>0.4)'}
            </button>
          ))}
          <span className="text-xs text-zinc-700 self-center ml-auto">
            {filtered.length} / {markets.length} shown
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            fetch error: {error} — check CORS or Polymarket API availability
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !markets.length && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-border bg-surface-1 animate-pulse" />
            ))}
          </div>
        )}

        {/* Market cards */}
        {!loading && (
          <div className="space-y-3">
            {filtered.map(m => (
              <MarketCard key={m.condition_id} market={m} />
            ))}
            {filtered.length === 0 && !error && (
              <div className="text-center text-zinc-600 py-12 text-sm">
                no markets match this filter
              </div>
            )}
          </div>
        )}

        {fetchedAt && (
          <p className="text-xs text-zinc-700 text-center">
            data fetched {timeSince(fetchedAt)} · auto-refreshes every 30s
          </p>
        )}
      </main>
    </div>
  )
}
