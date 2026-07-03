import { NextRequest, NextResponse } from 'next/server'
// Feature flag controls are platform-level — restricted to the
// developer / Sidihost super admin so day-to-day admins can't flip
// public-facing toggles by accident.
import { requireSuperAdmin } from '@/lib/auth'
import {
  getAllFlags,
  setFeatureEnabled,
  setFeatureVisibility,
  invalidateFeatureFlagCache,
  type FeatureVisibility,
} from '@/lib/feature-flags'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    await requireSuperAdmin()
    const flags = await getAllFlags(true)
    return NextResponse.json({ flags })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin()
    const { key, enabled, visibility, label, description } = await request.json()
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    }
    // Preferred: the 3-way visibility control (Off / Admin-only / Everyone).
    if (typeof visibility === 'string') {
      if (!['on', 'preview', 'off'].includes(visibility)) {
        return NextResponse.json({ error: 'Invalid visibility' }, { status: 400 })
      }
      await setFeatureVisibility(key, visibility as FeatureVisibility, admin.id)
    } else if (typeof enabled === 'boolean') {
      // Backward-compatible boolean toggle.
      await setFeatureEnabled(key, enabled, admin.id)
    }
    if (typeof label === 'string' || typeof description === 'string') {
      await sql`
        UPDATE feature_flags
        SET label = COALESCE(${label ?? null}, label),
            description = COALESCE(${description ?? null}, description),
            updated_by = ${admin.id},
            updated_at = NOW()
        WHERE key = ${key}
      `
      await invalidateFeatureFlagCache()
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/feature-flags PATCH]', err)
    return NextResponse.json({ error: 'Failed to update flag' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin()
    const { key, label, description, scope = 'site', enabled = true } = await request.json()
    if (!key || !label) {
      return NextResponse.json({ error: 'key and label are required' }, { status: 400 })
    }
    await sql`
      INSERT INTO feature_flags (key, label, description, scope, enabled, visibility, updated_by)
      VALUES (${key}, ${label}, ${description ?? null}, ${scope}, ${enabled}, ${enabled ? 'on' : 'off'}, ${admin.id})
      ON CONFLICT (key) DO UPDATE SET
        label = EXCLUDED.label,
        description = EXCLUDED.description,
        scope = EXCLUDED.scope,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `
    await invalidateFeatureFlagCache()
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/feature-flags POST]', err)
    return NextResponse.json({ error: 'Failed to create flag' }, { status: 500 })
  }
}
