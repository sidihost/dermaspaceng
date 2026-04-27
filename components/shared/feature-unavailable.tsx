/**
 * Friendly "this feature is currently turned off" screen.
 *
 * Rendered by any page that's gated on a feature flag when the flag
 * is OFF. Two design goals:
 *
 *   1. Don't 404. A 404 implies "we never had this" — wrong, the
 *      feature exists but is paused (e.g. payment provider outage,
 *      seasonal closure, or a deliberate admin pause).
 *   2. Give the visitor somewhere to go. We always link back home
 *      and to the contact page so they can still reach the spa.
 *
 * Visual treatment matches the rest of the public site: brand
 * purple #7B2D8E, generous whitespace, no decorative gradients.
 */

import Link from 'next/link'
import { ArrowRight, Phone } from 'lucide-react'

export function FeatureUnavailable({
  title,
  body,
}: {
  title: string
  body: string
}) {
  return (
    <main className="min-h-[80vh] bg-white flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-12 h-12 rounded-2xl bg-[#7B2D8E]/10 mx-auto mb-5 flex items-center justify-center">
          <span className="block w-2 h-2 rounded-full bg-[#7B2D8E]" aria-hidden />
        </div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2 text-balance">
          {title}
        </h1>
        <p className="text-sm sm:text-[15px] text-gray-600 leading-relaxed text-pretty">
          {body}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full bg-[#7B2D8E] text-white text-sm font-semibold hover:bg-[#5A1D6A] transition-colors"
          >
            Back to homepage
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="tel:+2349017972919"
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-full border border-gray-200 bg-white text-gray-900 text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            <Phone className="w-4 h-4" />
            +234 901 797 2919
          </a>
        </div>
      </div>
    </main>
  )
}
