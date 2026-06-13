import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/clients/[id]/payments
 *
 * Powers the "Payment history" tab inside the staff client drawer.
 * The drawer (ClientPaymentsTab) was calling this endpoint but it
 * never existed — so the tab was stuck on its loading spinner /
 * "Failed to load payments" state forever. This builds the unified
 * ledger the UI expects:
 *
 *   - Every row from `transactions` (wallet credits/debits, refunds,
 *     and the booking debit rows we now write for card payments).
 *   - Every paid booking from `bookings` that ISN'T already mirrored
 *     in `transactions` (legacy card bookings created before we
 *     started writing the ledger row), so historical payments still
 *     show up.
 *
 * Each record is normalised to the shape `ClientPaymentsTab` renders:
 *   { id, type, amount(kobo), description, reference, created_at,
 *     paystack_reference?, paystack_status? }
 *
 * NOTE: the slug here MUST stay `[id]` to match the sibling
 * `/api/staff/clients/[id]` route — Next.js forbids two different
 * dynamic-segment names at the same path level.
 */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdminOrStaff()

    const { id: clientId } = await context.params
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "Missing client id" },
        { status: 400 }
      )
    }

    // 1. Wallet/transaction ledger. `amount` is stored in NAIRA
    //    (DECIMAL) in this table, so multiply by 100 to hand the UI
    //    kobo (it divides by 100 for display).
    const txRows = (await sql`
      SELECT id, type, status, amount, reference, paystack_reference,
             description, metadata, created_at
      FROM transactions
      WHERE user_id = ${clientId}
      ORDER BY created_at DESC
      LIMIT 200
    `) as any[]

    const txReferences = new Set(
      txRows
        .map((r) => r.reference)
        .filter((r): r is string => typeof r === "string" && r.length > 0)
    )

    const payments = txRows.map((r) => {
      const meta = (r.metadata ?? {}) as Record<string, any>
      // Map DB transaction.type → the UI's record type union.
      let type:
        | "wallet_credit"
        | "wallet_debit"
        | "booking_charge"
        | "refund" = "wallet_debit"
      if (r.type === "refund") type = "refund"
      else if (r.type === "credit") type = "wallet_credit"
      else if (meta.type === "booking" || meta.booking_id) type = "booking_charge"
      else if (r.type === "debit") type = "wallet_debit"

      return {
        id: String(r.id),
        type,
        amount: Math.round(Number(r.amount ?? 0) * 100),
        description: r.description || "Transaction",
        reference: r.reference || undefined,
        created_at: String(r.created_at),
        paystack_reference: r.paystack_reference || undefined,
        paystack_status: r.status === "refunded" ? "refunded" : undefined,
      }
    })

    // 2. Legacy paid bookings not represented in the ledger. These are
    //    card bookings confirmed before we started writing the debit
    //    row. We key the de-dupe on the booking's payment_reference so
    //    a booking that DOES have a ledger row isn't listed twice.
    try {
      const bookingRows = (await sql`
        SELECT id, booking_reference, payment_reference, payment_method,
               payment_status, total_price_kobo, created_at
        FROM bookings
        WHERE user_id = ${clientId}
          AND payment_status = 'paid'
        ORDER BY created_at DESC
        LIMIT 200
      `) as any[]

      for (const b of bookingRows) {
        if (b.payment_reference && txReferences.has(b.payment_reference)) {
          continue // already in the ledger
        }
        payments.push({
          id: `booking_${b.id}`,
          type: "booking_charge",
          amount: Number(b.total_price_kobo ?? 0),
          description: `Booking payment ${b.booking_reference}`,
          reference: b.payment_reference || b.booking_reference || undefined,
          created_at: String(b.created_at),
          paystack_reference:
            b.payment_method === "paystack"
              ? b.payment_reference || undefined
              : undefined,
          paystack_status: undefined,
        })
      }
    } catch (err) {
      // bookings columns vary across envs — never let it break the
      // ledger we already built.
      console.error("[staff payments] booking merge failed", err)
    }

    // Newest first across the merged set.
    payments.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({ success: true, payments })
  } catch (error) {
    console.error("Staff client payments error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load payments" },
      { status: 500 }
    )
  }
}
