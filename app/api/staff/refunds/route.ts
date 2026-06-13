import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"
import { refundToWallet } from "@/lib/wallet"
import { notifyUser } from "@/lib/notifications"

/**
 * POST /api/staff/refunds
 *
 * Lets a staff member / admin refund a client's payment back to their
 * Dermaspace wallet. The "Refund" button in the staff client drawer
 * (ClientPaymentsTab) posts here, but the route never existed — so the
 * button always failed with "Refund failed: ...".
 *
 * Body: { clientId, paymentId, amount(kobo), paystackReference?, reason? }
 *
 * Behaviour:
 *   - Credits the refund amount to the client's wallet via the shared
 *     `refundToWallet` helper (atomic balance bump + 'refund' ledger
 *     row), so it shows up in BOTH the customer's transaction history
 *     and the staff payment tab immediately.
 *   - Marks the original transaction row 'refunded' when we can resolve
 *     it, so the UI hides the Refund button on re-load (idempotency).
 *   - Drops an in-app notification on the customer's bell.
 *
 * We refund to wallet (not back to the card) because card reversals
 * require a Paystack secret-key transfer flow + settlement balance;
 * wallet credit is instant and is the salon's existing refund policy.
 */
export async function POST(req: Request) {
  try {
    const me = await requireAdminOrStaff()

    const body = (await req.json().catch(() => ({}))) as {
      clientId?: string
      paymentId?: string
      amount?: number // kobo
      paystackReference?: string
      reason?: string
    }

    const clientId = body.clientId?.toString().trim()
    const amountKobo = Number(body.amount ?? 0)
    if (!clientId || !Number.isFinite(amountKobo) || amountKobo <= 0) {
      return NextResponse.json(
        { success: false, error: "Missing client or invalid amount" },
        { status: 400 }
      )
    }

    // Confirm the target is a real customer (not an operator account).
    const target = (await sql`
      SELECT id, role, first_name, last_name FROM users WHERE id = ${clientId} LIMIT 1
    `) as any[]
    if (target.length === 0) {
      return NextResponse.json(
        { success: false, error: "Client not found" },
        { status: 404 }
      )
    }
    if (target[0].role && ["admin", "staff"].includes(String(target[0].role))) {
      return NextResponse.json(
        { success: false, error: "Cannot refund operator accounts" },
        { status: 403 }
      )
    }

    // Resolve the original transaction id (numeric) when the UI sends a
    // real ledger row. Booking-derived rows arrive as `booking_<id>` and
    // have no numeric transaction id — that's fine, we still refund.
    let originalTransactionId = 0
    const rawId = body.paymentId?.toString() ?? ""
    if (/^\d+$/.test(rawId)) {
      originalTransactionId = Number(rawId)
    } else if (body.paystackReference) {
      const found = (await sql`
        SELECT id FROM transactions
        WHERE reference = ${body.paystackReference}
           OR paystack_reference = ${body.paystackReference}
        LIMIT 1
      `) as any[]
      if (found[0]) originalTransactionId = Number(found[0].id)
    }

    const amountNaira = amountKobo / 100
    const reason =
      body.reason?.toString().trim() || "Refund issued by Dermaspace staff"

    const result = await refundToWallet(
      Number(clientId),
      amountNaira,
      originalTransactionId,
      reason
    )
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || "Refund failed" },
        { status: 500 }
      )
    }

    // Flag the original row refunded so the UI hides its Refund button.
    if (originalTransactionId > 0) {
      try {
        await sql`
          UPDATE transactions
          SET status = 'refunded', updated_at = NOW()
          WHERE id = ${originalTransactionId}
        `
      } catch {
        /* status column / row may differ in some envs — non-fatal */
      }
    }

    // Customer bell + receipt deep-link to the new refund transaction.
    try {
      const refundRef = result.transaction?.payment_reference
      await notifyUser({
        userId: clientId,
        title: "Refund processed",
        message: `A refund of ₦${amountNaira.toLocaleString("en-NG")} has been added to your wallet.`,
        type: "status_update",
        referenceType: "transaction",
        referenceId: refundRef ?? null,
        actionUrl: refundRef ? `/dashboard/transactions/${refundRef}` : "/dashboard/wallet",
        priority: "high",
      })
    } catch (err) {
      console.error("[staff refund] notify failed", err)
    }

    // Audit (best-effort).
    try {
      await sql`
        INSERT INTO activity_log
          (staff_id, user_id, action_type, entity_type, entity_id, description)
        VALUES (
          ${me.id}, ${clientId}, 'refund_issued', 'transaction',
          ${result.transaction?.id ?? null},
          ${`Refunded ₦${amountNaira.toLocaleString("en-NG")} to wallet`}
        )
      `
    } catch {
      /* swallow */
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
    })
  } catch (error) {
    console.error("Staff refund error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to process refund" },
      { status: 500 }
    )
  }
}
