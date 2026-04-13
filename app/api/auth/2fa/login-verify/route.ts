import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { sql } from '@/lib/db'
import { verifyTOTPCode } from '@/lib/totp'
import { verify } from 'jsonwebtoken'
import { createSession, checkNewDevice } from '@/lib/auth'
import { sendNewDeviceAlert } from '@/lib/email'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { partialToken, code } = body

    if (!partialToken || !code) {
      return NextResponse.json({ error: 'Token and code are required' }, { status: 400 })
    }

    // Verify the partial token
    let decoded: { userId: string; email: string; requires2FA: boolean }
    try {
      decoded = verify(partialToken, JWT_SECRET) as typeof decoded
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    if (!decoded.requires2FA) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 })
    }

    // Verify the TOTP code
    const isValid = await verifyTOTPCode(decoded.userId, code)

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Get user details
    const userResult = await sql`
      SELECT id, email, first_name, last_name FROM users WHERE id = ${decoded.userId}
    `

    if (userResult.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const user = userResult[0]

    // Get device info and IP for session creation
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown device'
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0] || 'Unknown'

    // Check for new device
    const isNewDevice = await checkNewDevice(user.id, userAgent)

    // Create session (same as regular signin)
    const sessionId = await createSession(user.id, userAgent, ipAddress)

    // Send new device alert if needed
    if (isNewDevice) {
      let location = 'Unknown location'
      try {
        const geoRes = await fetch(`https://ipapi.co/${ipAddress}/json/`)
        const geoData = await geoRes.json()
        location = `${geoData.city || 'Unknown'}, ${geoData.country_name || 'Unknown'}`
      } catch {
        // Ignore geo lookup errors
      }

      await sendNewDeviceAlert({
        email: user.email,
        firstName: user.first_name,
        deviceInfo: userAgent,
        ipAddress,
        location
      })
    }

    // Set session cookie (same cookie as regular signin uses)
    const cookieStore = await cookies()
    cookieStore.set('session_id', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/'
    })

    return NextResponse.json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email, 
        firstName: user.first_name,
        lastName: user.last_name
      }
    })
  } catch (error) {
    console.error('Error verifying 2FA login:', error)
    return NextResponse.json({ error: 'Failed to verify 2FA' }, { status: 500 })
  }
}
