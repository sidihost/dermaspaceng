'use client'

import { Check } from 'lucide-react'

// Slim 4-dot progress indicator. We deliberately use dots rather
// than the labelled stepper from shadcn — labels eat horizontal
// space on mobile and the customer doesn't really need to read
// "Date & Time" again right after they leave it.
//
// Mobile compaction (Google / Vercel pattern)
// -------------------------------------------
// Up to and including ~640px we ONLY show the label for the CURRENT
// step. Other steps render as bare numbered/checked dots. That
// matches how Google Pay, Vercel deploy wizards and Stripe Checkout
// handle multi-step nav on phones — it eliminates the ugly
// "Loca…/Servi…/Date…/Revie…" truncation we were shipping before
// (see screenshot dated 2026-05-04) and lets the user actually read
// the step they're on.
export interface WizardProgressProps {
  steps: { key: string; label: string }[]
  current: number // 0-indexed
}

export function WizardProgress({ steps, current }: WizardProgressProps) {
  return (
    <nav aria-label="Booking progress" className="w-full">
      <ol className="flex items-center gap-1.5">
        {steps.map((step, i) => {
          const isDone = i < current
          const isCurrent = i === current
          return (
            <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1.5">
              <span
                aria-current={isCurrent ? 'step' : undefined}
                className={[
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold transition-colors',
                  isDone
                    ? 'bg-[#7B2D8E] text-white'
                    : isCurrent
                      ? 'bg-[#7B2D8E]/10 text-[#7B2D8E] ring-2 ring-[#7B2D8E]'
                      : 'bg-gray-100 text-gray-400',
                ].join(' ')}
              >
                {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
              </span>
              {/* Mobile: only the current step's label is visible —
                  prevents the four-way "Loca…/Servi…/Date…/Revie…"
                  truncation. Desktop (sm+): every label is shown so
                  the user can scan ahead. */}
              <span
                className={[
                  'truncate text-[11px] font-medium',
                  isCurrent
                    ? 'text-gray-900'
                    : 'text-gray-400 hidden sm:inline',
                ].join(' ')}
              >
                {step.label}
              </span>
              {i < steps.length - 1 ? (
                <span
                  className={[
                    'ml-1 hidden h-px flex-1 sm:block',
                    isDone ? 'bg-[#7B2D8E]' : 'bg-gray-200',
                  ].join(' ')}
                  aria-hidden="true"
                />
              ) : null}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
