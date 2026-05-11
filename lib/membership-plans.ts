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
 */

export type MembershipTierId = 'silver' | 'gold' | 'platinum'

export interface MembershipPlan {
  /** Stable identifier; persisted in `users.membership_tier`. */
  id: MembershipTierId
  /** Public-facing name on the marketing page. */
  name: string
  /** One-sentence positioning, sits under the name on the plan card. */
  tagline: string
  /** Annual subscription cost in NGN (no kobo). Funded as wallet credit. */
  price: number
  /** Validity in months — currently always 12 but kept here so a future
   *  monthly tier can drop in cleanly. */
  validityMonths: number
  /** Bonus wallet credit added at signup, expressed as a percent of the
   *  plan price. Silver: 5% / Gold: 8% / Platinum: 10%. */
  bonusCreditPct: number
  /** Discount applied to facial / body treatments on top of the wallet
   *  debit. Honoured by the booking pricing path. */
  treatmentDiscountPct: number
  /** Discount applied to waxing & mani-pedi (smaller margin services). */
  waxingDiscountPct: number
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
  // across the whole Dermaspace platform (booking on any partner
  // listing, wallet bonus, priority queue, etc.) and are NOT tied to
  // a specific spa. Platinum is the only tier specific to the
  // DermaspaceNG spa flagship and carries the in-house treatment
  // perks. The pricing structure was set deliberately by the
  // founder so the platform memberships feel like an "anyone can
  // join" entry point and Platinum stays a destination tier.
  {
    id: 'silver',
    name: 'Silver',
    tagline: 'Site membership — start saving on every booking',
    // Entry-level platform tier, deliberately priced low (₦10k/yr)
    // so any Dermaspace customer can opt in. Originally ₦150k, but
    // the founder reset the site-tier pricing so the platform
    // memberships are a true "anyone can join" entry point and
    // Platinum (₦500k) stays the destination tier.
    price: 10_000,
    validityMonths: 12,
    bonusCreditPct: 5,
    // Treatment-discount fields are kept at 0 for site tiers —
    // they only apply at participating spas via partner promos,
    // never as a flat platform-wide discount.
    treatmentDiscountPct: 0,
    waxingDiscountPct: 0,
    perks: [
      '5% bonus wallet credit on signup',
      'Member-only seasonal offers across the site',
      'Faster checkout with saved booking details',
      'Early access to new partner listings',
      'Valid for 12 months',
    ],
    accent: '#9C8FA8',
  },
  {
    id: 'gold',
    name: 'Gold',
    tagline: 'Site membership — priority access &amp; deeper rewards',
    // Mid-tier platform membership at ₦20k/yr. Sits squarely
    // between Silver (₦10k) and Platinum (₦500k) so the upgrade
    // path from Silver feels frictionless while keeping the
    // flagship Platinum tier clearly differentiated.
    price: 20_000,
    validityMonths: 12,
    bonusCreditPct: 8,
    treatmentDiscountPct: 0,
    waxingDiscountPct: 0,
    perks: [
      '8% bonus wallet credit on signup',
      'Priority booking on weekdays across the site',
      'Member-only seasonal offers &amp; partner promos',
      'Early access to new partner listings',
      'Dedicated booking support',
      'Valid for 12 months',
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
    bonusCreditPct: 10,
    treatmentDiscountPct: 10,
    waxingDiscountPct: 5,
    perks: [
      '10% off all facial &amp; body treatments at Dermaspace',
      '5% off waxing &amp; mani-pedi at Dermaspace',
      '10% bonus wallet credit on signup',
      'Priority booking, every day',
      'Complimentary quarterly signature facial',
      'Transferable benefits',
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
