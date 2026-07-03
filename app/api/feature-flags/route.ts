import { NextResponse } from 'next/server'
import { getEffectiveFlagMap } from '@/lib/feature-flags'

// Role-aware: the map is resolved for the CURRENT viewer (admins + staff
// can see 'preview' flags), so it must never be shared-cached across users.
export const dynamic = 'force-dynamic'

/**
 * Public read-only feature flag endpoint.
 * Returns a flat { key: enabled } map for cheap client-side checks,
 * resolved for the current session's role.
 */
export async function GET() {
  const map = await getEffectiveFlagMap()
  return NextResponse.json(
    { flags: map },
    {
      // Per-viewer result — keep it private to the browser only. The
      // client hook still de-dupes and polls, and the underlying flag
      // read is Redis-cached, so this stays cheap.
      headers: { 'Cache-Control': 'private, no-store' },
    },
  )
}
