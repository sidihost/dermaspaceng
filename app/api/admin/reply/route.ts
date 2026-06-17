import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'
import { sendReplyNotification } from '@/lib/email'
import { sendPushToUser } from '@/lib/push'
import { ensureNotificationsSchema } from '@/lib/notifications-column'
import { resolveAdminAvatar } from '@/lib/admin-avatars'

// The admin reply thread MUST always read fresh — any cached snapshot
// produces the "my reply disappears after refresh" bug because the
// stale GET predates the latest INSERT. Forcing dynamic + no-store
// guarantees the admin always sees the authoritative thread.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const sql = neon(process.env.DATABASE_URL!)

/**
 * Insert an admin_replies row, attempting to persist the optional
 * `sender_display_name` column. If that column doesn't exist yet
 * (migration 043 hasn't been applied) we silently retry without it
 * so the reply still saves. Returns the new row id.
 */
async function safeInsertAdminReply(opts: {
  requestType: string
  requestId: string | number
  userEmail: string | null | undefined
  staffId: string
  message: string
  isInternal: boolean
  senderDisplayName: string | null
}): Promise<string | number> {
  const { requestType, requestId, userEmail, staffId, message, isInternal, senderDisplayName } = opts
  // NOTE: the message body lives in the `reply_text` column on admin_replies
  // (NOT `message`). An earlier version of this route inserted into a
  // non-existent `message` column, which made every consultation / complaint
  // reply INSERT throw — the POST 500'd, the optimistic row rolled back, and
  // the admin saw "my reply never shows". We write `reply_text` here and the
  // GET handler aliases it back to `message` for the client.
  try {
    const rows = await sql`
      INSERT INTO admin_replies
        (request_type, request_id, user_email, staff_id, reply_text, is_internal, sender_display_name)
      VALUES
        (${requestType}, ${requestId}, ${userEmail || ''}, ${staffId}, ${message}, ${isInternal}, ${senderDisplayName})
      RETURNING id
    `
    return rows[0].id
  } catch (err) {
    // If the optional sender_display_name column doesn't exist yet, retry
    // without it so the reply still saves while the migration catches up.
    const msg = err instanceof Error ? err.message : String(err)
    if (/sender_display_name/i.test(msg)) {
      const fallback = await sql`
        INSERT INTO admin_replies
          (request_type, request_id, user_email, staff_id, reply_text, is_internal)
        VALUES
          (${requestType}, ${requestId}, ${userEmail || ''}, ${staffId}, ${message}, ${isInternal})
        RETURNING id
      `
      return fallback[0].id
    }
    throw err
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    const {
      requestType,
      requestId,
      userEmail,
      message,
      isInternal,
      // When requestType is 'ticket' we need the public ticket code
      // (e.g. DS-2026-000123) because ticket_responses.ticket_id is a VARCHAR
      // that references support_tickets.ticket_id, not the numeric PK.
      ticketCode,
      // Optional display name override. The reply composer lets admins
      // sign as "Admin", "Franca", "Itunu" or their own name when
      // replying on behalf of a salon contact. We fall back to the
      // signed-in admin's name if nothing is provided.
      senderDisplayName,
    } = await request.json()

    if (!requestType || !requestId || !message) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['complaint', 'consultation', 'gift_card', 'contact', 'ticket'].includes(requestType)) {
      return NextResponse.json(
        { error: 'Invalid request type' },
        { status: 400 }
      )
    }

    // Resolve the customer-facing sender name. We accept an optional
    // shortlist of values from the composer (Admin, Franca, Itunu) plus
    // a free-text override. Anything else falls back to the signed-in
    // admin's real name.
    const realName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Support'
    const allowedDisplayNames = new Set(['Admin', 'Franca', 'Itunu'])
    const cleanedDisplayName =
      typeof senderDisplayName === 'string' ? senderDisplayName.trim().slice(0, 60) : ''
    const resolvedDisplayName =
      cleanedDisplayName.length > 0
        ? (allowedDisplayNames.has(cleanedDisplayName) ? cleanedDisplayName : cleanedDisplayName)
        : realName

    // Create the reply. Tickets route to the dedicated ticket_responses table
    // (which feeds the user-facing /dashboard/support thread), everything else
    // stays in admin_replies as before.
    let replyId: string | number
    if (requestType === 'ticket') {
      // Resolve the string ticket_id if the caller passed the numeric id
      let resolvedCode: string | null = ticketCode || null
      if (!resolvedCode) {
        const row = await sql`SELECT ticket_id FROM support_tickets WHERE id = ${Number(requestId)}`
        resolvedCode = row[0]?.ticket_id || null
      }
      if (!resolvedCode) {
        return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
      }

      // Internal notes aren't surfaced on the user-facing ticket thread — we
      // still save them in admin_replies (with request_type='contact') so
      // they stay discoverable on the admin side without violating the
      // ticket_responses shape (which expects a user-visible message).
      if (isInternal) {
        // Internal notes never surface to the customer, so we don't
        // store a display name override on them.
        const noteRes = await safeInsertAdminReply({
          requestType: 'contact',
          requestId,
          userEmail,
          staffId: user.id,
          message,
          isInternal: true,
          senderDisplayName: null,
        })
        replyId = noteRes
      } else {
        const ticketRes = await sql`
          INSERT INTO ticket_responses (ticket_id, responder_type, responder_name, user_id, message, is_staff, created_at)
          VALUES (
            ${resolvedCode},
            ${user.role === 'admin' ? 'admin' : 'staff'},
            ${resolvedDisplayName},
            ${user.id},
            ${message},
            true,
            NOW()
          )
          RETURNING id
        `
        await sql`UPDATE support_tickets SET updated_at = NOW() WHERE ticket_id = ${resolvedCode}`
        replyId = ticketRes[0].id
      }
    } else {
      replyId = await safeInsertAdminReply({
        requestType,
        requestId,
        userEmail,
        staffId: user.id,
        message,
        isInternal: Boolean(isInternal),
        senderDisplayName: resolvedDisplayName,
      })
    }

    // If not internal, create notification for user (if user_id exists)
    // NOTE: Email + in-app notifications are best-effort — they must never
    // block the reply from being saved. Previously a missing RESEND_API_KEY
    // or a transient email failure would 500 the whole request and the
    // admin would see "reply not working" even though the DB write succeeded.
    if (!isInternal) {
      try {
        // Resolve the recipient user.
        //
        // Two lookup paths because a couple of admin reply forms (the
        // unified inbox in particular) post `userEmail` blank when the
        // ticket was raised by a logged-in customer and the admin
        // didn't manually retype the address:
        //
        //   1. Look up by email when we have one. This stays the primary
        //      path for non-ticket request types (complaints, gift card
        //      requests) where the request row owns the email.
        //   2. For tickets we ALSO fall back to `support_tickets.user_id`
        //      directly. That's the canonical owner of the ticket and
        //      it's set on creation, so the bell entry now fires even
        //      when the composer didn't bother sending userEmail.
        //
        // Without (2) the customer never sees the unread badge despite
        // an admin reply visibly landing in the thread — which is
        // exactly the "notifications aren't working" symptom that was
        // reported.
        let userResult: { id: string; first_name: string | null }[] = []

        if (userEmail) {
          userResult = (await sql`
            SELECT id, first_name FROM users WHERE email = ${userEmail}
          `) as unknown as typeof userResult
        }

        if (userResult.length === 0 && requestType === 'ticket') {
          const ticketOwner = await sql`
            SELECT u.id, u.first_name
            FROM support_tickets t
            JOIN users u ON u.id = t.user_id
            WHERE t.id = ${Number(requestId)}
            LIMIT 1
          `
          if (ticketOwner.length > 0) {
            userResult = ticketOwner as unknown as typeof userResult
          }
        }

        if (userResult.length > 0) {
          try {
            // Build a deep-link so tapping the bell entry takes the user
            // straight to their ticket / complaint thread instead of the
            // generic notifications inbox. Tickets resolve by code; the
            // others fall back to /dashboard/notifications since we don't
            // expose customer-facing detail pages for them yet.
            const actionUrl =
              requestType === 'ticket'
                ? `/dashboard/support/${ticketCode || ''}`.replace(/\/$/, '')
                : '/dashboard/notifications'

            // Idempotent schema patch. On older databases the
            // user_notifications table is missing action_url /
            // reference_* columns, so this INSERT used to fail
            // silently — the customer never saw the bell entry even
            // though the reply itself saved fine. This was the
            // entire reason "notifications never worked".
            await ensureNotificationsSchema()
            await sql`
              INSERT INTO user_notifications (
                user_id, title, message, type, reference_type, reference_id, action_url
              )
              VALUES (
                ${userResult[0].id},
                ${`New reply on your ${
                  requestType === 'complaint' ? 'complaint'
                  : requestType === 'consultation' ? 'consultation'
                  : requestType === 'ticket' ? 'support ticket'
                  : 'request'
                }`},
                ${message.substring(0, 200) + (message.length > 200 ? '...' : '')},
                'reply',
                ${requestType},
                ${requestId.toString()},
                ${actionUrl}
              )
            `
          } catch (notifErr) {
            console.error('Reply notification insert failed:', notifErr)
          }

          // Fire web push so the user is alerted instantly even when the
          // dashboard isn't open. Best-effort — silently no-ops when
          // VAPID keys aren't configured or no devices are subscribed.
          try {
            const requestLabel =
              requestType === 'complaint' ? 'complaint'
              : requestType === 'consultation' ? 'consultation'
              : requestType === 'ticket' ? 'support ticket'
              : 'request'
            await sendPushToUser(userResult[0].id, {
              title: `New reply on your ${requestLabel}`,
              body: message.length > 140 ? message.slice(0, 140) + '…' : message,
              url:
                requestType === 'ticket'
                  ? `/dashboard/support`
                  : `/dashboard/notifications`,
              tag: `reply-${requestType}-${requestId}`,
            })
          } catch (pushErr) {
            console.error('Reply push send failed:', pushErr)
          }
        }

        // Send email notification (best-effort). Tickets are included now —
        // the helper was extended to accept 'ticket' and a `ticketId` so the
        // "View" CTA deeplinks to /dashboard/support/<code> instead of just
        // the dashboard root.
        //
        // We need a real recipient address — the in-app + push paths fall
        // back to support_tickets.user_id when userEmail is missing, but
        // the email transport obviously can't. Skip cleanly instead of
        // calling Resend with an undefined `to`.
        if (
          userEmail &&
          (
            requestType === 'gift_card' ||
            requestType === 'complaint' ||
            requestType === 'consultation' ||
            requestType === 'ticket'
          )
        ) {
          try {
            const firstName = userResult[0]?.first_name || 'Customer'

            // For tickets we need the public ticket code for the deeplink.
            // We already resolved it above when handling the insert; grab it
            // again defensively for the email.
            let ticketDeepLink: string | undefined
            let ticketSubject: string | undefined
            if (requestType === 'ticket') {
              const codeRow = await sql`
                SELECT ticket_id, subject FROM support_tickets WHERE id = ${Number(requestId)}
              `
              ticketDeepLink = codeRow[0]?.ticket_id || ticketCode
              ticketSubject = codeRow[0]?.subject
            }

            const titleForEmail =
              requestType === 'ticket'
                ? ticketSubject || `Ticket ${ticketDeepLink || ''}`.trim()
                : `${requestType
                    .replace(/_/g, ' ')
                    .replace(/\b\w/g, (c) => c.toUpperCase())} Request`

            // Resolve the responder's portrait so the email avatar
            // matches the photo the admin / staff member picked in
            // their profile. The session user object returned by
            // requireAdminOrStaff() doesn't carry avatar_url, so we
            // look it up directly. `resolveAdminAvatar` prefers an
            // uploaded portrait, then falls back to the role-specific
            // default tile (admin / staff). When nothing matches we
            // leave it null so the email renders the initial-disc.
            let responderAvatarUrl: string | null = null
            try {
              const senderRow = await sql`
                SELECT avatar_url, role FROM users WHERE id = ${user.id} LIMIT 1
              `
              const uploaded = senderRow[0]?.avatar_url as string | null | undefined
              const role = senderRow[0]?.role as string | null | undefined
              responderAvatarUrl = resolveAdminAvatar(uploaded, role)
            } catch (avatarErr) {
              console.error('Responder avatar lookup failed:', avatarErr)
            }

            await sendReplyNotification({
              email: userEmail,
              firstName,
              requestType,
              requestTitle: titleForEmail,
              replyMessage: message,
              // Use the chosen display name (Admin / Franca / Itunu /
              // override) so the customer's email matches what they
              // see in the in-app conversation.
              responderName: resolvedDisplayName,
              responderAvatarUrl,
              ticketId: ticketDeepLink,
            })
          } catch (emailErr) {
            console.error('Reply email send failed:', emailErr)
          }
        }
      } catch (sideEffectErr) {
        // Any side-effect failure is logged but must not fail the reply.
        console.error('Reply side-effect error:', sideEffectErr)
      }
    }

    // Log activity — also wrapped so an activity-log failure can't hide the
    // successful reply from the admin.
    try {
      await sql`
        INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${user.id},
          ${isInternal ? 'internal_note_added' : 'reply_sent'},
          ${requestType},
          ${requestId.toString()},
          ${isInternal ? 'Internal note added' : 'Reply sent to user'}
        )
      `
    } catch (logErr) {
      console.error('Activity log insert failed:', logErr)
    }

    return NextResponse.json({
      success: true,
      replyId,
    })
  } catch (error) {
    console.error('Create reply error:', error)
    return NextResponse.json(
      { error: 'Failed to create reply' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdminOrStaff()

    const searchParams = request.nextUrl.searchParams
    const requestType = searchParams.get('requestType')
    const requestId = searchParams.get('requestId')

    if (!requestType || !requestId) {
      return NextResponse.json(
        { error: 'Missing request type or ID' },
        { status: 400 }
      )
    }

    // For tickets we merge the user-facing ticket_responses thread with any
    // internal notes admins filed in admin_replies so both the public replies
    // and the private team notes show up in one conversation list.
    if (requestType === 'ticket') {
      // Resolve the public ticket code from the numeric primary key.
      // We accept both shapes — if the caller already passed the code
      // (the user-facing "DS-2026-…" string) we use it directly, which
      // sidesteps the parseInt round-trip entirely. This makes the
      // endpoint resilient against callers that pass either the
      // numeric `support_tickets.id` or the public `ticket_id`.
      let code: string | null = null
      const asNumeric = Number(requestId)
      if (Number.isFinite(asNumeric) && /^\d+$/.test(String(requestId))) {
        const row = await sql`SELECT ticket_id FROM support_tickets WHERE id = ${asNumeric}`
        code = row[0]?.ticket_id || null
      }
      if (!code) {
        // Fall back: treat the requestId as already being the public code.
        const row = await sql`SELECT ticket_id FROM support_tickets WHERE ticket_id = ${String(requestId)}`
        code = row[0]?.ticket_id || null
      }
      if (!code) {
        console.error('/api/admin/reply GET ticket: code not found for requestId=', requestId)
        return NextResponse.json({ replies: [] })
      }

      // Both queries cast the join columns to text. `ticket_responses.user_id`
      // is VARCHAR(255) and `users.id` is VARCHAR(36) — under normal
      // conditions Postgres handles that fine, but the cast removes any
      // collation / length-mismatch edge case so admin replies never
      // silently fall out of the result set. The previous "I send a
      // reply, refresh, and only the user message shows" bug was caused
      // by the JOIN dropping the staff row when the user_id length
      // didn't satisfy implicit coercion.
      // We project the reply rows so the client can render the
      // conversation correctly:
      //
      //   - is_staff: TRUE for admin/staff replies, FALSE for the
      //     customer's own messages. The admin / staff detail pages
      //     KEY OFF THIS FLAG to decide which side of the thread a
      //     bubble renders on. Without it every customer reply was
      //     getting rendered as a staff reply (because the SELECT
      //     joined the customer's name into staff_first_name) and
      //     the conversation looked like a one-sided staff monologue.
      //
      //   - staff_first_name / staff_last_name: ONLY populated for
      //     staff replies. For customer replies we leave them NULL
      //     and project the customer's own name into
      //     customer_first_name / customer_last_name so the UI can
      //     label the bubble correctly.
      //
      //   - sender_display_name: the customer-facing alias the admin
      //     signed the reply with (e.g. "Franca"). NULL on customer
      //     replies.
      const [threadRows, internalRows] = await Promise.all([
        sql`
          SELECT
            tr.id,
            tr.message,
            tr.is_staff,
            false AS is_internal,
            tr.created_at,
            tr.responder_type,
            tr.responder_name,
            CASE
              WHEN tr.is_staff = true
                THEN COALESCE(NULLIF(u.first_name, ''), SPLIT_PART(COALESCE(tr.responder_name, ''), ' ', 1))
              ELSE NULL
            END AS staff_first_name,
            CASE
              WHEN tr.is_staff = true
                THEN COALESCE(NULLIF(u.last_name,  ''), SPLIT_PART(COALESCE(tr.responder_name, ''), ' ', 2))
              ELSE NULL
            END AS staff_last_name,
            CASE
              WHEN tr.is_staff = false
                THEN COALESCE(NULLIF(u.first_name, ''), SPLIT_PART(COALESCE(tr.responder_name, ''), ' ', 1))
              ELSE NULL
            END AS customer_first_name,
            CASE
              WHEN tr.is_staff = false
                THEN COALESCE(NULLIF(u.last_name, ''), SPLIT_PART(COALESCE(tr.responder_name, ''), ' ', 2))
              ELSE NULL
            END AS customer_last_name,
            CASE
              WHEN tr.is_staff = true
                THEN tr.responder_name
              ELSE NULL
            END AS sender_display_name,
            u.avatar_url AS author_avatar_url,
            u.role       AS author_role
          FROM ticket_responses tr
          LEFT JOIN users u ON u.id::text = tr.user_id::text
          WHERE tr.ticket_id = ${code}
          ORDER BY tr.created_at ASC
        `,
        sql`
          SELECT
            ar.id,
            ar.reply_text AS message,
            true AS is_staff,
            ar.is_internal,
            ar.created_at,
            'staff'::text AS responder_type,
            u.first_name AS staff_first_name,
            u.last_name  AS staff_last_name,
            NULL::text   AS customer_first_name,
            NULL::text   AS customer_last_name,
            NULL::text   AS sender_display_name,
            u.avatar_url AS author_avatar_url,
            u.role       AS author_role
          FROM admin_replies ar
          LEFT JOIN users u ON u.id::text = ar.staff_id::text
          WHERE ar.request_type = 'contact'
            AND ar.request_id::text = ${String(requestId)}
            AND ar.is_internal = true
          ORDER BY ar.created_at ASC
        `,
      ])

      const replies = [...threadRows, ...internalRows].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      ).map((r) => {
        const row = r as Record<string, unknown>
        // Only staff/admin authored bubbles get a portrait; customer
        // bubbles fall back to initials in the UI.
        const isStaff = row.is_staff !== false
        return {
          ...row,
          author_avatar_url: isStaff
            ? resolveAdminAvatar(
                row.author_avatar_url as string | null,
                row.author_role as string | null,
              )
            : null,
        }
      })
      console.log(
        '/api/admin/reply GET ticket: code=', code,
        'thread=', threadRows.length,
        'internal=', internalRows.length,
      )
      return NextResponse.json({ replies })
    }

    // IMPORTANT: pass requestId as a string, not parseInt(requestId).
    // `consultations.id` is a UUID (VARCHAR), and parseInt() on a UUID
    // returns NaN which then matches zero rows — making it look like
    // replies were never saved. Since scripts/030 widened
    // admin_replies.request_id to TEXT, a string compare works for both
    // UUID-keyed tables (consultations) and numeric-keyed tables
    // (complaints, contact_messages, gift_card_requests) — Postgres
    // coerces the numeric side during comparison.
    //
    // We try to project sender_display_name first; if that column
    // doesn't exist yet we fall back to a query without it so the
    // admin UI keeps working before migration 043 runs.
    // The body lives in `reply_text`; alias it to `message` so the client
    // (which renders `reply.message`) sees the text. We try to also project
    // sender_display_name; if that column doesn't exist yet we fall back to
    // a query without it so the admin UI keeps working before migration 043.
    let replies: unknown[] = []
    try {
      replies = await sql`
        SELECT
          ar.id,
          ar.reply_text       AS message,
          ar.is_internal,
          ar.created_at,
          ar.request_type,
          ar.request_id,
          true                AS is_staff,
          ar.sender_display_name AS sender_display_name,
          u.first_name        AS staff_first_name,
          u.last_name         AS staff_last_name,
          NULL::text          AS customer_first_name,
          NULL::text          AS customer_last_name,
          u.avatar_url        AS author_avatar_url,
          u.role              AS author_role
        FROM admin_replies ar
        LEFT JOIN users u ON u.id::text = ar.staff_id::text
        WHERE ar.request_type = ${requestType} AND ar.request_id = ${String(requestId)}
        ORDER BY ar.created_at ASC
      `
    } catch {
      replies = await sql`
        SELECT
          ar.id,
          ar.reply_text       AS message,
          ar.is_internal,
          ar.created_at,
          ar.request_type,
          ar.request_id,
          true                AS is_staff,
          u.first_name        AS staff_first_name,
          u.last_name         AS staff_last_name,
          NULL::text          AS customer_first_name,
          NULL::text          AS customer_last_name,
          u.avatar_url        AS author_avatar_url,
          u.role              AS author_role
        FROM admin_replies ar
        LEFT JOIN users u ON u.id::text = ar.staff_id::text
        WHERE ar.request_type = ${requestType} AND ar.request_id = ${String(requestId)}
        ORDER BY ar.created_at ASC
      `
    }

    const resolvedReplies = (replies as Record<string, unknown>[]).map((row) => ({
      ...row,
      author_avatar_url: resolveAdminAvatar(
        row.author_avatar_url as string | null,
        row.author_role as string | null,
      ),
    }))

    return NextResponse.json({ replies: resolvedReplies })
  } catch (error) {
    console.error('Get replies error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch replies' },
      { status: 500 }
    )
  }
}
