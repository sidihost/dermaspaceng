export interface ConsultationPersistencePlan {
  isAnonymous: boolean
  trackToken: string | null
}

export interface ConsultationEmailAction {
  mode: 'dashboard' | 'track' | 'rebook'
  ctaUrl: string
  dashboardUrl?: string
  trackUrl?: string
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
    if (args.status === 'cancelled') {
      return {
        mode: 'rebook',
        ctaUrl: `${origin}/consultation`,
        dashboardUrl: `${origin}/dashboard/consultations/${encodeURIComponent(args.consultationId)}`,
      }
    }
    const dashboardUrl = `${origin}/dashboard/consultations/${encodeURIComponent(args.consultationId)}`
    return {
      mode: 'dashboard',
      ctaUrl: dashboardUrl,
      dashboardUrl,
    }
  }

  if (args.status === 'cancelled' || !args.trackToken) {
    return {
      mode: 'rebook',
      ctaUrl: `${origin}/consultation`,
    }
  }

  const trackUrl = `${origin}/consultation/track/${encodeURIComponent(args.trackToken)}`
  return {
    mode: 'track',
    ctaUrl: trackUrl,
    trackUrl,
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
  const draftEmail = args.draft?.email?.trim().toLowerCase()
  const userEmail = args.user.email.trim().toLowerCase()
  const sameUserDraft = !draftEmail || draftEmail === userEmail

  return {
    firstName: sameUserDraft && args.draft?.firstName?.trim()
      ? args.draft.firstName
      : args.user.firstName,
    lastName: sameUserDraft && args.draft?.lastName?.trim()
      ? args.draft.lastName
      : args.user.lastName,
    email: args.user.email,
    phone: (sameUserDraft ? args.draft?.phone : undefined) || args.user.phone || '',
  }
}
