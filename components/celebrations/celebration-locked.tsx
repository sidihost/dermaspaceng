import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  Cake,
  Calendar,
  Clock,
  Lock,
  Settings,
  Snowflake,
} from 'lucide-react'
import {
  DermaspaceEmblem,
  DermaspaceWordmark,
} from '@/components/shared/dermaspace-emblem'
import { MONTHS_FULL, ordinalSuffix, parseIsoDateParts } from '@/lib/birthday'
import type { CelebrationOccasion } from '@/lib/celebrations'
import type { CelebrationDenyReason } from '@/lib/celebration-tokens'

function formatBirthdayMonthDayOnly(dobIso: string | null | undefined): string | null {
  const parts = parseIsoDateParts(dobIso)
  if (!parts) return null
  const month = MONTHS_FULL[parts.month - 1]
  if (!month) return null
  return `${month} ${parts.day}${ordinalSuffix(parts.day)}`
}

function getLockedCopy(input: {
  occasion: CelebrationOccasion
  reason: CelebrationDenyReason
  firstName?: string | null
  dobIso?: string | null
}): {
  badge: string
  headline: string
  body: string
  primaryCta: { label: string; href: string }
  secondaryCta: { label: string; href: string }
} {
  const name = input.firstName?.trim() || 'Friend'
  const bdayLabel = formatBirthdayMonthDayOnly(input.dobIso)

  if (
    input.reason === 'wrong_user' ||
    input.reason === 'wrong_occasion' ||
    input.reason === 'invalid_token' ||
    input.reason === 'expired_token' ||
    input.reason === 'dob_mismatch'
  ) {
    const title =
      input.reason === 'wrong_user'
        ? 'This link belongs to another account'
        : input.reason === 'expired_token'
          ? 'This celebration link has expired'
          : 'This celebration link is invalid'
    const detail =
      input.reason === 'wrong_user'
        ? `Celebration stories are private and bound to the member's own Dermaspace profile. Sign in with the matching account or open your own dashboard.`
        : `Personal celebration links are uniquely issued per member and expire after their window closes.`

    return {
      badge: 'Private Celebration Link',
      headline: title,
      body: detail,
      primaryCta: { label: 'Go to Dashboard', href: '/dashboard' },
      secondaryCta: { label: 'Book a Treatment', href: '/booking' },
    }
  }

  if (input.occasion === 'birthday') {
    if (input.reason === 'missing_dob') {
      return {
        badge: 'Birthday Glow Year',
        headline: `Add your birthday first, ${name}`,
        body: 'Your personal Glow Year story unlocks on your date of birth. Add your birthday in profile settings so we can celebrate with you when your day arrives.',
        primaryCta: { label: 'Add Date of Birth', href: '/dashboard/settings' },
        secondaryCta: { label: 'Back to Dashboard', href: '/dashboard' },
      }
    }

    return {
      badge: 'Birthday Glow Year',
      headline: bdayLabel
        ? `Your Glow Year opens on ${bdayLabel}`
        : `Your Glow Year opens on your birthday`,
      body: `To keep your birthday celebration special, Glow Year is only unlocked on your actual birthday${bdayLabel ? ` (${bdayLabel})` : ''} and through your private birthday email link.`,
      primaryCta: { label: 'Back to Dashboard', href: '/dashboard' },
      secondaryCta: { label: 'Book a Visit', href: '/booking' },
    }
  }

  if (input.occasion === 'christmas') {
    const body =
      input.reason === 'festive_disabled'
        ? 'The Dermaspace Christmas Glow experience is currently turned off. Visit your dashboard to check bookings, rewards, and self-care updates.'
        : 'Christmas Glow opens exclusively during our holiday season (December 1 – December 26). Come back in December to unwrap your festive spa story.'

    return {
      badge: 'Holiday Season Only',
      headline: `Christmas Glow is currently locked`,
      body,
      primaryCta: { label: 'Back to Dashboard', href: '/dashboard' },
      secondaryCta: { label: 'Explore Gift Cards', href: '/gift-cards' },
    }
  }

  return {
    badge: 'New Year Season Only',
    headline: 'New Year Wrap opens Dec 31 – Jan 7',
    body: 'Your Dermaspace Year in Review unlocks exclusively between December 31 and January 7 so you can look back on the year just ending.',
    primaryCta: { label: 'Back to Dashboard', href: '/dashboard' },
    secondaryCta: { label: 'Book a Visit', href: '/booking' },
  }
}

export default function CelebrationLocked({
  occasion,
  reason,
  firstName,
  dobIso,
}: {
  occasion: CelebrationOccasion
  reason: CelebrationDenyReason
  firstName?: string | null
  dobIso?: string | null
}) {
  const copy = getLockedCopy({ occasion, reason, firstName, dobIso })
  const OccasionIcon =
    occasion === 'christmas'
      ? Snowflake
      : occasion === 'new-year'
        ? Clock
        : Cake

  return (
    <div className="min-h-screen bg-[#7B2D8E] text-white flex flex-col justify-between px-4 py-6 sm:px-6">
      <header className="mx-auto flex w-full max-w-lg items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-[#5A1D6A] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-white hover:text-[#7B2D8E]"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          Dashboard
        </Link>

        <DermaspaceWordmark
          className="text-white"
          emblemClassName="h-5 w-5"
        />
      </header>

      <main className="mx-auto my-8 w-full max-w-md">
        <div className="rounded-3xl border border-white/25 bg-[#3E104B] px-6 py-7 text-center sm:px-8 sm:py-8">
          <div className="mx-auto flex items-center justify-center gap-2">
            <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-[#F5ECFA] bg-white text-[#7B2D8E]">
              <OccasionIcon className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="grid h-8 w-8 -ml-4 mt-5 place-items-center rounded-full border border-white/30 bg-[#5A1D6A] text-white">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>

          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-[#5A1D6A] px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#F5ECFA]">
            <Calendar className="h-3 w-3" aria-hidden="true" />
            {copy.badge}
          </p>

          <h1 className="font-serif mt-4 text-balance text-2xl font-bold leading-tight text-white sm:text-3xl">
            {copy.headline}
          </h1>

          <p className="mt-3 text-balance text-sm leading-relaxed text-white/85">
            {copy.body}
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href={copy.primaryCta.href}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[#7B2D8E] transition-colors hover:bg-[#F5ECFA]"
            >
              {reason === 'missing_dob' && (
                <Settings className="h-4 w-4" aria-hidden="true" />
              )}
              {copy.primaryCta.label}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>

            <Link
              href={copy.secondaryCta.href}
              className="inline-flex min-h-[42px] items-center justify-center rounded-full border border-white/25 bg-[#5A1D6A] px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-white hover:text-[#7B2D8E]"
            >
              {copy.secondaryCta.label}
            </Link>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/15 pt-4 text-[11px] font-medium uppercase tracking-[0.16em] text-white/65">
            <DermaspaceEmblem className="h-3.5 w-3.5" />
            <span>Member Privacy Protected</span>
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-white/65">
        Dermaspace &middot; Lagos
      </footer>
    </div>
  )
}
