import { NextRequest, NextResponse } from 'next/server'
import { fetchPriceHistory } from '@/lib/polymarket'

export const revalidate = 30

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tokenId = searchParams.get('token_id')
  const interval = (searchParams.get('interval') ?? '1w') as '1d' | '1w' | '1m' | 'max'

  if (!tokenId) {
    return NextResponse.json({ error: 'token_id required' }, { status: 400 })
  }

  try {
    const history = await fetchPriceHistory(tokenId, interval)
    return NextResponse.json(history)
  } catch (err) {
    console.error('price history error:', err)
    return NextResponse.json({ error: 'Failed to fetch price history' }, { status: 500 })
  }
}
