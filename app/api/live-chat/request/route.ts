import { NextResponse, after } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import {
  escalateToHumanWithMeta,
  escalateAsGuest,
  resolveSupportId,
} from '@/lib/live-chat'
import { setGuestChatCookieOnResponse } from '@/lib/live-chat-guest'
import { getGeoFromRequest } from '@/lib/geolocation'
import { notifyAdmins } from '@/lib/notifications'
import {
  cleanTextField,
  extractVisitorIpFromHeaders,
  formatVisitorLocation,
  parseVisitorUserAgent,
  sanitizeVisitorHints,
} from '@/lib/visitor-telemetry'

// ---------------------------------------------------------------------------
// POST /api/live-chat/request
// ---------------------------------------------------------------------------
// User-facing endpoint hit by the Derma AI tool result card AND directly by
// the chat tool itself when the model decides the user wants a human.
//
// Two paths:
//   1. Logged-in customer — body { topic?, transcript?, visitor? }. Idempotent:
//      if an open session already exists we hand it back.
//   2. Guest visitor — body { guest: { name, email, phone? }, topic?, visitor? }.
//      We create a fresh session (anonymous chats don't reuse), set an
//      httpOnly cookie holding the session id so subsequent calls from
//      the same browser can authenticate to it, and return the session.
// ---------------------------------------------------------------------------

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

async function buildVisitorMeta(req: Request, rawHints: unknown) {
  const hints = sanitizeVisitorHints(rawHints)
  const ua = cleanTextField(req.headers.get('user-agent'), 400)
  const parsed = parseVisitorUserAgent(ua)
  const ip = extractVisitorIpFromHeaders(req.headers)

  const geo = await getGeoFromRequest(req).catch(() => ({
    country: null,
    countryCode: null,
    city: null,
    region: null,
  }))

  const cfCity = cleanTextField(req.headers.get('cf-ipcity'), 80)
  const cfCountry = cleanTextField(req.headers.get('cf-ipcountry'), 80)
  const location = formatVisitorLocation({
    city: geo.city || cfCity,
    region: geo.region,
    country: geo.country || geo.countryCode || cfCountry,
    timezone: hints.timezone,
  })

  const acceptLang = cleanTextField(
    req.headers.get('accept-language')?.split(',')[0],
    32,
  )
  const headerReferrer = cleanTextField(req.headers.get('referer'), 300)

  return {
    location,
    ip,
    userAgent: ua,
    browser: parsed.browser,
    os: parsed.os,
    device: parsed.device,
    timezone: hints.timezone,
    pageUrl: hints.pageUrl || headerReferrer,
    referrer: hints.referrer,
    language: hints.language || acceptLang,
    screen: hints.screen,
  }
}

export async function POST(req: Request) {
  const user = await getCurrentUser()

  let topic: string | null = null
  let transcript: unknown = null
  let rawVisitor: unknown = null
  let guest: {
    name?: unknown
    email?: unknown
    phone?: unknown
  } | null = null
  try {
    const body = await req.json().catch(() => ({}))
    if (typeof body.topic === 'string') topic = body.topic.slice(0, 500)
    if (Array.isArray(body.transcript)) {
      transcript = body.transcript.slice(-30)
    }
    if (body.visitor && typeof body.visitor === 'object') {
      rawVisitor = body.visitor
    }
    if (body.guest && typeof body.guest === 'object') {
      guest = body.guest as {
        name?: unknown
        email?: unknown
        phone?: unknown
      }
    }
  } catch {
    /* malformed JSON — defaults are fine */
  }

  // ----- Logged-in path ----------------------------------------------------
  if (user) {
    const visitor = await buildVisitorMeta(req, rawVisitor)
    const { session, isNew } = await escalateToHumanWithMeta(
      user.id,
      topic,
      transcript,
      visitor,
    )
    const supportCode = resolveSupportId(session.support_code, session.id)
    if (isNew) {
      const customerLabel =
        `${user.first_name || ''} ${user.last_name || ''}`.trim() ||
        user.email ||
        'A member'
      const topicSnippet = topic ? ` · Topic: ${topic.slice(0, 90)}` : ''
      const bodyMsg = `${customerLabel} (${supportCode}) is waiting for a live support rep${topicSnippet}.`
      const qs = `?session=${encodeURIComponent(supportCode)}`
      after(async () => {
        await Promise.all([
          notifyAdmins({
            roles: ['admin'],
            title: 'New live chat request',
            message: bodyMsg,
            type: 'reply',
            referenceType: 'live_chat',
            referenceId: session.id,
            actionUrl: `/admin/live-chat${qs}`,
            priority: 'high',
            push: true,
          }),
          notifyAdmins({
            roles: ['staff'],
            title: 'New live chat request',
            message: bodyMsg,
            type: 'reply',
            referenceType: 'live_chat',
            referenceId: session.id,
            actionUrl: `/staff/live-chat${qs}`,
            priority: 'high',
            push: true,
          }),
        ])
      })
    }
    return NextResponse.json({
      success: true,
      sessionId: session.id,
      supportCode,
      status: session.status,
      isGuest: false,
      isNew,
    })
  }

  // ----- Guest path --------------------------------------------------------
  if (!guest) {
    return NextResponse.json(
      {
        error:
          'Please share a few details so a representative can follow up.',
        signinRequired: true,
        guestFormRequired: true,
      },
      { status: 401 },
    )
  }

  const name = typeof guest.name === 'string' ? guest.name.trim().slice(0, 80) : ''
  const email = typeof guest.email === 'string' ? guest.email.trim().slice(0, 120) : ''
  const phone =
    typeof guest.phone === 'string' && guest.phone.trim()
      ? guest.phone.trim().slice(0, 32)
      : null

  if (!name || name.length < 2) {
    return NextResponse.json(
      { error: 'Please tell us your name.' },
      { status: 400 },
    )
  }
  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: 'Please enter a valid email address.' },
      { status: 400 },
    )
  }

  const visitor = await buildVisitorMeta(req, rawVisitor)
  const session = await escalateAsGuest({
    name,
    email,
    phone,
    initialTopic: topic,
    visitor,
  })
  const supportCode = resolveSupportId(session.support_code, session.id)
  const topicSnippet = topic ? ` · Topic: ${topic.slice(0, 90)}` : ''
  const bodyMsg = `${name} (Guest · ${supportCode}) is waiting for a live support rep${topicSnippet}.`
  const qs = `?session=${encodeURIComponent(supportCode)}`
  after(async () => {
    await Promise.all([
      notifyAdmins({
        roles: ['admin'],
        title: 'New live chat request',
        message: bodyMsg,
        type: 'reply',
        referenceType: 'live_chat',
        referenceId: session.id,
        actionUrl: `/admin/live-chat${qs}`,
        priority: 'high',
        push: true,
      }),
      notifyAdmins({
        roles: ['staff'],
        title: 'New live chat request',
        message: bodyMsg,
        type: 'reply',
        referenceType: 'live_chat',
        referenceId: session.id,
        actionUrl: `/staff/live-chat${qs}`,
        priority: 'high',
        push: true,
      }),
    ])
  })

  const response = NextResponse.json({
    success: true,
    sessionId: session.id,
    supportCode,
    status: session.status,
    isGuest: true,
    isNew: true,
  })

  setGuestChatCookieOnResponse(response, session.id)

  return response
}
