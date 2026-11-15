import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import {
  ensureConsultationRepliesSchema,
  insertCustomerConsultationReply,
} from '@/lib/consultation-replies'
import { formatConsultationLocation } from '@/lib/consultation-mode'
import { sendConsultationCustomerReplyAlert } from '@/lib/email'
import { notifyAdmins } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const rawMessage = typeof body?.message === 'string' ? body.message : ''
    const trimmed = rawMessage.trim()

    if (!trimmed) {
      return NextResponse.json(
        { error: 'Please write a message before sending.' },
        { status: 400 },
      )
    }
    if (trimmed.length > 2000) {
      return NextResponse.json(
        { error: 'Message must be 2000 characters or fewer.' },
        { status: 400 },
      )
    }

    await ensureConsultationRepliesSchema()

    const rows = (await sql`
      SELECT id::text AS id, first_name, last_name, email, location, status
      FROM consultations
      WHERE id = ${id}
        AND (user_id = ${me.id}
             OR (user_id IS NULL AND LOWER(email) = LOWER(${me.email})))
      LIMIT 1
    `) as unknown as Array<{
      id: string
      first_name: string | null
      last_name: string | null
      email: string | null
      location: string | null
      status: string | null
    }>

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Consultation not found' }, { status: 404 })
    }

    const c = rows[0]
    if (c.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This consultation was cancelled. Please book a new slot.' },
        { status: 400 },
      )
    }

    const customerName =
      [me.first_name || c.first_name, me.last_name || c.last_name]
        .filter(Boolean)
        .join(' ')
        .trim() ||
      me.email ||
      'Customer'

    const reply = await insertCustomerConsultationReply({
      consultationId: String(c.id),
      userEmail: me.email || c.email,
      customerName,
      message: trimmed,
    })

    // Best-effort operator bell + email alert; never block customer reply.
    try {
      await notifyAdmins({
        title: `Consultation reply · ${customerName}`,
        message: trimmed.slice(0, 140),
        type: 'reply',
        referenceType: 'consultation',
        referenceId: String(c.id),
        actionUrl: `/admin/consultations/${encodeURIComponent(String(c.id))}`,
        priority: 'high',
      })
    } catch (notifyErr) {
      console.error('User consultation reply notifyAdmins failed:', notifyErr)
    }

    try {
      const adminRecipients =
        process.env.ADMIN_NOTIFICATIONS_EMAIL || 'hello@dermaspaceng.com'
      await sendConsultationCustomerReplyAlert({
        to: adminRecipients,
        customerName,
        customerEmail: me.email || c.email,
        consultationId: String(c.id),
        locationLabel: formatConsultationLocation(c.location),
        replyMessage: trimmed,
        isAnonymous: false,
      })
    } catch (emailErr) {
      console.error('User consultation reply alert email failed:', emailErr)
    }

    return NextResponse.json({ reply }, { status: 201 })
  } catch (error) {
    console.error('User consultation reply error:', error)
    return NextResponse.json(
      { error: 'Failed to send reply' },
      { status: 500 },
    )
  }
}
