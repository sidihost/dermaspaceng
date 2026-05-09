/**
 * Kicks off the Google Calendar OAuth dance for the *currently
 * authenticated staff member*. We redirect them straight to
 * Google's consent screen and stash a CSRF state token in a
 * short-lived cookie so the callback can validate it.
 *
 * If env vars are missing we redirect to the admin add-ons page
 * with a friendly message so the connect button never breaks the
 * UI on a freshly cloned environment.
 */

import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getCurrentUser } from '@/lib/auth'
import { buildAuthUrl, isConfigured } from '@/lib/google-calendar'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.redirect(
      new URL('/login?next=/admin/addons', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
    )
  }
  if (!['admin', 'staff', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  if (!isConfigured()) {
    const url = new URL(
      '/admin/addons?google_calendar=not_configured',
      process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
    )
    return NextResponse.redirect(url)
  }

  // CSRF state — random 32-byte token bound to the user id.
  const csrf = randomBytes(24).toString('base64url')
  const state = `${user.id}:${csrf}`
  const jar = await cookies()
  jar.set('gcal_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 10 * 60, // 10 minutes — covers the consent screen round-trip
  })

  const authUrl = buildAuthUrl(state)
  return NextResponse.redirect(authUrl)
}
