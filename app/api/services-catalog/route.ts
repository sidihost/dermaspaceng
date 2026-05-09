import { NextResponse } from 'next/server'
import { getMergedCatalog } from '@/lib/services-catalog-db'
import { SERVICES_CATALOG } from '@/lib/services-catalog'

/**
 * Public services catalog endpoint.
 *
 * Returns the merged catalog (code + admin overrides + admin
 * additions). The booking wizard hits this on mount so admin edits
 * propagate to customers without a deploy. Falls back to the static
 * code catalog on any error so the wizard never goes empty.
 *
 * Cached for one minute at the edge — admin edits typically don't
 * need to be visible the same second they're made, but we don't
 * want stale prices for hours either. The admin UI itself uses
 * `cache: 'no-store'` to keep the editor live.
 */
export const revalidate = 60

export async function GET() {
  try {
    const catalog = await getMergedCatalog()
    return NextResponse.json({ catalog })
  } catch (err) {
    console.error('[services-catalog] GET', err)
    // Fail open — return the static catalog so the public site keeps
    // working if the merge layer hits an unexpected exception.
    return NextResponse.json({ catalog: SERVICES_CATALOG, fallback: true })
  }
}
