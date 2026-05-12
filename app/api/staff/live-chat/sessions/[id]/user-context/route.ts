import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdminOrStaff } from '@/lib/auth'
import { getSessionById } from '@/lib/live-chat'

// ---------------------------------------------------------------------------
// GET /api/staff/live-chat/sessions/[id]/user-context
// ---------------------------------------------------------------------------
// Read-only view of the SESSION OWNER's account data, scoped to what a
// front-desk representative needs to triage a payment / booking question:
//
//   * profile (name, email, phone, joined-at)
//   * wallet balance
//   * last 8 transactions (type, amount, status, method, created_at)
//   * last 5 bookings (reference, location, date, status, total_price)
//   * last 3 support tickets (id, category, subject, status)
//
// We DO NOT expose: password hashes, sessions, 2fa secrets, passkeys, AI
// chat logs, internal admin notes. Staff are read-only on this endpoint —
// the actual mutations live behind admin-only routes.
// ---------------------------------------------------------------------------

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: Params) {
  let me
  try {
    me = await requireAdminOrStaff()
  } catch {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const session = await getSessionById(id)
  if (!session) return NextResponse.json({ error: 'not found' }, { status: 404 })

  // Staff can only see context for sessions assigned to them or in the
  // queue. Admins see anything.
  if (me.role !== 'admin') {
    const assigned = session.assigned_staff_id
    if (assigned && assigned !== me.id) {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
    if (!assigned && session.status !== 'waiting') {
      return NextResponse.json({ error: 'not yours' }, { status: 403 })
    }
  }

  const userId = session.user_id

  const userRows = await sql`
    SELECT id, first_name, last_name, email, phone, avatar_url, created_at,
           email_verified, is_active
      FROM users
     WHERE id = ${userId}
  `
  const user = userRows[0]
  if (!user) return NextResponse.json({ error: 'user gone' }, { status: 404 })

  // Wallet balance (lazy-created table — first-time users have no row;
  // surface 0 instead of failing).
  let walletBalance = 0
  let walletCurrency = 'NGN'
  try {
    const walletRows = await sql`
      SELECT balance, currency FROM wallets WHERE user_id = ${userId}
    `
    if (walletRows.length > 0) {
      walletBalance = Number(walletRows[0].balance ?? 0)
      walletCurrency = (walletRows[0].currency as string) || 'NGN'
    }
  } catch {
    /* wallet table may not exist on a brand-new account — keep defaults */
  }

  let transactions: unknown[] = []
  try {
    transactions = await sql`
      SELECT id, type, amount, status, payment_method, description, created_at
        FROM transactions
       WHERE user_id = ${userId}
       ORDER BY created_at DESC
       LIMIT 8
    `
  } catch {
    /* legacy schema — no transactions table */
  }

  let bookings: unknown[] = []
  try {
    bookings = await sql`
      SELECT id, booking_reference, location_name, appointment_date,
             appointment_time, status, total_price_kobo AS total_price, created_at
        FROM bookings
       WHERE user_id = ${userId}
       ORDER BY appointment_date DESC, appointment_time DESC
       LIMIT 5
    `
  } catch {
    /* schema variant — skip silently */
  }

  let tickets: unknown[] = []
  try {
    tickets = await sql`
      SELECT ticket_id, category, subject, priority, status, created_at
        FROM support_tickets
       WHERE user_id = ${userId}
       ORDER BY created_at DESC
       LIMIT 3
    `
  } catch {
    /* schema variant — skip silently */
  }

  return NextResponse.json({
    user: {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone,
      avatarUrl: user.avatar_url,
      memberSince: user.created_at,
      emailVerified: user.email_verified,
      isActive: user.is_active,
    },
    wallet: {
      balance: walletBalance,
      currency: walletCurrency,
      formatted: new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: walletCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(walletBalance),
    },
    transactions,
    bookings,
    tickets,
  })
}
