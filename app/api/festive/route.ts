import { NextResponse, type NextRequest } from 'next/server'
import { getChristmasSettings, setChristmasSettings } from '@/lib/christmas-settings'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Public & Admin API for Christmas / Festive Animation state.
 * GET: returns current { enabled: boolean, intensity: string }
 * POST: updates state if requested by an admin (or allowed for testing)
 */
export async function GET() {
  const settings = await getChristmasSettings()
  return NextResponse.json(settings, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    // Allow toggle if admin/staff or if testing in local environment
    const isAdminUser = user?.role === 'admin' || user?.role === 'staff' || !process.env.DATABASE_URL
    if (!isAdminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await req.json()
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : true
    const intensity = body.intensity === 'festive' ? 'festive' : 'gentle'

    const updated = await setChristmasSettings(enabled, intensity, user?.id ?? null)
    return NextResponse.json({ success: true, settings: updated })
  } catch (err) {
    console.error('[api/festive POST]', err)
    return NextResponse.json({ error: 'Failed to update festive settings' }, { status: 500 })
  }
}
