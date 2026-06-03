'use client'
import { ReactNode } from 'react'
import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: ReactNode
  mono?: boolean
}

export function StatCard({ label, value, sub, trend, icon, mono }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 uppercase tracking-wider">{label}</span>
        {icon && <span className="text-zinc-600">{icon}</span>}
      </div>
      <div className={clsx(
        'text-2xl font-semibold',
        mono && 'font-mono',
        trend === 'up' && 'text-accent-green',
        trend === 'down' && 'text-accent-red',
        !trend && 'text-zinc-100',
      )}>
        {value}
      </div>
      {sub && <div className="text-xs text-zinc-500">{sub}</div>}
    </div>
  )
}
