import { NextResponse } from 'next/server'
import { cookies, headers } from 'next/headers'
import { authenticateUser, createSession, checkNewDevice, verifyHCaptcha } from '@/lib/auth'
import { sendNewDeviceAlert } from '@/lib/email'

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
