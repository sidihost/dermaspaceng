import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  ensureConsultationRepliesSchema,
  insertCustomerConsultationReply,
} from '@/lib/consultation-replies'
import { formatConsultationLocation } from '@/lib/consultation-mode'
import { sendConsultationCustomerReplyAlert } from '@/lib/email'
import { notifyAdmins } from '@/lib/notifications'

export const dynamic = 'force-dynamic'

// Public, token-gated reply endpoint so anonymous consultation visitors
// can respond to the Dermaspace clinical team from /consultation/track/[token].
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params
    if (!token || !/^[a-f0-9]{20,80}$/i.test(token)) {
      return NextResponse.json({ error: 'Invalid tracking link' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const rawMessage = typeof body?.message === 'string' ? body.message : ''
    const trimmed = rawMessage.trim()

    if (!trimmed) {
      return NextResponse.json(
        { error: 'Please write a response before sending.' },
        { status: 400 },
      )
    }
    if (trimmed.length > 2000) {
      return NextResponse.json(
        { error: 'Response must be 2000 characters or fewer.' },
        { status: 400 },
      )
    }

    await ensureConsultationRepliesSchema()

    const rows = (await sql`
      SELECT id::text AS id, first_name, last_name, email, location, status
      FROM consultations
      WHERE track_token = ${token}
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
      [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || 'Guest'

    const reply = await insertCustomerConsultationReply({
      consultationId: String(c.id),
      userEmail: c.email,
      customerName,
      message: trimmed,
    })

    // Best-effort operator bell + email alert; never block the customer's reply.
    try {
      await notifyAdmins({
        title: `Consultation response · ${customerName}`,
        message: trimmed.slice(0, 140),
        type: 'reply',
        referenceType: 'consultation',
        referenceId: String(c.id),
        actionUrl: `/admin/consultations/${encodeURIComponent(String(c.id))}`,
        priority: 'high',
      })
    } catch (notifyErr) {
      console.error('Anonymous consultation reply notifyAdmins failed:', notifyErr)
    }

    try {
      const adminRecipients =
        process.env.ADMIN_NOTIFICATIONS_EMAIL || 'hello@dermaspaceng.com'
      await sendConsultationCustomerReplyAlert({
        to: adminRecipients,
        customerName,
        customerEmail: c.email,
        consultationId: String(c.id),
        locationLabel: formatConsultationLocation(c.location),
        replyMessage: trimmed,
        isAnonymous: true,
      })
    } catch (emailErr) {
      console.error('Anonymous consultation reply alert email failed:', emailErr)
    }

    return NextResponse.json({ reply }, { status: 201 })
  } catch (error) {
    console.error('Anonymous consultation reply error:', error)
    return NextResponse.json(
      { error: 'Failed to send response' },
      { status: 500 },
    )
  }
}
