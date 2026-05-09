import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/money?tab=all|payments|expense&limit=&offset=
 *
 * Salon-side "Money" panel — Splice splits this into Splice wallet,
 * Payments, Expense, and Finance. We surface Wallet + Payments here
 * because they map 1:1 onto the existing `transactions` table.
 *
 *   - Available balance  = Σ completed credits − Σ completed debits.
 *   - Total Balance      = Σ completed credits (gross).
 *   - Transactions list  = `transactions` ordered DESC, optionally
 *                          filtered by `tab`.
 *
 * Expense / Finance need an `expenses` schema (categories, vat,
 * receipts) — TODO: add migration for that and extend this route.
 *
 * Branch filter (multi-tenant) is intentionally out of scope for
 * release one — single salon today, branch_id arrives with a future
 * `salons` schema.
 *
 * The Neon serverless tagged template doesn't support runtime SQL
 * fragment composition (no `sql.unsafe`), so we branch on `tab` with
 * three explicit query variants. They share the same shape, so the
 * mapping below stays a one-liner.
 */

const VIRTUAL_ACCOUNT = {
  // Until the integration with a Nigerian payout provider is wired
  // up, we render Dermaspace's ops account so customers can still
  // bank-transfer. Replace with the per-tenant virtual NUBAN once
  // we go multi-tenant.
  bankName: "Wema Bank",
  accountName: "Dermaspace Operations",
  accountNumber: "0912047893",
}

export async function GET(req: Request) {
  try {
    await requireAdminOrStaff()

    const url = new URL(req.url)
    const limitRaw = Number(url.searchParams.get("limit") ?? 25)
    const offsetRaw = Number(url.searchParams.get("offset") ?? 0)
    const tab = (url.searchParams.get("tab") || "all").toLowerCase()
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100)
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)

    const balanceRows = (await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0)::float AS total_in,
        COALESCE(SUM(CASE WHEN type = 'debit'  THEN amount ELSE 0 END), 0)::float AS total_out
      FROM transactions
      WHERE status = 'completed'
    `) as any[]

    const totalIn = Number(balanceRows[0]?.total_in ?? 0)
    const totalOut = Number(balanceRows[0]?.total_out ?? 0)
    const available = Math.max(totalIn - totalOut, 0)

    let txRows: any[] = []
    let totalRow: any[] = []
    if (tab === "payments") {
      txRows = (await sql`
        SELECT t.id, t.reference, t.type, t.status, t.amount,
               t.payment_method, t.description, t.created_at,
               u.first_name, u.last_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.payment_method = 'paystack'
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      totalRow = (await sql`
        SELECT COUNT(*)::int AS total FROM transactions WHERE payment_method = 'paystack'
      `) as any[]
    } else if (tab === "expense") {
      txRows = (await sql`
        SELECT t.id, t.reference, t.type, t.status, t.amount,
               t.payment_method, t.description, t.created_at,
               u.first_name, u.last_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.type = 'debit'
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      totalRow = (await sql`
        SELECT COUNT(*)::int AS total FROM transactions WHERE type = 'debit'
      `) as any[]
    } else {
      txRows = (await sql`
        SELECT t.id, t.reference, t.type, t.status, t.amount,
               t.payment_method, t.description, t.created_at,
               u.first_name, u.last_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      totalRow = (await sql`SELECT COUNT(*)::int AS total FROM transactions`) as any[]
    }

    return NextResponse.json({
      success: true,
      wallet: {
        availableBalance: available,
        totalBalance: totalIn,
        currency: "NGN",
      },
      virtualAccount: VIRTUAL_ACCOUNT,
      transactions: txRows.map((r) => ({
        id: r.id,
        reference: r.reference,
        type: r.type,
        status: r.status,
        amount: Number(r.amount ?? 0),
        paymentMethod: r.payment_method,
        description:
          r.description ||
          [r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
          "Transaction",
        createdAt: r.created_at,
      })),
      total: Number(totalRow[0]?.total ?? 0),
    })
  } catch (error) {
    console.error("Staff money error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load money data" },
      { status: 500 }
    )
  }
}
