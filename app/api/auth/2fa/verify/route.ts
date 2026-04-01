import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { verifyAndEnable2FA } from '@/lib/totp'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    const result = await verifyAndEnable2FA(user.id, code)
    
    if (result.verified) {
      return NextResponse.json({
        success: true,
        message: '2FA enabled successfully',
        backupCodes: result.backupCodes
      })
    } else {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error verifying 2FA:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}
