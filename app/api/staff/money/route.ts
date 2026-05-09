import { NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { requireAdminOrStaff } from "@/lib/auth"

/**
 * GET /api/staff/money?tab=all|payments|expense|finance&limit=&offset=
 *
 * Real numbers from real tables:
 *   * `transactions`     — wallet credits & debits (Paystack + transfers).
 *   * `salon_expenses`   — operating expenses (Money > Expense tab).
 *   * `salon_settings`   — virtual NUBAN displayed on the wallet card.
 *
 * Wallet maths:
 *   - availableBalance = Σ completed credits − Σ completed debits − Σ expenses
 *   - totalBalance     = Σ completed credits (gross)
 *
 * The Neon serverless tagged template doesn't support runtime SQL
 * fragment composition, so we branch on `tab` with explicit query
 * variants. They all map onto the same response row shape.
 */
export async function GET(req: Request) {
  try {
    await requireAdminOrStaff()

    const url = new URL(req.url)
    const limitRaw = Number(url.searchParams.get("limit") ?? 25)
    const offsetRaw = Number(url.searchParams.get("offset") ?? 0)
    const tab = (url.searchParams.get("tab") || "all").toLowerCase()
    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 25, 1), 100)
    const offset = Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0)

    // ---- Wallet totals --------------------------------------------
    const balanceRows = (await sql`
      SELECT
        COALESCE(SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END), 0)::float AS total_in,
        COALESCE(SUM(CASE WHEN type = 'debit'  THEN amount ELSE 0 END), 0)::float AS total_out
      FROM transactions
      WHERE status = 'completed'
    `) as any[]
    const totalIn = Number(balanceRows[0]?.total_in ?? 0)
    const txnOut = Number(balanceRows[0]?.total_out ?? 0)

    // Operating expenses reduce *available* balance but not gross.
    const expenseTotalRows = (await sql`
      SELECT COALESCE(SUM(amount), 0)::float AS total FROM salon_expenses
    `) as any[]
    const expenseTotal = Number(expenseTotalRows[0]?.total ?? 0)

    const available = Math.max(totalIn - txnOut - expenseTotal, 0)

    // ---- Virtual account from salon_settings ----------------------
    const settingsRows = (await sql`
      SELECT virtual_account_bank, virtual_account_name, virtual_account_number,
             default_branch_label
      FROM salon_settings WHERE id = 'singleton' LIMIT 1
    `) as any[]
    const s = settingsRows[0] ?? {}
    const virtualAccount = {
      bankName: s.virtual_account_bank || "Wema Bank",
      accountName: s.virtual_account_name || "Dermaspace Operations",
      accountNumber: s.virtual_account_number || "",
    }
    const defaultBranchLabel = s.default_branch_label || "Lekki Branch"

    // ---- Items list (Payments / Expense / All) --------------------
    let items: Array<{
      id: string
      reference: string | null
      type: string
      status: string
      amount: number
      paymentMethod: string | null
      description: string
      createdAt: string
    }> = []
    let total = 0

    if (tab === "expense") {
      const rows = (await sql`
        SELECT e.id, e.category, e.description, e.amount, e.paid_at,
               u.first_name, u.last_name
        FROM salon_expenses e
        LEFT JOIN users u ON u.id = e.recorded_by
        ORDER BY e.paid_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      const totalRow = (await sql`SELECT COUNT(*)::int AS total FROM salon_expenses`) as any[]
      total = Number(totalRow[0]?.total ?? 0)
      items = rows.map((r) => ({
        id: r.id,
        reference: null,
        type: "expense",
        status: "completed",
        amount: Number(r.amount ?? 0),
        paymentMethod: r.category,
        description: r.description,
        createdAt: r.paid_at,
      }))
    } else if (tab === "payments") {
      const rows = (await sql`
        SELECT t.id, t.reference, t.type, t.status, t.amount,
               t.payment_method, t.description, t.created_at,
               u.first_name, u.last_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.payment_method = 'paystack'
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      const totalRow = (await sql`
        SELECT COUNT(*)::int AS total FROM transactions WHERE payment_method = 'paystack'
      `) as any[]
      total = Number(totalRow[0]?.total ?? 0)
      items = rows.map((r) => ({
        id: r.id,
        reference: r.reference,
        type: r.type,
        status: r.status,
        amount: Number(r.amount ?? 0),
        paymentMethod: r.payment_method,
        description:
          r.description ||
          [r.first_name, r.last_name].filter(Boolean).join(" ").trim() ||
          "Paystack payment",
        createdAt: r.created_at,
      }))
    } else if (tab === "finance") {
      // Finance is the full ledger excluding pending — useful for
      // reconciliation / month-end accounting.
      const rows = (await sql`
        SELECT t.id, t.reference, t.type, t.status, t.amount,
               t.payment_method, t.description, t.created_at,
               u.first_name, u.last_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        WHERE t.status = 'completed'
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      const totalRow = (await sql`
        SELECT COUNT(*)::int AS total FROM transactions WHERE status = 'completed'
      `) as any[]
      total = Number(totalRow[0]?.total ?? 0)
      items = rows.map((r) => ({
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
      }))
    } else {
      const rows = (await sql`
        SELECT t.id, t.reference, t.type, t.status, t.amount,
               t.payment_method, t.description, t.created_at,
               u.first_name, u.last_name
        FROM transactions t
        LEFT JOIN users u ON u.id = t.user_id
        ORDER BY t.created_at DESC
        LIMIT ${limit} OFFSET ${offset}
      `) as any[]
      const totalRow = (await sql`SELECT COUNT(*)::int AS total FROM transactions`) as any[]
      total = Number(totalRow[0]?.total ?? 0)
      items = rows.map((r) => ({
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
      }))
    }

    return NextResponse.json({
      success: true,
      wallet: {
        availableBalance: available,
        totalBalance: totalIn,
        currency: "NGN",
      },
      virtualAccount,
      defaultBranchLabel,
      transactions: items,
      total,
    })
  } catch (error) {
    console.error("Staff money error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to load money data" },
      { status: 500 }
    )
  }
}

/**
 * POST /api/staff/money/expense (also exposed at /api/staff/money?action=expense)
 *
 * Records an operating expense. Body:
 *   { category: string, description: string, amount: number, receiptUrl?: string }
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdminOrStaff()
    const body = await req.json().catch(() => ({}))
    const category = String(body.category || "").trim()
    const description = String(body.description || "").trim()
    const amount = Number(body.amount)
    const receiptUrl = body.receiptUrl ? String(body.receiptUrl) : null

    if (!category || !description || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { success: false, error: "category, description and positive amount are required" },
        { status: 400 }
      )
    }

    const userId = user.id

    const rows = (await sql`
      INSERT INTO salon_expenses (category, description, amount, recorded_by, receipt_url)
      VALUES (${category}, ${description}, ${amount}, ${userId}, ${receiptUrl})
      RETURNING id, category, description, amount, paid_at
    `) as any[]

    return NextResponse.json({ success: true, expense: rows[0] })
  } catch (error) {
    console.error("Staff money POST error:", error)
    return NextResponse.json(
      { success: false, error: "Failed to record expense" },
      { status: 500 }
    )
  }
}
