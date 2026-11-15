import { NextResponse, type NextRequest } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  getFestiveState,
  setFeatureVisibility,
  type FeatureVisibility,
} from '@/lib/feature-flags'

export const dynamic = 'force-dynamic'

/**
 * Public & Admin API for Christmas / Festive features state.
 * GET: returns current { enabled: boolean, intensity: string, visibility: string }
 * POST: updates state if requested by an admin
 */
export async function GET() {
  const state = await getFestiveState()
  return NextResponse.json(state, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const isAdminUser = user?.role === 'admin' || user?.role === 'staff' || !process.env.DATABASE_URL
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    let visibility: FeatureVisibility = 'on'

    if (typeof body.visibility === 'string' && ['on', 'preview', 'off'].includes(body.visibility)) {
      visibility = body.visibility as FeatureVisibility
    } else if (typeof body.enabled === 'boolean') {
      visibility = body.enabled ? 'on' : 'off'
    }

    const enabled = visibility !== 'off'
    const intensity = body.intensity === 'festive' ? 'festive' : 'gentle'

    const { setChristmasSettings } = await import('@/lib/christmas-settings')
    const updated = await setChristmasSettings(enabled, intensity, user?.id ?? null)
    await setFeatureVisibility('festive', visibility, user?.id ?? null).catch(() => {})

    return NextResponse.json({ success: true, settings: { ...updated, visibility } })
  } catch (err) {
    console.error('[api/festive POST]', err)
    return NextResponse.json({ error: 'Failed to update festive settings' }, { status: 500 })
  }
}
