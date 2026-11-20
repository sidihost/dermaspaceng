export type EmailSenderCategory =
  | 'support'
  | 'security'
  | 'team_security'
  | 'team'
  | 'bookings'
  | 'general'

export interface ResolvedEmailSender {
  category: EmailSenderCategory
  name: string
  email: string
  from: string
  title: string
}

const SENDER_DIRECTORY: Record<
  EmailSenderCategory,
  { name: string; email: string; title: string }
> = {
  support: {
    name: 'Dermaspace Support',
    email: 'support@dermaspaceng.com',
    title: 'Dermaspace Support',
  },
  security: {
    name: 'Dermaspace Security',
    email: 'security@dermaspaceng.com',
    title: 'Dermaspace Security',
  },
  team_security: {
    name: 'Dermaspace Team Security',
    email: 'security@dermaspaceng.com',
    title: 'Dermaspace Team Security',
  },
  team: {
    name: 'Dermaspace Team',
    email: 'team@dermaspaceng.com',
    title: 'Dermaspace Team',
  },
  bookings: {
    name: 'Dermaspace Bookings',
    email: 'bookings@dermaspaceng.com',
    title: 'Dermaspace Bookings',
  },
  general: {
    name: 'Dermaspace',
    email: 'noreply@dermaspaceng.com',
    title: 'Dermaspace',
  },
}

const VALID_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Resolves the context-specific Dermaspace sender identity (`From` header
 * + HTML `<title>`) for transactional emails.
 *
 * ZeptoMail authorizes the entire `dermaspaceng.com` domain, so category
 * addresses (`support@`, `security@`, `team@`, `bookings@`, `noreply@`)
 * deliver natively. If a deployment ever pins `ZEPTO_FORCE_FROM_EMAIL`,
 * the address is honored while preserving the category display name and title.
 */
export function resolveEmailSender(
  category: EmailSenderCategory = 'general',
  forcedFromEmail?: string | null,
): ResolvedEmailSender {
  const entry = SENDER_DIRECTORY[category] ?? SENDER_DIRECTORY.general
  const rawOverride =
    forcedFromEmail !== undefined
      ? forcedFromEmail
      : process.env.ZEPTO_FORCE_FROM_EMAIL
  const trimmedOverride = typeof rawOverride === 'string' ? rawOverride.trim() : ''
  const email =
    trimmedOverride && VALID_EMAIL_RE.test(trimmedOverride)
      ? trimmedOverride
      : entry.email

  return {
    category,
    name: entry.name,
    email,
    from: `"${entry.name}" <${email}>`,
    title: entry.title,
  }
}
