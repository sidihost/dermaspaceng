'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  Crown,
  Wallet,
  Receipt,
  Sparkles,
  Percent,
  Calendar,
  ChevronRight,
} from 'lucide-react'
import { getMembershipPlan, formatGlowPoints } from '@/lib/membership-plans'

/*
 * Subscribed-member dashboard card — top of /dashboard for any user
 * with an active Silver / Gold / Platinum membership. Replaces the
 * old solid-purple panel with a "benefits enjoyed so far" layout
 * inspired by the way YouTube Premium surfaces member usage, but
 * adapted to the Dermaspace brand:
 *
 *   - White surface with brand-purple (#7B2D8E) accents only — no
 *     shadows, no gradients, no sparkle / zap icons (deliberate
 *     design constraint).
 *   - Header strip: tier chip, member name, "Member since …", and a
 *     circular avatar on the right (real photo if the user has one,
 *     initial fallback otherwise).
 *   - Benefits list: each row shows a tinted icon tile, a benefit
 *     label, and the live value pulled from the membership block.
 *     Spacing and icon sizes are intentionally compact so the card
 *     drops into the existing dashboard rhythm without growing the
 *     section any taller than the old card did.
 *   - Renewal CTAs surface only when the membership is expiring or
 *     has lapsed — silence by default, signal when it matters.
 */

export type MembershipBlock = {
  tier: string | null
  status: string | null
  startedAt: string | null
  expiresAt: string | null
  fundedAmount: number
  balance: number
  /** Current Glow Points balance — loyalty reward earned through
   *  the membership. Shown as the headline benefit on the card so
   *  members can see what their tier has unlocked at a glance. */
  glowPoints: number
}

interface MembershipCardProps {
  membership: MembershipBlock | null | undefined
  /** Customer first name — drives the headline and the avatar
   *  initial fallback. */
  firstName?: string | null
  /** Customer last name — combined with firstName for the full
   *  display name. Optional; omit for a first-name-only render. */
  lastName?: string | null
  /** Optional R2 avatar URL. When present we render it as a real
   *  <Image>; otherwise we fall back to the first-name initial in a
   *  brand-purple circle. */
  avatarUrl?: string | null
}

// Naira formatter — wallet balances are always NGN, no kobo.
function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) return '₦0'
  return `₦${Math.round(amount).toLocaleString('en-NG')}`
}

// Days remaining on the subscription — positive while active,
// 0 on expiry day, negative once lapsed. The card uses this for
// both the "Days remaining" row and the expiring-soon CTA.
function daysUntil(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(ms)) return null
  return Math.ceil(ms / (1000 * 60 * 60 * 24))
}

// "Member since Mar 2024" — short and friendly. en-NG keeps the
// ordering consistent with the rest of the product.
function formatMemberSince(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-NG', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

// Full renewal date for the "Renews on" line in the footer.
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

// Single benefit row — icon tile, label on the left, value on the
// right. Kept as a local component so the rendering loop stays
// declarative below and we can apply consistent spacing.
function BenefitRow({
  icon: Icon,
  label,
  value,
  sublabel,
}: {
  icon: typeof Wallet
  label: string
  value: string
  sublabel?: string
}) {
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="w-9 h-9 rounded-lg bg-[#7B2D8E]/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-[#7B2D8E]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium text-gray-900 leading-tight">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{sublabel}</p>
        )}
      </div>
      <span className="text-[13px] font-semibold text-gray-900 tabular-nums flex-shrink-0">
        {value}
      </span>
    </div>
  )
}

export function MembershipCard({
  membership,
  firstName,
  lastName,
  avatarUrl,
}: MembershipCardProps) {
  // Non-members get nothing here — the dashboard stats grid already
  // shows them a "Standard / Upgrade" tile.
  if (!membership || !membership.tier) return null

  const plan = getMembershipPlan(membership.tier)
  const tierLabel = plan ? plan.name.toUpperCase() : 'MEMBER'
  const isActive = membership.status === 'active'
  const isExpired =
    membership.status === 'expired' || membership.status === 'cancelled'
  const daysLeft = daysUntil(membership.expiresAt)
  // 30-day window matches the renewal email cadence — gives the
  // member two touchpoints before the term actually lapses.
  const expiringSoon =
    isActive && daysLeft !== null && daysLeft <= 30 && daysLeft >= 0

  // Derived values for the benefit rows. We pull live numbers from
  // the membership block so the figures stay honest — no hard-coded
  // hour counts like the YouTube reference.
  const spent = Math.max(0, membership.fundedAmount - membership.balance)
  const treatmentDiscount = plan?.treatmentDiscountPct ?? 0
  const isSiteTier = plan?.siteWideOnly ?? false

  const displayName =
    [firstName, lastName].filter(Boolean).join(' ').trim() || 'Member'
  const initial = (firstName || 'M').slice(0, 1).toUpperCase()

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* ---------------------------------------------------------------
          Header — tier chip + name + member-since on the left, avatar
          on the right. The brand-purple tint on the chip + avatar
          carries the identity without leaning on a gradient.
      --------------------------------------------------------------- */}
      <div className="border-b border-gray-100 p-4 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#7B2D8E] text-white text-[10px] font-bold tracking-wider">
            <Crown className="w-3 h-3" aria-hidden="true" />
            {tierLabel}
          </span>
          <h3 className="mt-1.5 text-lg font-bold text-gray-900 leading-tight truncate">
            {displayName}
          </h3>
          {membership.startedAt && (
            <p className="text-[11.5px] text-gray-500 mt-0.5">
              Member since {formatMemberSince(membership.startedAt)}
            </p>
          )}
        </div>

        {/* Avatar — real photo when available, branded initial otherwise.
            Sized to match the YouTube reference (≈56px on mobile) but
            uses our circular brand-purple fallback instead of a flat
            grey ring. */}
        <div className="w-14 h-14 rounded-full bg-[#7B2D8E] flex items-center justify-center text-white font-bold text-xl flex-shrink-0 overflow-hidden">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </div>
      </div>

      {/* ---------------------------------------------------------------
          Benefits enjoyed so far — list of rows divided by light
          horizontal rules. Order is: what's left to spend, what's
          already been spent, what was earned at signup, what discount
          the tier unlocks (only when non-zero), and time remaining.
      --------------------------------------------------------------- */}
      <div className="px-4 pt-3 pb-1">
        <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
          Membership benefits enjoyed so far
        </h4>

        <div className="divide-y divide-gray-100">
          {/* Glow Points - the headline loyalty reward, shown first
              because it's the benefit every tier earns. */}
          <BenefitRow
            icon={Sparkles}
            label="Glow Points balance"
            sublabel="Unlocks features across Dermaspace"
            value={formatGlowPoints(membership.glowPoints)}
          />
          {/* Wallet rows - Platinum only. Site tiers (Silver, Gold)
              don't credit money so the wallet block is hidden to
              avoid implying a refund. */}
          {!isSiteTier && (
            <>
              <BenefitRow
                icon={Wallet}
                label="Wallet balance"
                sublabel={`of ${formatNaira(membership.fundedAmount)} funded`}
                value={formatNaira(membership.balance)}
              />
              <BenefitRow
                icon={Receipt}
                label="Credit redeemed"
                sublabel="Spent on bookings & treatments"
                value={formatNaira(spent)}
              />
            </>
          )}
          {treatmentDiscount > 0 && (
            <BenefitRow
              icon={Percent}
              label="Treatment discount"
              sublabel="Auto-applied at the Dermaspace spa"
              value={`${treatmentDiscount}%`}
            />
          )}
          <BenefitRow
            icon={Calendar}
            label={isExpired ? 'Expired on' : 'Renews on'}
            sublabel={
              isActive && daysLeft !== null
                ? daysLeft > 0
                  ? `${daysLeft} day${daysLeft === 1 ? '' : 's'} remaining`
                  : 'Expires today'
                : isExpired
                  ? 'Reactivate to restore benefits'
                  : undefined
            }
            value={formatExpiry(membership.expiresAt)}
          />
        </div>
      </div>

      {/* ---------------------------------------------------------------
          Footer — quick link to wallet (always visible for active
          members) and renewal CTAs when lifecycle warrants it. A
          single row keeps the card compact; we never stack multiple
          CTAs on top of one another.
      --------------------------------------------------------------- */}
      <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-2">
        {expiringSoon && (
          <Link
            href="/membership"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-[12.5px] font-semibold hover:bg-[#5A1D6A]"
          >
            Renew membership
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
        {isExpired && (
          <Link
            href="/membership"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#7B2D8E] text-white text-[12.5px] font-semibold hover:bg-[#5A1D6A]"
          >
            Reactivate {plan?.name ?? 'membership'}
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
        <Link
          href="/dashboard/wallet"
          className="ml-auto inline-flex items-center gap-0.5 text-[12px] font-medium text-[#7B2D8E] hover:text-[#5A1D6A]"
        >
          View wallet
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  )
}
