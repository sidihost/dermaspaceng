import { NextResponse } from 'next/server'
import { getAllFlags } from '@/lib/feature-flags'

/**
 * Public read-only feature flag endpoint.
 * Returns a flat { key: enabled } map for cheap client-side checks.
 */
export async function GET() {
  const flags = await getAllFlags()
  const map: Record<string, boolean> = {}
  for (const f of flags) map[f.key] = f.enabled
  return NextResponse.json({ flags: map }, {
    // Browsers can hold onto this for a minute; admin toggles will
    // propagate within that window without crushing the DB.
    headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
  })
}
