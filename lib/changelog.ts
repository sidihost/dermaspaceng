// Source of truth for the public "What's New" changelog (/changelog).
//
// Each entry can carry two screenshots — a desktop (landscape) and a
// mobile (portrait) capture. The page shows whichever matches the
// visitor's viewport, so desktop visitors see the desktop screenshot
// and phone visitors see the mobile one.

export type ChangeKind = 'New' | 'Improved' | 'Fixed'

export interface ChangelogEntry {
  /** Stable anchor id, also used as the React key. */
  id: string
  /** Human label shown as the version/tag chip, e.g. "June 2026". */
  date: string
  /** Sortable ISO date (newest first). */
  isoDate: string
  kind: ChangeKind
  title: string
  description: string
  /** Short bullet highlights. */
  highlights: string[]
  /** Optional responsive screenshots. */
  screenshot?: {
    desktop: string
    mobile: string
    /** Accessible description of what the screenshots show. */
    alt: string
  }
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 'activity-email-history',
    date: 'June 2026',
    isoDate: '2026-06-24',
    kind: 'New',
    title: 'Activity history & email resending',
    description:
      'Your account now keeps a clear, timestamped record of everything that happens — sign-ins, bookings, wallet top-ups and more. You can also review the emails we have sent you and resend any of them in one tap if you missed it.',
    highlights: [
      'A full activity timeline for your account',
      'See every email we have sent, with delivery status',
      'Resend any email instantly if it never arrived',
    ],
  },
  {
    id: 'personalized-help-center',
    date: 'June 2026',
    isoDate: '2026-06-20',
    kind: 'Improved',
    title: 'A more personal Help Center',
    description:
      'The Help Center now greets you by name when you are signed in and leads with the questions most relevant to your account — bookings, wallet, memberships and profile — with answers that link straight to the right page.',
    highlights: [
      'Personalized greeting and suggestions for signed-in members',
      'Account-focused popular questions',
      'Instant answers linked to the exact page you need',
    ],
    screenshot: {
      desktop: '/changelog/help-desktop.png',
      mobile: '/changelog/help-mobile.png',
      alt: 'Personalized Help Center with search box and suggested questions',
    },
  },
  {
    id: 'refreshed-services',
    date: 'June 2026',
    isoDate: '2026-06-18',
    kind: 'Improved',
    title: 'A refreshed services showcase',
    description:
      'The Services section on our homepage has a new editorial look — larger imagery with the treatment name and details set over each photo, plus a quick way to browse everything we offer.',
    highlights: [
      'Premium full-bleed treatment cards',
      'Save a category to your favourites without leaving home',
      'New "View all services" shortcut',
    ],
    screenshot: {
      desktop: '/changelog/services-desktop.png',
      mobile: '/changelog/services-mobile.png',
      alt: 'Homepage services section with editorial treatment cards',
    },
  },
]
