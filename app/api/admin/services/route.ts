import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { requireServiceManager } from '@/lib/auth'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

/**
 * Admin services catalog management.
 *
 * Read path
 * ---------
 * GET returns a fully merged "admin view" of the catalog. Each row is
 * tagged with `source` so the UI can show:
 *   • code      — defined in lib/services-catalog.ts (baseline)
 *   • override  — code row that admins have edited (a DB row exists
 *                 with override_for_slug pointing at it)
 *   • custom    — admin-added row that doesn't exist in code
 *   • disabled  — code row that admins have published off (DB row
 *                 with is_active = false)
 *
 * Write path
 * ----------
 * Mutations land in `service_categories_ext` / `service_treatments_ext`.
 * Editing a code-defined row creates an override row. Editing a custom
 * row updates it in place. Deleting publishes "is_active = false" so
 * the catalog merger removes the entry without losing the audit trail.
 */

interface DbCategory {
  id: string
  slug: string
  title: string
  tagline: string
  description: string
  image_url: string | null
  display_order: number
  is_active: boolean
  override_for_slug: string | null
  updated_at: string
}

interface DbTreatment {
  id: string
  category_slug: string
  slug: string
  name: string
  duration_minutes: number
  price_naira: number
  description: string
  popular: boolean
  concerns: unknown
  is_active: boolean
  display_order: number
  override_for_slug: string | null
  updated_at: string
  available_locations: string[] | null
}

function normaliseConcerns(raw: unknown): string[] {
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

function parseDuration(input: string | number): number {
  if (typeof input === 'number') return Math.max(1, Math.round(input))
  const m = /(\d+)/.exec(input)
  return m ? Math.max(1, parseInt(m[1], 10)) : 60
}

export async function GET() {
  try {
    await requireServiceManager()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let dbCats: DbCategory[] = []
  let dbTreats: DbTreatment[] = []
  try {
    dbCats = (await sql`
      SELECT id, slug, title, tagline, description, image_url,
             display_order, is_active, override_for_slug, updated_at
      FROM service_categories_ext
      ORDER BY display_order ASC, title ASC
    `) as unknown as DbCategory[]
  } catch {
    /* migration not applied — silent */
  }
  try {
    dbTreats = (await sql`
      SELECT id, category_slug, slug, name, duration_minutes, price_naira,
             description, popular, concerns, is_active, display_order,
             override_for_slug, updated_at, available_locations
      FROM service_treatments_ext
      ORDER BY display_order ASC, name ASC
    `) as unknown as DbTreatment[]
  } catch {
    /* migration not applied — silent */
  }

  const dbCatBySlug = new Map<string, DbCategory>()
  for (const c of dbCats) dbCatBySlug.set(c.slug, c)

  const dbTreatByKey = new Map<string, DbTreatment>()
  // For overrides: key = `${category_slug}::${override_for_slug}`
  // For new items: key = `${category_slug}::${slug}`
  for (const t of dbTreats) {
    const key = `${t.category_slug}::${t.override_for_slug ?? t.slug}`
    dbTreatByKey.set(key, t)
  }

  type AdminTreatment = {
    id: string // DB UUID for db rows, otherwise `${categorySlug}::${slug}`
    dbId: string | null
    categorySlug: string
    slug: string
    name: string
    durationMinutes: number
    priceNaira: number
    description: string
    popular: boolean
    concerns: string[]
    isActive: boolean
    displayOrder: number
    source: 'code' | 'override' | 'custom' | 'disabled'
    updatedAt: string | null
    availableLocations: string[]
  }

  type AdminCategory = {
    id: string
    dbId: string | null
    slug: string
    title: string
    tagline: string
    description: string
    image: string
    displayOrder: number
    isActive: boolean
    source: 'code' | 'override' | 'custom' | 'disabled'
    updatedAt: string | null
    treatments: AdminTreatment[]
  }

  const out: AdminCategory[] = []

  const codeSlugs = new Set(SERVICES_CATALOG.map((c) => c.slug))

  // 1. Walk the code catalog.
  for (let ci = 0; ci < SERVICES_CATALOG.length; ci++) {
    const codeCat = SERVICES_CATALOG[ci]
    const dbCat = dbCatBySlug.get(codeCat.slug) ?? null
    const catSource: AdminCategory['source'] = dbCat
      ? dbCat.is_active
        ? 'override'
        : 'disabled'
      : 'code'

    const cat: AdminCategory = {
      id: dbCat?.id ?? codeCat.slug,
      dbId: dbCat?.id ?? null,
      slug: codeCat.slug,
      title: dbCat?.title || codeCat.title,
      tagline: dbCat?.tagline || codeCat.tagline,
      description: dbCat?.description || codeCat.description,
      image: dbCat?.image_url || codeCat.image,
      displayOrder: dbCat?.display_order ?? ci * 100,
      isActive: dbCat?.is_active ?? true,
      source: catSource,
      updatedAt: dbCat?.updated_at ?? null,
      treatments: [],
    }

    // Walk code treatments for this category.
    for (let ti = 0; ti < codeCat.treatments.length; ti++) {
      const codeT = codeCat.treatments[ti]
      const key = `${codeCat.slug}::${codeT.id}`
      const dbT = dbTreatByKey.get(key) ?? null
      const tSource: AdminTreatment['source'] = dbT
        ? dbT.is_active
          ? 'override'
          : 'disabled'
        : 'code'
      cat.treatments.push({
        id: dbT?.id ?? key,
        dbId: dbT?.id ?? null,
        categorySlug: codeCat.slug,
        slug: codeT.id,
        name: dbT?.name || codeT.name,
        durationMinutes: dbT
          ? dbT.duration_minutes
          : parseDuration(codeT.duration),
        priceNaira: dbT?.price_naira ?? codeT.priceFrom,
        description: dbT?.description || codeT.description,
        popular: dbT?.popular ?? !!codeT.popular,
        concerns: dbT
          ? normaliseConcerns(dbT.concerns)
          : codeT.concerns ?? [],
        isActive: dbT?.is_active ?? true,
        displayOrder: dbT?.display_order ?? ti * 100,
        source: tSource,
        updatedAt: dbT?.updated_at ?? null,
        availableLocations: Array.isArray(dbT?.available_locations)
          ? (dbT!.available_locations as string[]).filter(Boolean)
          : [],
      })
    }

    // Append admin-added treatments to this category (DB rows where
    // override_for_slug is null AND slug isn't a code id).
    const codeIds = new Set(codeCat.treatments.map((t) => t.id))
    for (const t of dbTreats) {
      if (t.category_slug !== codeCat.slug) continue
      if (t.override_for_slug) continue
      if (codeIds.has(t.slug)) continue
      cat.treatments.push({
        id: t.id,
        dbId: t.id,
        categorySlug: codeCat.slug,
        slug: t.slug,
        name: t.name,
        durationMinutes: t.duration_minutes,
        priceNaira: t.price_naira,
        description: t.description,
        popular: t.popular,
        concerns: normaliseConcerns(t.concerns),
        isActive: t.is_active,
        displayOrder: t.display_order,
        source: t.is_active ? 'custom' : 'disabled',
        updatedAt: t.updated_at,
        availableLocations: Array.isArray(t.available_locations)
          ? t.available_locations.filter(Boolean)
          : [],
      })
    }

    out.push(cat)
  }

  // 2. Append brand-new admin-added categories (not in code).
  for (const dbCat of dbCats) {
    if (codeSlugs.has(dbCat.slug)) continue
    if (dbCat.override_for_slug && codeSlugs.has(dbCat.override_for_slug)) continue
    const cat: AdminCategory = {
      id: dbCat.id,
      dbId: dbCat.id,
      slug: dbCat.slug,
      title: dbCat.title,
      tagline: dbCat.tagline,
      description: dbCat.description,
      image: dbCat.image_url || '',
      displayOrder: dbCat.display_order,
      isActive: dbCat.is_active,
      source: dbCat.is_active ? 'custom' : 'disabled',
      updatedAt: dbCat.updated_at,
      treatments: [],
    }
    for (const t of dbTreats) {
      if (t.category_slug !== dbCat.slug) continue
      cat.treatments.push({
        id: t.id,
        dbId: t.id,
        categorySlug: dbCat.slug,
        slug: t.slug,
        name: t.name,
        durationMinutes: t.duration_minutes,
        priceNaira: t.price_naira,
        description: t.description,
        popular: t.popular,
        concerns: normaliseConcerns(t.concerns),
        isActive: t.is_active,
        displayOrder: t.display_order,
        source: t.is_active ? 'custom' : 'disabled',
        updatedAt: t.updated_at,
        availableLocations: Array.isArray(t.available_locations)
          ? t.available_locations.filter(Boolean)
          : [],
      })
    }
    out.push(cat)
  }

  return NextResponse.json({ categories: out })
}
