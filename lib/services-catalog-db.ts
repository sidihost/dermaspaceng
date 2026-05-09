// ---------------------------------------------------------------------------
// lib/services-catalog-db.ts
//
// Merges the code-shipped `SERVICES_CATALOG` (lib/services-catalog.ts)
// with admin-managed extensions persisted in
// `service_categories_ext` and `service_treatments_ext`
// (scripts/470-service-catalog-extensions.sql).
//
// This is a SERVER module — it imports `sql` and so cannot be bundled
// to the client. Client surfaces (booking wizard, services-step) must
// fetch through `/api/services-catalog` instead.
//
// Merge rules
// -----------
//   • Categories: code rows are the baseline. A DB row with the same
//     slug REPLACES the code row (allowing admins to retitle / repath
//     existing categories). DB rows with new slugs are appended.
//     `is_active = FALSE` on a DB row removes the category entirely.
//
//   • Treatments: same rules, scoped per category. A DB row with
//     (category_slug, override_for_slug) matching a code treatment
//     replaces it; otherwise it's appended. `is_active = FALSE`
//     removes the treatment from the merged result.
//
//   • Display order: DB `display_order` wins when present, falling
//     back to the original code position.
//
// We always fail soft. If the extension tables don't exist yet (older
// environments), we return the code catalog unchanged so booking,
// /services and the chatbot keep working without a migration step.
// ---------------------------------------------------------------------------

import { sql } from '@/lib/db'
import {
  SERVICES_CATALOG,
  type CatalogCategory,
  type CatalogTreatment,
} from '@/lib/services-catalog'

interface DbCategoryRow {
  id: string
  slug: string
  title: string
  tagline: string
  description: string
  image_url: string | null
  display_order: number
  is_active: boolean
  override_for_slug: string | null
}

interface DbTreatmentRow {
  id: string
  category_slug: string
  slug: string
  name: string
  duration_minutes: number
  price_naira: number
  description: string
  popular: boolean
  concerns: string[] | string | null
  is_active: boolean
  display_order: number
  override_for_slug: string | null
}

function normaliseConcerns(raw: DbTreatmentRow['concerns']): string[] {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(String)
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed.map(String) : []
    } catch {
      return raw.split(',').map((s) => s.trim()).filter(Boolean)
    }
  }
  return []
}

function dbTreatmentToCatalog(row: DbTreatmentRow): CatalogTreatment {
  return {
    id: row.slug,
    name: row.name,
    duration: `${row.duration_minutes} mins`,
    priceFrom: Number(row.price_naira),
    description: row.description,
    popular: row.popular || undefined,
    concerns: normaliseConcerns(row.concerns),
  }
}

/**
 * Build the merged catalog. Pure read — never mutates anything.
 */
export async function getMergedCatalog(): Promise<CatalogCategory[]> {
  let dbCategories: DbCategoryRow[] = []
  let dbTreatments: DbTreatmentRow[] = []

  try {
    const cats = (await sql`
      SELECT id, slug, title, tagline, description, image_url,
             display_order, is_active, override_for_slug
      FROM service_categories_ext
      ORDER BY display_order ASC, title ASC
    `) as unknown as DbCategoryRow[]
    dbCategories = cats
  } catch {
    // Migration 470 not applied — silently fall through.
  }

  try {
    const treats = (await sql`
      SELECT id, category_slug, slug, name, duration_minutes, price_naira,
             description, popular, concerns, is_active, display_order,
             override_for_slug
      FROM service_treatments_ext
      ORDER BY display_order ASC, name ASC
    `) as unknown as DbTreatmentRow[]
    dbTreatments = treats
  } catch {
    // Migration 470 not applied — silently fall through.
  }

  // Index the DB rows for O(1) lookup during the merge.
  const dbCatBySlug = new Map<string, DbCategoryRow>()
  const removedCategorySlugs = new Set<string>()
  for (const c of dbCategories) {
    if (!c.is_active) {
      removedCategorySlugs.add(c.slug)
      continue
    }
    dbCatBySlug.set(c.slug, c)
  }

  const dbTreatByCatSlug = new Map<string, DbTreatmentRow[]>()
  const removedTreatments = new Set<string>() // `${categorySlug}::${slug}`
  for (const t of dbTreatments) {
    const key = `${t.category_slug}::${t.override_for_slug ?? t.slug}`
    if (!t.is_active) {
      removedTreatments.add(key)
      continue
    }
    const list = dbTreatByCatSlug.get(t.category_slug) ?? []
    list.push(t)
    dbTreatByCatSlug.set(t.category_slug, list)
  }

  // Walk the code catalog, applying overrides + removals.
  const merged: CatalogCategory[] = []
  for (const codeCat of SERVICES_CATALOG) {
    if (removedCategorySlugs.has(codeCat.slug)) continue

    const dbCat = dbCatBySlug.get(codeCat.slug) ?? null
    const cat: CatalogCategory = dbCat
      ? {
          slug: dbCat.slug,
          title: dbCat.title,
          tagline: dbCat.tagline || codeCat.tagline,
          description: dbCat.description || codeCat.description,
          image: dbCat.image_url || codeCat.image,
          treatments: codeCat.treatments,
        }
      : { ...codeCat }

    // Build the treatments list for this category.
    const dbTreatments = dbTreatByCatSlug.get(cat.slug) ?? []
    const overrideMap = new Map<string, DbTreatmentRow>()
    const newAdditions: DbTreatmentRow[] = []
    for (const t of dbTreatments) {
      if (t.override_for_slug) {
        overrideMap.set(t.override_for_slug, t)
      } else {
        // Could still be a "treat my new slug as an override of the
        // same name" — try matching the slug to a code entry.
        const matchesCode = codeCat.treatments.some((c) => c.id === t.slug)
        if (matchesCode) {
          overrideMap.set(t.slug, t)
        } else {
          newAdditions.push(t)
        }
      }
    }

    const mergedTreatments: CatalogTreatment[] = []
    for (const codeT of codeCat.treatments) {
      const removeKey = `${cat.slug}::${codeT.id}`
      if (removedTreatments.has(removeKey)) continue
      const override = overrideMap.get(codeT.id)
      if (override) {
        mergedTreatments.push(dbTreatmentToCatalog(override))
      } else {
        mergedTreatments.push(codeT)
      }
    }
    // Append admin-added treatments after the code-defined ones, in
    // the order the admin set via `display_order`.
    for (const add of newAdditions.sort(
      (a, b) => a.display_order - b.display_order,
    )) {
      mergedTreatments.push(dbTreatmentToCatalog(add))
    }

    cat.treatments = mergedTreatments
    if (cat.treatments.length > 0) merged.push(cat)
  }

  // Append brand-new admin-added categories (those not in the code
  // catalog AND not flagged as override_for_slug).
  const codeCatSlugs = new Set(SERVICES_CATALOG.map((c) => c.slug))
  for (const dbCat of dbCategories) {
    if (!dbCat.is_active) continue
    if (codeCatSlugs.has(dbCat.slug)) continue
    if (dbCat.override_for_slug && codeCatSlugs.has(dbCat.override_for_slug)) {
      continue
    }
    const dbTreatments = (dbTreatByCatSlug.get(dbCat.slug) ?? [])
      .filter((t) => !t.override_for_slug)
      .sort((a, b) => a.display_order - b.display_order)
    if (dbTreatments.length === 0) continue
    merged.push({
      slug: dbCat.slug,
      title: dbCat.title,
      tagline: dbCat.tagline,
      description: dbCat.description,
      image: dbCat.image_url || '',
      treatments: dbTreatments.map(dbTreatmentToCatalog),
    })
  }

  return merged
}
