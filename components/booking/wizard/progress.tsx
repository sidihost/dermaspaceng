'use client'

import { Check } from 'lucide-react'

// Slim 5-dot progress indicator. We deliberately use dots rather
// than the labelled stepper from shadcn — labels eat horizontal
// space on mobile and the customer doesn't really need to read
// "Date & Time" again right after they leave it.
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
            <li key={step.key} className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
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
                <span
                  className={[
                    'truncate text-[11px] font-medium',
                    isCurrent ? 'text-gray-900' : 'text-gray-400',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 ? (
                <span
                  className={[
                    'mt-2 hidden h-0.5 w-full rounded-full sm:block',
                    isDone ? 'bg-[#7B2D8E]' : 'bg-gray-100',
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
