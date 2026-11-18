/**
 * Seasonal Celebration Domain Helpers (Birthday, Christmas, New Year)
 * -------------------------------------------------------------------
 * Pure, dependency-free helpers shared across:
 *   - /birthday, /christmas, /new-year interactive story experiences
 *   - /components/shared/birthday-celebration.tsx (Global celebration banner)
 *   - /app/dashboard/page.tsx (Dashboard seasonal overview cards)
 *
 * Strictly enforces Dermaspace brand rules:
 *   - Purple (#7B2D8E / #5A1D6A / #3E104B / #9B4DB0 / #F5ECFA), white, black neutrals
 *   - Zero gradients, zero shadows, zero Sparkles/Zap icons, zero sparkle emojis
 */

import {
  BIRTHDAY_CONFETTI_COLORS,
  buildShareText as buildBirthdayShareText,
  buildSlides as buildBirthdaySlides,
  getBirthdaySeenKey,
  getIntroSlideCopy as getBirthdayIntroSlideCopy,
  getLagosCalendarDate,
  getLocalCalendarDate,
  isBirthdayTodayLocal,
  type CalendarDate,
  type IntroSlideCopy,
  type RecapPayload,
  type SlideSpec,
} from './birthday'

export type CelebrationOccasion = 'birthday' | 'christmas' | 'new-year'

export interface NewYearEdition {
  /** Upcoming or newly arrived year being celebrated (e.g. 2027 on Dec 31, 2026 & Jan 1, 2027) */
  targetYear: number
  /** Year just wrapping up (targetYear - 1) */
  recapYear: number
  /** Two-digit target year label, e.g. "27" */
  shortTargetYear: string
  /** Two-digit recap year label, e.g. "26" */
  shortRecapYear: string
}

export interface OccasionThemeCopy {
  occasion: CelebrationOccasion
  /** Short header tag next to Dermaspace brand, e.g. "Glow Year", "Christmas '26", "Hello '27" */
  headerTag: string
  ariaStoryLabel: string
  closeAriaLabel: string
  songButtonTitle: string
  songHintLabel: string
  intro: IntroSlideCopy
  joined: {
    eyebrowFallback: string
    unitHeadlineSuffix: string
    description: string
  }
  stats: {
    topLeftLabel: string
    topRightLabel: string
    headlineLine1: string
    headlineLine2: string
    ringLabel: (firstName: string) => string
    investedLabel: string
    peakLabel: string
  }
  treatment: {
    eyebrow: string
    note: string
  }
  location: {
    eyebrow: string
    visitLabel: (count: number) => string
    note: string
    passLabel: string
  }
  share: {
    headlineLine1: string
    headlineLine2: string
    leftTag: string
    rightTag: string
    centerTag: string
    centerTitle: string
    buttonLabel: (firstName: string) => string
    shareTitle: string
    toastTitle: string
    toastSubtitle: string
  }
  wish: {
    eyebrow: string
    headlineTop: string
    headlineAccent: string
    headlineBottom: (firstName: string) => string
    boxLabel: string
    boxBody: string
    primaryCta: string
    secondaryCta?: { label: string; href: string }
  }
  finished: {
    eyebrow: string
    headline: (firstName: string) => string
    body: string
    shareButton: string
    bookButton: string
    secondaryCta?: { label: string; href: string }
  }
}

export interface CelebrationBannerCopy {
  occasion: CelebrationOccasion
  title: string
  subtitle: string
  primaryCtaLabel: string
  primaryCtaHref: string
  secondaryCtaLabel: string
  secondaryCtaHref: string
  dismissAriaLabel: string
}

/**
 * Resolves the celebration target year and recap year for New Year season:
 *   - Nov–Dec (e.g. Dec 31, 2026): welcoming targetYear = 2027, recapYear = 2026
 *   - Jan–Oct (e.g. Jan 1–7, 2027): welcoming targetYear = 2027, recapYear = 2026
 */
export function getNewYearEdition(cal: CalendarDate): NewYearEdition {
  const targetYear = cal.month >= 11 ? cal.year + 1 : cal.year
  const recapYear = targetYear - 1
  return {
    targetYear,
    recapYear,
    shortTargetYear: String(targetYear).slice(-2),
    shortRecapYear: String(recapYear).slice(-2),
  }
}

/**
 * Christmas celebration window runs Dec 1 through Dec 26 inclusive.
 */
export function isChristmasSeasonCalendar(cal: CalendarDate): boolean {
  return cal.month === 12 && cal.day >= 1 && cal.day <= 26
}

/**
 * New Year celebration window runs Dec 31 through Jan 7 inclusive.
 */
export function isNewYearSeasonCalendar(cal: CalendarDate): boolean {
  return (cal.month === 12 && cal.day >= 31) || (cal.month === 1 && cal.day <= 7)
}

export function isChristmasSeasonLocal(now: Date = new Date()): boolean {
  return isChristmasSeasonCalendar(getLocalCalendarDate(now))
}

export function isChristmasSeasonLagos(now: Date = new Date()): boolean {
  return isChristmasSeasonCalendar(getLagosCalendarDate(now))
}

export function isNewYearSeasonLocal(now: Date = new Date()): boolean {
  return isNewYearSeasonCalendar(getLocalCalendarDate(now))
}

export function isNewYearSeasonLagos(now: Date = new Date()): boolean {
  return isNewYearSeasonCalendar(getLagosCalendarDate(now))
}

/**
 * Determines which seasonal celebration banner should greet the signed-in user:
 *   1. Birthday on user's actual DOB always wins top priority.
 *   2. Christmas season (Dec 1–26) when admin Festive mode is active.
 *   3. New Year season (Dec 31–Jan 7).
 */
export function getActiveCelebrationOccasion(input: {
  dobIso: string | null | undefined
  festiveEnabled: boolean
  now?: Date
}): CelebrationOccasion | null {
  const now = input.now ?? new Date()
  if (isBirthdayTodayLocal(input.dobIso, now)) {
    return 'birthday'
  }
  if (input.festiveEnabled && isChristmasSeasonLocal(now)) {
    return 'christmas'
  }
  if (isNewYearSeasonLocal(now)) {
    return 'new-year'
  }
  return null
}

/**
 * Per-user, per-year localStorage key so dismissing or seeing one user's
 * seasonal celebration never blocks another user or next year's edition.
 */
export function getSeasonalSeenKey(
  occasion: CelebrationOccasion,
  userId: string | null | undefined,
  year: number,
): string {
  if (occasion === 'birthday') {
    return getBirthdaySeenKey(userId, year)
  }
  const safeId = userId && userId.trim() !== '' ? userId.trim() : 'anon'
  const prefix = occasion === 'christmas' ? 'ds_xmas_seen' : 'ds_ny_seen'
  return `${prefix}_${safeId}_${year}`
}

export function getCelebrationConfettiColors(
  _occasion: CelebrationOccasion,
): readonly string[] {
  return BIRTHDAY_CONFETTI_COLORS
}

/**
 * Only fire birthday celebration effects (confetti bursts & "Happy Birthday"
 * song) on the member's actual birthday. Off-day visits to /birthday present
 * a calm "Your Glow Year" recap without birthday celebration animations.
 * Seasonal routes (/christmas, /new-year) always play their festive effects.
 */
export function shouldPlayBirthdayCelebrationEffects(
  occasion: CelebrationOccasion,
  isBirthdayToday: boolean,
): boolean {
  if (occasion === 'birthday') {
    return Boolean(isBirthdayToday)
  }
  return true
}

/**
 * Returns true when the current route is one of the full-screen celebration
 * story pages (/birthday, /christmas, /new-year) where global banners and
 * floating snowfall canvases should stay hidden.
 */
export function isCelebrationStoryRoute(
  pathname: string | null | undefined,
): boolean {
  if (!pathname) return false
  return (
    pathname === '/birthday' ||
    pathname.startsWith('/birthday/') ||
    pathname === '/christmas' ||
    pathname.startsWith('/christmas/') ||
    pathname === '/new-year' ||
    pathname.startsWith('/new-year/')
  )
}

export function buildCelebrationSlides(
  occasion: CelebrationOccasion,
  recap: RecapPayload,
): SlideSpec[] {
  const base = buildBirthdaySlides(recap)
  if (occasion === 'birthday') return base

  const labelOverrides: Partial<Record<SlideSpec['id'], string>> =
    occasion === 'christmas'
      ? {
          intro: 'Merry Christmas',
          share: 'Share Holiday Glow',
          wish: 'Holiday Wish',
        }
      : {
          intro: 'Happy New Year',
          share: 'Share New Year Wrap',
          wish: 'New Year Wish',
        }

  return base.map((slide) => ({
    ...slide,
    label: labelOverrides[slide.id] ?? slide.label,
  }))
}

export function buildCelebrationShareText(
  occasion: CelebrationOccasion,
  recap: RecapPayload,
  now: Date = new Date(),
): string {
  if (occasion === 'birthday') {
    return buildBirthdayShareText(recap)
  }

  const cal = getLagosCalendarDate(now)
  const name = recap.user.firstName?.trim() || 'My'
  const parts = [
    `${recap.daysWithUs} ${recap.daysWithUs === 1 ? 'day' : 'days'} with Dermaspace`,
  ]
  if (recap.stats.totalBookings > 0) {
    parts.push(
      `${recap.stats.totalBookings} ${recap.stats.totalBookings === 1 ? 'visit' : 'visits'}`,
    )
  }
  if (recap.stats.topTreatment) {
    parts.push(`favourite: ${recap.stats.topTreatment}`)
  }

  if (occasion === 'christmas') {
    const prefix =
      name === 'My'
        ? `My Christmas ${cal.year} Glow`
        : `${name}'s Christmas ${cal.year} Glow`
    return `${prefix} at Dermaspace — ${parts.join(', ')}.`
  }

  const ny = getNewYearEdition(cal)
  const prefix =
    name === 'My'
      ? `My Hello ${ny.targetYear} Wrap`
      : `${name}'s Hello ${ny.targetYear} Wrap`
  return `${prefix} at Dermaspace — ${parts.join(', ')}.`
}

export function getCelebrationThemeCopy(
  occasion: CelebrationOccasion,
  recap: RecapPayload,
  now: Date = new Date(),
): OccasionThemeCopy {
  const cal = getLagosCalendarDate(now)
  const shortYear = String(cal.year).slice(-2)
  const ny = getNewYearEdition(cal)

  if (occasion === 'christmas') {
    return {
      occasion: 'christmas',
      headerTag: `Christmas '${shortYear}`,
      ariaStoryLabel: 'Christmas Glow story slides',
      closeAriaLabel: 'Close Christmas Glow',
      songButtonTitle: 'Holiday Song',
      songHintLabel: 'Holiday Song',
      intro: {
        eyebrow: 'Merry Christmas',
        cardLabel: 'Season of Radiance',
        dateText: {
          month: 'DECEMBER',
          day: 25,
          suffix: 'th',
          year: cal.year,
        },
        subtitleLead: 'Holiday Glow with',
        subtitleBrand: 'Dermaspace',
      },
      joined: {
        eyebrowFallback: 'Your Dermaspace Year',
        unitHeadlineSuffix: 'Glow With',
        description:
          'Through every busy week this year, you made time for stillness and self-care — thank you for letting us care for your skin.',
      },
      stats: {
        topLeftLabel: 'Holiday Edit',
        topRightLabel: `Xmas '${shortYear}`,
        headlineLine1: 'FESTIVE',
        headlineLine2: 'GLOW',
        ringLabel: (firstName) => `${firstName} · christmas ${cal.year}`,
        investedLabel: 'Invested',
        peakLabel: 'Peak Month',
      },
      treatment: {
        eyebrow: 'Your Ritual of the Year',
        note: 'The treatment you trusted most this year — ready whenever you crave a quiet December reset.',
      },
      location: {
        eyebrow: 'Your Holiday Sanctuary',
        visitLabel: (count) =>
          count === 1 ? 'Visit this year' : 'Visits this year',
        note: 'Warm light, calm rooms, and familiar therapists waiting to help you unwind this festive season.',
        passLabel: `Holiday Club Pass · ${cal.year}`,
      },
      share: {
        headlineLine1: 'Share your',
        headlineLine2: `Christmas '${shortYear} Glow`,
        leftTag: `'${shortYear}`,
        rightTag: `'${shortYear}`,
        centerTag: `Xmas '${shortYear}`,
        centerTitle: 'Holiday Glow',
        buttonLabel: (firstName) => `Share my Christmas Glow, ${firstName}`,
        shareTitle: `Christmas ${cal.year} Glow · Dermaspace`,
        toastTitle: 'Christmas Glow copied',
        toastSubtitle: 'Ready to paste and share anywhere.',
      },
      wish: {
        eyebrow: 'From everyone at Dermaspace',
        headlineTop: 'Wishing you a',
        headlineAccent: 'calm, luminous',
        headlineBottom: (firstName) => `Christmas, ${firstName}.`,
        boxLabel: 'Holiday Self-Care & Gifting',
        boxBody:
          'Treat yourself to a restorative December session or surprise someone dear with a Dermaspace festive gift card.',
        primaryCta: 'Book a holiday visit',
        secondaryCta: {
          label: 'Send a festive gift card',
          href: '/gift-cards',
        },
      },
      finished: {
        eyebrow: `Dermaspace · Christmas '${shortYear}`,
        headline: (firstName) => `Merry Christmas, ${firstName}.`,
        body: 'May your holidays feel unhurried, warm, and wonderfully restful — see you in the sanctuary soon.',
        shareButton: 'Share my Christmas Glow',
        bookButton: 'Book a holiday visit',
        secondaryCta: {
          label: 'Explore gift cards',
          href: '/gift-cards',
        },
      },
    }
  }

  if (occasion === 'new-year') {
    return {
      occasion: 'new-year',
      headerTag: `Hello '${ny.shortTargetYear}`,
      ariaStoryLabel: 'New Year Wrap story slides',
      closeAriaLabel: 'Close New Year Wrap',
      songButtonTitle: 'New Year Song',
      songHintLabel: 'New Year Song',
      intro: {
        eyebrow: 'Happy New Year',
        cardLabel: 'A Fresh Chapter',
        dateText: {
          month: 'JANUARY',
          day: 1,
          suffix: 'st',
          year: ny.targetYear,
        },
        subtitleLead: `${ny.recapYear} Wrap by`,
        subtitleBrand: 'Dermaspace',
      },
      joined: {
        eyebrowFallback: `Your ${ny.recapYear} Journey`,
        unitHeadlineSuffix: 'Glow With',
        description: `Every ritual you kept in ${ny.recapYear} built the healthy foundation you are carrying into ${ny.targetYear}.`,
      },
      stats: {
        topLeftLabel: `${ny.recapYear} in Review`,
        topRightLabel: `Hello '${ny.shortTargetYear}`,
        headlineLine1: 'NEW',
        headlineLine2: 'CHAPTER',
        ringLabel: (firstName) => `${firstName} · hello ${ny.targetYear}`,
        investedLabel: 'Invested',
        peakLabel: 'Peak Month',
      },
      treatment: {
        eyebrow: `Your ${ny.recapYear} Signature`,
        note: `Consistency beats everything — carry what your skin loved most straight into ${ny.targetYear}.`,
      },
      location: {
        eyebrow: 'Your Sanctuary Home',
        visitLabel: (count) =>
          count === 1 ? `Visit in ${ny.recapYear}` : `Visits in ${ny.recapYear}`,
        note: `Familiar rooms, trusted hands, and a fresh ${ny.targetYear} calendar ready for your next reset.`,
        passLabel: `New Year Club Pass · ${ny.targetYear}`,
      },
      share: {
        headlineLine1: 'Share your',
        headlineLine2: `Hello ${ny.targetYear} Wrap`,
        leftTag: `'${ny.shortRecapYear}`,
        rightTag: `'${ny.shortTargetYear}`,
        centerTag: `Hello '${ny.shortTargetYear}`,
        centerTitle: 'Year Moves',
        buttonLabel: (firstName) => `Share my ${ny.targetYear} wrap, ${firstName}`,
        shareTitle: `Hello ${ny.targetYear} Wrap · Dermaspace`,
        toastTitle: 'New Year Wrap copied',
        toastSubtitle: 'Ready to paste and share anywhere.',
      },
      wish: {
        eyebrow: `From everyone at Dermaspace`,
        headlineTop: 'Wishing you a',
        headlineAccent: 'radiant, grounded',
        headlineBottom: (firstName) => `${ny.targetYear}, ${firstName}.`,
        boxLabel: `Your ${ny.targetYear} Skin Reset`,
        boxBody: `Begin ${ny.targetYear} at your own pace — reserve your first facial, massage, or consultation with our team this month.`,
        primaryCta: `Book your ${ny.targetYear} visit`,
        secondaryCta: {
          label: 'Explore spa packages',
          href: '/packages',
        },
      },
      finished: {
        eyebrow: `Dermaspace · Hello ${ny.targetYear}`,
        headline: (firstName) => `Happy New Year, ${firstName}.`,
        body: `Thank you for spending ${ny.recapYear} with us. Here is to your calmest, healthiest skin in ${ny.targetYear}.`,
        shareButton: `Share my ${ny.targetYear} wrap`,
        bookButton: `Book your ${ny.targetYear} visit`,
        secondaryCta: {
          label: 'Explore packages',
          href: '/packages',
        },
      },
    }
  }

  // Birthday (default — matches Glow Year design verbatim)
  const intro = getBirthdayIntroSlideCopy({
    birthday: recap.birthday,
    isBirthdayToday: recap.isBirthdayToday,
    now,
  })
  return {
    occasion: 'birthday',
    headerTag: 'Glow Year',
    ariaStoryLabel: 'Glow Year story slides',
    closeAriaLabel: 'Close Glow Year',
    songButtonTitle: 'Glow Song',
    songHintLabel: 'Glow Song',
    intro,
    joined: {
      eyebrowFallback: 'Your Dermaspace Journey',
      unitHeadlineSuffix: 'Glow With',
      description:
        "The day you started taking your skin seriously — and we've been in your corner ever since.",
    },
    stats: {
      topLeftLabel: 'Your Spa Year',
      topRightLabel: `Edition '${shortYear}`,
      headlineLine1: 'GLOW',
      headlineLine2: 'MOVES',
      ringLabel: (firstName) => `${firstName} · glow year`,
      investedLabel: 'Invested',
      peakLabel: 'Peak Month',
    },
    treatment: {
      eyebrow: 'Your Go-To Treatment',
      note: 'Some people call it routine. We call it knowing exactly what your skin loves.',
    },
    location: {
      eyebrow: 'Your Sanctuary',
      visitLabel: (count) =>
        count === 1 ? 'Visit this year' : 'Visits this year',
      note: 'Familiar rooms, familiar faces, and treatments tailored to how your skin evolves.',
      passLabel: `Sanctuary Club Pass · ${cal.year}`,
    },
    share: {
      headlineLine1: 'Share what your',
      headlineLine2: 'Glow Year looks like',
      leftTag: `'${shortYear}`,
      rightTag: `'${shortYear}`,
      centerTag: `Glow '${shortYear}`,
      centerTitle: 'Glow Moves',
      buttonLabel: (firstName) => `Share my Glow Year, ${firstName}`,
      shareTitle: 'My Glow Year · Dermaspace',
      toastTitle: 'Glow Year copied',
      toastSubtitle: 'Ready to paste and share anywhere.',
    },
    wish: {
      eyebrow: 'From everyone at Dermaspace',
      headlineTop: recap.isBirthdayToday ? 'Wishing you the' : "Here's to your",
      headlineAccent: 'softest, healthiest',
      headlineBottom: (firstName) =>
        recap.isBirthdayToday
          ? `year yet, ${firstName}.`
          : `skin yet, ${firstName}.`,
      boxLabel: recap.isBirthdayToday
        ? 'Your Birthday Treat'
        : 'Celebrate Your Glow',
      boxBody: recap.isBirthdayToday
        ? 'Book any treatment in the next 30 days and our team will have a birthday surprise waiting for you in-clinic.'
        : 'Whenever you are ready for your next reset, our therapists are waiting with a plan tailored to your skin.',
      primaryCta: recap.isBirthdayToday
        ? 'Book your birthday visit'
        : 'Book your next visit',
    },
    finished: {
      eyebrow: `Dermaspace · Glow Year '${shortYear}`,
      headline: (firstName) => `That's your year, ${firstName}.`,
      body: "Save it, share it, and let's make this next chapter even better for your skin.",
      shareButton: 'Share my Glow Year',
      bookButton: 'Book a treatment',
    },
  }
}

export function getCelebrationBannerCopy(input: {
  occasion: CelebrationOccasion
  firstName: string
  now?: Date
}): CelebrationBannerCopy {
  const now = input.now ?? new Date()
  const cal = getLocalCalendarDate(now)
  const name = input.firstName.trim() || 'Friend'

  if (input.occasion === 'christmas') {
    return {
      occasion: 'christmas',
      title: `Merry Christmas, ${name}!`,
      subtitle:
        'Your Holiday Glow recap is unwrapped — revisit your year of calm and radiant skin at Dermaspace.',
      primaryCtaLabel: 'Open Holiday Story',
      primaryCtaHref: '/christmas',
      secondaryCtaLabel: 'Send a gift card',
      secondaryCtaHref: '/gift-cards',
      dismissAriaLabel: 'Dismiss Christmas greeting',
    }
  }

  if (input.occasion === 'new-year') {
    const ny = getNewYearEdition(cal)
    return {
      occasion: 'new-year',
      title: `Happy New Year ${ny.targetYear}, ${name}!`,
      subtitle: `Your ${ny.recapYear} Year in Review is ready — celebrate your self-care milestones and start ${ny.targetYear} glowing.`,
      primaryCtaLabel: `Open ${ny.targetYear} Wrap`,
      primaryCtaHref: '/new-year',
      secondaryCtaLabel: 'Book a New Year visit',
      secondaryCtaHref: '/booking',
      dismissAriaLabel: 'Dismiss New Year greeting',
    }
  }

  return {
    occasion: 'birthday',
    title: `Happy Birthday, ${name}!`,
    subtitle:
      'Your Glow Year recap is ready — revisit your year of self-care at Dermaspace.',
    primaryCtaLabel: 'Open Glow Year',
    primaryCtaHref: '/birthday',
    secondaryCtaLabel: 'Book a birthday visit',
    secondaryCtaHref: '/booking',
    dismissAriaLabel: 'Dismiss birthday greeting',
  }
}
