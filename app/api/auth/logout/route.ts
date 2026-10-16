import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { sql } from '@/lib/db'
import { getAuthCookieOptions } from '@/lib/cookie-options'

export async function POST() {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('session_id')?.value

  if (sessionId) {
    try {
      await sql`DELETE FROM sessions WHERE id = ${sessionId}`
    } catch (error) {
      // Still clear the cookie below — a DB hiccup must never leave the
      // browser holding a session the user asked to end.
      console.error('Logout error:', error)
    }
  }

  const response = NextResponse.json(
    { success: true },
    { headers: { 'Cache-Control': 'no-store' } },
  )
  // Overwrite with the same attributes used to set it plus an immediate
  // expiry; some browsers won't drop a Secure/SameSite cookie otherwise.
  response.cookies.set('session_id', '', {
    ...getAuthCookieOptions({ maxAge: 0, expires: new Date(0) }),
  })

  return response
}
