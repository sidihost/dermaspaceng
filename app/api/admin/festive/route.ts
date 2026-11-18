import { NextResponse, type NextRequest } from 'next/server'
import { getChristmasSettings, setChristmasSettings } from '@/lib/christmas-settings'
import { getCurrentUser } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'admin' && user.role !== 'staff')) {
    return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
  }
  const settings = await getChristmasSettings()
  return NextResponse.json({ settings })
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()
    const isAdminUser =
      Boolean(user) && (user?.role === 'admin' || user?.role === 'staff')
    if (!isAdminUser || !user) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 403 })
    }

    const body = await req.json()
    const enabled = typeof body.enabled === 'boolean' ? body.enabled : true
    const intensity = body.intensity === 'festive' ? 'festive' : 'gentle'

    const { setFeatureVisibility } = await import('@/lib/feature-flags')
    const updated = await setChristmasSettings(enabled, intensity, user?.id ?? null)
    await setFeatureVisibility('festive', enabled ? 'on' : 'off', user?.id ?? null).catch(() => {})
    return NextResponse.json({ success: true, settings: updated })
  } catch (err) {
    console.error('[api/admin/festive POST]', err)
    return NextResponse.json({ error: 'Failed to update festive settings' }, { status: 500 })
  }
}
