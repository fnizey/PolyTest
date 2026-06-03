'use client'
import clsx from 'clsx'

interface SignalBadgeProps {
  label: string
  value: number | string
  variant?: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'neutral'
}

export function SignalBadge({ label, value, variant = 'neutral' }: SignalBadgeProps) {
  return (
    <div className={clsx(
      'flex items-center gap-1.5 rounded px-2 py-1 text-xs font-mono',
      variant === 'green'   && 'bg-green-950/60 text-green-400 border border-green-900/50',
      variant === 'red'     && 'bg-red-950/60 text-red-400 border border-red-900/50',
      variant === 'amber'   && 'bg-amber-950/60 text-amber-400 border border-amber-900/50',
      variant === 'blue'    && 'bg-blue-950/60 text-blue-400 border border-blue-900/50',
      variant === 'purple'  && 'bg-purple-950/60 text-purple-400 border border-purple-900/50',
      variant === 'neutral' && 'bg-surface-3 text-zinc-400 border border-border',
    )}>
      <span className="text-zinc-500">{label}</span>
      <span>{value}</span>
    </div>
  )
}
