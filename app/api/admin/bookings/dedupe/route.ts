import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// ---------------------------------------------------------------------------
// POST /api/admin/bookings/dedupe
// ---------------------------------------------------------------------------
// Removes duplicate booking rows in one shot. Two bookings are
// considered duplicates when they share *all* of:
//   user_id, location_id, appointment_date, appointment_time
//
// We keep ONE survivor per group — the oldest paid row if any,
// otherwise the oldest pending/confirmed row. Every other row in
// the group is hard-deleted (along with its booking_services and
// staff_booking_access children).
//
// Paid duplicates are surfaced but never deleted unless `?force=true`
// is passed — losing a paid row silently would mean losing money owed.
//
// Returns:
//   {
//     groups: number          // distinct dup groups found
//     deleted: number         // rows removed
//     skipped_paid: number    // rows we refused to touch (no force)
//     details: Array<{ kept, removed[] }>
//   }
// ---------------------------------------------------------------------------
export async function POST(req: Request) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(req.url)
  const force = url.searchParams.get('force') === 'true'
  const dryRun = url.searchParams.get('dry_run') === 'true'

  const groupsRaw = (await sql`
    SELECT user_id, location_id, appointment_date, appointment_time,
           COUNT(*)::int AS n,
           ARRAY_AGG(json_build_object(
             'id', id,
             'booking_reference', booking_reference,
             'payment_status', payment_status,
             'status', status,
             'created_at', created_at
           ) ORDER BY created_at ASC) AS rows
      FROM bookings
     GROUP BY user_id, location_id, appointment_date, appointment_time
    HAVING COUNT(*) > 1
  `) as any[]

  let deleted = 0
  let skippedPaid = 0
  const details: Array<{ kept: string; removed: string[]; skipped_paid: string[] }> = []

  for (const g of groupsRaw) {
    const rows = g.rows as Array<{
      id: string
      booking_reference: string
      payment_status: string
      status: string
      created_at: string
    }>

    // Choose survivor: oldest paid wins, else oldest row.
    const paid = rows.filter((r) => r.payment_status === 'paid')
    const survivor = (paid[0] ?? rows[0])!

    const toRemove: string[] = []
    const skipped: string[] = []
    for (const r of rows) {
      if (r.id === survivor.id) continue
      if (r.payment_status === 'paid' && !force) {
        skipped.push(r.booking_reference)
        skippedPaid += 1
        continue
      }
      toRemove.push(r.id)
    }

    if (!dryRun && toRemove.length) {
      // Cascade-style cleanup. We can't rely on FK CASCADE because
      // staff_booking_access doesn't have one declared.
      await sql`DELETE FROM booking_services WHERE booking_id = ANY(${toRemove}::text[])`
      await sql`DELETE FROM staff_booking_access WHERE booking_id = ANY(${toRemove}::text[])`
      const res = (await sql`DELETE FROM bookings WHERE id = ANY(${toRemove}::text[]) RETURNING id`) as any[]
      deleted += res.length
    } else if (dryRun) {
      deleted += toRemove.length
    }

    details.push({
      kept: survivor.booking_reference,
      removed: rows
        .filter((r) => toRemove.includes(r.id))
        .map((r) => r.booking_reference),
      skipped_paid: skipped,
    })
  }

  return NextResponse.json({
    ok: true,
    dry_run: dryRun,
    groups: groupsRaw.length,
    deleted,
    skipped_paid: skippedPaid,
    details,
  })
}
