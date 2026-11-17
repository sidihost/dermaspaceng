import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'
import { sendDirectUserEmail } from '@/lib/email'
import { logStaffActivity } from '@/lib/activity-log'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await getCurrentUser()
    if (!me) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (me.role !== 'admin' && me.role !== 'staff') {
      return NextResponse.json({ error: 'Staff access required' }, { status: 403 })
    }

    const { id: clientId } = await params
    if (!clientId) {
      return NextResponse.json({ error: 'Missing client id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      subject?: unknown
      message?: unknown
    }

    const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''

    if (!subject || subject.length > 200) {
      return NextResponse.json(
        { error: 'Please enter a subject (maximum 200 characters).' },
        { status: 400 },
      )
    }
    if (!message || message.length > 10000) {
      return NextResponse.json(
        { error: 'Please enter a message (maximum 10,000 characters).' },
        { status: 400 },
      )
    }

    const rows = (await sql`
      SELECT id, email, first_name, last_name, role
      FROM users
      WHERE id = ${clientId}
      LIMIT 1
    `) as Array<{
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
      role: string | null
    }>

    const target = rows[0]
    if (!target) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    if (target.role === 'admin' || target.role === 'staff') {
      return NextResponse.json(
        { error: 'Operator accounts cannot be emailed from the client drawer.' },
        { status: 403 },
      )
    }

    if (!target.email || isPlaceholderEmail(target.email)) {
      return NextResponse.json(
        { error: 'This client does not have a deliverable email address on file.' },
        { status: 400 },
      )
    }

    const recipientName =
      [target.first_name, target.last_name].filter(Boolean).join(' ').trim() ||
      target.email
    const senderName =
      [me.first_name, me.last_name].filter(Boolean).join(' ').trim() ||
      'Dermaspace Specialist'

    const sent = await sendDirectUserEmail({
      email: target.email,
      recipientName,
      subject,
      message,
      senderName,
      senderRole: me.role === 'admin' ? 'admin' : 'staff',
    })

    if (!sent) {
      return NextResponse.json(
        { error: 'Could not deliver the email. Please try again shortly.' },
        { status: 502 },
      )
    }

    await logStaffActivity({
      staffId: String(me.id),
      userId: String(target.id),
      actionType: 'email_sent',
      entityType: 'email',
      entityId: String(target.id),
      description: `Emailed ${recipientName}: ${subject}`,
    })

    return NextResponse.json({
      success: true,
      sentTo: target.email,
    })
  } catch (error) {
    console.error('[staff/clients/email] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 },
    )
  }
}
