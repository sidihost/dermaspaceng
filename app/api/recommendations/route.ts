import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import {
  SERVICES_CATALOG,
  getCategoryBySlug,
  type CatalogCategory,
  type CatalogTreatment,
} from '@/lib/services-catalog'

// ---------------------------------------------------------------------------
// /api/recommendations
//
// Drives the "Trending services" + "Most-loved by clients" carousels
// on the public services page.
//
// Two independent signals are aggregated:
//
//   • mostVisited — how many times each `/services/{slug}` URL was
//                    landed on in the trailing window (default 30 days).
//                    Sourced from `page_views`. Used to power the
//                    "most-visited" rail. Anonymous + logged-in views
//                    both count because the rail is a *site-wide*
//                    popularity signal, not personal.
//
//   • mostBooked  — how many actual paid/confirmed/completed bookings
//                    were placed against each treatment in the trailing
//                    window (default 60 days). Sourced from
//                    `booking_services` joined to `bookings` so we can
//                    drop cancelled / no-show rows.
//
// The endpoint always returns 200 — if a backing table doesn't exist
// yet (fresh deploy that hasn't run scripts/043 or scripts/034), the
// affected list comes back empty and the UI degrades gracefully into
// a static fallback.
// ---------------------------------------------------------------------------

export const dynamic = 'force-dynamic'
// Re-aggregating bookings + pageviews on every navigation would be
// wasteful — keep responses warm at the edge for 5 minutes.
export const revalidate = 300

interface VisitedItem {
  kind: 'category'
  slug: string
  title: string
  description: string
  image: string
  href: string
  /** Total page-view count in the window. */
  count: number
}

interface BookedItem {
  kind: 'treatment' | 'category'
  /** Category slug — useful for routing to the detail page. */
  slug: string
  /** Treatment id within the category, or null when this row aggregates
   *  the whole category (e.g. when a treatment was logged with a name
   *  we can no longer match in the catalog). */
  treatmentId: string | null
  title: string
  /** "Body Treatments · 90 mins" — used as the small caption under the
   *  card title. */
  subtitle: string
  image: string
  href: string
  count: number
}

function findTreatmentByName(
  category: CatalogCategory,
  treatmentName: string,
): CatalogTreatment | null {
  const needle = treatmentName.trim().toLowerCase()
  return (
    category.treatments.find((t) => t.name.toLowerCase() === needle) ?? null
  )
}

export async function GET() {
  let mostVisited: VisitedItem[] = []
  let mostBooked: BookedItem[] = []

  // -----------------------------------------------------------------
  // 1. Most-visited service pages — group by path, last 30 days.
  // -----------------------------------------------------------------
  try {
    const rows = (await sql`
      SELECT path, COUNT(*)::int AS visits
      FROM page_views
      WHERE path LIKE '/services/%'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY path
      ORDER BY visits DESC
      LIMIT 12
    `) as Array<{ path: string; visits: number }>

    for (const row of rows) {
      // Path is `/services/{slug}` (or sometimes `/services/{slug}/...` if
      // we ever add nested routes — strip to the first segment).
      const slug = row.path.replace(/^\/services\//, '').split('/')[0]
      if (!slug) continue
      const category = getCategoryBySlug(slug)
      if (!category) continue
      mostVisited.push({
        kind: 'category',
        slug: category.slug,
        title: category.title,
        description: category.tagline,
        image: category.image,
        href: `/services/${category.slug}`,
        count: row.visits,
      })
    }
  } catch (err) {
    console.warn('[v0] recommendations: page_views aggregation skipped:', err)
  }

  // -----------------------------------------------------------------
  // 2. Most-booked treatments — group by category + treatment, last 60
  //    days, only counting bookings that actually happened.
  // -----------------------------------------------------------------
  try {
    const rows = (await sql`
      SELECT bs.category_name, bs.treatment_name, COUNT(*)::int AS bookings
      FROM booking_services bs
      JOIN bookings b ON b.id = bs.booking_id
      WHERE b.status IN ('confirmed', 'completed', 'pending')
        AND b.created_at >= NOW() - INTERVAL '60 days'
      GROUP BY bs.category_name, bs.treatment_name
      ORDER BY bookings DESC
      LIMIT 12
    `) as Array<{
      category_name: string
      treatment_name: string
      bookings: number
    }>

    for (const row of rows) {
      // Category name in `booking_services` was captured as the
      // human-readable title (e.g. "Facial Treatments"), so match by
      // title not slug.
      const category = SERVICES_CATALOG.find(
        (c) => c.title.toLowerCase() === row.category_name.toLowerCase(),
      )
      if (!category) continue

      const treatment = findTreatmentByName(category, row.treatment_name)

      if (treatment) {
        mostBooked.push({
          kind: 'treatment',
          slug: category.slug,
          treatmentId: treatment.id,
          title: treatment.name,
          subtitle: `${category.title} · ${treatment.duration}`,
          image: category.image,
          href: `/services/${category.slug}#${treatment.id}`,
          count: row.bookings,
        })
      } else {
        // Treatment name drifted (renamed, removed, or admin-entered) —
        // still surface the category so the row isn't dropped.
        mostBooked.push({
          kind: 'category',
          slug: category.slug,
          treatmentId: null,
          title: row.treatment_name,
          subtitle: category.title,
          image: category.image,
          href: `/services/${category.slug}`,
          count: row.bookings,
        })
      }
    }
  } catch (err) {
    console.warn('[v0] recommendations: bookings aggregation skipped:', err)
  }

  return NextResponse.json(
    {
      mostVisited,
      mostBooked,
      // Surface generated-at so the UI can show a relative timestamp
      // ("updated 3 min ago") if we ever want to.
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        // CDN-cache for 5 minutes, allow stale-while-revalidate for
        // another 10 so a slow database query never blocks a render.
        'Cache-Control':
          'public, s-maxage=300, stale-while-revalidate=600',
      },
    },
  )
}
