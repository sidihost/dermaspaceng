import { isPlaceholderEmail } from './auth-onboarding'

export interface ConsultationPersistencePlan {
  isAnonymous: boolean
  trackToken: string | null
}

export interface ConsultationEmailAction {
  mode: 'dashboard' | 'track' | 'rebook'
  ctaUrl: string
  ctaLabel: string
  dashboardUrl?: string
  trackUrl?: string
}

export interface ConsultationReplyTarget {
  isAnonymousRecipient: boolean
  ctaUrl: string
  ctaLabel: string
  actionPath: string | null
  footerNote: string
}

const CONSULTATION_LOCATIONS: Record<string, string> = {
  vi: 'Victoria Island - 237b Muri Okunola St',
  ikoyi: 'Ikoyi - 9 Agbeke Rotinwa Cl, Dolphin Estate',
}

export function formatConsultationLocation(location: string | null | undefined): string {
  const cleaned = typeof location === 'string' ? location.trim() : ''
  if (!cleaned) return ''
  return CONSULTATION_LOCATIONS[cleaned.toLowerCase()] || cleaned
}

export function formatConsultationDateLabel(
  dateValue: string | Date | null | undefined,
): string | null {
  if (!dateValue) return null
  let isoDay: string | null = null
  if (dateValue instanceof Date) {
    if (Number.isNaN(dateValue.getTime())) return null
    isoDay = dateValue.toISOString().slice(0, 10)
  } else {
    const raw = String(dateValue).trim()
    if (!raw) return null
    const isoMatch = raw.match(/^(\d{4}-\d{2}-\d{2})/)
    if (isoMatch) {
      isoDay = isoMatch[1]
    } else {
      const parsed = new Date(raw)
      if (!Number.isNaN(parsed.getTime())) {
        isoDay = parsed.toISOString().slice(0, 10)
      } else {
        return raw
      }
    }
  }
  const parsed = new Date(`${isoDay}T00:00:00.000Z`)
  if (Number.isNaN(parsed.getTime())) return isoDay
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function normalizePublicOrigin(raw?: string | null): string {
  const cleaned = typeof raw === 'string' ? raw.trim() : ''
  if (!cleaned || cleaned === 'undefined' || cleaned === 'null') {
    return 'https://www.dermaspaceng.com'
  }
  return cleaned.replace(/\/+$/, '')
}

export function buildConsultationPersistencePlan(args: {
  userId: string | null | undefined
  generateToken: () => string
}): ConsultationPersistencePlan {
  const hasUser = Boolean(args.userId && String(args.userId).trim())
  if (hasUser) {
    return {
      isAnonymous: false,
      trackToken: null,
    }
  }
  return {
    isAnonymous: true,
    trackToken: args.generateToken(),
  }
}

export function buildConsultationEmailAction(args: {
  isAnonymous: boolean
  appUrl?: string | null
  consultationId: string
  trackToken?: string | null
  status?: string | null
}): ConsultationEmailAction {
  const origin = normalizePublicOrigin(args.appUrl)

  if (!args.isAnonymous) {
    const dashboardUrl = `${origin}/dashboard/consultations/${encodeURIComponent(args.consultationId)}`
    if (args.status === 'cancelled') {
      return {
        mode: 'rebook',
        ctaUrl: `${origin}/consultation`,
        ctaLabel: 'Book a new consultation',
        dashboardUrl,
      }
    }
    return {
      mode: 'dashboard',
      ctaUrl: dashboardUrl,
      ctaLabel: 'View in Dashboard',
      dashboardUrl,
    }
  }

  if (args.status === 'cancelled' || !args.trackToken) {
    return {
      mode: 'rebook',
      ctaUrl: `${origin}/consultation`,
      ctaLabel: 'Book a new consultation',
    }
  }

  const trackUrl = `${origin}/consultation/track/${encodeURIComponent(args.trackToken)}`
  return {
    mode: 'track',
    ctaUrl: trackUrl,
    ctaLabel: 'Track your consultation',
    trackUrl,
  }
}

export function buildConsultationReplyTarget(args: {
  isAnonymous: boolean
  hasUserAccount: boolean
  appUrl?: string | null
  consultationId: string
  trackToken?: string | null
}): ConsultationReplyTarget {
  const origin = normalizePublicOrigin(args.appUrl)

  if (!args.isAnonymous || args.hasUserAccount) {
    const actionPath = `/dashboard/consultations/${encodeURIComponent(args.consultationId)}/responses`
    return {
      isAnonymousRecipient: false,
      ctaUrl: `${origin}${actionPath}`,
      ctaLabel: 'View response',
      actionPath,
      footerNote:
        'You can read this response and reply directly from your Dermaspace responses page at any time.',
    }
  }

  if (args.trackToken && String(args.trackToken).trim()) {
    const trackUrl = `${origin}/consultation/track/${encodeURIComponent(String(args.trackToken).trim())}/responses`
    return {
      isAnonymousRecipient: true,
      ctaUrl: trackUrl,
      ctaLabel: 'View response',
      actionPath: null,
      footerNote:
        'Use the button above to open your private responses page and send a message back to our team anytime.',
    }
  }

  return {
    isAnonymousRecipient: true,
    ctaUrl: `${origin}/consultation`,
    ctaLabel: 'Book a Consultation',
    actionPath: null,
    footerNote:
      'If you have follow-up questions, reply to our team at info@dermaspaceng.com.',
  }
}

export function resolveSignedInConsultationIdentity(args: {
  user: {
    firstName: string
    lastName: string
    email: string
    phone?: string | null
  }
  draft?: {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
  } | null
}) {
  const visibleUserEmail = isPlaceholderEmail(args.user.email) ? '' : args.user.email
  const draftEmail = args.draft?.email?.trim().toLowerCase()
  const userEmail = visibleUserEmail.trim().toLowerCase()
  const sameUserDraft = !draftEmail || (userEmail !== '' && draftEmail === userEmail)

  return {
    firstName: sameUserDraft && args.draft?.firstName?.trim()
      ? args.draft.firstName
      : args.user.firstName,
    lastName: sameUserDraft && args.draft?.lastName?.trim()
      ? args.draft.lastName
      : args.user.lastName,
    email: visibleUserEmail,
    phone: (sameUserDraft ? args.draft?.phone : undefined) || args.user.phone || '',
  }
}
