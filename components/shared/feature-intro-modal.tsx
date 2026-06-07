'use client'

import { useEffect, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Flower2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface FeatureIntroItem {
  icon: LucideIcon | ComponentType<{ className?: string }>
  title: string
  description: string
}

interface FeatureIntroModalProps {
  /**
   * Unique key. Once the user taps the primary button, we persist this
   * key to localStorage so the modal never re-appears for them. Bump
   * the suffix (e.g. "public-profile-v2") to re-show after changes.
   */
  storageKey: string
  /** Small eyebrow above the title, e.g. "Introducing". */
  eyebrow?: string
  title: string
  features: FeatureIntroItem[]
  /** Primary dismiss button label. Defaults to "Okay". */
  primaryLabel?: string
  /** Optional secondary text link shown under the button. */
  learnMoreLabel?: string
  learnMoreHref?: string
  /** Override the spotlight illustration icon. Defaults to the brand flower. */
  heroIcon?: LucideIcon | ComponentType<{ className?: string }>
  /** Render only when this is true (e.g. user is signed in). */
  enabled?: boolean
}

/**
 * Brand-styled feature introduction modal, inspired by the common
 * "Introducing X" onboarding sheet. Strictly follows the Dermaspace
 * design system: brand purple (#7B2D8E), themed tokens, flat surfaces
 * (no gradients, no coloured shadows), and no zap/sparkle icons.
 *
 * Shows once per user per storageKey.
 */
export function FeatureIntroModal({
  storageKey,
  eyebrow = 'Introducing',
  title,
  features,
  primaryLabel = 'Okay',
  learnMoreLabel,
  learnMoreHref,
  heroIcon: HeroIcon = Flower2,
  enabled = true,
}: FeatureIntroModalProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!enabled) return
    try {
      const seen = window.localStorage.getItem(`feature-intro:${storageKey}`)
      if (!seen) setOpen(true)
    } catch {
      // localStorage unavailable (private mode / SSR mismatch) — just show it.
      setOpen(true)
    }
  }, [enabled, storageKey])

  function dismiss() {
    try {
      window.localStorage.setItem(`feature-intro:${storageKey}`, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? dismiss() : setOpen(v))}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md gap-0 overflow-y-auto max-h-[90dvh] rounded-2xl border-border p-0"
      >
        <div className="flex flex-col items-center px-6 pb-5 pt-8 text-center sm:pb-6 sm:pt-10">
          {/* Spotlight hero — a soft brand-tinted disc behind the icon.
              Flat fill, no gradient, no coloured shadow. */}
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#7B2D8E]/10 sm:mb-6 sm:h-24 sm:w-24">
            <HeroIcon className="h-10 w-10 text-[#7B2D8E] sm:h-12 sm:w-12" />
          </div>

          {eyebrow ? (
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[#7B2D8E] sm:text-sm">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-balance font-serif text-xl font-semibold leading-tight text-foreground sm:text-2xl">
            {title}
          </h2>
        </div>

        {/* Feature list */}
        <ul className="flex flex-col gap-4 px-6 pb-2 sm:gap-5">
          {features.map((f) => {
            const Icon = f.icon
            return (
              <li key={f.title} className="flex items-start gap-4">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-[#7B2D8E]">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="flex flex-col gap-1 pt-0.5">
                  <p className="font-medium leading-snug text-foreground">{f.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {f.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>

        {/* Actions */}
        <div className="flex flex-col items-center gap-3 px-6 pb-6 pt-5 sm:pb-8 sm:pt-6">
          <button
            type="button"
            onClick={dismiss}
            className="w-full rounded-full bg-[#7B2D8E] px-6 py-3.5 font-medium text-white transition-colors hover:bg-[#5A1D6A]"
          >
            {primaryLabel}
          </button>
          {learnMoreLabel && learnMoreHref ? (
            <Link
              href={learnMoreHref}
              onClick={dismiss}
              className="text-sm font-medium text-[#7B2D8E] hover:underline"
            >
              {learnMoreLabel}
            </Link>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}
