'use client'

import Link from 'next/link'
import { Crown, Wallet, Calendar, ChevronRight } from 'lucide-react'
import { getMembershipPlan } from '@/lib/membership-plans'

/*
 * Platinum membership card rendered at the top of the dashboard for
 * subscribed users. The component is intentionally self-contained:
 * `app/dashboard/page.tsx` passes the membership block straight from
 * `/api/auth/me` and the card decides whether to render itself
 * (active members), render an "expiring soon" warning, or render
 * nothing at all (legacy / non-members — the upgrade CTA already
 * lives in the stats grid in that case).
 *
 * Design rules followed exactly:
 *   - Solid brand purple (#7B2D8E), no gradients, no sparkle / zap.
 *   - Crown icon only (lucide-react). Same icon used on
 *     /membership so the visual language matches.
 *   - Reuses the dashboard's rounded-2xl + 1-pixel border rhythm so
 *     it slots between the Welcome Header and Stats Grid without
 *     visually fighting either neighbour.
 */

export type MembershipBlock = {
  tier: string | null
  status: string | null
  startedAt: string | null
  expiresAt: string | null
  fundedAmount: number
  balance: number
}

interface MembershipCardProps {
  membership: MembershipBlock | null | undefined
  /** Customer first name — used inside the eyebrow for a personalised
   *  "Platinum Member · Tobi" style label. Optional; omit for the
   *  generic "Platinum Member" fallback. */
  firstName?: string | null
}

// Naira formatter — wallet balances on Dermaspace are always in NGN.
// Force a thousands separator and zero fraction digits to match the
// in-product wallet page; users don't expect kobo precision here.
function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) return '₦0'
  return `₦${Math.round(amount).toLocaleString('en-NG')}`
}

// Days remaining on the subscription. Returns a positive integer for
// active subs, 0 on the day it expires, negative once it has lapsed.
// Caller decides how to render each case.
function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// Short, friendly date. We use `en-NG` so DD MMM YYYY ordering
// matches the rest of the product (booking confirmations, receipts).
function formatExpiry(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

export function MembershipCard({ membership, firstName }: MembershipCardProps) {
  // Render nothing for non-members. The dashboard already shows a
  // "Standard / Upgrade" tile in the stats grid, so a second CTA
  // here would be visual noise.
  if (!membership || !membership.tier) return null

  // Pull the plan from the shared catalog so the tier label
  // ("Silver Member" / "Gold Member" / "Platinum Member") and the
  // accent strip stay in lockstep with the public /membership page.
  // Unknown / discontinued tiers fall back to "Member" so we never
  // crash on a stale value.
  const plan = getMembershipPlan(membership.tier)
  const tierLabel = plan ? `${plan.name} Member` : 'Member'
  const isActive = membership.status === 'active'
  const isExpired = membership.status === 'expired' || membership.status === 'cancelled'
  const daysLeft = daysUntil(membership.expiresAt)
  // "Expiring soon" surfaces a renewal CTA without yelling at the
  // user. 30 days is the industry-standard renewal window and gives
  // us a couple of touchpoints (reminder email, in-app banner) before
  // the term lapses.
  const expiringSoon = isActive && daysLeft !== null && daysLeft <= 30 && daysLeft >= 0

  // Spend ratio — what fraction of the funded capital is still
  // available. Drives the slim progress bar at the bottom of the
  // card. We clamp 0..1 so a wallet top-up that lands in audit
  // before the funded total updates can't blow the bar past 100%.
  const ratio = membership.fundedAmount > 0
    ? Math.max(0, Math.min(1, membership.balance / membership.fundedAmount))
    : 0
  const spentLabel = formatNaira(Math.max(0, membership.fundedAmount - membership.balance))

  return (
    <div
      className={[
        'rounded-2xl overflow-hidden border',
        // Active members get the full-bleed brand-purple panel.
        // Expired / cancelled members get a quieter neutral surface
        // with a renewal CTA so we never imply they still have
        // benefits they no longer have.
        isActive
          ? 'bg-[#7B2D8E] border-[#6B2278]'
          : 'bg-white border-gray-200',
      ].join(' ')}
    >
      <div className="p-3.5 md:p-4">
        {/* Eyebrow row — Crown chip + tier label. We match the
            uppercase-tracked styling used on the public /membership
            hero so members see the same visual cue when they land
            on either page. */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div
            className={[
              'inline-flex items-center gap-1.5 px-2 py-1 rounded-full',
              isActive
                ? 'bg-white/12 border border-white/25'
                : 'bg-[#7B2D8E]/10 border border-[#7B2D8E]/20',
            ].join(' ')}
          >
            <Crown className={['w-3.5 h-3.5', isActive ? 'text-white' : 'text-[#7B2D8E]'].join(' ')} />
            <span
              className={[
                'text-[10.5px] font-semibold uppercase tracking-[0.14em]',
                isActive ? 'text-white' : 'text-[#7B2D8E]',
              ].join(' ')}
            >
              {tierLabel}{firstName ? ` · ${firstName}` : ''}
            </span>
          </div>
          {isActive && (
            <Link
              href="/dashboard/wallet"
              className="inline-flex items-center gap-0.5 text-[11.5px] font-medium text-white/90 hover:text-white"
            >
              Wallet
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>

        {/* Headline figures. Three columns on tablet+, two on mobile
            with the renewal date stacking under the balance — this
            keeps the most important number (live balance) visible
            even on the narrowest 320px-wide phones. */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div>
            <p
              className={[
                'text-[10.5px] uppercase tracking-wider mb-0.5',
                isActive ? 'text-white/65' : 'text-gray-500',
              ].join(' ')}
            >
              Wallet Balance
            </p>
            <p
              className={[
                'text-lg md:text-xl font-bold leading-tight tabular-nums',
                isActive ? 'text-white' : 'text-gray-900',
              ].join(' ')}
            >
              {formatNaira(membership.balance)}
            </p>
            <p className={['text-[11px] mt-0.5', isActive ? 'text-white/60' : 'text-gray-500'].join(' ')}>
              of {formatNaira(membership.fundedAmount)} funded
            </p>
          </div>

          <div>
            <p
              className={[
                'text-[10.5px] uppercase tracking-wider mb-0.5',
                isActive ? 'text-white/65' : 'text-gray-500',
              ].join(' ')}
            >
              Spent To Date
            </p>
            <p
              className={[
                'text-lg md:text-xl font-bold leading-tight tabular-nums',
                isActive ? 'text-white' : 'text-gray-900',
              ].join(' ')}
            >
              {spentLabel}
            </p>
            <p className={['text-[11px] mt-0.5', isActive ? 'text-white/60' : 'text-gray-500'].join(' ')}>
              redeemed via membership
            </p>
          </div>

          <div className="col-span-2 sm:col-span-1">
            <p
              className={[
                'text-[10.5px] uppercase tracking-wider mb-0.5',
                isActive ? 'text-white/65' : 'text-gray-500',
              ].join(' ')}
            >
              {isExpired ? 'Expired' : 'Renews'}
            </p>
            <p
              className={[
                'text-base md:text-lg font-semibold leading-tight',
                isActive ? 'text-white' : 'text-gray-900',
              ].join(' ')}
            >
              {formatExpiry(membership.expiresAt)}
            </p>
            {isActive && daysLeft !== null && (
              <p className={['text-[11px] mt-0.5', expiringSoon ? 'text-amber-200' : 'text-white/60'].join(' ')}>
                {daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
                  : 'Expires today'}
              </p>
            )}
          </div>
        </div>

        {/* Progress bar — only for active members. Anchored to the
            funded capital so people instantly see how much of their
            membership pot is still in play. */}
        {isActive && membership.fundedAmount > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div
              className="flex-1 h-1.5 rounded-full bg-white/15 overflow-hidden"
              role="progressbar"
              aria-valuenow={Math.round(ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Membership balance remaining"
            >
              <div
                className="h-full bg-white"
                style={{ width: `${Math.round(ratio * 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-white/85 tabular-nums">
              {Math.round(ratio * 100)}%
            </span>
          </div>
        )}

        {/* Lifecycle / renewal CTAs. Each branch is mutually
            exclusive so there's never more than one button visible
            on the card. */}
        {expiringSoon && (
          <Link
            href="/membership"
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-[#7B2D8E] text-[12.5px] font-semibold hover:bg-white/90"
          >
            Renew membership
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {isExpired && (
          <Link
            href="/membership"
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-[12.5px] font-semibold hover:bg-[#6B2278]"
          >
            Reactivate {plan?.name ?? 'membership'}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {/* Member-since strip. Quiet, unobtrusive, but a nice trust
          touch for long-tenured members ("Member since Mar 2024"). */}
      {membership.startedAt && (
        <div
          className={[
            'px-3.5 md:px-4 py-2 text-[11px] flex items-center gap-1.5',
            isActive
              ? 'bg-white/8 border-t border-white/12 text-white/75'
              : 'bg-gray-50 border-t border-gray-100 text-gray-500',
          ].join(' ')}
        >
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Member since{' '}
            {new Date(membership.startedAt).toLocaleDateString('en-NG', {
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="ml-auto inline-flex items-center gap-1 text-[10.5px] font-medium">
            <Wallet className="w-3.5 h-3.5" />
            {isActive ? 'Auto-applied at checkout' : 'Membership benefits paused'}
          </span>
        </div>
      )}
    </div>
  )
}
