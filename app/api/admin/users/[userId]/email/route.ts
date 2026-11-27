import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'
import { sendDirectUserEmail } from '@/lib/email'
import { logStaffActivity } from '@/lib/activity-log'
import {
  listAdminClientEmails,
  recordAdminClientEmail,
} from '@/lib/admin-client-emails-db'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getCurrentUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const rows = (await sql`
      SELECT id, email
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `) as Array<{ id: string; email: string | null }>

    const target = rows[0]
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const emails = await listAdminClientEmails(
      String(target.id),
      target.email || '',
    )

    return NextResponse.json({ emails })
  } catch (error) {
    console.error('[admin/users/email] GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load sent emails' },
      { status: 500 },
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
) {
  try {
    const admin = await getCurrentUser()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
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
      SELECT id, email, first_name, last_name
      FROM users
      WHERE id = ${userId}
      LIMIT 1
    `) as Array<{
      id: string
      email: string | null
      first_name: string | null
      last_name: string | null
    }>

    const target = rows[0]
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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
      [admin.first_name, admin.last_name].filter(Boolean).join(' ').trim() ||
      'Dermaspace Admin'

    const sent = await sendDirectUserEmail({
      email: target.email,
      recipientName,
      subject,
      message,
      senderName,
      senderRole: 'admin',
    })

    if (!sent) {
      return NextResponse.json(
        { error: 'Could not deliver the email. Please check email settings and try again.' },
        { status: 502 },
      )
    }

    let savedEmail = null
    try {
      savedEmail = await recordAdminClientEmail({
        userId: String(target.id),
        recipientEmail: target.email,
        subject,
        message,
        sentById: String(admin.id),
        sentByName: senderName,
      })
    } catch (recordErr) {
      console.error('[admin/users/email] failed to persist sent email history:', recordErr)
    }

    await logStaffActivity({
      staffId: String(admin.id),
      userId: String(target.id),
      actionType: 'email_sent',
      entityType: 'email',
      entityId: savedEmail?.id ?? String(target.id),
      description: `Emailed ${recipientName}: ${subject}`,
    })

    return NextResponse.json({
      success: true,
      sentTo: target.email,
      email: savedEmail,
    })
  } catch (error) {
    console.error('[admin/users/email] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to send email' },
      { status: 500 },
    )
  }
}
