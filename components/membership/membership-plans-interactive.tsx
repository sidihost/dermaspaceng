'use client'

/**
 * MembershipPlansInteractive
 * --------------------------------------------------------------
 * The interactive plan-selection block on /membership.
 *
 * Two layers:
 *
 *   1. A neat, compact stack of plan cards — name, price,
 *      one-line positioning and a "See what's included"
 *      affordance.
 *
 *   2. A Snapchat-"Upgrade to Lens+" style detail sheet that
 *      slides up when a card (or its feature affordance) is
 *      tapped: a solid brand-purple panel with feature cards,
 *      an expandable "all benefits" section, a big Subscribe
 *      pill, "View other plans", and the fine-print terms
 *      carrying a linked "Membership Terms".
 *
 * Styling rules from the team: Dermaspace brand purple (#7B2D8E)
 * and its shades only — NO gradients, NO drop shadows, NO glow
 * blur, and NO sparkle/zap icons. Depth comes from solid fills
 * and borders.
 */

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  Check,
  Crown,
  Percent,
  Award,
  Calendar,
  Gift,
  Wallet,
  Star,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import {
  type MembershipPlan,
  formatNgn,
  formatGlowPoints,
} from '@/lib/membership-plans'
import { useAuth } from '@/hooks/use-auth'

// Round-robin of on-brand icons for the perk -> feature-card
// mapping. Perks are plain strings in the catalog, so we pick an
// icon by keyword where we can and fall back otherwise.
function iconForPerk(perk: string) {
  const p = perk.toLowerCase()
  if (p.includes('glow point')) return Award
  if (p.includes('%') || p.includes('off ')) return Percent
  if (p.includes('wallet') || p.includes('credit')) return Wallet
  if (p.includes('priority') || p.includes('booking')) return Calendar
  if (p.includes('complimentary') || p.includes('facial')) return Gift
  if (p.includes('offer') || p.includes('promo') || p.includes('access'))
    return Star
  return Check
}

function periodLabel(months: number) {
  return months === 12 ? 'yr' : `${months} mo`
}
// (membership upgrade sheet — solid brand purple, no gradients/shadows)

export default function MembershipPlansInteractive({
  plans,
}: {
  plans: readonly MembershipPlan[]
}) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const activePlan = plans.find((p) => p.id === activeId) ?? null

  const close = useCallback(() => setActiveId(null), [])

  // Lock body scroll + close on Escape while the sheet is open.
  useEffect(() => {
    if (!activePlan) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [activePlan, close])

  return (
    <>
      {/* Neat plan stack */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5 items-stretch">
        {plans.map((plan) => {
          const isRecommended = plan.recommended
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setActiveId(plan.id)}
              className={`group relative flex flex-col text-left bg-white rounded-2xl p-5 md:p-6 transition-colors ${
                isRecommended
                  ? 'border-2 border-[#7B2D8E]'
                  : 'border border-gray-200 hover:border-[#7B2D8E]'
              }`}
            >
              {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="inline-block px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white bg-[#7B2D8E] rounded-full">
                    Most popular
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#7B2D8E]/10">
                  <Crown className="w-5 h-5 text-[#7B2D8E]" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-gray-900 leading-tight">
                    {plan.name}
                  </h3>
                  <p
                    className="text-xs text-gray-600 leading-snug"
                    dangerouslySetInnerHTML={{ __html: plan.tagline }}
                  />
                </div>
              </div>

              <div className="mb-4 pb-4 border-b border-gray-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl md:text-3xl font-bold text-gray-900">
                    {formatNgn(plan.price)}
                  </span>
                  <span className="text-xs text-gray-500">
                    /{periodLabel(plan.validityMonths)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-gray-500">
                  {plan.siteWideOnly
                    ? `Earn ${formatGlowPoints(
                        plan.glowPointsOnSignup,
                      )} on signup`
                    : `Funds your wallet + ${formatGlowPoints(
                        plan.glowPointsOnSignup,
                      )}`}
                </p>
              </div>

              {/* Short preview of the top perks, then the "see all"
                  affordance that opens the upgrade sheet. */}
              <ul className="space-y-2.5 flex-1">
                {plan.perks.slice(0, 3).map((perk, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 bg-[#7B2D8E]/10">
                      <Check className="w-2.5 h-2.5 text-[#7B2D8E]" />
                    </span>
                    <span
                      className="text-xs text-gray-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: perk }}
                    />
                  </li>
                ))}
              </ul>

              <span className="mt-5 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 font-semibold rounded-full text-sm bg-[#7B2D8E] text-white transition-colors group-hover:bg-[#5A1D6A]">
                See what&apos;s included
                <ChevronRight className="w-4 h-4" />
              </span>
            </button>
          )
        })}
      </div>

      <p className="mt-6 text-center text-xs text-gray-500">
        All plans are valid for 12 months and auto-renew is opt-in. Need
        something custom?{' '}
        <Link
          href="/contact"
          className="text-[#7B2D8E] font-semibold hover:underline"
        >
          Talk to our team
        </Link>
        .
      </p>

      {/* Upgrade detail sheet */}
      {activePlan && (
        <UpgradeSheet
          plan={activePlan}
          onClose={close}
          onSwitchPlan={(id) => setActiveId(id)}
          allPlans={plans}
        />
      )}
    </>
  )
}

function UpgradeSheet({
  plan,
  onClose,
  onSwitchPlan,
  allPlans,
}: {
  plan: MembershipPlan
  onClose: () => void
  onSwitchPlan: (id: string) => void
  allPlans: readonly MembershipPlan[]
}) {
  const [expanded, setExpanded] = useState(false)
  // First three perks become feature cards; the rest fold into the
  // expandable "Includes all benefits" panel.
  const featurePerks = plan.perks.slice(0, 3)
  const extraPerks = plan.perks.slice(3)
  const otherPlans = allPlans.filter((p) => p.id !== plan.id)

  // Logged-in users get a personalized header: their own avatar
  // (or initials) front-and-centre with a small brand crown badge —
  // Snapchat-"Lens+" style. Signed-out visitors fall back to the
  // plain Dermaspace brand mark.
  const { user, isAuthenticated } = useAuth()
  const initials =
    `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}`.toUpperCase() ||
    user?.email?.[0]?.toUpperCase() ||
    ''

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Upgrade to ${plan.name}`}
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
      />

      {/* Panel — solid brand-purple, no gradient, no shadow */}
      <div className="relative w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-[#3F1349] text-white border border-white/10">
        {/* Top bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-2 bg-[#3F1349]">
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-white/70">
            Dermaspace Membership
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 pb-5">
          {/* Avatar + title — compact, Snapchat-style. Logged-in
              users see their own photo/initials with a brand crown
              badge; visitors see the Dermaspace mark. */}
          <div className="text-center pt-1 pb-4">
            <div className="inline-flex items-center justify-center mb-2.5">
              <span className="relative inline-block">
                {isAuthenticated ? (
                  <span className="block w-16 h-16 rounded-full bg-white/15 ring-2 ring-white/30 overflow-hidden flex items-center justify-center">
                    {user?.avatarUrl ? (
                      <Image
                        src={user.avatarUrl || '/placeholder.svg'}
                        alt={user.firstName ?? 'Your avatar'}
                        width={96}
                        height={96}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xl font-bold text-white">
                        {initials || (
                          <Crown className="w-7 h-7 text-white" />
                        )}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="block w-16 h-16 rounded-full bg-white ring-2 ring-white/25 overflow-hidden flex items-center justify-center">
                    <Image
                      src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Dermaspace-9.png-EdcQ7u5ESh5sPzpgMsL9Sep8NnY0iu.webp"
                      alt="Dermaspace"
                      width={96}
                      height={96}
                      className="w-11 h-11 object-contain"
                    />
                  </span>
                )}
                {/* Brand crown badge — overlaps the avatar bottom-right */}
                <span className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-[#7B2D8E] ring-2 ring-[#3F1349] flex items-center justify-center">
                  <Crown className="w-3.5 h-3.5 text-white" />
                </span>
              </span>
            </div>
            {isAuthenticated && user?.firstName && (
              <p className="text-[13px] font-medium text-white/60 mb-0.5">
                Hi, {user.firstName}
              </p>
            )}
            <h2 className="text-2xl font-bold text-balance leading-tight">
              Upgrade to {plan.name}
            </h2>
            <p
              className="mt-1 text-[13px] text-white/70 max-w-xs mx-auto leading-snug"
              dangerouslySetInnerHTML={{ __html: plan.tagline }}
            />
          </div>

          {/* Feature cards */}
          <div className="space-y-2.5">
            {featurePerks.map((perk, idx) => {
              const Icon = iconForPerk(perk)
              return (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-white/8 border border-white/10"
                >
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-white" />
                  </span>
                  <p
                    className="text-sm font-medium leading-snug text-white/95"
                    dangerouslySetInnerHTML={{ __html: perk }}
                  />
                </div>
              )
            })}

            {/* Expandable "all benefits" row */}
            {extraPerks.length > 0 && (
              <div className="rounded-2xl bg-white/8 border border-white/10 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded((v) => !v)}
                  aria-expanded={expanded}
                  className="w-full flex items-center gap-3 px-3.5 py-3 text-left"
                >
                  <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Award className="w-5 h-5 text-white" />
                  </span>
                  <span className="flex-1 text-sm font-medium text-white/95">
                    Includes all {plan.name} benefits
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-white/70 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {expanded && (
                  <ul className="px-4 pb-4 pt-1 space-y-2.5">
                    {extraPerks.map((perk, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <span className="w-4 h-4 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                        <span
                          className="text-[13px] text-white/80 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: perk }}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Subscribe pill — solid brand purple */}
          <div className="mt-4">
            <Link
              href={`/membership/checkout?plan=${plan.id}`}
              className="flex items-center justify-center w-full py-3.5 rounded-full bg-[#7B2D8E] text-white text-base font-bold hover:bg-[#5A1D6A] transition-colors"
            >
              Register for {formatNgn(plan.price)}/
              {periodLabel(plan.validityMonths)}
            </Link>
          </div>

          {/* View other plans */}
          {otherPlans.length > 0 && (
            <div className="mt-3.5 text-center">
              <p className="text-[11px] font-semibold text-white/60 uppercase tracking-widest mb-2">
                View other plans
              </p>
              <div className="flex items-center justify-center gap-2">
                {otherPlans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSwitchPlan(p.id)}
                    className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/10 border border-white/15 text-white hover:bg-white/20 transition-colors"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Fine print + linked terms */}
          <p className="mt-4 text-[11px] leading-relaxed text-white/55 text-center">
            Benefits and rates can change with notice. Memberships are valid
            for {plan.validityMonths} months, are non-refundable and
            non-exchangeable. Glow Points are a reward and are not credited
            to your wallet. By tapping &ldquo;Register for{' '}
            {formatNgn(plan.price)}/{periodLabel(plan.validityMonths)}
            &rdquo;, you agree to the{' '}
            <Link
              href="/terms"
              className="font-semibold text-white underline underline-offset-2"
            >
              Membership Terms
            </Link>{' '}
            and the auto-renewal you opt into.
          </p>
        </div>
      </div>
    </div>
  )
}
