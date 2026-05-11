/**
 * Membership-plan catalog
 *
 * Single source of truth for the tiered subscription plans the company
 * sells on the /membership page. Both the public marketing grid and
 * the personalised dashboard card pull from this file, so when an
 * admin needs to tweak the price of "Gold" or add a new perk to
 * "Platinum" we touch one file and every surface updates in lockstep.
 *
 * Tier IDs are also the strings stored in `users.membership_tier`,
 * which keeps the joins simple — `WHERE membership_tier = 'platinum'`
 * is a covering-index hit on the column added by script 480.
 *
 * Pricing is in plain naira (not kobo) because the existing wallet
 * funding flow already handles the kobo conversion at the Paystack
 * boundary and the marketing copy renders the naira figure verbatim.
 *
 * ---------------------------------------------------------------------
 * GLOW POINTS — the reward currency
 *
 * Every plan grants a one-off `glowPointsOnSignup` award at activation.
 * Glow Points are NOT money: they don't appear in the wallet ledger,
 * they don't settle to naira, and they're never tied to a single
 * booking. They unlock site features (priority booking, early
 * partner access, member-only offers, etc.) and act as a visible
 * "loyalty badge" on the user's dashboard. See script
 * `620-glow-points.sql` for the ledger schema.
 *
 * Critically:
 *   * Silver / Gold are SITE-WIDE memberships — they unlock website
 *     features and grant Glow Points, but they do NOT credit money
 *     to the user's wallet.
 *   * Platinum is the flagship Dermaspace spa membership — it
 *     credits the user's wallet AND grants the largest Glow Points
 *     award AND unlocks in-house treatment discounts.
 * The `siteWideOnly` flag below is the runtime branch that enforces
 * this — every payment / verify path checks it before touching the
 * wallet.
 * ---------------------------------------------------------------------
 */

export type MembershipTierId = 'silver' | 'gold' | 'platinum'

export interface MembershipPlan {
  /** Stable identifier; persisted in `users.membership_tier`. */
  id: MembershipTierId
  /** Public-facing name on the marketing page. */
  name: string
  /** One-sentence positioning, sits under the name on the plan card. */
  tagline: string
  /** Annual subscription cost in NGN (no kobo). */
  price: number
  /** Validity in months — currently always 12 but kept here so a future
   *  monthly tier can drop in cleanly. */
  validityMonths: number
  /** One-off Glow Points granted on signup. NOT money — see the top
   *  comment for the points philosophy. The receipt + dashboard
   *  surface this so members see exactly what they earned. */
  glowPointsOnSignup: number
  /** Discount applied to facial / body treatments on top of the wallet
   *  debit. Honoured by the booking pricing path. */
  treatmentDiscountPct: number
  /** Discount applied to waxing & mani-pedi (smaller margin services). */
  waxingDiscountPct: number
  /** True when the plan is a site-wide membership (Silver, Gold)
   *  that unlocks website features and is NOT tied to the
   *  Dermaspace spa service. False for the flagship Platinum spa
   *  membership (which credits the wallet + grants treatment
   *  discounts in-house). Drives copy + payment math so site
   *  memberships never accidentally credit money to the user's
   *  wallet. */
  siteWideOnly: boolean
  /** Bullet-point perks shown on the marketing card, in the order they
   *  should appear. Keep these terse — the card is space-constrained. */
  perks: string[]
  /** Whether this plan should be marked as the recommended pick on
   *  the marketing grid. Drives the "Most popular" pill. */
  recommended?: boolean
  /** Hex colour used for the small accent strip on the plan card and
   *  the badge ring on the dashboard membership card. We keep these
   *  inside the brand palette (no rainbow) so the grid still reads as
   *  one cohesive product. */
  accent: string
}

/**
 * Ordered list of plans — order here is the order they render on the
 * /membership page, so cheapest -> most expensive (left to right on
 * desktop, top to bottom on mobile).
 */
export const MEMBERSHIP_PLANS: readonly MembershipPlan[] = [
  // Silver & Gold are *site-wide* memberships — they unlock perks
  // across the whole Dermaspace platform (priority queue, early
  // partner access, member offers) and are NOT tied to the
  // Dermaspace spa. Platinum is the flagship spa membership and is
  // the only tier that funds the wallet + carries in-house
  // treatment discounts.
  {
    id: 'silver',
    name: 'Silver',
    tagline:
      'Site membership — unlocks more website features. Not tied to our spa service.',
    // Entry-level platform tier, deliberately priced low (₦10k/yr)
    // so any Dermaspace customer can opt in.
    price: 10_000,
    validityMonths: 12,
    // 500 Glow Points — enough to feel meaningful next to the entry
    // price but visibly stepped below Gold / Platinum.
    glowPointsOnSignup: 500,
    // Treatment-discount fields are kept at 0 for site tiers —
    // they only apply at participating spas via partner promos,
    // never as a flat platform-wide discount.
    treatmentDiscountPct: 0,
    waxingDiscountPct: 0,
    siteWideOnly: true,
    perks: [
      'Earn 500 Glow Points to unlock site features',
      'Member-only seasonal offers across the site',
      'Faster checkout with saved booking details',
      'Early access to new partner listings',
      'Valid for 12 months',
      'Not tied to our Dermaspace spa service',
    ],
    accent: '#9C8FA8',
  },
  {
    id: 'gold',
    name: 'Gold',
    tagline:
      'Site membership — unlocks priority website features. Not tied to our spa service.',
    // Mid-tier platform membership at ₦20k/yr. Sits squarely
    // between Silver (₦10k) and Platinum (₦500k) so the upgrade
    // path from Silver feels frictionless while keeping the
    // flagship Platinum tier clearly differentiated.
    price: 20_000,
    validityMonths: 12,
    // 1,500 Glow Points — 3× Silver, visibly bigger reward.
    glowPointsOnSignup: 1_500,
    treatmentDiscountPct: 0,
    waxingDiscountPct: 0,
    siteWideOnly: true,
    perks: [
      'Earn 1,500 Glow Points to unlock priority features',
      'Priority booking on weekdays across the site',
      'Member-only seasonal offers &amp; partner promos',
      'Early access to new partner listings',
      'Dedicated booking support',
      'Valid for 12 months',
      'Not tied to our Dermaspace spa service',
    ],
    recommended: true,
    accent: '#C9A961',
  },
  {
    id: 'platinum',
    name: 'Platinum',
    tagline: 'Our flagship Dermaspace spa membership',
    price: 500_000,
    validityMonths: 12,
    // 10,000 Glow Points — the flagship reward, plus the wallet
    // credit + treatment discounts below.
    glowPointsOnSignup: 10_000,
    treatmentDiscountPct: 10,
    waxingDiscountPct: 5,
    siteWideOnly: false,
    perks: [
      'Earn 10,000 Glow Points to unlock every site feature',
      '10% off all facial &amp; body treatments at Dermaspace',
      '5% off waxing &amp; mani-pedi at Dermaspace',
      'Your ₦500,000 lands in your wallet as spendable credit',
      'Priority booking, every day',
      'Complimentary quarterly signature facial',
      'Valid for 12 months',
    ],
    accent: '#7B2D8E',
  },
] as const

/** Look up a plan by its ID. Returns undefined for unknown values so
 *  we never crash on a stale tier left over from a discontinued plan. */
export function getMembershipPlan(
  id: string | null | undefined,
): MembershipPlan | undefined {
  if (!id) return undefined
  return MEMBERSHIP_PLANS.find((p) => p.id === id)
}

/** Format a naira amount the way the marketing page wants it —
 *  "₦150,000" with the actual naira sign and en-NG grouping. */
export function formatNgn(amount: number): string {
  return `\u20A6${amount.toLocaleString('en-NG')}`
}

/** Format a Glow Points figure with grouping ("10,000 Glow Points").
 *  Centralised so every surface uses the same en-NG locale + label. */
export function formatGlowPoints(points: number): string {
  return `${points.toLocaleString('en-NG')} Glow Points`
}
