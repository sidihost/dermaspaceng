/**
 * Single source of truth for the Dermaspace legal pack.
 * --------------------------------------------------------------
 * Bumping `CURRENT_LEGAL_VERSION` re-prompts every signed-in user
 * on their next dashboard visit. Use ISO dates (YYYY-MM-DD) so the
 * versions sort naturally and old emails / audit log rows still
 * make sense to a human reader.
 *
 * The three documents shown in the modal — Terms of Service,
 * Privacy Policy and Derma AI Terms — live as full pages at:
 *   /terms
 *   /privacy
 *   /derma-ai-terms
 * The strings below are *summaries* (the user-facing TL;DR) the
 * modal scrolls through. Each summary card always carries a
 * "Read full" link to the canonical page so users who want the
 * legalese can drop into it.
 */

export const CURRENT_LEGAL_VERSION = '2026-04-26'

/** Display labels for the version pill shown at the bottom of the
 *  modal — "Effective Apr 26, 2026". Pure cosmetic helper. */
export function formatLegalVersion(version: string): string {
  // Defensive — accept anything; if the format isn't a date,
  // fall back to the raw string.
  const d = new Date(version)
  if (Number.isNaN(d.getTime())) return version
  return d.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export interface LegalCard {
  /** Unique id we use for analytics + the swipe pagination dots. */
  id: 'derma-ai' | 'privacy' | 'terms'
  /** Eyebrow shown above the card title, e.g. "01 — Derma AI Terms". */
  eyebrow: string
  /** Big title at the top of the card. */
  title: string
  /** One-sentence intro paragraph rendered below the title. */
  intro: string
  /** 3–5 plain-English bullets the user actually reads. */
  highlights: string[]
  /** Where the canonical full text lives. */
  href: string
  /** Tiny "Read the full Derma AI Terms" CTA copy. */
  cta: string
}

/**
 * The three cards the user swipes through, in order.
 *
 * Bullet-list rules of thumb the editorial team agreed on:
 *   * Plain English — never "the User", always "you".
 *   * Each bullet ≤ ~100 chars so it fits on one line at mobile DPR.
 *   * Lead with what we DON'T do (data-minimization, no resale)
 *     before what we DO — readers stop after 2 bullets.
 *   * Mention concrete things ("Lagos", "Nigerian licensed therapists")
 *     so it doesn't feel like a generic policy template.
 */
export const LEGAL_CARDS: readonly LegalCard[] = [
  {
    id: 'derma-ai',
    eyebrow: '01 — Derma AI',
    title: 'Meet Derma AI, your skin & wellness assistant.',
    intro:
      'Derma AI helps you find the right treatment, plan a routine and book at our Victoria Island and Ikoyi studios. It is an assistant — not a doctor.',
    highlights: [
      'Suggestions are starting points, not diagnoses. Your therapist always has the final say.',
      'Conversations stay private to your account. We never sell or share them with advertisers.',
      'You can delete your chat history any time from Settings → Privacy.',
      'Don’t share government IDs, payment card numbers or other people’s data in chat.',
    ],
    href: '/derma-ai-terms',
    cta: 'Read the full Derma AI Terms',
  },
  {
    id: 'privacy',
    eyebrow: '02 — Privacy',
    title: 'How we look after your data.',
    intro:
      'We collect only what we need to run your account, your bookings and your skin profile — and we keep all of it under lock and key in encrypted Nigerian-resident storage.',
    highlights: [
      'We never sell your data. Period.',
      'Your skin profile, photos and consultation notes are visible only to you and the therapist treating you.',
      'You can export or delete your account end-to-end from Settings → Privacy.',
      'We use cookies for sign-in and fraud prevention only — no third-party ad tracking.',
    ],
    href: '/privacy',
    cta: 'Read the full Privacy Policy',
  },
  {
    id: 'terms',
    eyebrow: '03 — Terms',
    title: 'A few ground rules.',
    intro:
      'Standard stuff — what you agree to when you book, what we promise in return and how we handle the awkward edge cases together.',
    highlights: [
      'Be at least 13 years old to have an account; some treatments have higher age limits.',
      'Bookings can be rescheduled or cancelled per the cancellation policy on each service.',
      'Wallet credits, gift cards and rewards have their own redemption rules — we’ll always show them up front.',
      'Don’t harass our therapists or other users — we will close accounts that do.',
    ],
    href: '/terms',
    cta: 'Read the full Terms of Service',
  },
] as const
