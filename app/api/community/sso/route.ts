// ---------------------------------------------------------------------------
// Discourse SSO endpoint  (GET /api/community/sso)
// ---------------------------------------------------------------------------
// This is the route Discourse redirects every "Log In" click to (after we
// configure `discourse connect url = https://dermaspaceng.com/api/community/sso`
// in the forum's admin settings).
//
// Handshake:
//   1. Discourse → us with `?sso=<base64 payload>&sig=<hmac>`.
//   2. We verify the HMAC against DISCOURSE_SSO_SECRET (rejects forged inits).
//   3. If the user isn't signed in to Dermaspace yet, we bounce them to
//      /signin?next=<this exact URL with all sso/sig query params> so once
//      they log in they come right back here and the handshake resumes.
//   4. With a valid Dermaspace user we sign a NEW payload containing their
//      identity (external_id, email, name, avatar) and 302 the browser to
//      Discourse's `return_sso_url` — Discourse trusts the signature, the
//      account gets created or matched, and the user is logged into the forum.
//
// We also expose `?init=1` as a tiny convenience: it triggers an OUTBOUND
// SSO init from our website ("Open community" buttons) by generating a
// nonce and bouncing the browser into Discourse's /session/sso entry.
// ---------------------------------------------------------------------------

import { NextResponse, type NextRequest } from 'next/server'
import {
  buildSsoInitUrl,
  buildSsoRedirect,
  discourseBaseUrl,
  discourseSsoConfigured,
  verifySsoRequest,
  type DiscourseSsoUser,
} from '@/lib/discourse'
import { getCurrentUser } from '@/lib/auth'
import { sql } from '@/lib/db'

export const runtime = 'nodejs'
// Never cache — every hit needs a live signature, a live session check, and a
// fresh redirect. Caching would corrupt SSO.
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  // Hard-fail with a useful message if the integration isn't wired up
  // yet. This keeps the /community page visible even before the env
  // vars land — only the "Sign in to community" button surfaces this.
  if (!discourseSsoConfigured()) {
    return NextResponse.json(
      {
        error: 'community_not_configured',
        message:
          'The community forum is not connected yet. An administrator needs to set DISCOURSE_URL and DISCOURSE_SSO_SECRET.',
      },
      { status: 503 },
    )
  }

  const url = new URL(req.url)
  const sso = url.searchParams.get('sso')
  const sig = url.searchParams.get('sig')

  // ---- Outbound init: /api/community/sso?init=1 ---------------------------
  // Used by the "Join the conversation" button on /community. We generate
  // a fresh nonce and hand off to Discourse, which then comes back here
  // with a real ?sso=&sig= pair to complete the round-trip.
  if (!sso && !sig && url.searchParams.get('init') === '1') {
    const returnTo = `${url.origin}/api/community/sso`
    const initUrl = buildSsoInitUrl(returnTo)
    if (!initUrl) {
      return NextResponse.redirect(`${url.origin}/community?sso=error`)
    }
    return NextResponse.redirect(initUrl)
  }

  // ---- Inbound from Discourse --------------------------------------------
  if (!sso || !sig) {
    // Naked GET — give the visitor something useful instead of a 400.
    return NextResponse.redirect(`${url.origin}/community`)
  }

  const verified = verifySsoRequest(sso, sig)
  if (!verified.ok) {
    console.warn('[community/sso] verification failed:', verified.reason)
    return NextResponse.redirect(`${url.origin}/community?sso=invalid`)
  }

  // Make sure the user is signed in here on Dermaspace; if not, send them
  // through the regular sign-in flow with a return URL pointing back at
  // this exact endpoint so the handshake survives.
  const me = await getCurrentUser()
  if (!me) {
    const next = `${url.pathname}${url.search}`
    return NextResponse.redirect(
      `${url.origin}/signin?next=${encodeURIComponent(next)}`,
    )
  }

  // Fetch avatar and username — these aren't returned by getCurrentUser()
  // because the User type stays lean for hot paths. Best-effort: a missing
  // avatar/username just produces a slightly less polished forum profile.
  let avatarUrl: string | null = null
  let username: string | null = null
  try {
    const rows = (await sql`
      SELECT avatar_url, username
      FROM users
      WHERE id = ${me.id}
      LIMIT 1
    `) as Array<{ avatar_url: string | null; username: string | null }>
    if (rows.length) {
      avatarUrl = rows[0].avatar_url ?? null
      username = rows[0].username ?? null
    }
  } catch (err) {
    console.error('[community/sso] avatar/username lookup failed:', err)
  }

  // Discourse usernames have a strict alphabet (alnum + . _ -). Derive
  // a safe fallback from email when the user has no username on file.
  const safeUsername =
    (username || me.email.split('@')[0] || 'member')
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20) || 'member'

  // Build the avatar URL into an absolute one so Discourse can fetch it
  // even when we serve relative `/avatars/...` paths from the app shell.
  let absoluteAvatar: string | undefined
  if (avatarUrl) {
    absoluteAvatar = avatarUrl.startsWith('http')
      ? avatarUrl
      : `${url.origin}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`
  }

  const ssoUser: DiscourseSsoUser = {
    externalId: me.id,
    email: me.email,
    username: safeUsername,
    name: `${me.first_name ?? ''} ${me.last_name ?? ''}`.trim() || safeUsername,
    avatarUrl: absoluteAvatar,
    // Mirror Dermaspace roles into Discourse: site admins become forum
    // admins, staff become moderators. Anyone else is a regular member.
    admin: me.role === 'admin',
    moderator: me.role === 'staff',
  }

  const redirect = buildSsoRedirect(verified.nonce, verified.returnSsoUrl, ssoUser)
  return NextResponse.redirect(redirect, { status: 302 })
}

/**
 * Small helper used by /community page when it needs to decide between
 * showing "Sign in to community" or "Open community". We expose it as a
 * HEAD so the page can prefetch cheaply.
 */
export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'X-Community-Configured': discourseSsoConfigured() ? '1' : '0',
      'X-Community-Url': discourseBaseUrl() || '',
    },
  })
}
