'use client'

/**
 * TeamAvatarPicker
 *
 * Curated "Choose your portrait" sheet for staff and admin accounts.
 * Mirrors the customer AvatarPicker shell (header bar, grid, sticky
 * Use Avatar CTA, Esc-to-close, body-scroll lock) so the experience
 * feels consistent across the whole product — but reads from
 * `lib/team-avatars` so the team sees professional portraits instead
 * of the customer pool.
 *
 * The component is role-aware: pass role="staff" for the staff pool,
 * "admin" for the admin pool. The admin pool includes a single male
 * IT engineer portrait; the staff pool is women-only by design.
 */

import * as React from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { teamAvatarPoolFor, type TeamAvatar } from '@/lib/team-avatars'

type Props = {
  open: boolean
  onClose: () => void
  currentUrl: string | null
  initials: string
  /** Drives which curated pool is rendered. */
  role: 'staff' | 'admin'
  /** Persist the chosen URL — return a Promise to show the spinner. */
  onSelect: (url: string) => void | Promise<void>
}

const BRAND = '#7B2D8E'

export function TeamAvatarPicker({
  open,
  onClose,
  currentUrl,
  initials,
  role,
  onSelect,
}: Props) {
  const [picked, setPicked] = React.useState<string | null>(currentUrl)
  const [saving, setSaving] = React.useState(false)

  // Re-sync on every open so a stale selection from a previous
  // session never sticks around.
  React.useEffect(() => {
    if (open) {
      setPicked(currentUrl)
      setSaving(false)
    }
  }, [open, currentUrl])

  // Body scroll lock + Esc-to-close — same UX contract as the
  // customer AvatarPicker.
  React.useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, saving, onClose])

  if (!open) return null

  const pool: TeamAvatar[] = teamAvatarPoolFor(role) ?? []
  const dirty = picked !== currentUrl
  const canSave = dirty && !!picked && !saving

  const handleUse = async () => {
    if (!canSave || !picked) return
    setSaving(true)
    try {
      await onSelect(picked)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Choose a portrait"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[88vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — back arrow, centered title, live preview of the
            current selection on the right. */}
        <header className="flex items-center justify-between px-4 sm:px-6 h-14 sm:h-16 border-b border-gray-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="w-10 h-10 -ml-2 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-900 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
          </button>
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            {role === 'admin' ? 'Choose your admin portrait' : 'Choose your staff portrait'}
          </h2>
          <div
            className="w-9 h-9 rounded-full overflow-hidden ring-1 ring-gray-200 flex items-center justify-center"
            style={{ backgroundColor: BRAND }}
          >
            {picked ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={picked}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-[11px] font-semibold text-white">
                {initials || 'You'}
              </span>
            )}
          </div>
        </header>

        {/* Body — single grid (no gender chooser); team pools are
            already curated. */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">
            Tap a portrait, then tap{' '}
            <span className="font-medium text-gray-700">Use Portrait</span> to save.
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5">
            {pool.map((a) => {
              const selected = picked === a.url
              return (
                <div key={a.slug} className="relative aspect-square">
                  <button
                    type="button"
                    onClick={() => setPicked(a.url)}
                    className="group absolute inset-0 rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7B2D8E]"
                    aria-label={`Choose ${a.label}`}
                    aria-pressed={selected}
                    style={{ backgroundColor: a.tint }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={a.url}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 w-full h-full object-cover rounded-full transition-transform duration-200 group-active:scale-[0.96]"
                      loading="lazy"
                    />
                    {!selected && (
                      <span className="absolute inset-0 rounded-full pointer-events-none transition-all group-hover:ring-2 group-hover:ring-gray-300" />
                    )}
                  </button>
                  {selected && (
                    <span
                      className="absolute inset-0 rounded-full pointer-events-none"
                      style={{ boxShadow: `0 0 0 3px ${BRAND}` }}
                    />
                  )}
                  {selected && (
                    <span
                      className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center ring-2 ring-white pointer-events-none"
                      style={{ backgroundColor: BRAND }}
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Sticky CTA — same height/styling as the customer picker
            for visual consistency across surfaces. */}
        <div
          className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleUse}
            disabled={!canSave}
            className="w-full h-12 rounded-full text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Use Portrait'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
