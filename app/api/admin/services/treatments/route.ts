import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireServiceManager } from '@/lib/auth'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

/**
 * Create a new treatment under an existing category (code or custom).
 *
 * POST body:
 *   {
 *     categorySlug,
 *     slug,
 *     name,
 *     durationMinutes,
 *     priceNaira,
 *     description?,
 *     popular?,
 *     concerns?: string[],
 *     displayOrder?,
 *     isActive?,
 *   }
 *
 * If `slug` matches an existing code-defined treatment in this
 * category, the new row is stored as an OVERRIDE so the merger
 * replaces the code values without orphaning the original entry.
 */
export async function POST(req: NextRequest) {
  let admin
  try {
    admin = await requireServiceManager()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const categorySlug = String(body.categorySlug ?? '').trim().toLowerCase()
  const slug = String(body.slug ?? '').trim().toLowerCase()
  const name = String(body.name ?? '').trim()
  const durationMinutes = Number(body.durationMinutes)
  const priceNaira = Number(body.priceNaira)
  const description = String(body.description ?? '').trim()
  const popular = body.popular === true
  const concerns = Array.isArray(body.concerns)
    ? (body.concerns as unknown[]).map(String)
    : []
  const displayOrder = Number.isFinite(Number(body.displayOrder))
    ? Number(body.displayOrder)
    : 100
  const isActive = body.isActive === false ? false : true

  if (!categorySlug || !slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return NextResponse.json(
      { error: 'A valid category and slug are required.' },
      { status: 400 },
    )
  }
  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json(
      { error: 'Duration must be a positive number of minutes.' },
      { status: 400 },
    )
  }
  if (!Number.isFinite(priceNaira) || priceNaira < 0) {
    return NextResponse.json(
      { error: 'Price must be zero or higher (in Naira).' },
      { status: 400 },
    )
  }

  // Detect override: does this category exist in code AND already
  // contain a treatment with this slug?
  const codeCat = SERVICES_CATALOG.find((c) => c.slug === categorySlug)
  const isOverride = !!codeCat && codeCat.treatments.some((t) => t.id === slug)

  try {
    const rows = (await sql`
      INSERT INTO service_treatments_ext
        (category_slug, slug, name, duration_minutes, price_naira,
         description, popular, concerns, is_active, display_order,
         override_for_slug, created_by, updated_by)
      VALUES
        (${categorySlug}, ${slug}, ${name}, ${Math.round(durationMinutes)},
         ${Math.round(priceNaira)}, ${description}, ${popular},
         ${JSON.stringify(concerns)}::jsonb, ${isActive}, ${displayOrder},
         ${isOverride ? slug : null}, ${admin.id}, ${admin.id})
      RETURNING id
    `) as unknown as Array<{ id: string }>
    return NextResponse.json({ ok: true, id: rows[0]?.id, isOverride })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Insert failed'
    if (/unique|duplicate/i.test(msg)) {
      return NextResponse.json(
        { error: 'A treatment with that slug already exists in this category.' },
        { status: 409 },
      )
    }
    console.error('[admin/services/treatments] POST', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
