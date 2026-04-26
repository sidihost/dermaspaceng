// ---------------------------------------------------------------------------
// app/sitemap.ts
//
// Dynamic sitemap that includes every static marketing page plus every
// published blog post. Next.js serves this from /sitemap.xml automatically.
//
// Why dynamic?
//   * Blog posts are added by admins and staff at runtime — a static file
//     would go stale immediately.
//   * Categories live in the database so we surface their archive pages
//     too once they exist.
//
// Cached for an hour at the edge to keep the cost of indexing crawlers
// negligible. The blog query is a single indexed read so even uncached
// it's effectively free.
// ---------------------------------------------------------------------------

import type { MetadataRoute } from 'next'
import { getCategories, getPublishedPosts } from '@/lib/blog'

// Render on demand instead of at build time. The blog helpers go
// through our Upstash Redis cache, whose client uses `cache: 'no-store'`
// fetches — Next.js refuses to bake those into the build output and
// throws "Dynamic server usage" if we try to statically prerender.
// The underlying Redis cache (1h TTL on the post + category lists)
// keeps each crawler hit cheap, so on-demand rendering is fine.
export const dynamic = 'force-dynamic'

const SITE_URL = 'https://dermaspaceng.com'

// Pages that always exist regardless of database state.
const STATIC_PAGES: Array<{ path: string; priority: number; changeFreq: MetadataRoute.Sitemap[number]['changeFrequency'] }> = [
  { path: '/',                   priority: 1.0, changeFreq: 'weekly' },
  { path: '/about',              priority: 0.8, changeFreq: 'monthly' },
  { path: '/services',           priority: 0.9, changeFreq: 'weekly' },
  { path: '/services/body-treatments',   priority: 0.7, changeFreq: 'monthly' },
  { path: '/services/facial-treatments', priority: 0.7, changeFreq: 'monthly' },
  { path: '/services/nail-care',         priority: 0.7, changeFreq: 'monthly' },
  { path: '/services/waxing',            priority: 0.7, changeFreq: 'monthly' },
  { path: '/packages',           priority: 0.7, changeFreq: 'monthly' },
  { path: '/membership',         priority: 0.7, changeFreq: 'monthly' },
  { path: '/gift-cards',         priority: 0.6, changeFreq: 'monthly' },
  { path: '/gallery',            priority: 0.6, changeFreq: 'monthly' },
  { path: '/contact',            priority: 0.6, changeFreq: 'yearly'  },
  { path: '/booking',            priority: 0.8, changeFreq: 'monthly' },
  { path: '/consultation',       priority: 0.7, changeFreq: 'monthly' },
  { path: '/laser-tech',         priority: 0.5, changeFreq: 'yearly'  },
  { path: '/derma-ai',           priority: 0.9, changeFreq: 'weekly'  },
  { path: '/blog',               priority: 0.9, changeFreq: 'daily'   },
  { path: '/privacy',            priority: 0.3, changeFreq: 'yearly'  },
  { path: '/terms',              priority: 0.3, changeFreq: 'yearly'  },
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  // Pull blog content concurrently with the static pages so the sitemap
  // generates in a single round-trip.
  const [posts, categories] = await Promise.all([
    getPublishedPosts({ limit: 1000 }),
    getCategories(),
  ])

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((p) => ({
    url: `${SITE_URL}${p.path}`,
    lastModified: now,
    changeFrequency: p.changeFreq,
    priority: p.priority,
  }))

  const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
    url: `${SITE_URL}/blog?category=${c.slug}`,
    lastModified: now,
    changeFrequency: 'weekly',
    priority: 0.6,
  }))

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: 'monthly',
    priority: p.featured ? 0.8 : 0.7,
  }))

  return [...staticEntries, ...categoryEntries, ...postEntries]
}
