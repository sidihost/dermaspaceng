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
import { requireAdmin } from '@/lib/auth'
import {
  listSchedules,
  upsertSchedule,
  deleteSchedule,
} from '@/lib/qstash'
import { QSTASH_SCHEDULES } from '@/lib/qstash-schedules'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const live = await listSchedules()

    // Build a path-keyed lookup off the live data so we can mark each
    // manifest entry as registered/missing in O(n).
    const livePathMap = new Map<string, (typeof live)[number]>()
    for (const s of live) {
      try {
        const u = new URL(s.destination)
        livePathMap.set(u.pathname, s)
      } catch {
        // Skip malformed destinations rather than crashing the page.
      }
    }

    const manifest = QSTASH_SCHEDULES.map((cfg) => {
      const live = livePathMap.get(cfg.path)
      return {
        ...cfg,
        registered: !!live,
        scheduleId: live?.scheduleId ?? null,
        liveCron: live?.cron ?? null,
        cronInSync: live?.cron === cfg.cron,
        paused: live?.paused ?? false,
        createdAt: live?.createdAt ?? null,
      }
    })

    // Anything live that ISN'T in the manifest is stale (e.g. a path was
    // renamed in code). Surface it so admins can prune via DELETE.
    const known = new Set(QSTASH_SCHEDULES.map((c) => c.path))
    const orphans = live
      .filter((s) => {
        try {
          return !known.has(new URL(s.destination).pathname)
        } catch {
          return true
        }
      })
      .map((s) => ({
        scheduleId: s.scheduleId,
        destination: s.destination,
        cron: s.cron,
        paused: s.paused,
        createdAt: s.createdAt,
      }))

    return NextResponse.json({ manifest, orphans })
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
    await requireAdmin()
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
    await requireAdmin()
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
