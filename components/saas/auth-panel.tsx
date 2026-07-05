import Link from 'next/link'
import { ButterflyLogo } from '@/components/shared/butterfly-logo'

/**
 * Shared left brand panel for the SaaS auth pages. Solid purple, serif
 * statement, flat design — no gradients or shadows.
 */
export function AuthPanel({ headline, sub }: { headline: string; sub: string }) {
  return (
    <div className="flex flex-col justify-between bg-primary p-8 lg:min-h-screen lg:p-12">
      <Link href="/derma-ai-saas" className="flex items-center gap-2.5">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border border-primary-foreground/40 text-primary-foreground">
          <ButterflyLogo className="h-5 w-5 text-primary-foreground" />
        </span>
        <span className="leading-tight">
          <span className="block font-serif text-base text-primary-foreground">Derma AI</span>
          <span className="block text-[11px] uppercase tracking-widest text-primary-foreground/70">
            for Business
          </span>
        </span>
      </Link>

      <div className="py-16 lg:py-0">
        <h2 className="max-w-md text-balance font-serif text-4xl leading-[1.1] text-primary-foreground lg:text-5xl">
          {headline}
        </h2>
        <p className="mt-6 max-w-md text-pretty leading-relaxed text-primary-foreground/80">{sub}</p>
      </div>

      <figure className="hidden border-t border-primary-foreground/25 pt-8 lg:block">
        <blockquote className="max-w-md text-pretty font-serif text-lg leading-relaxed text-primary-foreground">
          &ldquo;Our assistant answered 400 customer questions in its first month &mdash; while we
          slept.&rdquo;
        </blockquote>
        <figcaption className="mt-4 text-sm text-primary-foreground/70">
          A Derma AI business customer
        </figcaption>
      </figure>
    </div>
  )
}
