import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdminOrStaff } from '@/lib/auth'
import { getAdminPermissions } from '@/lib/admin-permissions'
// Per-event reminder cancel: when admin moves a consultation to
// 'cancelled' or 'completed', kill the pending 1h-before reminder
// so we don't email "your consultation starts soon" for a slot that
// is already over / cancelled.
import { cancelConsultationReminder } from '@/lib/reminders'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const me = await requireAdminOrStaff()
    // Admins are filtered by the consultations permission map (only
    // the super admin and Franca can see this surface). Staff keep
    // access — their own queue page already filters to assignments.
    if (me.role === 'admin' && !getAdminPermissions(me).canSeeConsultations) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // We join twice:
    //  - `u` is the staff/admin the consultation has been assigned to
    //    (so the admin list can render "Assigned to Franca").
    //  - `cu` is the customer themselves, matched by the email they
    //    submitted on the booking form. When the email maps to a real
    //    Dermaspace account we surface their avatar_url so the list
    //    can show the same portrait we show everywhere else in the
    //    admin — keeping the visual language consistent with
    //    /admin/users. Customers without an account simply render
    //    initials in a brand-tinted circle.
    // Compose the legacy `name`, `message`, `scheduled_at` fields the
    // admin list UI was authored against. See the detail route for the
    // full story — the underlying columns are `first_name`/`last_name`,
    // `notes`, and the `appointment_date`+`appointment_time` pair.
    const consultations = await sql`
      SELECT 
        c.*,
        TRIM(CONCAT(COALESCE(c.first_name, ''), ' ', COALESCE(c.last_name, ''))) AS name,
        c.notes AS message,
        CASE
          WHEN c.appointment_date IS NOT NULL AND c.appointment_time IS NOT NULL
            THEN (c.appointment_date::text || ' ' || c.appointment_time)
          WHEN c.appointment_date IS NOT NULL
            THEN c.appointment_date::text
          ELSE NULL
        END AS scheduled_at,
        u.first_name as assigned_first_name,
        u.last_name as assigned_last_name,
        u.avatar_url as assigned_avatar_url,
        u.role as assigned_role,
        u.gender as assigned_gender,
        cu.avatar_url as customer_avatar_url,
        cu.role as customer_role,
        cu.gender as customer_gender,
        cu.id as customer_user_id
      FROM consultations c
      LEFT JOIN users u ON CAST(u.id AS TEXT) = CAST(c.assigned_to AS TEXT)
      LEFT JOIN LATERAL (
        SELECT id, avatar_url, role, gender
        FROM users
        WHERE (c.user_id IS NOT NULL AND CAST(id AS TEXT) = CAST(c.user_id AS TEXT))
           OR (c.email IS NOT NULL AND TRIM(LOWER(email)) = TRIM(LOWER(c.email)))
        ORDER BY
          CASE WHEN c.user_id IS NOT NULL AND CAST(id AS TEXT) = CAST(c.user_id AS TEXT) THEN 0 ELSE 1 END,
          CASE WHEN avatar_url IS NOT NULL AND TRIM(avatar_url) <> '' THEN 0 ELSE 1 END
        LIMIT 1
      ) cu ON TRUE
      WHERE (${status} = '' OR c.status = ${status || 'pending'})
      ORDER BY c.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `

    const countResult = await sql`
      SELECT COUNT(*) as total FROM consultations
      WHERE (${status} = '' OR status = ${status || 'pending'})
    `

    const statusCounts = await sql`
      SELECT status, COUNT(*) as count
      FROM consultations
      GROUP BY status
    `

    return NextResponse.json({
      consultations,
      pagination: {
        page,
        limit,
        total: Number(countResult[0].total),
        totalPages: Math.ceil(Number(countResult[0].total) / limit)
      },
      statusCounts: statusCounts.reduce((acc, row) => {
        acc[row.status || 'pending'] = Number(row.count)
        return acc
      }, {} as Record<string, number>)
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Get consultations error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch consultations' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAdminOrStaff()
    if (user.role === 'admin' && !getAdminPermissions(user).canSeeConsultations) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { consultationId, action, value, notes } = await request.json()

    if (!consultationId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    switch (action) {
      case 'update_status': {
        if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(value)) {
          return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
        }
        const [{ ensureConsultationRepliesSchema, ensureConsultationTrackToken }, { formatConsultationDateLabel, formatConsultationLocation, buildConsultationEmailAction }, { resolveEmailOrigin }] =
          await Promise.all([
            import('@/lib/consultation-replies'),
            import('@/lib/consultation-mode'),
            import('@/lib/email-url'),
          ])
        await ensureConsultationRepliesSchema()

        await sql`
          UPDATE consultations 
          SET status = ${value}, updated_at = NOW()
          WHERE id = ${consultationId}
        `
        // Tear down the pending 1h-before reminder when the
        // consultation will no longer happen. We deliberately don't
        // cancel for 'confirmed' (the appointment is still on) or
        // 'pending' (the user could yet keep the slot).
        if (value === 'cancelled' || value === 'completed') {
          await cancelConsultationReminder(consultationId)
        }
        await sql`
          INSERT INTO activity_log (staff_id, action_type, entity_type, entity_id, description)
          VALUES (${user.id}, 'consultation_status_changed', 'consultation', ${consultationId}, ${`Status changed to ${value}`})
        `

        // Light up the customer's bell and send the status email. We look the
        // customer up by user_id first (set on signed-in submissions) and fall
        // back to a case-insensitive match on email so older rows still link
        // cleanly. Failures are logged but never break the PUT.
        try {
          const target = (await sql`
            SELECT
              COALESCE(c.user_id, cu.id) AS notify_user_id,
              c.email,
              c.first_name,
              c.location,
              TO_CHAR(c.appointment_date, 'YYYY-MM-DD') AS appointment_date,
              c.appointment_time,
              c.is_anonymous,
              c.track_token
            FROM consultations c
            LEFT JOIN users cu ON LOWER(cu.email) = LOWER(c.email)
            WHERE c.id = ${consultationId}
            LIMIT 1
          `) as unknown as Array<{
            notify_user_id: string | null
            email: string | null
            first_name: string | null
            location: string | null
            appointment_date: string | null
            appointment_time: string | null
            is_anonymous: boolean | null
            track_token: string | null
          }>
          const recipient = target[0]
          const formattedDate = formatConsultationDateLabel(recipient?.appointment_date)
          const formattedLocation = formatConsultationLocation(recipient?.location)

          if (recipient?.notify_user_id) {
            const { notifyUser } = await import('@/lib/notifications')
            const titles: Record<string, string> = {
              confirmed: 'Consultation confirmed',
              completed: 'Consultation completed',
              cancelled: 'Consultation cancelled',
              pending: 'Consultation pending',
            }
            const dateTimeClause = formattedDate
              ? ` for ${formattedDate}${recipient.appointment_time ? ' at ' + recipient.appointment_time : ''}`
              : ''
            const messages: Record<string, string> = {
              confirmed: `Great news! Your consultation is confirmed${dateTimeClause}.`,
              completed: 'Thanks for visiting us. We hope you loved your consultation — leave a quick review when you have a moment.',
              cancelled: 'Your consultation has been cancelled. Tap to rebook a new slot whenever you\u2019re ready.',
              pending: 'Your consultation is back to pending. We\u2019ll reach out shortly.',
            }
            await notifyUser({
              userId: recipient.notify_user_id,
              title: titles[value] || 'Consultation update',
              message: messages[value] || `Status: ${value}`,
              type: 'status_update',
              referenceType: 'consultation',
              referenceId: consultationId,
              actionUrl: `/dashboard/consultations/${consultationId}`,
              priority: value === 'confirmed' || value === 'cancelled' ? 'high' : 'normal',
            })
          }

          if (recipient?.email && ['confirmed', 'completed', 'cancelled'].includes(value)) {
            const { sendConsultationStatusEmail } = await import('@/lib/email')
            const isAnonRecipient = Boolean(
              (recipient.is_anonymous ?? true) && !recipient.notify_user_id,
            )
            const resolvedToken = isAnonRecipient
              ? await ensureConsultationTrackToken(consultationId, recipient.track_token)
              : recipient.track_token
            const emailAction = buildConsultationEmailAction({
              isAnonymous: isAnonRecipient,
              appUrl: resolveEmailOrigin(),
              consultationId,
              trackToken: resolvedToken,
              status: value as 'confirmed' | 'completed' | 'cancelled',
            })
            const sent = await sendConsultationStatusEmail({
              email: recipient.email,
              firstName: recipient.first_name || 'there',
              status: value as 'confirmed' | 'completed' | 'cancelled',
              location: formattedLocation || recipient.location,
              date: formattedDate || recipient.appointment_date,
              time: recipient.appointment_time,
              ctaUrl: emailAction.ctaUrl,
              ctaLabel: emailAction.ctaLabel,
            })
            if (!sent) {
              console.warn('consultation status email was not delivered for', consultationId)
            }
          }
        } catch (err) {
          console.error('consultation status notify/email failed', err)
        }
        break
      }

      case 'assign':
        await sql`
          UPDATE consultations 
          SET assigned_to = ${value}, updated_at = NOW()
          WHERE id = ${consultationId}
        `
        break

      case 'add_notes':
        await sql`
          UPDATE consultations 
          SET admin_notes = ${notes}, updated_at = NOW()
          WHERE id = ${consultationId}
        `
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('Update consultation error:', error)
    return NextResponse.json(
      { error: 'Failed to update consultation' },
      { status: 500 }
    )
  }
}
