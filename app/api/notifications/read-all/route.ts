import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { query } from '@/lib/db'
import { resolveReadColumn } from '@/lib/notifications-column'

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // The "read" column is named either `read` or `is_read` depending on
  // when the database was first set up — see lib/notifications-column.ts.
  //
  // We scope the bulk-read to the audience (customer / admin) the
  // caller is currently looking at so an operator who hits "Mark all
  // read" on the admin bell doesn't accidentally also clear their
  // unrelated customer notifications, and vice versa.
  const requested = request.nextUrl.searchParams.get('audience')
  const isOperator = user.role === 'admin' || user.role === 'staff'
  const audience: 'admin' | 'customer' =
    requested === 'admin' && isOperator ? 'admin' : 'customer'
  try {
    const col = await resolveReadColumn()
    await query(
      `UPDATE user_notifications SET "${col}" = TRUE
       WHERE user_id = $1
         AND "${col}" = FALSE
         AND COALESCE(audience, 'customer') = $2`,
      [user.id, audience],
    )
  } catch (err) {
    console.error('[notifications/read-all] failed', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

