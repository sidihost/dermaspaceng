import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'
import { getCurrentUser, getUserById } from '@/lib/auth'
import { formatCurrency } from '@/lib/wallet'

/**
 * Admin transaction detail API.
 *
 * Powers /admin/transactions/[id] — the dedicated page that replaces
 * the old modal overlay. We pull the single transaction and hydrate
 * the user info the same way the list route does, so the detail page
 * can reuse the same shape.
 */
const sql = neon(process.env.DATABASE_URL!)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'admin')
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { id } = await params
    const rows = await sql`
      SELECT * FROM transactions WHERE id = ${id} LIMIT 1
    `
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const tx = rows[0] as Record<string, unknown>
    const txUser = await getUserById(Number(tx.user_id))
    return NextResponse.json({
      transaction: {
        ...tx,
        formattedAmount: formatCurrency(Number(tx.amount), String(tx.currency || 'NGN')),
        formattedDate: new Date(String(tx.created_at)).toLocaleDateString('en-NG', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        user: txUser
          ? {
              id: txUser.id,
              name: `${txUser.first_name} ${txUser.last_name}`,
              email: txUser.email,
            }
          : null,
      },
    })
  } catch (error) {
    console.error('[v0] Get transaction detail error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch transaction'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
