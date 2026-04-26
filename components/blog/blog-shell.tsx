// ---------------------------------------------------------------------------
// components/blog/blog-shell.tsx
//
// Shared layout chrome for /blog, /blog/[slug] and /blog/category/[slug].
// Lives at the top of every blog page so the header treatment, max-width,
// and breadcrumb position stay consistent across the section.
//
// We avoid gradients and decorative SVG entirely — the design brief asks
// for a clean, web-app feel with the brand purple as the only accent.
// ---------------------------------------------------------------------------

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'

interface Crumb {
  label: string
  href?: string
}

export function BlogShell({
  children,
  crumbs = [],
}: {
  children: ReactNode
  crumbs?: Crumb[]
}) {
  return (
    // Plain white surface (was a tinted lavender). The user asked
    // for an app-like feel with the brand purple as the *only* hint
    // of colour, surrounded by generous whitespace — a tinted
    // background made the page feel busier than it needed to be.
    <main className="min-h-screen bg-white pb-20">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[11px] text-gray-500 pt-3 pb-2 overflow-x-auto whitespace-nowrap"
        >
          <Link href="/" className="hover:text-[#7B2D8E] transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden />
          <Link href="/blog" className="hover:text-[#7B2D8E] transition-colors">
            Blog
          </Link>
          {crumbs.map((c, idx) => (
            <span key={idx} className="flex items-center gap-1.5">
              <ChevronRight className="w-3 h-3 flex-shrink-0" aria-hidden />
              {c.href ? (
                <Link href={c.href} className="hover:text-[#7B2D8E] transition-colors">
                  {c.label}
                </Link>
              ) : (
                <span className="text-gray-700 font-medium truncate max-w-[180px]">{c.label}</span>
              )}
            </span>
          ))}
        </nav>
        {children}
      </div>
    </main>
  )
}
