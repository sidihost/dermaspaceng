'use client'

/**
 * AvatarPicker
 *
 * Curated "Choose an Avatar" sheet. The user's gender is collected at
 * signup (or in settings for legacy accounts) and the grid is
 * filtered to match — men only see male avatars and women only see
 * female ones, which is exactly what the product wants.
 *
 * If the viewer has no gender on record yet, we show an inline
 * gender picker instead of the grid (and invite them to go to
 * settings). The brief explicitly removed file uploads, so the
 * curated set is the only path.
 */

import * as React from 'react'
import { ArrowLeft, Check, Loader2, User2, UserRound } from 'lucide-react'
import { SPA_AVATARS, type AvatarGender } from '@/lib/spa-avatars'

type Props = {
  open: boolean
  onClose: () => void
  currentUrl: string | null
  initials: string
  /** Viewer's gender — drives which avatars are shown. `null` means
   *  the viewer hasn't set one yet; we render an inline chooser
   *  instead of the grid so picking an avatar never requires a
   *  detour to Settings. */
  gender: 'male' | 'female' | null
  /** Called with the final chosen avatar URL when the user taps
   *  "Use Avatar". Return a promise to show a spinner on the CTA. */
  onSelect: (url: string) => void | Promise<void>
  /** Called when the viewer picks a gender from the inline chooser.
   *  Parents should persist it (e.g. PUT /api/auth/profile) and push
   *  the new value back in via the `gender` prop. Optional: if not
   *  provided the picker will still flip to the filtered grid
   *  locally (so at least one avatar can be selected for THIS
   *  session) but the choice won't stick across reloads. */
  onGenderSelect?: (g: 'male' | 'female') => void | Promise<void>
}

const BRAND = '#7B2D8E'

// Translate the user's gender (as stored on their record) to the
// avatar pool tag used in SPA_AVATARS.
function poolFor(gender: 'male' | 'female' | null): AvatarGender | null {
  if (gender === 'male') return 'men'
  if (gender === 'female') return 'women'
  return null
}

export function AvatarPicker({
  open,
  onClose,
  currentUrl,
  initials,
  gender,
  onSelect,
  onGenderSelect,
}: Props) {
  const [picked, setPicked] = React.useState<string | null>(currentUrl)
  const [saving, setSaving] = React.useState(false)
  // Local gender mirrors the prop, but we bias it toward "whatever
  // the viewer just picked inline" so the grid renders the instant
  // they tap a gender card — even before the parent's async save
  // round-trips back through the `gender` prop. When the prop later
  // resolves to the same value (or the parent explicitly flips it),
  // this stays in sync via the effects below.
  const [localGender, setLocalGender] = React.useState<'male' | 'female' | null>(gender)
  const [savingGender, setSavingGender] = React.useState(false)

  // Re-sync local state each time the modal opens so repeat visits
  // don't stick on a stale selection from a previous session.
  React.useEffect(() => {
    if (open) {
      setPicked(currentUrl)
      setSaving(false)
      setSavingGender(false)
      setLocalGender(gender)
    }
  }, [open, currentUrl, gender])

  // If the parent saves a new gender (and pushes it via the prop),
  // reflect it locally so we never drift.
  React.useEffect(() => {
    if (gender) setLocalGender(gender)
  }, [gender])

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

  const pool = poolFor(localGender)
  const avatars = pool ? SPA_AVATARS.filter((a) => a.gender === pool) : []
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

  // Pick a gender from the inline chooser. Flip local state first so
  // the grid renders right away, THEN fire the parent persistence
  // callback in the background. If the parent throws we roll back so
  // the UI matches the source of truth.
  const handleGender = async (g: 'male' | 'female') => {
    const previous = localGender
    setLocalGender(g)
    if (!onGenderSelect) return
    try {
      setSavingGender(true)
      await onGenderSelect(g)
    } catch {
      setLocalGender(previous)
    } finally {
      setSavingGender(false)
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
          <h2 className="text-base sm:text-lg font-bold text-gray-900">
            Choose an Avatar
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

        {/* Body — either the grid filtered to the viewer's gender, or
            a nudge to set their gender when we don't have it. */}
        {pool ? (
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5">
            <p className="text-xs text-gray-500 mb-4">
              Tap a portrait, then tap <span className="font-medium text-gray-700">Use Avatar</span> to save.
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 sm:gap-5">
              {avatars.map((a) => {
                const selected = picked === a.url
                return (
                  // Outer wrapper is `relative` but NOT overflow-hidden
                  // so the selection checkmark can sit on the edge of
                  // the avatar without being clipped by the circle.
                  // The circular portrait itself lives on the inner
                  // button which keeps the overflow-hidden it needs
                  // to render the image as a circle.
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
                      {/* Hover ring — pure in-button affordance, no
                          need to escape the overflow-hidden. */}
                      {!selected && (
                        <span className="absolute inset-0 rounded-full pointer-events-none transition-all group-hover:ring-2 group-hover:ring-gray-300" />
                      )}
                    </button>

                    {/* Selection ring — sits on the wrapper (outside
                        the overflow-hidden) so the ring renders
                        cleanly around the circle. Previously had a
                        soft outer glow via box-shadow; trimmed to a
                        single crisp brand-coloured ring per the
                        product's "less shadow" direction. */}
                    {selected && (
                      <span
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{ boxShadow: `0 0 0 3px ${BRAND}` }}
                      />
                    )}

                    {/* Selection checkmark — sits on the wrapper so
                        the round badge at the bottom-right isn't
                        clipped by the circle. No drop shadow; the
                        white ring keeps it readable against any
                        avatar background. */}
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
        ) : (
          // No gender on record yet — previously we punted the user
          // over to Settings to set it, which broke the whole "I just
          // want to pick an avatar right now" flow. Instead, render
          // an inline chooser: two large cards (Men / Women) that,
          // once tapped, immediately flip the grid on in place.
          // `onGenderSelect` persists the choice in the background so
          // the picker never has to be re-prompted.
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-6 sm:py-8">
            <div className="max-w-sm mx-auto text-center">
              <div
                className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${BRAND}1A`, color: BRAND }}
              >
                <UserRound className="w-6 h-6" />
              </div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5">
                Who are we picking avatars for?
              </h3>
              <p className="text-sm text-gray-600">
                Tap one to see avatars designed for you. You can always change this later from your profile.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 max-w-sm mx-auto">
              {(
                [
                  { key: 'male' as const, label: 'Men', Icon: User2 },
                  { key: 'female' as const, label: 'Women', Icon: UserRound },
                ]
              ).map(({ key, label, Icon }) => {
                const isBusy = savingGender
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleGender(key)}
                    disabled={isBusy}
                    className="group relative flex flex-col items-center justify-center gap-2 py-6 sm:py-8 rounded-2xl border-2 border-gray-200 hover:border-[#7B2D8E] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7B2D8E]/40 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <span
                      className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
                      style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
                    >
                      <Icon className="w-6 h-6" strokeWidth={2} />
                    </span>
                    <span className="text-sm font-semibold text-gray-900 group-hover:text-[#7B2D8E] transition-colors">
                      {label}
                    </span>
                  </button>
                )
              })}
            </div>

            {savingGender && (
              <p className="mt-5 flex items-center justify-center gap-2 text-xs text-gray-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Setting things up…
              </p>
            )}
          </div>
        )}

        {/* Sticky CTA — smaller than before (h-12, text-sm), with a
            subtler shadow. The user specifically asked for a less
            heavy button here. */}
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
              'Use Avatar'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
