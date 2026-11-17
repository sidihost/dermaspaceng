import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { invalidateUserMe } from '@/lib/redis'
import { isPlaceholderEmail } from '@/lib/auth-onboarding'
import { sendAppealDecisionEmail } from '@/lib/email'
import { logStaffActivity } from '@/lib/activity-log'
import { canTransitionAppealStatus } from '@/lib/suspension-appeals'
import { ensureAccountAppealsTable } from '@/lib/suspension-appeals-db'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin()
    await ensureAccountAppealsTable()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Missing appeal id' }, { status: 400 })
    }

    const body = (await request.json().catch(() => ({}))) as {
      decision?: unknown
      reviewNote?: unknown
    }
    const decision = body.decision === 'approved' || body.decision === 'rejected' ? body.decision : null
    if (!decision) {
      return NextResponse.json(
        { error: 'Invalid decision. Expected approved or rejected.' },
        { status: 400 },
      )
    }

    const reviewNote =
      typeof body.reviewNote === 'string' && body.reviewNote.trim()
        ? body.reviewNote.trim().slice(0, 1000)
        : null

    const rows = (await sql`
      SELECT
        a.id,
        a.user_id,
        a.user_email,
        a.user_name,
        a.user_role,
        a.status,
        u.first_name,
        u.email AS current_email,
        u.role AS current_role,
        u.deleted_at AS user_deleted_at
      FROM account_appeals a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE a.id = ${id}
      LIMIT 1
    `) as Array<{
      id: string
      user_id: string
      user_email: string
      user_name: string | null
      user_role: string
      status: string
      first_name: string | null
      current_email: string | null
      current_role: string | null
      user_deleted_at: string | null
    }>

    const appeal = rows[0]
    if (!appeal) {
      return NextResponse.json({ error: 'Appeal not found' }, { status: 404 })
    }

    if (!canTransitionAppealStatus(appeal.status, decision)) {
      return NextResponse.json(
        { error: `This appeal has already been ${appeal.status}.` },
        { status: 409 },
      )
    }

    if (decision === 'approved' && appeal.user_deleted_at !== null) {
      return NextResponse.json(
        { error: 'This account is archived. Restore it from the archive before approving an appeal.' },
        { status: 409 },
      )
    }

    const updatedRows = (await sql`
      UPDATE account_appeals
      SET
        status = ${decision},
        reviewed_by = ${String(admin.id)},
        review_note = ${reviewNote},
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
        AND status = 'pending'
      RETURNING id
    `) as Array<{ id: string }>

    if (updatedRows.length === 0) {
      return NextResponse.json(
        { error: 'This appeal has already been reviewed.' },
        { status: 409 },
      )
    }

    if (decision === 'approved') {
      await sql`
        UPDATE users
        SET is_active = TRUE, updated_at = NOW()
        WHERE id = ${appeal.user_id}
          AND deleted_at IS NULL
      `
      await invalidateUserMe(String(appeal.user_id))
    }

    const notifyEmail =
      (appeal.current_email && !isPlaceholderEmail(appeal.current_email)
        ? appeal.current_email
        : null) ||
      (appeal.user_email && !isPlaceholderEmail(appeal.user_email)
        ? appeal.user_email
        : null)

    if (notifyEmail) {
      await sendAppealDecisionEmail({
        email: notifyEmail,
        firstName: appeal.first_name || appeal.user_name,
        role: appeal.current_role || appeal.user_role,
        decision,
        reviewNote,
      }).catch((err) => {
        console.error('[api/admin/appeals/decision] failed to send email:', err)
      })
    }

    await logStaffActivity({
      staffId: String(admin.id),
      userId: String(appeal.user_id),
      actionType: decision === 'approved' ? 'appeal_approved' : 'appeal_rejected',
      entityType: 'appeal',
      entityId: String(appeal.id),
      description:
        decision === 'approved'
          ? `Approved appeal ${appeal.id} and reinstated ${appeal.user_name || appeal.user_email}`
          : `Declined appeal ${appeal.id} for ${appeal.user_name || appeal.user_email}`,
    })

    return NextResponse.json({ success: true, decision })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unauthorized:')) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    console.error('[api/admin/appeals/[id]] POST error:', error)
    return NextResponse.json(
      { error: 'Failed to process appeal decision' },
      { status: 500 },
    )
  }
}
