'use client'

/**
 * CoverPicker
 *
 * Mirrors the AvatarPicker shell so the two "customise your profile"
 * flows feel identical: full-screen sheet on mobile, centred card on
 * desktop, brand-purple primary CTA at the bottom, Esc-to-close and
 * body-scroll lock.
 *
 * The picker shows a grid of the curated brand-aligned cover designs
 * from `lib/profile-covers`. Tapping a tile selects it, then "Use
 * Cover" persists the chosen slug via the parent's `onSelect`.
 */
import * as React from 'react'
import { ArrowLeft, Check, Loader2 } from 'lucide-react'
import {
  PROFILE_COVERS,
  resolveCover,
  type CoverSlug,
} from '@/lib/profile-covers'

type Props = {
  open: boolean
  onClose: () => void
  /** Currently saved slug on the user record (null if unset). */
  currentSlug: string | null
  /** Used to preview the deterministic fallback on the grid header
   *  when the viewer hasn't picked a slug yet. */
  userId: string | null
  onSelect: (slug: CoverSlug) => void | Promise<void>
}

const BRAND = '#7B2D8E'

export function CoverPicker({
  open,
  onClose,
  currentSlug,
  userId,
  onSelect,
}: Props) {
  const initial = resolveCover(currentSlug, userId).slug
  const [picked, setPicked] = React.useState<CoverSlug>(initial)
  const [saving, setSaving] = React.useState(false)

  // Re-sync each time the modal opens so repeat visits don't stick
  // on a stale selection from a previous session.
  React.useEffect(() => {
    if (open) {
      setPicked(resolveCover(currentSlug, userId).slug)
      setSaving(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, currentSlug, userId])

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

  // "Dirty" means the viewer has picked something different from
  // what's stored on their record — not just different from the
  // deterministic fallback — so the Save button only lights up when
  // there's actually a change worth persisting.
  const dirty = picked !== (currentSlug ?? initial)
  const canSave = dirty && !saving

  const handleUse = async () => {
    if (!canSave) return
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
      aria-label="Choose a cover"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white w-full sm:max-w-2xl h-[100dvh] sm:h-auto sm:max-h-[90vh] sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — back, centered title, live preview chip that
            reflects the currently *picked* design. */}
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
            Choose a Cover
          </h2>
          <div className="relative w-16 h-9 rounded-lg overflow-hidden ring-2 ring-white shadow-sm">
            <CoverThumb slug={picked} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
          <p className="text-xs text-gray-500 mb-4">
            Tap a design, then tap{' '}
            <span className="font-medium text-gray-700">Use Cover</span> to
            save. All designs use your brand colours.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {PROFILE_COVERS.map((preset) => {
              const selected = picked === preset.slug
              return (
                <button
                  key={preset.slug}
                  type="button"
                  onClick={() => setPicked(preset.slug)}
                  className="group relative text-left rounded-2xl overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7B2D8E] active:scale-[0.99] transition-transform"
                  aria-label={`Choose ${preset.label} cover`}
                  aria-pressed={selected}
                >
                  <div className="relative aspect-[16/9] w-full">
                    <CoverThumb slug={preset.slug} />
                    {/* Selection ring + checkmark — sits on top of
                        the design without blocking pointer events. */}
                    <span
                      className={`absolute inset-0 rounded-2xl pointer-events-none transition-all ${
                        selected ? '' : 'group-hover:ring-2 group-hover:ring-gray-300'
                      }`}
                      style={
                        selected
                          ? {
                              boxShadow: `inset 0 0 0 3px ${BRAND}, 0 0 0 3px rgba(123,45,142,0.18)`,
                            }
                          : undefined
                      }
                    />
                    {selected && (
                      <span
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center shadow-md"
                        style={{ backgroundColor: BRAND }}
                      >
                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="px-1 pt-2 pb-1">
                    <p className="text-sm font-semibold text-gray-900 leading-tight">
                      {preset.label}
                    </p>
                    <p className="text-[11px] text-gray-500 leading-tight">
                      {preset.hint}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Sticky save CTA — same styling as AvatarPicker so the
            two modals feel like siblings. */}
        <div
          className="px-4 sm:px-6 py-3 border-t border-gray-100 bg-white flex-shrink-0"
          style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
        >
          <button
            type="button"
            onClick={handleUse}
            disabled={!canSave}
            className="w-full h-12 rounded-full text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] shadow-md shadow-[#7B2D8E]/15 inline-flex items-center justify-center gap-2"
            style={{ backgroundColor: BRAND }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Use Cover'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

/** Small helper that renders a preset full-bleed inside its parent. */
function CoverThumb({ slug }: { slug: CoverSlug }) {
  const preset = PROFILE_COVERS.find((p) => p.slug === slug)!
  const Render = preset.Render
  return (
    <div className="absolute inset-0">
      <Render />
    </div>
  )
}
