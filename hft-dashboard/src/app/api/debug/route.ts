import { NextResponse } from 'next/server'

// DELETE THIS ROUTE before going to production — it's for diagnostics only
export async function GET() {
  const GAMMA_HOST = 'https://gamma-api.polymarket.com'

  try {
    const res = await fetch(
      `${GAMMA_HOST}/markets?active=true&closed=false&archived=false&limit=3&order=volume24hr&ascending=false`,
      { cache: 'no-store' }
    )
    const raw = await res.json()

    return NextResponse.json({
      status: res.status,
      is_array: Array.isArray(raw),
      top_level_keys: typeof raw === 'object' && !Array.isArray(raw) ? Object.keys(raw) : null,
      length: Array.isArray(raw) ? raw.length : null,
      first_item_keys: Array.isArray(raw) && raw.length > 0 ? Object.keys(raw[0]) : null,
      sample: Array.isArray(raw) ? raw[0] : raw,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
