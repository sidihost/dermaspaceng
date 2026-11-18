import { cn } from '@/lib/utils'

/**
 * Official Dermaspace Crescent-Wing brand emblem.
 * Derived from the signature crescent arc + winged silhouette in
 * `/public/images/dermaspace-logo.png` (distinct from the Derma AI butterfly mark).
 */
export function DermaspaceEmblem({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      className={cn('shrink-0', className)}
      aria-hidden="true"
    >
      {/* Sweeping outer crescent arc */}
      <path
        d="M21 8C10.5 16.5 6.5 31 11.5 43.2C16.8 56 32 61.5 45.5 55.2C50.2 53 54 49.6 56.8 45.4C52.6 49.4 47.2 52 41 52.8C27.2 54.6 15.2 44.8 13.8 31.2C12.9 22.5 15.8 14.2 21 8Z"
        fill="currentColor"
      />
      {/* Upper primary wing */}
      <path
        d="M24.2 14.8C29.4 15.6 36.2 19.6 39.2 26.8C40.5 30 40.3 33.4 39.2 35.6C35.8 35.8 30.8 34.8 27 31.6C22.4 27.7 21.8 20.6 24.2 14.8Z"
        fill="currentColor"
      />
      {/* Right elevated wing */}
      <path
        d="M41.2 28.4C41.8 22.8 45.6 16.8 52.6 14.8C53.6 20.4 51.4 26.8 46.6 30.2C44.8 31.4 42.8 31.9 41.2 31.7C41 30.6 41 29.5 41.2 28.4Z"
        fill="currentColor"
      />
      {/* Lower tail wing */}
      <path
        d="M21.4 38.6C24.4 35.4 29.2 34.8 33.4 36.4C31.8 40.8 27.6 43.6 22.8 43.6C21.4 43.6 20.4 43.2 19.8 42.6C20 41.1 20.6 39.7 21.4 38.6Z"
        fill="currentColor"
      />
      {/* Delicate twin antennae */}
      <path
        d="M41.8 33.6C44.8 32.6 47.4 30.2 48.2 27.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M42.2 35.4C45.8 35.4 49 34 50.8 31.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="48.4" cy="27.2" r="1.4" fill="currentColor" />
      <circle cx="51.1" cy="31.3" r="1.4" fill="currentColor" />
    </svg>
  )
}

/**
 * Clean Dermaspace wordmark + official crescent emblem lockup for keepsake cards.
 */
export function DermaspaceWordmark({
  className,
  emblemClassName = 'h-5 w-5',
  showSubtitle = false,
}: {
  className?: string
  emblemClassName?: string
  showSubtitle?: boolean
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 whitespace-nowrap', className)}>
      <DermaspaceEmblem className={emblemClassName} />
      <span className="flex flex-col text-left leading-none">
        <span className="font-serif text-[13px] font-semibold tracking-tight">
          Dermaspace
        </span>
        {showSubtitle && (
          <span className="mt-0.5 text-[8px] font-medium uppercase tracking-[0.18em] opacity-75">
            Esthetic &amp; Wellness
          </span>
        )}
      </span>
    </span>
  )
}
