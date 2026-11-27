import { NextResponse, type NextRequest } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { sql } from '@/lib/db'

export interface SeenBaselineRecord {
  count: number
  date?: string
}

export type SeenBaselinesMap = Record<string, SeenBaselineRecord>

const KEY_PREFIX = 'admin.badgeBaselines.'

const ALLOWED_SURFACES = new Set([
  'tickets',
  'consultations',
  'live-chat',
  'users',
  'bookings',
  'feedback',
  'newsletter',
])

async function readBaselines(adminId: string): Promise<SeenBaselinesMap> {
  try {
    const rows = (await sql`
      SELECT value FROM app_settings WHERE key = ${KEY_PREFIX + adminId} LIMIT 1
    `) as Array<{ value: unknown }>
    const raw = rows[0]?.value
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
    const out: SeenBaselinesMap = {}
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (!ALLOWED_SURFACES.has(k) || !v || typeof v !== 'object') continue
      const rec = v as { count?: unknown; date?: unknown }
      const count = Number(rec.count)
      if (!Number.isFinite(count) || count < 0) continue
      out[k] = {
        count: Math.floor(count),
        ...(typeof rec.date === 'string' && rec.date ? { date: rec.date.slice(0, 10) } : {}),
      }
    }
    return out
  } catch (err) {
    console.warn('[admin/badges/seen] read failed:', err)
    return {}
  }
}

export async function GET() {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const baselines = await readBaselines(admin.id)
  return NextResponse.json(
    { baselines },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}

export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: { surface?: unknown; count?: unknown; date?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const surface = typeof body.surface === 'string' ? body.surface.trim() : ''
  const rawCount = Number(body.count)
  if (!ALLOWED_SURFACES.has(surface) || !Number.isFinite(rawCount) || rawCount < 0) {
    return NextResponse.json({ error: 'Invalid surface or count' }, { status: 400 })
  }

  const safeCount = Math.floor(rawCount)
  const dateStr =
    typeof body.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.date.trim())
      ? body.date.trim()
      : undefined

  const existing = await readBaselines(admin.id)
  const next: SeenBaselinesMap = {
    ...existing,
    [surface]: {
      count: safeCount,
      ...(dateStr ? { date: dateStr } : {}),
    },
  }

  try {
    await sql`
      INSERT INTO app_settings (key, value, updated_by, updated_at)
      VALUES (${KEY_PREFIX + admin.id}, ${JSON.stringify(next)}::jsonb, ${admin.id}, NOW())
      ON CONFLICT (key) DO UPDATE
        SET value = EXCLUDED.value,
            updated_by = EXCLUDED.updated_by,
            updated_at = NOW()
    `
  } catch (err) {
    console.warn('[admin/badges/seen] write failed:', err)
    return NextResponse.json({ error: 'Failed to save baseline' }, { status: 500 })
  }

  return NextResponse.json(
    { baselines: next },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
