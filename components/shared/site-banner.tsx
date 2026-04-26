'use client'

/**
 * Site-wide notification banner.
 *
 * Pulls the active banners from /api/banners (cached/SWR'd) and
 * renders a single thin bar at the top of the layout. If the admin
 * has multiple banners scheduled at once we cycle through them on a
 * 6-second timer so promos don't crowd each other out.
 *
 * Dismissed banner ids are persisted to localStorage by id, so a
 * user who dismissed banner X never sees it again — but a freshly
 * created banner Y still appears.
 */

import * as React from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { X } from 'lucide-react'

type Banner = {
  id: string
  message: string
  link_url: string | null
  link_text: string | null
  variant: string
  scope: string
  dismissible: boolean
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const STORAGE_KEY = 'dermaspace-dismissed-banners'

function loadDismissed(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]))
  } catch { /* quota / private mode — fine */ }
}

const VARIANT_STYLES: Record<string, string> = {
  // Brand purple. Default for everything we don't recognise.
  info:    'bg-[#7B2D8E] text-white',
  promo:   'bg-[#7B2D8E] text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-gray-900',
  danger:  'bg-rose-600 text-white',
}

export function SiteBanner({ scope = 'site' }: { scope?: 'site' | 'dashboard' | 'admin' }) {
  const { data } = useSWR<{ banners: Banner[] }>(
    `/api/banners?scope=${scope}`,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 5 * 60_000 },
  )

  const [dismissed, setDismissed] = React.useState<Set<string>>(() => loadDismissed())
  const [index, setIndex] = React.useState(0)

  const banners = (data?.banners ?? []).filter((b) => !dismissed.has(b.id))

  // Cycle through multiple active banners.
  React.useEffect(() => {
    if (banners.length <= 1) return
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length)
    }, 6000)
    return () => window.clearInterval(t)
  }, [banners.length])

  // Reset the index whenever the active list shrinks below the
  // current pointer (e.g. user dismissed the last one).
  React.useEffect(() => {
    if (index >= banners.length) setIndex(0)
  }, [index, banners.length])

  if (banners.length === 0) return null

  const active = banners[index] ?? banners[0]
  const styles = VARIANT_STYLES[active.variant] ?? VARIANT_STYLES.info

  function handleDismiss() {
    const next = new Set(dismissed)
    next.add(active.id)
    setDismissed(next)
    saveDismissed(next)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`relative ${styles} px-4 py-2 text-center text-[12.5px] sm:text-sm font-medium`}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 pr-8">
        <span className="text-pretty">{active.message}</span>
        {active.link_url && (
          <Link
            href={active.link_url}
            className="underline underline-offset-2 font-semibold hover:opacity-90 whitespace-nowrap"
          >
            {active.link_text || 'Learn more'}
          </Link>
        )}
      </div>
      {active.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-black/10 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  )
}
