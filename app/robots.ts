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
          // Authenticated app surfaces — never index, would leak PII.
          '/admin',
          '/staff',
          '/dashboard',
          '/account',
          '/api/',
          '/checkout',
          '/continue-payment',

          // Auth flows that only make sense mid-session. /signup and
          // /signin are intentionally allowed so they can surface as
          // sitelinks ("Signup", "Sign in") on the brand SERP.
          '/signin/2fa',
          '/2fa',
          '/reset-password',
          '/forgot-password',
          '/verify-email',
          '/accept-invite',
          '/complete-profile',
          '/blocked',

          // Operational / one-shot pages that have no value in search.
          '/maintenance',
          '/offline',
          '/feedback',
          '/survey',
          '/free-consultation',
          '/contact/success',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
