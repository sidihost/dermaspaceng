import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { sql } from '@/lib/db'
import { sendSecurityReminderEmail } from '@/lib/email'
import { getUserPasskeys } from '@/lib/passkey'
import { get2FAStatus } from '@/lib/totp'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get user details
    const users = await sql`
      SELECT id, email, first_name FROM users WHERE id = ${payload.userId}
    `
    
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    const user = users[0]
    
    // Get security status
    const passkeys = await getUserPasskeys(payload.userId)
    const twoFAStatus = await get2FAStatus(payload.userId)
    
    // Send the security reminder email
    const sent = await sendSecurityReminderEmail({
      email: user.email,
      firstName: user.first_name,
      hasPasskey: passkeys.length > 0,
      has2FA: twoFAStatus.isEnabled
    })
    
    if (!sent) {
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Security reminder email sent successfully' 
    })
  } catch (error) {
    console.error('Security reminder email error:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}

// GET endpoint to check security status
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const payload = await verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
    
    // Get security status
    const passkeys = await getUserPasskeys(payload.userId)
    const twoFAStatus = await get2FAStatus(payload.userId)
    
    return NextResponse.json({
      hasPasskey: passkeys.length > 0,
      has2FA: twoFAStatus.isEnabled,
      passkeyCount: passkeys.length,
      backupCodesRemaining: twoFAStatus.backupCodesRemaining
    })
  } catch (error) {
    console.error('Security status error:', error)
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 })
  }
}
