import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { getAuthCookieOptions } from '@/lib/cookie-options'

export async function POST() {
  try {
    const cookieStore = await cookies()
    const sessionId = cookieStore.get('session_id')?.value

    if (sessionId) {
      await sql`DELETE FROM sessions WHERE id = ${sessionId}`
    }

    const response = NextResponse.json({ success: true })
    // Clear the session cookie reliably across browsers.
    // ----------------------------------------------------------------
    // A bare `delete('session_id')` only matches on name + the default
    // path. Some browsers refuse to remove a cookie that was set with
    // `Secure` + `SameSite=Lax` unless those same attributes are echoed
    // on the clearing response — which is why a sign-out could appear
    // to "not take" until a manual refresh. We overwrite the cookie
    // with the exact same auth options used to set it and an immediate
    // expiry (maxAge: 0 + epoch expires), then also call delete() as a
    // belt-and-braces fallback.
    response.cookies.set('session_id', '', {
      ...getAuthCookieOptions({ maxAge: 0, expires: new Date(0) }),
    })
    response.cookies.delete('session_id')

    return response
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
