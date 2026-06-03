'use client'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts'

interface PricePoint { t: number; p: number }

interface PriceChartProps {
  data: PricePoint[]
  midprice?: number
}

function fmt(ts: number) {
  return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function PriceChart({ data, midprice }: PriceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-600 text-sm">
        no price history
      </div>
    )
  }

  const last = data[data.length - 1]?.p ?? 0.5
  const first = data[0]?.p ?? 0.5
  const up = last >= first

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="colorUp" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorDown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="t"
          tickFormatter={fmt}
          tick={{ fontSize: 10, fill: '#52525b' }}
          axisLine={false}
          tickLine={false}
          minTickGap={60}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={v => `${(v * 100).toFixed(0)}¢`}
          tick={{ fontSize: 10, fill: '#52525b' }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip
          contentStyle={{
            background: '#18181b',
            border: '1px solid #2e2e35',
            borderRadius: 6,
            fontSize: 12,
          }}
          labelFormatter={fmt}
          formatter={(v: number) => [`${(v * 100).toFixed(2)}¢`, 'price']}
        />
        {midprice !== undefined && (
          <ReferenceLine
            y={midprice}
            stroke="#3b82f6"
            strokeDasharray="3 3"
            strokeWidth={1}
          />
        )}
        <Area
          type="monotone"
          dataKey="p"
          stroke={up ? '#22c55e' : '#ef4444'}
          strokeWidth={1.5}
          fill={`url(#color${up ? 'Up' : 'Down'})`}
          dot={false}
          animationDuration={300}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
