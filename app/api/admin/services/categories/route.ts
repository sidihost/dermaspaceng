import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

/**
 * Create a new admin-managed category.
 *
 * POST body:
 *   { slug, title, tagline?, description?, image?, displayOrder?, isActive? }
 *
 * If `slug` matches a code-defined category, this becomes an OVERRIDE
 * row (override_for_slug = slug). Otherwise it's a brand-new custom
 * category that the public site picks up via the merger.
 */
export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const slug = String(body.slug ?? '').trim().toLowerCase()
  const title = String(body.title ?? '').trim()
  const tagline = String(body.tagline ?? '').trim()
  const description = String(body.description ?? '').trim()
  const image = body.image ? String(body.image).trim() : null
  const displayOrder = Number.isFinite(Number(body.displayOrder))
    ? Number(body.displayOrder)
    : 100
  const isActive = body.isActive === false ? false : true

  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase letters, numbers, and dashes.' },
      { status: 400 },
    )
  }
  if (!title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  }

  const isOverride = SERVICES_CATALOG.some((c) => c.slug === slug)

  try {
    const rows = (await sql`
      INSERT INTO service_categories_ext
        (slug, title, tagline, description, image_url, display_order,
         is_active, override_for_slug, created_by, updated_by)
      VALUES
        (${slug}, ${title}, ${tagline}, ${description}, ${image},
         ${displayOrder}, ${isActive},
         ${isOverride ? slug : null}, ${admin.id}, ${admin.id})
      RETURNING id
    `) as unknown as Array<{ id: string }>
    return NextResponse.json({ ok: true, id: rows[0]?.id, slug, isOverride })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Insert failed'
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json(
        { error: 'A category with that slug already exists.' },
        { status: 409 },
      )
    }
    console.error('[admin/services/categories] POST', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
