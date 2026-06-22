import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { requireAdmin } from '@/lib/auth'
import { sendApprovalDecisionNotification } from '@/lib/email'

const sql = neon(process.env.DATABASE_URL!)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin()
    const { id } = await params

    const body = (await request.json().catch(() => ({}))) as {
      decision: 'approved' | 'rejected'
      note?: string
    }

    if (!['approved', 'rejected'].includes(body.decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 })
    }

    // Load the approval request
    const requests = (await sql`
      SELECT
        id,
        action_type,
        target_user_id,
        payload,
        status,
        requested_by,
        (SELECT first_name FROM users WHERE id = requested_by) AS requester_name,
        (SELECT email FROM users WHERE id = requested_by) AS requester_email
      FROM admin_approval_requests
      WHERE id = ${id}
      LIMIT 1
    `) as Array<{
      id: string
      action_type: string
      target_user_id: string
      payload: Record<string, unknown>
      status: string
      requested_by: string
      requester_name: string
      requester_email: string
    }>

    if (!requests.length) {
      return NextResponse.json({ error: 'Approval request not found' }, { status: 404 })
    }

    const approvalReq = requests[0]

    // Can't approve/reject something that's already been handled
    if (approvalReq.status !== 'pending') {
      return NextResponse.json(
        { error: `This request has already been ${approvalReq.status}.` },
        { status: 409 },
      )
    }

    // Update the approval request status + reviewer info
    await sql`
      UPDATE admin_approval_requests
      SET
        status = ${body.decision},
        reviewed_by = ${admin.id},
        reviewed_at = NOW(),
        review_note = ${body.note || null},
        updated_at = NOW()
      WHERE id = ${id}
    `

    // If approved, execute the action
    if (body.decision === 'approved') {
      if (approvalReq.action_type === 'remove_staff') {
        // Demote staff member back to a regular, ACTIVE client.
        await sql`
          UPDATE users
          SET
            role = 'user',
            is_active = TRUE,
            is_super_admin = FALSE,
            can_manage_services = FALSE,
            updated_at = NOW()
          WHERE id = ${approvalReq.target_user_id}
        `
        await sql`DELETE FROM sessions WHERE user_id = ${approvalReq.target_user_id}`
      } else if (approvalReq.action_type === 'delete_user') {
        // Demote to a regular client. We keep the account active so the
        // person can still sign in as a customer (history preserved).
        await sql`
          UPDATE users
          SET
            role = 'user',
            is_active = TRUE,
            is_super_admin = FALSE,
            can_manage_services = FALSE,
            updated_at = NOW()
          WHERE id = ${approvalReq.target_user_id}
        `
        await sql`DELETE FROM sessions WHERE user_id = ${approvalReq.target_user_id}`
      }
    }

    // Send notification to the requester (best-effort, never blocks)
    try {
      const actionLabel =
        approvalReq.action_type === 'remove_staff'
          ? `Remove ${(approvalReq.payload as any)?.target_name || 'staff member'} from staff`
          : `Delete user account (${(approvalReq.payload as any)?.target_name || 'user'})`

      await sendApprovalDecisionNotification({
        email: approvalReq.requester_email,
        firstName: approvalReq.requester_name,
        actionLabel,
        decision: body.decision,
        reviewNote: body.note,
      })
    } catch (mailErr) {
      console.error('[v0] approval decision email failed:', mailErr)
    }

    return NextResponse.json({
      success: true,
      decision: body.decision,
      message: `Request ${body.decision}. Notification sent to requester.`,
    })
  } catch (error) {
    console.error('[v0] POST /api/admin/approvals/[id] failed:', error)
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
