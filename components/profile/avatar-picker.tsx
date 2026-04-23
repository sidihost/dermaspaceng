'use client'

/**
 * AvatarPicker
 *
 * Full-screen "Choose an Avatar" sheet modelled on modern avatar
 * pickers (Apple Memoji, iOS Contacts): a lean header with a back
 * arrow, the title, and a live preview of the selected avatar; a
 * Men / Women segmented control; a grid of round 3D character
 * avatars; and a persistent "Use Avatar" CTA pinned to the bottom.
 *
 * Design decisions:
 *   - No file upload. The brief explicitly removed that surface —
 *     forcing everyone into the curated set keeps profiles looking
 *     cohesive across the site, and it avoids every photo-moderation
 *     headache a social-style site picks up when it lets strangers
 *     upload arbitrary images.
 *   - Men / Women tabs instead of auto-filtering by a stored gender.
 *     We don't collect gender on the user, so we let the viewer
 *     self-select. The initial tab matches the gender of their
 *     current avatar if they have one, so returning users land on
 *     the tab they expect.
 *   - The CTA is disabled until the user actually picks a *different*
 *     avatar; tapping the one you already have is a no-op.
 */

import * as React from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import { SPA_AVATARS, type AvatarGender } from '@/lib/spa-avatars'

type Props = {
  open: boolean
  onClose: () => void
  currentUrl: string | null
  initials: string
  /** Called with the final chosen avatar URL when the user taps
   *  "Use Avatar". Return a promise to show a spinner on the CTA. */
  onSelect: (url: string) => void | Promise<void>
}

const BRAND = '#7B2D8E'

export function AvatarPicker({
  open,
  onClose,
  currentUrl,
  initials,
  onSelect,
}: Props) {
  // Default the tab to whichever gender the current avatar belongs
  // to — returning users should land on the tab they last used. New
  // users land on "men" (first alphabetically, not a value judgment).
  const initialTab: AvatarGender = React.useMemo(() => {
    const hit = SPA_AVATARS.find((a) => currentUrl && currentUrl.endsWith(a.url))
    return hit?.gender ?? 'men'
  }, [currentUrl])

  const [tab, setTab] = React.useState<AvatarGender>(initialTab)
  const [picked, setPicked] = React.useState<string | null>(currentUrl)
  const [saving, setSaving] = React.useState(false)

  // Re-sync local state each time the modal opens so repeat visits
  // don't stick on a stale selection from a previous session.
  React.useEffect(() => {
    if (open) {
      setPicked(currentUrl)
      setTab(initialTab)
      setSaving(false)
    }
  }, [open, currentUrl, initialTab])

  // Lock body scroll + support Esc-to-close. Matches the confirm
  // dialog's behavior so the whole app feels consistent.
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

  const avatars = SPA_AVATARS.filter((a) => a.gender === tab)
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
      aria-label="Choose an avatar"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-lg h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — back arrow, centered title, preview of the
            currently selected avatar on the right. */}
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
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">
            Choose an Avatar
          </h2>
          <div
            className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white shadow-sm flex items-center justify-center"
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
              <span className="text-xs font-semibold text-white">
                {initials || 'You'}
              </span>
            )}
          </div>
        </header>

        {/* Segmented control — Men / Women. Kept visually light so
            the avatars are the hero of the screen. */}
        <div className="px-4 sm:px-6 pt-4 flex-shrink-0">
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full">
            {(['men', 'women'] as AvatarGender[]).map((g) => {
              const active = tab === g
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => setTab(g)}
                  className={`flex-1 h-9 rounded-full text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {g === 'men' ? 'Men' : 'Women'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Grid — 3 columns on mobile (matches the reference design),
            4 on tablet+. Selected tile gets a solid brand-colored
            ring plus a check overlay in the bottom-right. */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5">
            {avatars.map((a) => {
              const selected = picked === a.url
              return (
                <button
                  key={a.slug}
                  type="button"
                  onClick={() => setPicked(a.url)}
                  className="group relative aspect-square rounded-full overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7B2D8E]"
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
                  {/* Selection ring — box-shadow so it sits outside
                      the image and doesn't clip the circle. */}
                  <span
                    className={`absolute inset-0 rounded-full pointer-events-none transition-all ${
                      selected ? '' : 'group-hover:ring-2 group-hover:ring-gray-300'
                    }`}
                    style={
                      selected
                        ? {
                            boxShadow: `0 0 0 3px ${BRAND}, 0 0 0 6px rgba(123,45,142,0.15)`,
                          }
                        : undefined
                    }
                  />
                  {selected && (
                    <span
                      className="absolute bottom-1 right-1 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                      style={{ backgroundColor: BRAND }}
                    >
                      <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sticky CTA — big pill, disabled until a new pick is made. */}
        <div
          className="px-4 sm:px-6 py-4 border-t border-gray-100 bg-white flex-shrink-0"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleUse}
            disabled={!canSave}
            className="w-full h-14 rounded-full text-white text-base font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg shadow-[#7B2D8E]/20 inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND }}
          >
            {saving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Saving…
              </>
            ) : (
              'Use Avatar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
