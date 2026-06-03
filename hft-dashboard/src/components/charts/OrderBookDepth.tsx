'use client'

interface Level { price: string; size: string }

interface OrderBookDepthProps {
  bids: Level[]
  asks: Level[]
  midprice?: number
}

export function OrderBookDepth({ bids, asks, midprice }: OrderBookDepthProps) {
  const maxSize = Math.max(
    ...bids.map(b => parseFloat(b.size)),
    ...asks.map(a => parseFloat(a.size)),
    1
  )

  const fmt = (n: string) => parseFloat(n).toFixed(4)
  const fmtSize = (n: string) => {
    const v = parseFloat(n)
    return v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
  }

  return (
    <div className="font-mono text-xs">
      <div className="grid grid-cols-3 text-zinc-600 mb-1 px-1">
        <span>price</span>
        <span className="text-center">size</span>
        <span className="text-right">depth</span>
      </div>

      {/* Asks (reversed so best ask is closest to mid) */}
      {[...asks].reverse().map((a, i) => {
        const pct = (parseFloat(a.size) / maxSize) * 100
        return (
          <div key={i} className="relative grid grid-cols-3 items-center px-1 py-0.5 rounded overflow-hidden">
            <div
              className="absolute right-0 top-0 h-full bg-red-950/40"
              style={{ width: `${pct}%` }}
            />
            <span className="relative text-accent-red">{fmt(a.price)}</span>
            <span className="relative text-center text-zinc-400">{fmtSize(a.size)}</span>
            <span className="relative text-right text-zinc-600">{pct.toFixed(0)}%</span>
          </div>
        )
      })}

      {/* Mid */}
      {midprice !== undefined && (
        <div className="text-center text-zinc-300 font-semibold py-1 border-y border-border my-0.5">
          {midprice.toFixed(4)}
        </div>
      )}

      {/* Bids */}
      {bids.map((b, i) => {
        const pct = (parseFloat(b.size) / maxSize) * 100
        return (
          <div key={i} className="relative grid grid-cols-3 items-center px-1 py-0.5 rounded overflow-hidden">
            <div
              className="absolute right-0 top-0 h-full bg-green-950/40"
              style={{ width: `${pct}%` }}
            />
            <span className="relative text-accent-green">{fmt(b.price)}</span>
            <span className="relative text-center text-zinc-400">{fmtSize(b.size)}</span>
            <span className="relative text-right text-zinc-600">{pct.toFixed(0)}%</span>
          </div>
        )
      })}
    </div>
  )
}
