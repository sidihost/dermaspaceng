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
  deleteSchedulesBatch,
} from '@/lib/qstash'
import { QSTASH_SCHEDULES } from '@/lib/qstash-schedules'
import {
  collectOrphanScheduleIds,
  reconcileManifestWithLiveSchedules,
} from '@/lib/qstash-reconcile'
import { isPreviewDeploymentEnv } from '@/lib/push-origin'

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

  if (isPreviewDeploymentEnv()) {
    return NextResponse.json(
      { error: 'Schedule sync is disabled on preview deployments.' },
      { status: 400 },
    )
  }

  const canonicalOrigin = getCanonicalQStashOrigin()
  let existing
  try {
    existing = await listSchedules()
  } catch (err) {
    console.error('[admin/qstash] sync list failed:', err)
    return NextResponse.json(
      { error: 'Failed to reach QStash. Check QSTASH_TOKEN and try again.' },
      { status: 500 },
    )
  }

  // Step 1: Upsert every manifest schedule (wipes all stale/drifted/preview
  // schedules sharing the same pathname before creating the canonical one).
  const results: Array<{ id: string; scheduleId?: string; error?: string }> = []
  for (const cfg of QSTASH_SCHEDULES) {
    try {
      const scheduleId = await upsertSchedule({
        path: cfg.path,
        cron: cfg.cron,
        existingSchedules: existing,
      })
      results.push({ id: cfg.id, scheduleId })
    } catch (err: any) {
      console.error(`[admin/qstash] upsert ${cfg.id} failed:`, err)
      results.push({ id: cfg.id, error: err?.message ?? 'unknown' })
    }
  }

  // Step 2: Automatically prune any remaining orphan/preview/duplicate
  // schedules (such as legacy *.vercel.app schedules from older deploys).
  let prunedOrphans = 0
  let prunedFailed = 0
  try {
    const afterUpsert = await listSchedules()
    const orphanIds = collectOrphanScheduleIds(
      QSTASH_SCHEDULES,
      afterUpsert,
      canonicalOrigin,
    )
    if (orphanIds.length > 0) {
      const pruneRes = await deleteSchedulesBatch(orphanIds)
      prunedOrphans = pruneRes.deleted
      prunedFailed = pruneRes.failed
    }
  } catch (err) {
    console.warn('[admin/qstash] orphan prune after sync failed:', err)
  }

  return NextResponse.json(
    { results, prunedOrphans, prunedFailed },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function DELETE(req: NextRequest) {
  try {
    await requireSuperAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const allOrphans = params.get('allOrphans') === '1'

  if (allOrphans) {
    try {
      const live = await listSchedules()
      const orphanIds = collectOrphanScheduleIds(
        QSTASH_SCHEDULES,
        live,
        getCanonicalQStashOrigin(),
      )
      const { deleted, failed } = await deleteSchedulesBatch(orphanIds)
      return NextResponse.json(
        { ok: true, deleted, failed },
        { headers: { 'Cache-Control': 'no-store' } },
      )
    } catch (err) {
      console.error('[admin/qstash] bulk orphan delete failed:', err)
      return NextResponse.json(
        { error: 'Failed to remove orphan schedules' },
        { status: 500 },
      )
    }
  }

  const scheduleId = params.get('scheduleId')
  if (!scheduleId) {
    return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 })
  }
  await deleteSchedule(scheduleId)
  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
