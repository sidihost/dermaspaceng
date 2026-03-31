import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { getOrCreateWalletSettings, updateWalletSettings } from '@/lib/wallet'

// GET /api/wallet/settings - Get wallet settings
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const settings = await getOrCreateWalletSettings(user.id)
    
    return NextResponse.json({
      success: true,
      settings,
    })
  } catch (error) {
    console.error('Get wallet settings error:', error)
    return NextResponse.json(
      { error: 'Failed to get settings' },
      { status: 500 }
    )
  }
}

// PUT /api/wallet/settings - Update wallet settings
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const user = await verifyToken(token)
    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    const body = await request.json()
    
    // Validate settings
    const allowedFields = [
      'monthly_budget',
      'budget_alert_threshold',
      'low_balance_alert',
      'email_notifications',
      'push_notifications',
      'auto_reload_enabled',
      'auto_reload_amount',
      'auto_reload_threshold',
    ]
    
    const updates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    
    const updatedSettings = await updateWalletSettings(user.id, updates)
    
    if (!updatedSettings) {
      return NextResponse.json(
        { error: 'Failed to update settings' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      settings: updatedSettings,
    })
  } catch (error) {
    console.error('Update wallet settings error:', error)
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    )
  }
}
