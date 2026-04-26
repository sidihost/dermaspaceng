'use client'

/**
 * Password strength meter.
 *
 * Visual feedback that updates as the user types. Three sub-pieces:
 *
 *   1. **Segmented bar** — four pills, each filling in as the score
 *      climbs. Colour transitions from rose (weak) → amber (fair)
 *      → emerald (good) → brand-purple (strong) so the feedback is
 *      pre-attentively obvious.
 *   2. **Verdict label** — single word ("Weak" / "Fair" / "Good" /
 *      "Strong") in the colour matching the bar.
 *   3. **Checklist** — six rules with inline tick / dot icons so
 *      the user knows exactly which one is missing.
 *
 * Pure presentational component — scoring lives in
 * `lib/password-strength.ts` so it can run identically on the
 * server during signup validation. The meter is driven by passing
 * the password value down; the consumer can also pass a
 * `breachWarning` prop set after the server's HIBP check returns
 * to surface the "found in 12,431 breaches" copy without coupling
 * the meter to the network call.
 */

import { Check, X } from 'lucide-react'
import { evaluatePasswordStrength, type StrengthLevel } from '@/lib/password-strength'

interface Props {
  password: string
  /** Optional. When set, renders a red breach warning above the
   *  checklist. The parent fetches this from /api/auth/password-check
   *  on a debounce; we don't run it ourselves to keep this
   *  component side-effect-free. */
  breachWarning?: string | null
  /** Hide the rule checklist on tight layouts (e.g. password
   *  reset modal). Defaults to showing it. */
  showChecklist?: boolean
}

const LEVEL_TO_BAR: Record<StrengthLevel, { fill: number; color: string; track: string }> = {
  // `fill` is how many of the 4 segments to colour in.
  // `color` is the foreground; `track` is the unfilled background.
  'too-short': { fill: 0, color: 'bg-gray-200', track: 'bg-gray-100' },
  weak: { fill: 1, color: 'bg-rose-500', track: 'bg-gray-100' },
  fair: { fill: 2, color: 'bg-amber-500', track: 'bg-gray-100' },
  good: { fill: 3, color: 'bg-emerald-500', track: 'bg-gray-100' },
  strong: { fill: 4, color: 'bg-[#7B2D8E]', track: 'bg-gray-100' },
}

const LEVEL_TO_TEXT: Record<StrengthLevel, string> = {
  'too-short': 'text-gray-500',
  weak: 'text-rose-600',
  fair: 'text-amber-600',
  good: 'text-emerald-600',
  strong: 'text-[#7B2D8E]',
}

export default function PasswordStrengthMeter({
  password,
  breachWarning,
  showChecklist = true,
}: Props) {
  const result = evaluatePasswordStrength(password)
  const bar = LEVEL_TO_BAR[result.level]
  const labelColor = LEVEL_TO_TEXT[result.level]

  // Don't render anything until the user has typed something — the
  // meter shouldn't shout "Too short!" at an empty input.
  if (password.length === 0) return null

  const rules: Array<{ key: keyof typeof result.checks; label: string }> = [
    { key: 'length', label: '8+ characters' },
    { key: 'upper', label: 'Uppercase letter' },
    { key: 'lower', label: 'Lowercase letter' },
    { key: 'digit', label: 'Number' },
    { key: 'symbol', label: 'Symbol (!@#)' },
    { key: 'notCommon', label: 'Not a common password' },
  ]

  return (
    <div className="mt-2" aria-live="polite">
      {/* Segmented bar — four pills. We render four equal-width
          divs and colour the first `fill` of them. */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-200 ${
              i < bar.fill ? bar.color : bar.track
            }`}
          />
        ))}
        {result.label && (
          <span className={`ml-2 text-xs font-semibold tabular-nums ${labelColor}`}>
            {result.label}
          </span>
        )}
      </div>

      {/* HIBP breach warning — only shown when the parent has
          confirmed via the server-side range API. Bright but not
          alarming; the user can still type a different password. */}
      {breachWarning && (
        <p className="mt-2 text-[12px] leading-snug text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
          {breachWarning}
        </p>
      )}

      {showChecklist && (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {rules.map((rule) => {
            const passed = result.checks[rule.key]
            return (
              <li
                key={rule.key}
                className={`flex items-center gap-1.5 text-[11.5px] leading-snug ${
                  passed ? 'text-emerald-600' : 'text-gray-500'
                }`}
              >
                <span
                  className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                    passed ? 'bg-emerald-500/15' : 'bg-gray-200/70'
                  }`}
                >
                  {passed ? (
                    <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={3} />
                  ) : (
                    <X className="h-2.5 w-2.5 text-gray-400" strokeWidth={3} />
                  )}
                </span>
                <span>{rule.label}</span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
