import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireServiceManager } from '@/lib/auth'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

/**
 * Update or delete a treatment by (categorySlug, slug).
 *
 *   • Code-defined treatment: a new override row is upserted in
 *     `service_treatments_ext` with override_for_slug = slug.
 *   • Custom treatment: the row is updated/deleted in place.
 *   • Deleting a code-defined treatment writes a "disabled" override
 *     so the merger removes it without forgetting it ever existed.
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
  ctx: { params: Promise<{ categorySlug: string; slug: string }> },
) {
  const admin = await loadAdminOr401()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categorySlug, slug } = await ctx.params

  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const codeCat = SERVICES_CATALOG.find((c) => c.slug === categorySlug)
  const codeT = codeCat?.treatments.find((t) => t.id === slug)
  const isCodeDefined = !!codeT

  const name = body.name !== undefined ? String(body.name).trim() : codeT?.name ?? ''
  const durationMinutes = Number.isFinite(Number(body.durationMinutes))
    ? Math.max(1, Math.round(Number(body.durationMinutes)))
    : codeT
      ? parseInt((codeT.duration.match(/\d+/)?.[0] ?? '60'), 10)
      : 60
  const priceNaira = Number.isFinite(Number(body.priceNaira))
    ? Math.max(0, Math.round(Number(body.priceNaira)))
    : codeT?.priceFrom ?? 0
  const description =
    body.description !== undefined ? String(body.description) : codeT?.description ?? ''
  const popular = body.popular === undefined ? !!codeT?.popular : body.popular === true
  const concerns = Array.isArray(body.concerns)
    ? (body.concerns as unknown[]).map(String)
    : codeT?.concerns ?? []
  // `availableLocations` is admin-managed only — code treatments default
  // to "every clinic" (empty array). Passing `undefined` leaves the
  // existing DB value untouched on PATCH; passing an array (even empty)
  // overwrites it.
  const availableLocationsInput = Array.isArray(body.availableLocations)
    ? (body.availableLocations as unknown[])
        .map((s) => String(s).trim().toLowerCase())
        .filter(Boolean)
    : null
  const availableLocationsForInsert = availableLocationsInput ?? []
  const displayOrder = Number.isFinite(Number(body.displayOrder))
    ? Number(body.displayOrder)
    : null
  const isActive = body.isActive === undefined ? true : body.isActive !== false

  if (!name) {
    return NextResponse.json({ error: 'Name is required.' }, { status: 400 })
  }

  try {
    // Locate any existing extension row — either the override (matches
    // override_for_slug) or the in-place row (matches slug + null
    // override).
    const existing = (await sql`
      SELECT id FROM service_treatments_ext
      WHERE category_slug = ${categorySlug}
        AND (
          (override_for_slug IS NOT NULL AND override_for_slug = ${slug})
          OR (override_for_slug IS NULL AND slug = ${slug})
        )
      LIMIT 1
    `) as unknown as Array<{ id: string }>

    if (existing.length === 0) {
      await sql`
        INSERT INTO service_treatments_ext
          (category_slug, slug, name, duration_minutes, price_naira,
           description, popular, concerns, is_active, display_order,
           override_for_slug, available_locations, created_by, updated_by)
        VALUES
          (${categorySlug}, ${slug}, ${name}, ${durationMinutes},
           ${priceNaira}, ${description}, ${popular},
           ${JSON.stringify(concerns)}::jsonb, ${isActive},
           ${displayOrder ?? 100},
           ${isCodeDefined ? slug : null},
           ${availableLocationsForInsert.length > 0 ? availableLocationsForInsert : null},
           ${admin.id}, ${admin.id})
      `
    } else {
      // available_locations: only overwrite when the client actually
      // sent the field. Sending `[]` clears the restriction (i.e.
      // available everywhere), sending `['vi']` restricts to VI, and
      // omitting the key entirely leaves the existing value alone.
      if (availableLocationsInput === null) {
        await sql`
          UPDATE service_treatments_ext
          SET name = ${name},
              duration_minutes = ${durationMinutes},
              price_naira = ${priceNaira},
              description = ${description},
              popular = ${popular},
              concerns = ${JSON.stringify(concerns)}::jsonb,
              is_active = ${isActive},
              display_order = COALESCE(${displayOrder}, display_order),
              updated_by = ${admin.id},
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
      } else {
        const newLocs =
          availableLocationsInput.length > 0 ? availableLocationsInput : null
        await sql`
          UPDATE service_treatments_ext
          SET name = ${name},
              duration_minutes = ${durationMinutes},
              price_naira = ${priceNaira},
              description = ${description},
              popular = ${popular},
              concerns = ${JSON.stringify(concerns)}::jsonb,
              is_active = ${isActive},
              display_order = COALESCE(${displayOrder}, display_order),
              available_locations = ${newLocs},
              updated_by = ${admin.id},
              updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
      }
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/services/treatments] PATCH', err)
    const msg = err instanceof Error ? err.message : 'Update failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ categorySlug: string; slug: string }> },
) {
  const admin = await loadAdminOr401()
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { categorySlug, slug } = await ctx.params

  const codeCat = SERVICES_CATALOG.find((c) => c.slug === categorySlug)
  const codeT = codeCat?.treatments.find((t) => t.id === slug)
  const isCodeDefined = !!codeT

  try {
    const existing = (await sql`
      SELECT id, override_for_slug FROM service_treatments_ext
      WHERE category_slug = ${categorySlug}
        AND (
          (override_for_slug IS NOT NULL AND override_for_slug = ${slug})
          OR (override_for_slug IS NULL AND slug = ${slug})
        )
      LIMIT 1
    `) as unknown as Array<{ id: string; override_for_slug: string | null }>

    if (isCodeDefined) {
      // Soft delete via override row.
      if (existing.length === 0) {
        const dur = parseInt((codeT!.duration.match(/\d+/)?.[0] ?? '60'), 10)
        await sql`
          INSERT INTO service_treatments_ext
            (category_slug, slug, name, duration_minutes, price_naira,
             description, popular, concerns, is_active, display_order,
             override_for_slug, created_by, updated_by)
          VALUES
            (${categorySlug}, ${slug}, ${codeT!.name}, ${dur},
             ${codeT!.priceFrom}, ${codeT!.description},
             ${!!codeT!.popular},
             ${JSON.stringify(codeT!.concerns ?? [])}::jsonb,
             FALSE, 100, ${slug}, ${admin.id}, ${admin.id})
        `
      } else {
        await sql`
          UPDATE service_treatments_ext
          SET is_active = FALSE, updated_by = ${admin.id}, updated_at = NOW()
          WHERE id = ${existing[0].id}
        `
      }
    } else {
      // Pure custom treatment: hard delete.
      if (existing.length === 0) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      await sql`DELETE FROM service_treatments_ext WHERE id = ${existing[0].id}`
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[admin/services/treatments] DELETE', err)
    const msg = err instanceof Error ? err.message : 'Delete failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
