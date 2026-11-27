// ---------------------------------------------------------------------------
// /api/admin/qstash/schedules
//
// Admin-only endpoint for inspecting and reconciling the QStash recurring
// schedules. Backed by `lib/qstash-schedules.ts` (declarative manifest)
// and `lib/qstash.ts` (thin client wrappers).
//
//   GET    → list everything currently registered with QStash, joined
//            against our manifest so the UI can show "expected vs.
//            actual" with a single render.
//   POST   → upsert every schedule in the manifest. Idempotent — safe
//            to hit on every deploy or as a recovery action.
//   DELETE → ?scheduleId=… to drop a single schedule (used to remove
//            stale entries left over after we change a path).
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/auth'
import {
  getCanonicalQStashOrigin,
  listSchedules,
  upsertSchedule,
  deleteSchedule,
} from '@/lib/qstash'
import { QSTASH_SCHEDULES } from '@/lib/qstash-schedules'
import { reconcileManifestWithLiveSchedules } from '@/lib/qstash-reconcile'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const live = await listSchedules()
    const { manifest, orphans } = reconcileManifestWithLiveSchedules(
      QSTASH_SCHEDULES,
      live,
      getCanonicalQStashOrigin(),
    )

    return NextResponse.json(
      { manifest, orphans },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('[admin/qstash] list failed:', err)
    return NextResponse.json(
      {
        error:
          'Failed to talk to QStash. Make sure QSTASH_TOKEN is set under Project Settings → Environment Variables.',
      },
      { status: 500 },
    )
  }
}

export async function POST() {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const results: Array<{ id: string; scheduleId?: string; error?: string }> = []
  for (const cfg of QSTASH_SCHEDULES) {
    try {
      const scheduleId = await upsertSchedule({
        path: cfg.path,
        cron: cfg.cron,
      })
      results.push({ id: cfg.id, scheduleId })
    } catch (err: any) {
      console.error(`[admin/qstash] upsert ${cfg.id} failed:`, err)
      results.push({ id: cfg.id, error: err?.message ?? 'unknown' })
    }
  }
  return NextResponse.json({ results })
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const scheduleId = new URL(req.url).searchParams.get('scheduleId')
  if (!scheduleId) {
    return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 })
  }
  await deleteSchedule(scheduleId)
  return NextResponse.json({ ok: true })
}
