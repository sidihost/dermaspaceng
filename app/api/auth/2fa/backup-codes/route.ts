import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { regenerateBackupCodes, verifyTOTPCode } from '@/lib/totp'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: 'Code is required to regenerate backup codes' }, { status: 400 })
    }

    // Verify the code before regenerating
    const isValid = await verifyTOTPCode(user.id, code)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    const backupCodes = await regenerateBackupCodes(user.id)
    
    if (!backupCodes) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }
    
    return NextResponse.json({ 
      success: true, 
      backupCodes,
      message: 'Backup codes regenerated successfully' 
    })
  } catch (error) {
    console.error('Error regenerating backup codes:', error)
    return NextResponse.json({ error: 'Failed to regenerate backup codes' }, { status: 500 })
  }
}
