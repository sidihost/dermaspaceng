import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { getCurrentUser } from '@/lib/auth'

// ---------------------------------------------------------------------------
// GET /api/live-chat/snapshot
// ---------------------------------------------------------------------------
// Lightweight read used by the user-side LiveChatOverlay's "Your snapshot"
// panel. Mirrors what the staff representative can see on the other side
// (wallet balance, upcoming bookings) so the user has full transparency
// about what's being shared.
// ---------------------------------------------------------------------------
export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ user: null })

  let walletBalance = 0
  let walletCurrency = 'NGN'
  try {
    const rows = await sql`
      SELECT balance, currency FROM wallets WHERE user_id = ${user.id}
    `
    if (rows.length > 0) {
      walletBalance = Number(rows[0].balance ?? 0)
      walletCurrency = (rows[0].currency as string) || 'NGN'
    }
  } catch {
    /* lazy table — defaults are fine */
  }

  let upcoming: Array<{
    booking_reference: string
    location_name: string
    appointment_date: string
    status: string
  }> = []
  try {
    upcoming = (await sql`
      SELECT booking_reference, location_name, appointment_date, status
        FROM bookings
       WHERE user_id = ${user.id}
         AND appointment_date >= CURRENT_DATE
         AND status IN ('pending', 'confirmed')
       ORDER BY appointment_date ASC
       LIMIT 3
    `) as typeof upcoming
  } catch {
    /* schema variant — surface zero bookings */
  }

  return NextResponse.json({
    user: {
      firstName: user.first_name,
      avatarUrl: null,
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
    bookings: upcoming,
  })
}
