import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireServiceManager } from '@/lib/auth'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

/**
 * Update or delete a category by slug.
 *
 * PATCH — upserts an extension row for the slug. Editable fields:
 *   { title, tagline, description, image, displayOrder, isActive }
 *
 *   • If the slug exists in SERVICES_CATALOG, the row is stored as an
 *     OVERRIDE (override_for_slug = slug).
 *   • Otherwise it's a custom category and we update its row in place.
 *
 * DELETE — soft delete. Sets is_active = false on the matching row,
 * creating a "disabled" override if one didn't exist yet. Public
 * surfaces stop showing the category but the row stays for audit.
 */

async function loadAdminOr401() {
  try {
    return await requireServiceManager()
  } catch {
    return null
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const admin = await loadAdminOr401()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await ctx.params
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const isCodeDefined = SERVICES_CATALOG.some((c) => c.slug === slug)
  const codeRef = isCodeDefined
    ? SERVICES_CATALOG.find((c) => c.slug === slug)!
    : null

  const title = body.title !== undefined ? String(body.title).trim() : codeRef?.title ?? ''
  const tagline = body.tagline !== undefined ? String(body.tagline) : codeRef?.tagline ?? ''
  const description =
    body.description !== undefined ? String(body.description) : codeRef?.description ?? ''
  const image = body.image !== undefined ? String(body.image) : codeRef?.image ?? ''
  const displayOrder = Number.isFinite(Number(body.displayOrder))
    ? Number(body.displayOrder)
    : null
  const isActive = body.isActive === undefined ? true : body.isActive !== false

  if (!title) {
    return NextResponse.json({ error: 'Title is required.' }, { status: 400 })
  }

  try {
    // Check if a DB row already exists for this slug.
    const existing = (await sql`
      SELECT id FROM service_categories_ext WHERE slug = ${slug} LIMIT 1
    `) as unknown as Array<{ id: string }>

    if (existing.length === 0) {
      await sql`
        INSERT INTO service_categories_ext
          (slug, title, tagline, description, image_url, display_order,
           is_active, override_for_slug, created_by, updated_by)
        VALUES
          (${slug}, ${title}, ${tagline}, ${description},
           ${image || null},
           ${displayOrder ?? 100}, ${isActive},
           ${isCodeDefined ? slug : null}, ${admin.id}, ${admin.id})
      `
    } else {
      await sql`
        UPDATE service_categories_ext
        SET title = ${title},
            tagline = ${tagline},
            description = ${description},
            image_url = ${image || null},
            display_order = COALESCE(${displayOrder}, display_order),
            is_active = ${isActive},
            updated_by = ${admin.id},
            updated_at = NOW()
        WHERE slug = ${slug}
      `
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/services/categories] PATCH', err)
    const msg = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const admin = await loadAdminOr401()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { slug } = await ctx.params
  if (!slug) {
    return NextResponse.json({ error: 'Missing slug' }, { status: 400 })
  }

  const isCodeDefined = SERVICES_CATALOG.some((c) => c.slug === slug)
  const codeRef = isCodeDefined
    ? SERVICES_CATALOG.find((c) => c.slug === slug)!
    : null

  try {
    const existing = (await sql`
      SELECT id FROM service_categories_ext WHERE slug = ${slug} LIMIT 1
    `) as unknown as Array<{ id: string }>

    if (existing.length === 0) {
      // Custom category that hasn't been persisted yet shouldn't reach
      // this branch, but if it does, return a 404. Code categories get
      // a "disable" override row so the merger removes them.
      if (!isCodeDefined) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await sql`
        INSERT INTO service_categories_ext
          (slug, title, tagline, description, image_url, display_order,
           is_active, override_for_slug, created_by, updated_by)
        VALUES
          (${slug}, ${codeRef!.title}, ${codeRef!.tagline}, ${codeRef!.description},
           ${codeRef!.image}, 100, FALSE, ${slug}, ${admin.id}, ${admin.id})
      `
    } else if (isCodeDefined) {
      // Code-defined: keep the row, just deactivate.
      await sql`
        UPDATE service_categories_ext
        SET is_active = FALSE,
            updated_by = ${admin.id},
            updated_at = NOW()
        WHERE slug = ${slug}
      `
    } else {
      // Pure custom: hard-delete (with cascade to its treatments).
      await sql`DELETE FROM service_treatments_ext WHERE category_slug = ${slug}`
      await sql`DELETE FROM service_categories_ext WHERE slug = ${slug}`
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/services/categories] DELETE', err)
    const msg = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
