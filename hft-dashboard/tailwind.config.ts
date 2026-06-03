import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      colors: {
        surface: {
          0: '#0a0a0b',
          1: '#111113',
          2: '#18181b',
          3: '#1f1f23',
          4: '#27272c',
        },
        border: '#2e2e35',
        accent: {
          green:  '#22c55e',
          red:    '#ef4444',
          amber:  '#f59e0b',
          blue:   '#3b82f6',
          purple: '#a78bfa',
          teal:   '#14b8a6',
        },
      },
    },
  },
  plugins: [],
}

export default config
