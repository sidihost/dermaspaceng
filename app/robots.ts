// ---------------------------------------------------------------------------
// app/robots.ts
//
// Crawl directives for search engines. Block authenticated app surfaces
// (admin / staff / account / dashboard, plus API routes) so they can't be
// indexed and bleed PII into search results, but explicitly invite
// crawlers into the public marketing and blog pages.
// ---------------------------------------------------------------------------

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://dermaspaceng.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/staff',
          '/dashboard',
          '/account',
          '/api/',
          '/checkout',
          '/signin',
          '/signup',
          '/2fa',
          '/reset-password',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
