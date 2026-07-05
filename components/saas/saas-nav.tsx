'use client'

import Link from 'next/link'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

/**
 * Marketing nav for the Derma AI for Business SaaS.
 * Flat editorial chrome: hairline bottom border, purple butterfly
 * logomark, rounded-full CTA. No gradients or shadows per brand rules.
 */
export function SaasNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/derma-ai-saas" className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ButterflyLogo className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block font-serif text-base text-foreground">Derma AI</span>
            <span className="block text-[11px] uppercase tracking-widest text-muted-foreground">
              for Business
            </span>
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/derma-ai-saas/login"
            className="rounded-full px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
          >
            Sign in
          </Link>
          <Link
            href="/derma-ai-saas/signup"
            className="rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
