"use client"

/**
 * Shared error tile for data-fetching pages.
 *
 * Rendered when a SWR-backed (or setState-backed) page failed to
 * load its primary resource. Replaces the silent "empty state"
 * fall-through that the staff dashboard suffered from across
 * Appointments / Clients / Loyalty / Reports etc. — those pages
 * used a bare `r => r.json()` fetcher and so a 500 response
 * decoded to `{ error: "..." }` got treated as data, leaving a
 * blank page with no diagnostic.
 *
 * Design rules:
 *   - Brand purple #7B2D8E, hairline border, neutral grays
 *   - No gradients / shadows / glow effects
 *   - Single retry CTA, visible on mobile and desktop
 *   - The actual error message is rendered verbatim so the
 *     operator can copy/paste it into a support ticket
 */

import { AlertTriangle, RefreshCw } from "lucide-react"

interface DataLoadErrorProps {
  /** Human-facing title for the failure card. */
  title?: string
  /**
   * The raw error from SWR (or `fetch`). May be an `Error`, an
   * `HttpError` from `safeFetcher`, or any object with a `message`
   * string. Anything else is rendered as `String(error)`.
   */
  error: unknown
  /** Retry callback (e.g. `mutate()` from SWR or the page's `fetch` fn). */
  onRetry?: () => void
  /**
   * When true, render the compact inline variant — a single horizontal
   * row instead of the centered block. Useful when the page already has
   * cached data and we just want to surface that the latest poll failed.
   */
  inline?: boolean
}

function describeError(err: unknown): string {
  if (!err) return "Unknown error"
  if (err instanceof Error) return err.message
  if (typeof err === "string") return err
  if (typeof err === "object" && err !== null) {
    const maybe = (err as { message?: unknown }).message
    if (typeof maybe === "string") return maybe
  }
  return String(err)
}

export function DataLoadError({
  title = "Could not load",
  error,
  onRetry,
  inline = false,
}: DataLoadErrorProps) {
  const msg = describeError(error)

  if (inline) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700">
        <AlertTriangle className="h-3.5 w-3.5 text-[#7B2D8E] flex-shrink-0" aria-hidden />
        <span className="truncate">
          <span className="font-semibold">{title}:</span> {msg}
        </span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="ml-auto inline-flex items-center gap-1 font-semibold text-[#7B2D8E] hover:underline flex-shrink-0"
          >
            <RefreshCw className="h-3 w-3" aria-hidden />
            Retry
          </button>
        )}
      </div>
    )
  }

  return (
    <div
      role="alert"
      className="rounded-2xl border border-gray-200 bg-white px-6 py-10 text-center"
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#7B2D8E]/10 text-[#7B2D8E]">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <p className="mt-3 text-base font-semibold text-gray-900">{title}</p>
      <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto break-words">
        {msg}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#7B2D8E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#5A1D6A]"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Retry
        </button>
      )}
    </div>
  )
}
