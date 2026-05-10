import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import {
  sendTicketConfirmation,
  sendCustomerReplyAlert,
  sendAdminNewRequestNotification,
} from '@/lib/email'

// ============================================================================
// Inbound email → ticket webhook
// ----------------------------------------------------------------------------
// Configured in Zepto Mail under "Mail Agents → Inbound Webhook" with target:
//
//   POST  https://www.dermaspaceng.com/api/inbound/email?token=$INBOUND_EMAIL_TOKEN
//
// Anything sent to hello@dermaspaceng.com will be POSTed here as parsed JSON.
//
// What this endpoint does
// -----------------------
//   1. Verifies the shared-secret token in the query string. We don't trust
//      the body until the token matches — anyone on the public internet can
//      hit this URL.
//   2. Parses the inbound payload defensively. Zepto's exact shape has
//      shifted between versions and we may also receive forwarded
//      SendGrid/Postmark/Mailgun payloads in the future, so we read each
//      field through a small "first non-empty" helper.
//   3. Detects whether this email is a reply to an existing ticket by
//      scanning the subject line for our public ticket code (DS-YYYY-XXXXXX).
//      If we find one and the ticket exists, the inbound message is added
//      as a customer reply on that ticket — the conversation continues in
//      one place.
//   4. Otherwise it creates a brand-new support ticket. If the sender's
//      email matches an existing user we link `user_id` so the ticket
//      shows up in their dashboard immediately. Guests still get a ticket
//      created (user_id NULL); admins handle them from /admin/complaints.
//   5. Sends the appropriate confirmation email back to the customer and
//      pings the admin inbox. Every email transport call is best-effort
//      so a transient SMTP failure doesn't return a 500 (which would make
//      Zepto retry and produce a duplicate ticket on the next attempt).
//
// Idempotency
// -----------
// Every inbound message has a unique RFC-5322 Message-ID header. We store
// it on the ticket / response we create; the unique index in
// scripts/541-inbound-email-tickets.sql makes the second insert a no-op
// instead of a duplicate.
// ============================================================================

const sql = neon(process.env.DATABASE_URL!)

// Match our public ticket codes anywhere in a subject. Format: DS-2026-123456.
// Tightened to 4-8 trailing digits so we don't match unrelated tracking
// numbers a customer might quote in their reply.
const TICKET_CODE_REGEX = /\bDS-\d{4}-\d{4,8}\b/i

type InboundEmail = {
  fromEmail: string
  fromName: string | null
  subject: string
  text: string
  html: string | null
  messageId: string | null
}

/** Pick the first non-empty string from a list of candidate fields. */
function firstString(...candidates: unknown[]): string {
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return ''
}

/**
 * Defensive parser. Zepto Mail Inbound Parse posts a payload like
 *
 *   { "data": [ { "from": [{ address, name }], "subject": ..., "html_body": ... } ] }
 *
 * but real-world senders also post forwarded SendGrid / Postmark / Mailgun
 * shapes, and Zepto itself has shipped at least two slightly different
 * envelopes. We read each field through `firstString` so any of them works.
 */
function parseInboundPayload(payload: unknown): InboundEmail | null {
  if (!payload || typeof payload !== 'object') return null
  const root = payload as Record<string, unknown>

  // Zepto wraps the message in `data`, sometimes as an array, sometimes
  // as a single object. Postmark uses `Message`. Mailgun uses the root.
  let msg: Record<string, unknown> = root
  if (root.data) {
    msg = (Array.isArray(root.data) ? root.data[0] : root.data) as Record<
      string,
      unknown
    >
  } else if (root.Message) {
    msg = root.Message as Record<string, unknown>
  }
  if (!msg || typeof msg !== 'object') return null

  // ---- From -------------------------------------------------------------
  // Zepto: `from` is `[{ address, name }]` or `{ address, name }`.
  // SendGrid: `from` is the raw header string `"Name" <addr@host>`.
  // Postmark: separate `From` (display) + `FromFull.Email`.
  let fromEmail = ''
  let fromName: string | null = null
  const rawFrom = msg.from ?? msg.From ?? msg.sender
  if (Array.isArray(rawFrom) && rawFrom[0] && typeof rawFrom[0] === 'object') {
    const f = rawFrom[0] as Record<string, unknown>
    fromEmail = firstString(f.address, f.email, f.Email)
    fromName = firstString(f.name, f.Name) || null
  } else if (rawFrom && typeof rawFrom === 'object') {
    const f = rawFrom as Record<string, unknown>
    fromEmail = firstString(f.address, f.email, f.Email)
    fromName = firstString(f.name, f.Name) || null
  } else if (typeof rawFrom === 'string') {
    // "Display Name" <addr@host>  — pull the bracketed address.
    const m = rawFrom.match(/<([^>]+)>/)
    fromEmail = m ? m[1].trim() : rawFrom.trim()
    const namePart = rawFrom.replace(/<[^>]*>/, '').trim().replace(/^"|"$/g, '')
    fromName = namePart || null
  }
  if (!fromEmail) {
    fromEmail = firstString(msg.fromEmail, msg.FromEmail, (msg.FromFull as Record<string, unknown>)?.Email)
  }
  if (!fromName) {
    fromName = firstString(msg.fromName, msg.FromName) || null
  }

  if (!fromEmail || !fromEmail.includes('@')) return null

  // ---- Subject + body ---------------------------------------------------
  const subject =
    firstString(msg.subject, msg.Subject) || '(no subject)'
  const text = firstString(
    msg.text_body,
    msg.text,
    msg.TextBody,
    msg.plain,
    msg['stripped-text'],
    msg['body-plain'],
  )
  const html = firstString(
    msg.html_body,
    msg.html,
    msg.HtmlBody,
    msg['stripped-html'],
    msg['body-html'],
  ) || null

  // ---- Message-ID for dedup --------------------------------------------
  const headers = (msg.headers ?? msg.Headers) as
    | Record<string, unknown>
    | Array<{ name?: string; key?: string; value?: string }>
    | undefined
  let messageId = ''
  if (Array.isArray(headers)) {
    const h = headers.find(
      (x) =>
        typeof x === 'object' &&
        x !== null &&
        ((x.name || x.key)?.toLowerCase?.() === 'message-id'),
    )
    messageId = firstString(h?.value)
  } else if (headers && typeof headers === 'object') {
    messageId = firstString(
      (headers as Record<string, unknown>)['Message-ID'],
      (headers as Record<string, unknown>)['Message-Id'],
      (headers as Record<string, unknown>)['message-id'],
    )
  }
  messageId =
    messageId ||
    firstString(msg.message_id, msg.messageId, msg.MessageID, msg.id)

  return {
    fromEmail: fromEmail.toLowerCase(),
    fromName,
    subject,
    text,
    html,
    messageId: messageId || null,
  }
}

/**
 * Strip the obvious quoted-reply tail so the ticket's stored message
 * doesn't include the entire prior thread. We only want what the
 * customer actually typed today.
 *
 * This is intentionally conservative — there are dozens of "On <date>
 * <person> wrote:" formats in the wild, so when in doubt we keep more
 * text rather than less. Admins can always read the raw HTML on the
 * ticket detail page if they need to.
 */
function stripQuotedReply(body: string): string {
  if (!body) return ''
  const markers = [
    /\n\s*On .+wrote:[\s\S]*$/i,
    /\n\s*-{2,}\s*Original Message\s*-{2,}[\s\S]*$/i,
    /\n\s*From:.+\n\s*Sent:.+[\s\S]*$/i,
    /\n\s*>.+(\n>?.+)*\s*$/, // long trailing blockquote
  ]
  let trimmed = body
  for (const re of markers) {
    trimmed = trimmed.replace(re, '')
  }
  return trimmed.trim() || body.trim()
}

/** Generate the same DS-YYYY-XXXXXX format the in-app form uses. */
function generateTicketId(): string {
  const year = new Date().getFullYear()
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
  return `DS-${year}-${random}`
}

/** Best-effort first/last name split from "First Last" or fallback to email handle. */
function splitName(displayName: string | null, email: string) {
  const source = (displayName || email.split('@')[0] || 'Customer').trim()
  const parts = source.replace(/[._-]+/g, ' ').split(/\s+/).filter(Boolean)
  const first = parts[0] || 'Customer'
  const last = parts.slice(1).join(' ') || ''
  return { first, last, full: `${first} ${last}`.trim() || first }
}

export async function POST(request: NextRequest) {
  // ---- Token gate -------------------------------------------------------
  const expected = process.env.INBOUND_EMAIL_TOKEN
  if (!expected) {
    console.error('[v0] INBOUND_EMAIL_TOKEN not configured — refusing inbound')
    return NextResponse.json(
      { error: 'Inbound webhook not configured' },
      { status: 503 },
    )
  }
  const provided =
    request.nextUrl.searchParams.get('token') ||
    request.headers.get('x-webhook-token') ||
    ''
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // ---- Parse body -------------------------------------------------------
  let payload: unknown
  try {
    payload = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = parseInboundPayload(payload)
  if (!parsed) {
    console.error('[v0] inbound: failed to parse payload')
    // Still return 200 so Zepto doesn't retry a fundamentally
    // malformed payload forever — we just log and move on.
    return NextResponse.json({ ok: true, ignored: 'unparseable' })
  }

  console.log(
    `[v0] inbound email from ${parsed.fromEmail} subject="${parsed.subject}" id=${parsed.messageId ?? 'none'}`,
  )

  // ---- Dedup on Message-ID ---------------------------------------------
  if (parsed.messageId) {
    try {
      const existing = await sql`
        SELECT 'ticket' AS kind, ticket_id AS code FROM support_tickets
          WHERE external_message_id = ${parsed.messageId}
        UNION ALL
        SELECT 'response' AS kind, ticket_id AS code FROM ticket_responses
          WHERE external_message_id = ${parsed.messageId}
        LIMIT 1
      `
      if (Array.isArray(existing) && existing.length > 0) {
        console.log('[v0] inbound: duplicate message_id, skipping')
        return NextResponse.json({
          ok: true,
          deduped: true,
          existing: existing[0],
        })
      }
    } catch (err) {
      console.error('[v0] inbound: dedup lookup failed:', err)
    }
  }

  const cleanedText = stripQuotedReply(parsed.text || '')
  const messageBody =
    cleanedText ||
    (parsed.html
      ? parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      : '') ||
    '(no message body)'

  // ---- Match an existing ticket from the subject -----------------------
  const codeMatch = parsed.subject.match(TICKET_CODE_REGEX)
  if (codeMatch) {
    const code = codeMatch[0].toUpperCase()
    try {
      const ticketRows = (await sql`
        SELECT id, ticket_id, user_id, email, name, subject, status
        FROM support_tickets
        WHERE UPPER(ticket_id) = ${code}
        LIMIT 1
      `) as Array<{
        id: number
        ticket_id: string
        user_id: string | null
        email: string
        name: string
        subject: string
        status: string
      }>

      if (ticketRows.length > 0) {
        const ticket = ticketRows[0]
        // Append as a customer response on the existing ticket. We tag
        // source='email' and store the Message-ID so retries dedup.
        const { full: responderName } = splitName(parsed.fromName, parsed.fromEmail)
        await sql`
          INSERT INTO ticket_responses (
            ticket_id, responder_type, responder_name, user_id,
            message, is_staff, source, external_message_id, created_at
          ) VALUES (
            ${ticket.ticket_id}, 'user', ${responderName}, ${ticket.user_id},
            ${messageBody}, false, 'email', ${parsed.messageId}, NOW()
          )
          ON CONFLICT (external_message_id) DO NOTHING
        `

        // Wake the ticket back up if it was sitting in pending /
        // waiting_on_customer (mirrors the in-app reply route).
        await sql`
          UPDATE support_tickets
          SET updated_at = NOW(),
              status = CASE WHEN status IN ('pending','waiting_on_customer','resolved','closed')
                            THEN 'open' ELSE status END
          WHERE ticket_id = ${ticket.ticket_id}
        `

        // Notify the support inbox best-effort.
        try {
          const adminRecipients =
            process.env.ADMIN_NOTIFICATIONS_EMAIL || 'hello@dermaspaceng.com'
          await sendCustomerReplyAlert({
            to: adminRecipients,
            customerName: responderName,
            customerEmail: parsed.fromEmail,
            ticketCode: ticket.ticket_id,
            ticketSubject: ticket.subject || `Support Ticket ${ticket.ticket_id}`,
            replyMessage: messageBody,
            adminLinkId: ticket.id,
          })
        } catch (err) {
          console.error('[v0] inbound: admin reply alert failed:', err)
        }

        return NextResponse.json({
          ok: true,
          action: 'appended_reply',
          ticketId: ticket.ticket_id,
        })
      }
    } catch (err) {
      console.error('[v0] inbound: existing-ticket lookup failed:', err)
      // Fall through and create a new ticket so we never lose the message.
    }
  }

  // ---- Create a brand-new ticket ---------------------------------------
  const { first, last, full } = splitName(parsed.fromName, parsed.fromEmail)

  // Look up an existing user so logged-in customers see the ticket in
  // their dashboard immediately. Guests get a ticket with user_id = NULL
  // (the migration made that column nullable).
  let userId: string | null = null
  try {
    const matchedUsers = (await sql`
      SELECT id::text AS id FROM users WHERE LOWER(email) = ${parsed.fromEmail} LIMIT 1
    `) as Array<{ id: string }>
    if (matchedUsers.length > 0) userId = matchedUsers[0].id
  } catch (err) {
    console.error('[v0] inbound: user lookup failed:', err)
  }

  // Subject -> category heuristic. We default to "general" but pick a
  // smarter category when the subject contains an obvious keyword. This
  // makes the admin inbox readable at a glance.
  const subjectLower = parsed.subject.toLowerCase()
  const category = (() => {
    if (/\b(refund|payment|charge|invoice|paid|naira|money|wallet)\b/.test(subjectLower)) return 'billing'
    if (/\b(book|appointment|reschedule|cancel|consult)\b/.test(subjectLower)) return 'booking'
    if (/\b(gift|voucher|card|coupon)\b/.test(subjectLower)) return 'gift_card'
    if (/\b(login|password|account|sign|2fa|otp|verify)\b/.test(subjectLower)) return 'account'
    if (/\b(treatment|skin|service|product)\b/.test(subjectLower)) return 'service'
    return 'general'
  })()

  const ticketId = generateTicketId()
  const cleanedSubject = parsed.subject.replace(TICKET_CODE_REGEX, '').replace(/^\s*(re|fwd|fw):\s*/i, '').trim() || '(no subject)'

  try {
    await sql`
      INSERT INTO support_tickets (
        ticket_id, user_id, email, name, category, subject, message,
        priority, source, external_message_id
      ) VALUES (
        ${ticketId},
        ${userId},
        ${parsed.fromEmail},
        ${full},
        ${category},
        ${cleanedSubject.slice(0, 250)},
        ${messageBody},
        'normal',
        'email',
        ${parsed.messageId}
      )
      ON CONFLICT (external_message_id) DO NOTHING
    `
  } catch (err) {
    console.error('[v0] inbound: ticket insert failed:', err)
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 },
    )
  }

  // Send the customer the same confirmation we send for in-app submissions.
  // Best-effort; do not fail the webhook if the transactional send hiccups.
  try {
    await sendTicketConfirmation({
      email: parsed.fromEmail,
      firstName: first,
      ticketId,
      subject: cleanedSubject,
      category,
    })
  } catch (err) {
    console.error('[v0] inbound: customer confirmation failed:', err)
  }

  // Ping the admin inbox so staff see the ticket the moment it lands.
  try {
    const adminRecipients =
      process.env.ADMIN_NOTIFICATIONS_EMAIL || 'hello@dermaspaceng.com'
    await sendAdminNewRequestNotification({
      adminEmail: adminRecipients,
      requestType: 'complaint',
      customerName: full,
      customerEmail: parsed.fromEmail,
      details: `From inbound email • Ticket ${ticketId}\nSubject: ${cleanedSubject}\n\n${messageBody.slice(0, 1500)}${messageBody.length > 1500 ? '…' : ''}`,
    })
  } catch (err) {
    console.error('[v0] inbound: admin notification failed:', err)
  }

  return NextResponse.json({
    ok: true,
    action: 'created_ticket',
    ticketId,
    matchedExistingUser: Boolean(userId),
  })
}

// Health check — handy when configuring Zepto so you can confirm the
// route is reachable without sending a real email.
export async function GET() {
  return NextResponse.json({
    ok: true,
    name: 'inbound-email-webhook',
    requiresToken: Boolean(process.env.INBOUND_EMAIL_TOKEN),
  })
}
