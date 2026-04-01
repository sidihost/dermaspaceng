import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { authenticateUser, createSession, checkNewDevice, verifyHCaptcha } from '@/lib/auth'
import { sendNewDeviceAlert } from '@/lib/email'
import { sql } from '@/lib/db'
import { sign } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, captchaToken } = body

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Verify hCaptcha
    if (process.env.HCAPTCHA_SECRET_KEY) {
      const captchaValid = await verifyHCaptcha(captchaToken)
      if (!captchaValid) {
        return NextResponse.json(
          { error: 'Captcha verification failed' },
          { status: 400 }
        )
      }
    }

    // Authenticate user
    const { user, error } = await authenticateUser(email, password)

    if (error || !user) {
      return NextResponse.json(
        { error: error || 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Check if user has 2FA enabled
    const twoFAResult = await sql`
      SELECT is_enabled FROM user_2fa_settings 
      WHERE user_id = ${user.id} AND is_enabled = true
    `

    if (twoFAResult.length > 0) {
      // User has 2FA enabled, return partial token
      const partialToken = sign(
        { userId: user.id, email: user.email, requires2FA: true },
        JWT_SECRET,
        { expiresIn: '5m' }
      )

      return NextResponse.json({
        requires2FA: true,
        partialToken,
        message: 'Please complete 2FA verification'
      })
    }

    // Get device info and IP
    const headersList = await headers()
    const userAgent = headersList.get('user-agent') || 'Unknown device'
    const forwardedFor = headersList.get('x-forwarded-for')
    const ipAddress = forwardedFor?.split(',')[0] || 'Unknown'

    // Check for new device
    const isNewDevice = await checkNewDevice(user.id, userAgent)
    
    // Create session
    const sessionId = await createSession(user.id, userAgent, ipAddress)

    // Send new device alert if needed
    if (isNewDevice) {
      // Try to get location from IP
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

    // Set session cookie
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
    console.error('Signin error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
