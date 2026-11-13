import Link from 'next/link'
import { ArrowLeft, ChevronRight } from 'lucide-react'

interface ServiceBackBarProps {
  /** Current service page title displayed in the breadcrumb trail. */
  title: string
  /** Optional parent route override (defaults to `/services`). */
  backHref?: string
  /** Optional parent label override (defaults to `Services`). */
  backLabel?: string
}

/**
 * Architectural sub-navigation bar for Dermaspace service detail pages.
 * Anchors "Back to Services" at the top-left of the `max-w-6xl` content
 * grid above the `#7B2D8E` hero, strictly flat (zero gradients, zero shadows).
 */
export function ServiceBackBar({
  title,
  backHref = '/services',
  backLabel = 'Services',
}: ServiceBackBarProps) {
  return (
    <nav aria-label="Service breadcrumb" className="bg-white border-t border-gray-100">
      <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href={backHref}
          className="group inline-flex items-center gap-2 rounded-full border border-[#7B2D8E]/20 bg-[#F5ECF8] py-1 pl-1.5 pr-3.5 text-xs font-semibold text-[#7B2D8E] transition-colors hover:border-[#7B2D8E] hover:bg-[#7B2D8E] hover:text-white"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#7B2D8E] text-white transition-colors group-hover:bg-white group-hover:text-[#7B2D8E]">
            <ArrowLeft
              className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
              aria-hidden="true"
            />
          </span>
          <span>Back to {backLabel}</span>
        </Link>

        <ol className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
          <li className="hidden sm:block">
            <Link href={backHref} className="transition-colors hover:text-[#7B2D8E]">
              {backLabel}
            </Link>
          </li>
          <li className="hidden sm:flex items-center" aria-hidden="true">
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
          </li>
          <li className="truncate font-semibold text-[#7B2D8E]" aria-current="page">
            {title}
          </li>
        </ol>
      </div>
    </nav>
  )
}
