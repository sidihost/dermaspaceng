'use client'

import Link from 'next/link'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

/**
 * Marketing nav for the Derma AI for Business SaaS.
 * Mirrors the main site chrome: white bar, purple butterfly logomark,
 * rounded-full CTA. No gradients or shadows per brand rules.
 */
export function SaasNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/derma-ai-saas" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7B2D8E] text-white">
            <ButterflyLogo className="h-5 w-5 text-white" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-bold text-gray-900">Derma AI</span>
            <span className="block text-[11px] text-gray-500">for Business</span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/derma-ai-saas/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:text-[#7B2D8E]"
          >
            Sign in
          </Link>
          <Link
            href="/derma-ai-saas/signup"
            className="rounded-full bg-[#7B2D8E] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#6B2278]"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
