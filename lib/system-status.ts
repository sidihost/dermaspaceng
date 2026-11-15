export interface DermaspaceBranch {
  name: string
  shortAddress: string
  phoneDisplay: string
  phoneHref: string
}

export const DERMASPACE_EMAIL = 'info@dermaspaceng.com'

export const DERMASPACE_BRANCHES: readonly DermaspaceBranch[] = [
  {
    name: 'Victoria Island',
    shortAddress: '237B Muri Okunola St, VI',
    phoneDisplay: '+234 906 183 6625',
    phoneHref: 'tel:+2349061836625',
  },
  {
    name: 'Ikoyi',
    shortAddress: '9 Agbeke Rotinwa Cl, Dolphin Estate',
    phoneDisplay: '+234 901 313 4945',
    phoneHref: 'tel:+2349013134945',
  },
] as const

export const OFFLINE_QUICK_LINKS = [
  { label: 'Services', href: '/services' },
  { label: 'Gift Cards', href: '/gift-cards' },
  { label: 'Contact', href: '/contact' },
] as const

export type SystemStatusVariant = 'error' | 'offline'

export interface SystemStatusCopy {
  documentTitle: string
  heading: string
  description: string
  retryLabel: string
  homeLabel: string
}

export function getSystemStatusCopy(variant: SystemStatusVariant): SystemStatusCopy {
  if (variant === 'offline') {
    return {
      documentTitle: "You're offline · Dermaspace",
      heading: "You're offline",
      description:
        "Your connection dropped. Pages you've already visited still work offline.",
      retryLabel: 'Try again',
      homeLabel: 'Back to Home',
    }
  }

  return {
    documentTitle: 'Something went wrong · Dermaspace',
    heading: 'Something went wrong',
    description:
      "We hit an unexpected snag loading this page. It's on us, not you — a quick retry usually clears it right up.",
    retryLabel: 'Try again',
    homeLabel: 'Back to Home',
  }
}

export function resolveRetryAction(
  isOnline: boolean,
  hasResetHandler: boolean,
): 'reset' | 'reload' {
  if (isOnline && hasResetHandler) return 'reset'
  return 'reload'
}
