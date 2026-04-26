import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { getAllFlags, setFeatureEnabled, invalidateFeatureFlagCache } from '@/lib/feature-flags'
import { sql } from '@/lib/db'

export async function GET() {
  try {
    await requireAdmin()
    const flags = await getAllFlags(true)
    return NextResponse.json({ flags })
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const { key, enabled, label, description } = await request.json()
    if (!key || typeof key !== 'string') {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 })
    }
    if (typeof enabled === 'boolean') {
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
    const admin = await requireAdmin()
    const { key, label, description, scope = 'site', enabled = true } = await request.json()
    if (!key || !label) {
      return NextResponse.json({ error: 'key and label are required' }, { status: 400 })
    }
    await sql`
      INSERT INTO feature_flags (key, label, description, scope, enabled, updated_by)
      VALUES (${key}, ${label}, ${description ?? null}, ${scope}, ${enabled}, ${admin.id})
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
