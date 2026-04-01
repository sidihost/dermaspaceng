import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { get2FAStatus } from '@/lib/totp'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const status = await get2FAStatus(user.id)
    
    return NextResponse.json(status)
  } catch (error) {
    console.error('Error getting 2FA status:', error)
    return NextResponse.json({ error: 'Failed to get 2FA status' }, { status: 500 })
  }
}
